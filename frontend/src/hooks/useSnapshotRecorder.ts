import { useEffect } from 'react';
import type { TradeWithSnapshots, SnapshotInput } from '../types/portfolio';
import { getOptionsChain } from '../api/options';
import { getContractPrice, recordSnapshots } from '../api/portfolio';

export function useSnapshotRecorder(trades: TradeWithSnapshots[], onComplete: () => void) {
  useEffect(() => {
    const open = trades.filter(t => t.status === 'open');
    if (open.length === 0) return;

    recordCurrentPrices(open)
      .then(inserted => { if (inserted > 0) onComplete(); })
      .catch(() => {}); // best-effort, never block the UI
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount
}

async function recordCurrentPrices(trades: TradeWithSnapshots[]): Promise<number> {
  // Group by underlying ticker to minimise API calls
  const byTicker = new Map<string, TradeWithSnapshots[]>();
  for (const t of trades) {
    if (!byTicker.has(t.underlying_ticker)) byTicker.set(t.underlying_ticker, []);
    byTicker.get(t.underlying_ticker)!.push(t);
  }

  const toRecord: SnapshotInput[] = [];

  for (const [ticker, tickerTrades] of byTicker) {
    try {
      // Try the standard 28-60 DTE chain first (served from cache if already loaded)
      const chain = await getOptionsChain(ticker);
      const allContracts = [...chain.puts, ...chain.calls];

      for (const trade of tickerTrades) {
        const match = allContracts.find(c => c.ticker === trade.contract_symbol);
        if (match) {
          toRecord.push({
            trade_id: trade.id,
            bid: match.bid,
            ask: match.ask,
            underlying_price: chain.underlyingPrice,
            open_interest: match.openInterest,
          });
        } else {
          // Contract outside 28-60 window — use dedicated endpoint
          try {
            const price = await getContractPrice(ticker, trade.contract_symbol);
            toRecord.push({
              trade_id: trade.id,
              bid: price.bid,
              ask: price.ask,
              underlying_price: price.underlying_price,
            });
          } catch {
            // Skip this contract silently
          }
        }
      }
    } catch {
      // Skip entire ticker silently
    }
  }

  if (toRecord.length === 0) return 0;
  const result = await recordSnapshots(toRecord);
  return result.inserted;
}
