import type { StockQuote } from '../types/quote';
import type { OptionsChain } from '../types/options';

export async function getQuote(ticker: string): Promise<StockQuote> {
  const res = await fetch(`/api/stocks/${ticker}/quote`);
  if (!res.ok) throw new Error(`Failed to load quote for ${ticker}`);
  return res.json();
}

export async function getOptionsChain(ticker: string): Promise<OptionsChain> {
  const res = await fetch(`/api/stocks/${ticker}/options`);
  if (!res.ok) throw new Error(`Failed to load options for ${ticker}`);
  return res.json();
}
