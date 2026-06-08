import { RefreshCw } from 'lucide-react';
import type { StockQuote } from '../../types/quote';
import { formatCurrency, formatNumber, formatPercent, formatDateTime } from '../../utils/formatters';
import { Button } from '../ui/Button';

interface Props {
  quote: StockQuote;
  onRefresh: () => void;
  refreshing: boolean;
}

export function StockQuoteHeader({ quote, onRefresh, refreshing }: Props) {
  const up = quote.changePercent >= 0;
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold text-slate-100">{formatCurrency(quote.price)}</span>
          <span className={`text-sm font-medium ${up ? 'text-emerald-400' : 'text-red-400'}`}>
            {up ? '+' : ''}{formatPercent(quote.changePercent)}
          </span>
        </div>
        <div className="flex gap-4 mt-1 text-xs text-slate-400">
          <span>Vol: {formatNumber(quote.volume)}</span>
          <span>Prev close: {formatCurrency(quote.prevClose)}</span>
          <span className="text-slate-500">{formatDateTime(quote.lastUpdated)}</span>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onRefresh} disabled={refreshing} title="Force refresh from Polygon">
        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
      </Button>
    </div>
  );
}
