import { useState, useEffect } from 'react';
import type { StockQuote } from '../types/quote';
import { getQuote } from '../api/options';

export function useQuote(ticker: string) {
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getQuote(ticker)
      .then(setQuote)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [ticker]);

  return { quote, loading, error };
}
