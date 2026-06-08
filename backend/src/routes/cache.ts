import { Router } from 'express';
import { cacheDelete } from '../cache/memoryCache.js';

const router = Router();

router.delete('/:ticker', (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  cacheDelete(`quote:${ticker}`);
  cacheDelete(`options:${ticker}`);
  console.log(`[cache] Invalidated all entries for ${ticker}`);
  res.status(204).send();
});

export default router;
