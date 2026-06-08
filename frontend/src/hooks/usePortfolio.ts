import { useState, useEffect, useCallback } from 'react';
import type { TradeWithSnapshots, AddTradeRequest, CloseTradeRequest } from '../types/portfolio';
import { getTrades, addTrade as apiAddTrade, closeTrade as apiCloseTrade, deleteTrade as apiDeleteTrade } from '../api/portfolio';

export function usePortfolio() {
  const [trades, setTrades] = useState<TradeWithSnapshots[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getTrades()
      .then(setTrades)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const addTrade = useCallback(async (req: AddTradeRequest) => {
    const trade = await apiAddTrade(req);
    setTrades(prev => [trade, ...prev]);
  }, []);

  const closeTrade = useCallback(async (id: number, req: CloseTradeRequest) => {
    const trade = await apiCloseTrade(id, req);
    setTrades(prev => prev.map(t => t.id === id ? trade : t));
  }, []);

  const deleteTrade = useCallback(async (id: number) => {
    await apiDeleteTrade(id);
    setTrades(prev => prev.filter(t => t.id !== id));
  }, []);

  return { trades, loading, error, addTrade, closeTrade, deleteTrade, refresh: load };
}
