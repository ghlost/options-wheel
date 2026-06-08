import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import type { WatchedStock } from '../../types/watchlist';

interface Props {
  stock: WatchedStock;
  active: boolean;
  onClick: () => void;
  onRemove: () => void;
}

export function TickerItem({ stock, active, onClick, onRemove }: Props) {
  return (
    <div
      className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer group transition-colors ${
        active ? 'bg-indigo-600/30 text-indigo-300' : 'hover:bg-slate-700 text-slate-300'
      }`}
      onClick={onClick}
    >
      <span className="font-mono font-semibold text-sm">{stock.ticker}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={e => { e.stopPropagation(); onRemove(); }}
        className="opacity-0 group-hover:opacity-100 p-1"
        title={`Remove ${stock.ticker}`}
      >
        <X size={14} />
      </Button>
    </div>
  );
}
