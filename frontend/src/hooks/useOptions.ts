import { useState, useEffect, useCallback } from 'react';
import type { OptionsChain } from '../types/options';
import { getOptionsChain } from '../api/options';
import { invalidateCache } from '../api/stocks';

export function useOptions(ticker: string) {
  const [chain, setChain] = useState<OptionsChain | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getOptionsChain(ticker)
      .then(setChain)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [ticker]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(async () => {
    await invalidateCache(ticker);
    load();
  }, [ticker, load]);

  return { chain, loading, error, refresh };
}
