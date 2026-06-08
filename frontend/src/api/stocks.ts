import type { WatchedStock } from '../types/watchlist';

export async function getWatchlist(): Promise<WatchedStock[]> {
  const res = await fetch('/api/stocks');
  if (!res.ok) throw new Error('Failed to load watchlist');
  return res.json();
}

export async function addStock(ticker: string): Promise<WatchedStock> {
  const res = await fetch('/api/stocks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error ?? 'Failed to add stock');
  }
  return res.json();
}

export async function removeStock(ticker: string): Promise<void> {
  const res = await fetch(`/api/stocks/${ticker}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to remove stock');
}

export async function invalidateCache(ticker: string): Promise<void> {
  await fetch(`/api/cache/${ticker}`, { method: 'DELETE' });
}
