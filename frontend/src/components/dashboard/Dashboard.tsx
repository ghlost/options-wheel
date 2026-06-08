import { useState, useCallback } from 'react';
import type { WatchedStock } from '../../types/watchlist';
import type { AddTradeRequest } from '../../types/portfolio';
import { StockCard } from '../stock/StockCard';

interface Props {
  stocks: WatchedStock[];
  tickerOrder: string[];
  onAddTrade?: (req: AddTradeRequest) => Promise<void>;
}

export function Dashboard({ stocks, tickerOrder, onAddTrade }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = useCallback((ticker: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  }, []);

  if (stocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <p className="text-lg">No stocks in watchlist</p>
        <p className="text-sm mt-1">Add a ticker in the sidebar to get started.</p>
      </div>
    );
  }

  const sorted = [...stocks].sort((a, b) => {
    const ac = collapsed.has(a.ticker) ? 1 : 0;
    const bc = collapsed.has(b.ticker) ? 1 : 0;
    if (ac !== bc) return ac - bc;
    const ai = tickerOrder.indexOf(a.ticker);
    const bi = tickerOrder.indexOf(b.ticker);
    const aIdx = ai === -1 ? Infinity : ai;
    const bIdx = bi === -1 ? Infinity : bi;
    return aIdx - bIdx;
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {sorted.map(s => (
        <div key={s.ticker} id={`stock-${s.ticker.toLowerCase()}`}>
          <StockCard
            ticker={s.ticker}
            collapsed={collapsed.has(s.ticker)}
            onToggleCollapse={toggle}
            onAddTrade={onAddTrade}
          />
        </div>
      ))}
    </div>
  );
}
