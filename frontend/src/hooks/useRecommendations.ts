import { useState, useCallback, useEffect, useMemo } from 'react';
import type { WatchedStock } from '../types/watchlist';
import type { Recommendation } from '../../../shared/types/recommendations.js';
import { getOptionsChain } from '../api/options';
import { probabilityOfProfit } from '../../../shared/utils/blackScholes.js';

const YIELD_FLOOR = 3.0;
const POP_FLOOR = 0.70;

function bestRec(
  contracts: OptionContract[],
  underlyingPrice: number,
  ticker: string,
  avgCost?: number | null,
): Recommendation | null {
  let best: Recommendation | null = null;

  for (const c of contracts) {
    const otm = c.contractType === 'put'
      ? c.strikePrice < underlyingPrice
      : c.strikePrice > underlyingPrice;

    const rawBid = Math.max(0, 2 * c.bid - c.ask);
    if (!otm || c.impliedVolatility <= 0 || rawBid < 0.10 || c.premiumYield < YIELD_FLOOR) continue;

    // For covered calls: skip any strike below avg cost
    if (c.contractType === 'call' && avgCost != null && avgCost > 0) {
      if (c.strikePrice < avgCost) continue;
    }

    const pop = probabilityOfProfit(underlyingPrice, c.strikePrice, c.daysToExpiration, c.impliedVolatility, c.contractType);
    if (pop < POP_FLOOR) continue;

    const score = c.premiumYield * pop;
    if (best === null || score > best.score) {
      best = { ticker, underlyingPrice, contract: c, probabilityOfProfit: pop, score };
    }
  }

  return best;
}

async function computeRecommendations(stocks: WatchedStock[]): Promise<Recommendation[]> {
  const results = await Promise.allSettled(
    stocks.map(async stock => {
      const chain = await getOptionsChain(stock.ticker);
      const putBest = bestRec(chain.puts, chain.underlyingPrice, stock.ticker);
      let callBest = stock.shares_owned >= 100
        ? bestRec(chain.calls, chain.underlyingPrice, stock.ticker, stock.avg_cost)
        : null;

      // Boost covered call score for tickers trending up today
      if (callBest && chain.changePercent > 0) {
        callBest = { ...callBest, score: callBest.score * (1 + chain.changePercent / 100) };
      }

      // Return whichever scores higher
      if (putBest && callBest) return putBest.score >= callBest.score ? putBest : callBest;
      return putBest ?? callBest;
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<Recommendation> =>
      r.status === 'fulfilled' && r.value !== null
    )
    .map(r => r.value)
    .sort((a, b) => b.score - a.score);
}

export function useRecommendations(stocks: WatchedStock[]) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only re-run when the set of tickers changes, not on shares_owned updates
  const tickerKey = useMemo(() => stocks.map(s => s.ticker).sort().join(','), [stocks]);

  const run = useCallback(async (currentStocks: WatchedStock[]) => {
    if (currentStocks.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const recs = await computeRecommendations(currentStocks);
      setRecommendations(recs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to compute recommendations');
    } finally {
      setLoading(false);
    }
  }, []);

  // Stable refresh function that always uses current stocks
  const refresh = useCallback(() => { run(stocks); }, [run, stocks]);

  useEffect(() => {
    if (stocks.length > 0) run(stocks);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickerKey]); // intentionally only re-run when ticker list changes

  return { recommendations, loading, error, refresh };
}
