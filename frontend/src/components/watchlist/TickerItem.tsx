import { X, GripVertical } from 'lucide-react';
import { Button } from '../ui/Button';
import type { WatchedStock } from '../../types/watchlist';

interface Props {
  stock: WatchedStock;
  active: boolean;
  onClick: () => void;
  onRemove: () => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}

export function TickerItem({ stock, active, onClick, onRemove, draggable, onDragStart, onDragOver, onDragEnd }: Props) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`flex items-center justify-between px-2 py-2 rounded cursor-pointer group transition-colors ${
        active ? 'bg-indigo-600/30 text-indigo-300' : 'hover:bg-slate-700 text-slate-300'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <GripVertical size={12} className="text-slate-600 group-hover:text-slate-500 shrink-0 cursor-grab" />
        <span className="font-mono font-semibold text-sm truncate">{stock.ticker}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={e => { e.stopPropagation(); onRemove(); }}
        className="opacity-0 group-hover:opacity-100 p-1 shrink-0"
        title={`Remove ${stock.ticker}`}
      >
        <X size={14} />
      </Button>
    </div>
  );
}
