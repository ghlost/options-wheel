import { useState, useRef } from 'react';
import { X, GripVertical, TrendingUp } from 'lucide-react';
import { Button } from '../ui/Button';
import type { WatchedStock } from '../../types/watchlist';

interface Props {
  stock: WatchedStock;
  active: boolean;
  onClick: () => void;
  onRemove: () => void;
  onSharesChange: (shares: number) => void;
  onAvgCostChange: (avgCost: number | null) => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}

export function TickerItem({ stock, active, onClick, onRemove, onSharesChange, onAvgCostChange, draggable, onDragStart, onDragOver, onDragEnd }: Props) {
  const ownsShares = stock.shares_owned >= 100;
  const [costInput, setCostInput] = useState(stock.avg_cost != null ? String(stock.avg_cost) : '');
  const lastSavedRef = useRef(stock.avg_cost);

  function handleCostBlur() {
    const val = costInput.trim() === '' ? null : parseFloat(costInput);
    const parsed = val === null || isNaN(val) ? null : val;
    if (parsed !== lastSavedRef.current) {
      lastSavedRef.current = parsed;
      onAvgCostChange(parsed);
    }
  }

  function handleCostKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') e.currentTarget.blur();
  }

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`flex flex-col px-2 py-1.5 rounded cursor-pointer group transition-colors ${
        active ? 'bg-indigo-600/30 text-indigo-300' : 'hover:bg-slate-700 text-slate-300'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <GripVertical size={12} className="text-slate-600 group-hover:text-slate-500 shrink-0 cursor-grab" />
          <span className="font-mono font-semibold text-sm truncate">{stock.ticker}</span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onSharesChange(ownsShares ? 0 : 100); }}
            title={ownsShares ? 'Owns 100+ shares (click to unmark)' : 'Mark as owning 100+ shares for covered call recs'}
            className={`opacity-0 group-hover:opacity-100 p-1 transition-colors rounded ${ownsShares ? 'opacity-100 text-emerald-400 hover:text-emerald-300' : 'text-slate-600 hover:text-slate-400'}`}
          >
            <TrendingUp size={13} />
          </button>
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
      </div>

      {ownsShares && (
        <div className="flex items-center gap-1 ml-4 mt-0.5" onClick={e => e.stopPropagation()}>
          <span className="text-[10px] text-slate-500">Avg:</span>
          <span className="text-[10px] text-slate-500">$</span>
          <input
            type="number"
            min={0}
            step={0.01}
            value={costInput}
            placeholder="cost basis"
            onChange={e => setCostInput(e.target.value)}
            onBlur={handleCostBlur}
            onKeyDown={handleCostKey}
            className="w-16 bg-transparent border-b border-slate-600 focus:border-slate-400 outline-none text-[10px] text-slate-400 placeholder-slate-600 py-0"
          />
        </div>
      )}
    </div>
  );
}
