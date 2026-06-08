import type { TradeWithSnapshots, AddTradeRequest, CloseTradeRequest, SnapshotInput, ContractPriceResponse } from '../types/portfolio';

export async function getTrades(): Promise<TradeWithSnapshots[]> {
  const res = await fetch('/api/portfolio/trades');
  if (!res.ok) throw new Error('Failed to load trades');
  return res.json();
}

export async function addTrade(req: AddTradeRequest): Promise<TradeWithSnapshots> {
  const res = await fetch('/api/portfolio/trades', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error ?? 'Failed to add trade');
  }
  return res.json();
}

export async function closeTrade(id: number, req: CloseTradeRequest): Promise<TradeWithSnapshots> {
  const res = await fetch(`/api/portfolio/trades/${id}/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error('Failed to close trade');
  return res.json();
}

export async function deleteTrade(id: number): Promise<void> {
  const res = await fetch(`/api/portfolio/trades/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete trade');
}

export async function recordSnapshots(snapshots: SnapshotInput[]): Promise<{ inserted: number }> {
  const res = await fetch('/api/portfolio/snapshots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ snapshots }),
  });
  if (!res.ok) throw new Error('Failed to record snapshots');
  return res.json();
}

export async function getContractPrice(ticker: string, contractSymbol: string): Promise<ContractPriceResponse> {
  const res = await fetch(`/api/stocks/${ticker}/options/contract/${encodeURIComponent(contractSymbol)}`);
  if (!res.ok) throw new Error('Failed to fetch contract price');
  return res.json();
}
