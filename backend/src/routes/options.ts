import { Router, type Request, type Response, type NextFunction } from 'express';
import { fetchStockQuote, fetchOptionsChainForDates, fetchOptionsChain } from '../services/polygon.js';
import type { ContractPriceResponse } from '../../../shared/types/portfolio.js';

const router = Router({ mergeParams: true });

router.get('/', async (req: Request<{ ticker: string }>, res: Response, next: NextFunction) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const quote = await fetchStockQuote(ticker);
    const chain = await fetchOptionsChain(ticker, quote.price);
    chain.changePercent = quote.changePercent;
    res.json(chain);
  } catch (e) {
    next(e);
  }
});

// Fetch current price for a specific contract by symbol (e.g. TQQQ-2026-07-18-75-P)
router.get('/contract/:contractSymbol', async (
  req: Request<{ ticker: string; contractSymbol: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const symbol = req.params.contractSymbol;

    // Parse: TQQQ-2026-07-18-75-P  →  expiry=2026-07-18, strike=75, type=put
    const parts = symbol.split('-');
    // Format: TICKER-YYYY-MM-DD-STRIKE-TYPE  (ticker may itself contain dashes for some symbols)
    // Last part is type (C/P), second-to-last is strike, then date (3 parts), rest is ticker
    const contractTypeChar = parts[parts.length - 1].toUpperCase();
    const strikeStr = parts[parts.length - 2];
    const expirationDate = parts.slice(parts.length - 5, parts.length - 2).join('-');
    const contractType = contractTypeChar === 'C' ? 'call' : 'put';

    const today = new Date().toISOString().slice(0, 10);

    if (expirationDate < today) {
      const quote = await fetchStockQuote(ticker);
      const response: ContractPriceResponse = { bid: 0, ask: 0, underlying_price: quote.price, expired: true };
      res.json(response);
      return;
    }

    const quote = await fetchStockQuote(ticker);
    const chain = await fetchOptionsChainForDates(ticker, quote.price, expirationDate, expirationDate);
    const contracts = contractType === 'put' ? chain.puts : chain.calls;
    const match = contracts.find(c => c.ticker === symbol);

    if (!match) {
      const response: ContractPriceResponse = { bid: 0, ask: 0, underlying_price: quote.price, expired: false };
      res.json(response);
      return;
    }

    const strike = parseFloat(strikeStr);
    void strike; // used for matching only
    const response: ContractPriceResponse = {
      bid: match.bid,
      ask: match.ask,
      underlying_price: chain.underlyingPrice,
      expired: false,
    };
    res.json(response);
  } catch (e) {
    next(e);
  }
});

export default router;
