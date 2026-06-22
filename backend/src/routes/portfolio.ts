import { Router, type Request, type Response, type NextFunction } from 'express';
import db from '../db/client.js';
import type {
  Trade,
  PriceSnapshot,
  TradeWithSnapshots,
  AddTradeRequest,
  CloseTradeRequest,
  SnapshotInput,
} from '../../../shared/types/portfolio.js';

const router = Router();

function daysBetween(a: string, b: string): number {
  return Math.round(Math.abs(new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
}

function dteRemaining(expirationDate: string): number {
  const today = new Date().toISOString().slice(0, 10);
  const diff = new Date(expirationDate).getTime() - new Date(today).getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

function computeFields(
  trade: Trade & {
    latest_bid?: number | null;
    latest_ask?: number | null;
    latest_underlying_price?: number | null;
    latest_open_interest?: number | null;
  },
  snapshots: PriceSnapshot[]
): TradeWithSnapshots {
  const today = new Date().toISOString().slice(0, 10);
  const endDate = trade.closed_at ? trade.closed_at.slice(0, 10) : today;

  const premium_received = trade.open_price * 100 * trade.quantity;
  const cash_reserved = trade.contract_type === 'put'
    ? trade.strike_price * 100 * trade.quantity
    : 0;

  const latest_bid = trade.latest_bid ?? null;
  const latest_ask = trade.latest_ask ?? null;
  const latest_underlying_price = trade.latest_underlying_price ?? null;
  const latest_open_interest = trade.latest_open_interest ?? null;

  const mid = latest_bid !== null && latest_ask !== null
    ? (latest_bid + latest_ask) / 2
    : latest_bid;
  const current_value = mid !== null ? mid * 100 * trade.quantity : null;
  const unrealized_pnl = current_value !== null ? premium_received - current_value : null;
  const unrealized_pnl_pct = unrealized_pnl !== null && premium_received > 0
    ? (unrealized_pnl / premium_received) * 100 : null;

  const days_held = daysBetween(trade.opened_at.slice(0, 10), endDate);
  // Puts: yield on reserved cash (strike × 100 × qty)
  // Calls: yield on share value at open (underlying_price_at_open × 100 × qty) — the collateral pledged
  const annualized_basis = trade.contract_type === 'put'
    ? cash_reserved
    : trade.underlying_price_at_open * 100 * trade.quantity;
  const annualized_return = unrealized_pnl !== null && days_held > 0 && annualized_basis > 0
    ? (unrealized_pnl / annualized_basis) * (365 / days_held) * 100 : null;

  return {
    ...trade,
    latest_bid,
    latest_ask,
    latest_underlying_price,
    latest_open_interest,
    dte_remaining: dteRemaining(trade.expiration_date),
    days_held,
    premium_received,
    cash_reserved,
    unrealized_pnl,
    unrealized_pnl_pct,
    annualized_return,
    snapshots,
  };
}

// GET /api/portfolio/trades
router.get('/trades', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = db.prepare(`
      SELECT t.*,
        s.bid              AS latest_bid,
        s.ask              AS latest_ask,
        s.underlying_price AS latest_underlying_price,
        s.open_interest    AS latest_open_interest
      FROM trades t
      LEFT JOIN price_snapshots s ON s.trade_id = t.id
        AND s.snapshot_date = (
          SELECT MAX(snapshot_date) FROM price_snapshots WHERE trade_id = t.id
        )
      ORDER BY t.opened_at DESC
    `).all() as unknown as (Trade & {
      latest_bid: number | null;
      latest_ask: number | null;
      latest_underlying_price: number | null;
      latest_open_interest: number | null;
    })[];

    // Fetch all snapshots for open trades (for sparklines)
    const openIds = rows.filter(r => r.status === 'open').map(r => r.id);
    const snapshotsByTrade = new Map<number, PriceSnapshot[]>();
    if (openIds.length > 0) {
      const placeholders = openIds.map(() => '?').join(',');
      const snaps = db.prepare(
        `SELECT * FROM price_snapshots WHERE trade_id IN (${placeholders}) ORDER BY snapshot_date ASC`
      ).all(...openIds) as unknown as PriceSnapshot[];
      for (const s of snaps) {
        if (!snapshotsByTrade.has(s.trade_id)) snapshotsByTrade.set(s.trade_id, []);
        snapshotsByTrade.get(s.trade_id)!.push(s);
      }
    }

    const result = rows.map(r => computeFields(r, snapshotsByTrade.get(r.id) ?? []));
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// POST /api/portfolio/trades
router.post('/trades', (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as AddTradeRequest;
    const { contract_symbol, underlying_ticker, contract_type, strike_price,
      expiration_date, quantity, open_price, underlying_price_at_open, notes } = body;

    if (!contract_symbol || !underlying_ticker || !contract_type || !strike_price
      || !expiration_date || !quantity || open_price == null || underlying_price_at_open == null) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    db.prepare(`
      INSERT INTO trades
        (contract_symbol, underlying_ticker, contract_type, strike_price, expiration_date,
         quantity, open_price, underlying_price_at_open, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(contract_symbol, underlying_ticker.toUpperCase(), contract_type, strike_price,
      expiration_date, quantity, open_price, underlying_price_at_open, notes ?? null);

    const trade = db.prepare(
      `SELECT * FROM trades WHERE id = last_insert_rowid()`
    ).get() as unknown as Trade;

    res.status(201).json(computeFields(trade, []));
  } catch (e) {
    next(e);
  }
});

// POST /api/portfolio/trades/:id/close
router.post('/trades/:id/close', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { close_price } = req.body as CloseTradeRequest;

    if (!close_price && close_price !== 0) {
      res.status(400).json({ error: 'close_price required' });
      return;
    }

    db.prepare(`
      UPDATE trades SET status='closed', close_price=?, closed_at=datetime('now')
      WHERE id=? AND status='open'
    `).run(close_price, id);

    const trade = db.prepare(`SELECT * FROM trades WHERE id=?`).get(id) as unknown as Trade | undefined;
    if (!trade) { res.status(404).json({ error: 'Trade not found' }); return; }

    res.json(computeFields(trade, []));
  } catch (e) {
    next(e);
  }
});

// DELETE /api/portfolio/trades/:id
router.delete('/trades/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    db.prepare(`DELETE FROM trades WHERE id=?`).run(id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

// POST /api/portfolio/snapshots  — bulk INSERT OR IGNORE
router.post('/snapshots', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { snapshots } = req.body as { snapshots: SnapshotInput[] };
    if (!Array.isArray(snapshots) || snapshots.length === 0) {
      res.json({ inserted: 0 });
      return;
    }

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO price_snapshots (trade_id, bid, ask, underlying_price, open_interest)
      VALUES (?, ?, ?, ?, ?)
    `);

    let inserted = 0;
    for (const s of snapshots) {
      const result = stmt.run(s.trade_id, s.bid, s.ask, s.underlying_price, s.open_interest ?? null) as unknown as { changes: number };
      inserted += result.changes;
    }

    res.json({ inserted });
  } catch (e) {
    next(e);
  }
});

export default router;
