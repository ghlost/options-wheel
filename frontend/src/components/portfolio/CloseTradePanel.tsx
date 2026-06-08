import { useState } from 'react';
import type { TradeWithSnapshots, CloseTradeRequest } from '../../types/portfolio';
import { formatCurrency } from '../../utils/formatters';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface Props {
  trade: TradeWithSnapshots;
  onClose: (id: number, req: CloseTradeRequest) => Promise<void>;
  onCancel: () => void;
}

export function CloseTradePanel({ trade, onClose, onCancel }: Props) {
  const suggested = trade.latest_ask ?? trade.open_price;
  const [price, setPrice] = useState(suggested.toFixed(2));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closePrice = parseFloat(price) || 0;
  const realizedPnl = (trade.open_price - closePrice) * 100 * trade.quantity;

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      await onClose(trade.id, { close_price: closePrice });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to close trade');
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap px-4 py-2 bg-slate-700/30 rounded border border-amber-500/30">
      <span className="text-xs text-slate-400">Close price (per share):</span>
      <Input
        type="number"
        min={0}
        step={0.01}
        value={price}
        onChange={e => setPrice(e.target.value)}
        className="w-24 py-0.5 px-2 text-xs"
      />
      {trade.latest_ask != null && (
        <button
          onClick={() => setPrice(trade.latest_ask!.toFixed(2))}
          className="text-xs text-indigo-400 hover:text-indigo-300"
        >
          Use current ask ({formatCurrency(trade.latest_ask)})
        </button>
      )}
      <span className={`text-xs font-mono ${realizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        Realized: {realizedPnl >= 0 ? '+' : ''}{formatCurrency(realizedPnl)}
      </span>
      <Button size="sm" onClick={handleConfirm} disabled={loading || closePrice < 0}>
        {loading ? '...' : 'Confirm Close'}
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
