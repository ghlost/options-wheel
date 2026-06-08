import { Router } from 'express';
import { cacheDelete } from '../cache/memoryCache.js';

const router = Router();

// Clear all cached quotes and options chains
router.delete('/', (_req, res) => {
  cacheDelete('quote:');
  cacheDelete('options:');
  console.log('[cache] Invalidated all entries');
  res.status(204).send();
});

router.delete('/:ticker', (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  cacheDelete(`quote:${ticker}`);
  cacheDelete(`options:${ticker}`);
  console.log(`[cache] Invalidated all entries for ${ticker}`);
  res.status(204).send();
});

export default router;
