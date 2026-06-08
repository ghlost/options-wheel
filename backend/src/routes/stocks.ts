import { Router } from 'express';
import db from '../db/client.js';
import type { WatchedStock, AddStockRequest } from '../../../shared/types/watchlist.js';

const router = Router();

router.get('/', (_req, res) => {
  const rows = db.prepare(
    `SELECT id, ticker, notes, added_at FROM watched_stocks ORDER BY added_at DESC`
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

router.delete('/:ticker', (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  db.prepare(`DELETE FROM watched_stocks WHERE ticker = ?`).run(ticker);
  res.status(204).send();
});

export default router;
