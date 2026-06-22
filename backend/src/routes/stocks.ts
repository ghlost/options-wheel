import { Router } from 'express';
import db from '../db/client.js';
import type { WatchedStock, AddStockRequest } from '../../../shared/types/watchlist.js';

const router = Router();

router.get('/', (_req, res) => {
  const rows = db.prepare(
    `SELECT id, ticker, notes, added_at, shares_owned, avg_cost FROM watched_stocks ORDER BY added_at DESC`
  ).all() as unknown as WatchedStock[];
  res.json(rows);
});

router.post('/', (req, res) => {
  const { ticker, notes } = req.body as AddStockRequest;
  if (!ticker || !/^[A-Za-z]{1,5}$/.test(ticker.trim())) {
    res.status(400).json({ error: 'Invalid ticker: must be 1–5 letters' });
    return;
  }
  const upper = ticker.trim().toUpperCase();
  try {
    db.prepare(
      `INSERT INTO watched_stocks (ticker, notes) VALUES (?, ?)`
    ).run(upper, notes ?? null);
    const row = db.prepare(`SELECT * FROM watched_stocks WHERE ticker = ?`).get(upper) as unknown as WatchedStock;
    res.status(201).json(row);
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('UNIQUE')) {
      res.status(409).json({ error: `${upper} is already in your watchlist` });
    } else {
      throw e;
    }
  }
});

router.patch('/:ticker/shares', (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  const { shares_owned } = req.body as { shares_owned: number };
  if (typeof shares_owned !== 'number' || shares_owned < 0 || !Number.isInteger(shares_owned)) {
    res.status(400).json({ error: 'shares_owned must be a non-negative integer' });
    return;
  }
  db.prepare(`UPDATE watched_stocks SET shares_owned = ? WHERE ticker = ?`).run(shares_owned, ticker);
  const row = db.prepare(`SELECT id, ticker, notes, added_at, shares_owned, avg_cost FROM watched_stocks WHERE ticker = ?`).get(ticker) as unknown as WatchedStock | undefined;
  if (!row) { res.status(404).json({ error: 'Ticker not found' }); return; }
  res.json(row);
});

router.patch('/:ticker/avg-cost', (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  const { avg_cost } = req.body as { avg_cost: number | null };
  if (avg_cost !== null && (typeof avg_cost !== 'number' || avg_cost < 0)) {
    res.status(400).json({ error: 'avg_cost must be a non-negative number or null' });
    return;
  }
  db.prepare(`UPDATE watched_stocks SET avg_cost = ? WHERE ticker = ?`).run(avg_cost ?? null, ticker);
  const row = db.prepare(`SELECT id, ticker, notes, added_at, shares_owned, avg_cost FROM watched_stocks WHERE ticker = ?`).get(ticker) as unknown as WatchedStock | undefined;
  if (!row) { res.status(404).json({ error: 'Ticker not found' }); return; }
  res.json(row);
});

router.delete('/:ticker', (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  db.prepare(`DELETE FROM watched_stocks WHERE ticker = ?`).run(ticker);
  res.status(204).send();
});

export default router;
