import { useState, useEffect, useCallback } from 'react';
import type { WatchedStock } from '../types/watchlist';
import { getWatchlist, addStock, removeStock, updateShares as apiUpdateShares, updateAvgCost as apiUpdateAvgCost } from '../api/stocks';

export function useWatchlist() {
  const [stocks, setStocks] = useState<WatchedStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getWatchlist()
      .then(setStocks)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const add = useCallback(async (ticker: string) => {
    const stock = await addStock(ticker);
    setStocks(prev => [stock, ...prev]);
  }, []);

  const remove = useCallback(async (ticker: string) => {
    await removeStock(ticker);
    setStocks(prev => prev.filter(s => s.ticker !== ticker));
  }, []);

  const updateShares = useCallback(async (ticker: string, sharesOwned: number) => {
    const updated = await apiUpdateShares(ticker, sharesOwned);
    setStocks(prev => prev.map(s => s.ticker === ticker ? updated : s));
  }, []);

  const updateAvgCost = useCallback(async (ticker: string, avgCost: number | null) => {
    const updated = await apiUpdateAvgCost(ticker, avgCost);
    setStocks(prev => prev.map(s => s.ticker === ticker ? updated : s));
  }, []);

  return { stocks, loading, error, add, remove, updateShares, updateAvgCost };
}
