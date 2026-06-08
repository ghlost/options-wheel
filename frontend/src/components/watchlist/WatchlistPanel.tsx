import type { WatchedStock } from '../../types/watchlist';
import { AddTickerForm } from './AddTickerForm';
import { TickerItem } from './TickerItem';

interface Props {
  stocks: WatchedStock[];
  activeTicker: string | null;
  onSelect: (ticker: string) => void;
  onAdd: (ticker: string) => Promise<void>;
  onRemove: (ticker: string) => Promise<void>;
}

export function WatchlistPanel({ stocks, activeTicker, onSelect, onAdd, onRemove }: Props) {
  return (
    <aside className="flex flex-col gap-4">
      <div>
        <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-2 px-1">Watchlist</h2>
        <AddTickerForm onAdd={onAdd} />
      </div>
      <div className="flex-1 overflow-y-auto">
        {stocks.length === 0 ? (
          <p className="text-xs text-slate-500 px-1">No tickers added yet.</p>
        ) : (
          <div className="space-y-0.5">
            {stocks.map(s => (
              <TickerItem
                key={s.ticker}
                stock={s}
                active={activeTicker === s.ticker}
                onClick={() => onSelect(s.ticker)}
                onRemove={() => onRemove(s.ticker)}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
