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

export async function updateAvgCost(ticker: string, avgCost: number | null): Promise<WatchedStock> {
  const res = await fetch(`/api/stocks/${ticker}/avg-cost`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ avg_cost: avgCost }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error ?? 'Failed to update avg cost');
  }
  return res.json();
}

export async function updateShares(ticker: string, sharesOwned: number): Promise<WatchedStock> {
  const res = await fetch(`/api/stocks/${ticker}/shares`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shares_owned: sharesOwned }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error ?? 'Failed to update shares');
  }
  return res.json();
}
