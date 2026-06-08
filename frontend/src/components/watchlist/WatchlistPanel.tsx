import { useRef } from 'react';
import type { WatchedStock } from '../../types/watchlist';
import { AddTickerForm } from './AddTickerForm';
import { TickerItem } from './TickerItem';

interface Props {
  stocks: WatchedStock[];
  tickerOrder: string[];
  onReorder: (newOrder: string[]) => void;
  activeTicker: string | null;
  onSelect: (ticker: string) => void;
  onAdd: (ticker: string) => Promise<void>;
  onRemove: (ticker: string) => Promise<void>;
}

export function WatchlistPanel({ stocks, tickerOrder, onReorder, activeTicker, onSelect, onAdd, onRemove }: Props) {
  const dragIndex = useRef<number | null>(null);

  // Render in tickerOrder, falling back to any not-yet-ordered tickers at the end
  const ordered = [
    ...tickerOrder.filter(t => stocks.some(s => s.ticker === t)),
    ...stocks.map(s => s.ticker).filter(t => !tickerOrder.includes(t)),
  ];

  function handleDragStart(i: number) {
    dragIndex.current = i;
  }

  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === i) return;
    const next = [...ordered];
    const [moved] = next.splice(dragIndex.current, 1);
    next.splice(i, 0, moved);
    dragIndex.current = i;
    onReorder(next);
  }

  function handleDragEnd() {
    dragIndex.current = null;
  }

  return (
    <aside className="flex flex-col gap-4">
      <div>
        <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-2 px-1">Watchlist</h2>
        <AddTickerForm onAdd={onAdd} />
      </div>
      <div className="flex-1 overflow-y-auto">
        {ordered.length === 0 ? (
          <p className="text-xs text-slate-500 px-1">No tickers added yet.</p>
        ) : (
          <div className="space-y-0.5">
            {ordered.map((ticker, i) => {
              const stock = stocks.find(s => s.ticker === ticker)!;
              return (
                <TickerItem
                  key={ticker}
                  stock={stock}
                  active={activeTicker === ticker}
                  onClick={() => onSelect(ticker)}
                  onRemove={() => onRemove(ticker)}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={e => handleDragOver(e, i)}
                  onDragEnd={handleDragEnd}
                />
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
