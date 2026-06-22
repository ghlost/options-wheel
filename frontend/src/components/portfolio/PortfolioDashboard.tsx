import { useState } from 'react';
import type { TradeWithSnapshots, CloseTradeRequest, AddTradeRequest } from '../../types/portfolio';
import type { Recommendation } from '../../../../shared/types/recommendations.js';
import { PortfolioSummaryBar } from './PortfolioSummaryBar';
import { RecommendationsPanel } from './RecommendationsPanel';
import { TradeRow } from './TradeRow';
import { Spinner } from '../ui/Spinner';
import { useSnapshotRecorder } from '../../hooks/useSnapshotRecorder';
import { clsx } from 'clsx';

interface Props {
  trades: TradeWithSnapshots[];
  loading: boolean;
  error: string | null;
  onClose: (id: number, req: CloseTradeRequest) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onRefresh: () => void;
  recommendations: Recommendation[];
  recsLoading: boolean;
  recsError: string | null;
  onRecsRefresh: () => void;
  onAddTrade: (req: AddTradeRequest) => Promise<unknown>;
}

type Tab = 'open' | 'closed';

const COLUMNS = [
  'Ticker', 'Strike', 'Expiry', 'Qty', 'DTE', 'Held',
  'Premium Rec\'d', 'Cash Reserved', 'Mid', 'Underlying', 'OI',
  'P&L', 'P&L%', 'Ann. Ret.', '',
];

export function PortfolioDashboard({ trades, loading, error, onClose, onDelete, onRefresh, recommendations, recsLoading, recsError, onRecsRefresh, onAddTrade }: Props) {
  const [tab, setTab] = useState<Tab>('open');

  useSnapshotRecorder(trades, onRefresh);

  const open = trades.filter(t => t.status === 'open');
  const closed = trades.filter(t => t.status === 'closed');
  const shown = tab === 'open' ? open : closed;

  if (loading) {
    return <div className="flex justify-center pt-16"><Spinner className="w-6 h-6" /></div>;
  }

  if (error) {
    return <p className="text-sm text-red-400 p-4">{error}</p>;
  }

  return (
    <div className="flex flex-col gap-6 max-w-full">
      <PortfolioSummaryBar trades={trades} />

      {(recsLoading || recommendations.length > 0) && (
        <RecommendationsPanel
          recommendations={recommendations}
          loading={recsLoading}
          error={recsError}
          onRefresh={onRecsRefresh}
          onAddTrade={onAddTrade}
        />
      )}

      <div>
        <div className="flex gap-1 mb-3">
          <button
            onClick={() => setTab('open')}
            className={clsx(
              'px-3 py-1.5 rounded text-sm font-medium transition-colors',
              tab === 'open' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
            )}
          >
            Open <span className="text-slate-500 ml-1">{open.length}</span>
          </button>
          <button
            onClick={() => setTab('closed')}
            className={clsx(
              'px-3 py-1.5 rounded text-sm font-medium transition-colors',
              tab === 'closed' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
            )}
          >
            Closed <span className="text-slate-500 ml-1">{closed.length}</span>
          </button>
        </div>

        {shown.length === 0 ? (
          <p className="text-slate-500 text-sm py-8 text-center">
            {tab === 'open'
              ? 'No open trades. Add trades from the Screener tab.'
              : 'No closed trades yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full text-xs min-w-max">
              <thead>
                <tr className="bg-slate-800 border-b border-slate-700 text-slate-400 font-medium">
                  {COLUMNS.map((col, i) => (
                    <th
                      key={i}
                      className={clsx(
                        'px-3 py-2.5 whitespace-nowrap',
                        i === 0 ? 'text-left' : 'text-right',
                        i === COLUMNS.length - 1 && 'w-20'
                      )}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map(trade => (
                  <TradeRow
                    key={trade.id}
                    trade={trade}
                    onClose={onClose}
                    onDelete={onDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
