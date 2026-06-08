import { Router, type Request, type Response, type NextFunction } from 'express';
import { fetchStockQuote } from '../services/polygon.js';

const router = Router({ mergeParams: true });

router.get('/', async (req: Request<{ ticker: string }>, res: Response, next: NextFunction) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const quote = await fetchStockQuote(ticker);
    res.json(quote);
  } catch (e) {
    next(e);
  }
});

export default router;
