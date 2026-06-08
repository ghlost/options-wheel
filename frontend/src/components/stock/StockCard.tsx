import { ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { Card } from '../ui/Card';
import { Spinner } from '../ui/Spinner';
import { StockQuoteHeader } from './StockQuoteHeader';
import { OptionsTab } from './OptionsTab';
import { useQuote } from '../../hooks/useQuote';
import { useOptions } from '../../hooks/useOptions';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import type { AddTradeRequest } from '../../types/portfolio';

interface Props {
  ticker: string;
  collapsed: boolean;
  onToggleCollapse: (ticker: string) => void;
  onAddTrade?: (req: AddTradeRequest) => Promise<void>;
}

export function StockCard({ ticker, collapsed, onToggleCollapse, onAddTrade }: Props) {
  const { quote, loading: quoteLoading, error: quoteError } = useQuote(ticker);
  const { chain, loading: optionsLoading, error: optionsError, refresh } = useOptions(ticker);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggleCollapse(ticker)}
          className="flex items-center gap-2 text-left group shrink-0"
        >
          <ChevronRight
            size={14}
            className={clsx('text-slate-500 transition-transform shrink-0', !collapsed && 'rotate-90')}
          />
        </button>
        <a
          href={`https://finviz.com/stock?t=${ticker}&p=d`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-lg font-bold font-mono text-slate-100 hover:text-indigo-300 transition-colors"
          onClick={e => e.stopPropagation()}
        >
          {ticker}
        </a>
        <button
          onClick={() => onToggleCollapse(ticker)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          {quote && !quoteLoading && (
            <>
              <span className="text-sm font-mono text-slate-300">{formatCurrency(quote.price)}</span>
              <span className={clsx('text-xs', quote.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {quote.changePercent >= 0 ? '+' : ''}{formatPercent(quote.changePercent)}
              </span>
            </>
          )}
        </button>
        {(quoteLoading || optionsLoading) && <Spinner className="w-4 h-4" />}
      </div>

      {!collapsed && (
        <>
          {quoteError && (
            <p className="text-sm text-red-400">Quote error: {quoteError}</p>
          )}
          {quote && !quoteLoading && (
            <StockQuoteHeader quote={quote} onRefresh={refresh} refreshing={optionsLoading} />
          )}
          {!quote && quoteLoading && (
            <div className="h-12 bg-slate-700/50 rounded animate-pulse" />
          )}

          {optionsError && (
            <p className="text-sm text-red-400">Options error: {optionsError}</p>
          )}
          {chain && !optionsLoading && (
            <OptionsTab chain={chain} onAddTrade={onAddTrade} />
          )}
          {!chain && optionsLoading && (
            <div className="space-y-2">
              <div className="h-4 bg-slate-700/50 rounded animate-pulse w-1/3" />
              <div className="h-32 bg-slate-700/50 rounded animate-pulse" />
            </div>
          )}
        </>
      )}
    </Card>
  );
}
