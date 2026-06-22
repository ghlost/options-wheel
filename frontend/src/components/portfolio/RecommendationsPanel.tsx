import { useState, Fragment } from 'react';
import { RefreshCw } from 'lucide-react';
import type { Recommendation } from '../../../../shared/types/recommendations.js';
import type { AddTradeRequest } from '../../../../shared/types/portfolio.js';
import { formatCurrency, formatDate, formatPercent } from '../../utils/formatters';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Spinner } from '../ui/Spinner';
import { clsx } from 'clsx';

interface Props {
  recommendations: Recommendation[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onAddTrade: (req: AddTradeRequest) => Promise<unknown>;
}

function yieldColor(y: number) {
  if (y >= 5) return 'text-emerald-400';
  if (y >= 2) return 'text-yellow-400';
  return 'text-slate-400';
}

function popColor(p: number) {
  if (p >= 0.7) return 'text-emerald-400';
  if (p >= 0.5) return 'text-yellow-400';
  return 'text-red-400';
}

export function RecommendationsPanel({ recommendations, loading, error, onRefresh, onAddTrade }: Props) {
  const [addingRec, setAddingRec] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [customBid, setCustomBid] = useState('');
  const [notes, setNotes] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function handleConfirm(rec: Recommendation) {
    setAdding(true);
    setAddError(null);
    const openPrice = parseFloat(customBid) || rec.contract.bid;
    try {
      await onAddTrade({
        contract_symbol: rec.contract.ticker,
        underlying_ticker: rec.ticker,
        contract_type: rec.contract.contractType,
        strike_price: rec.contract.strikePrice,
        expiration_date: rec.contract.expirationDate,
        quantity: qty,
        open_price: openPrice,
        underlying_price_at_open: rec.underlyingPrice,
        notes: notes.trim() || undefined,
      });
      setAddingRec(null);
      setQty(1);
      setCustomBid('');
      setNotes('');
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Failed to add trade');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-700 overflow-hidden">
      <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-200">Recommendations</span>
          {loading && <Spinner className="w-3.5 h-3.5" />}
          {!loading && recommendations.length > 0 && (
            <span className="text-xs text-slate-500">{recommendations.length} found</span>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Re-run
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-400 px-4 py-2">{error}</p>
      )}

      {!loading && recommendations.length === 0 && !error && (
        <p className="text-xs text-slate-500 px-4 py-3 text-center">
          No qualifying options found. Try refreshing or adjusting your watchlist.
        </p>
      )}

      {recommendations.length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 border-b border-slate-700 font-medium">
              <th className="px-3 py-2 text-left">Ticker</th>
              <th className="px-3 py-2 text-center">Type</th>
              <th className="px-3 py-2 text-right">Strike</th>
              <th className="px-3 py-2 text-right">Expiry</th>
              <th className="px-3 py-2 text-right">DTE</th>
              <th className="px-3 py-2 text-right">Mid</th>
              <th className="px-3 py-2 text-right">Yield%</th>
              <th className="px-3 py-2 text-right">PoP</th>
              <th className="px-3 py-2 text-right">Score</th>
              <th className="px-3 py-2 text-right">Underlying</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {recommendations.map(rec => (
              <Fragment key={rec.contract.ticker}>
                <tr className="border-b border-slate-700/50 hover:bg-slate-800/40 transition-colors text-slate-300">
                  <td className="px-3 py-2 font-mono font-semibold text-slate-100">{rec.ticker}</td>
                  <td className="px-3 py-2 text-center">
                    <Badge variant={rec.contract.contractType === 'put' ? 'put' : 'call'}>
                      {rec.contract.contractType === 'put' ? 'PUT' : 'CALL'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{formatCurrency(rec.contract.strikePrice)}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{formatDate(rec.contract.expirationDate)}</td>
                  <td className="px-3 py-2 text-right text-slate-400">{rec.contract.daysToExpiration}d</td>
                  <td className="px-3 py-2 text-right font-mono">{formatCurrency(rec.contract.bid)}</td>
                  <td className={clsx('px-3 py-2 text-right font-semibold', yieldColor(rec.contract.premiumYield))}>
                    {formatPercent(rec.contract.premiumYield)}
                  </td>
                  <td className={clsx('px-3 py-2 text-right font-semibold', popColor(rec.probabilityOfProfit))}>
                    {(rec.probabilityOfProfit * 100).toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-right text-slate-500">{rec.score.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-400">{formatCurrency(rec.underlyingPrice)}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => {
                        setAddingRec(rec.contract.ticker);
                        setQty(1);
                        setCustomBid(rec.contract.bid.toFixed(2));
                        setNotes('');
                        setAddError(null);
                      }}
                      className="text-indigo-400 hover:text-indigo-300 font-bold text-sm leading-none"
                      title="Add as trade"
                    >+</button>
                  </td>
                </tr>

                {addingRec === rec.contract.ticker && (
                  <tr className="bg-slate-700/30 border-b border-indigo-500/30">
                    <td colSpan={11} className="px-3 py-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-slate-400">Qty:</span>
                        <Input
                          type="number" min={1} max={100} value={qty}
                          onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 py-0.5 px-2 text-xs"
                        />
                        <span className="text-slate-400">Bid:</span>
                        <Input
                          type="number" min={0} step={0.01} value={customBid}
                          onChange={e => setCustomBid(e.target.value)}
                          className="w-20 py-0.5 px-2 text-xs"
                        />
                        <span className="text-slate-400">Notes:</span>
                        <Input
                          value={notes} onChange={e => setNotes(e.target.value)}
                          placeholder="optional" className="w-36 py-0.5 px-2 text-xs"
                        />
                        <span className="text-slate-500 text-xs">
                          Premium: {formatCurrency((parseFloat(customBid) || rec.contract.bid) * 100 * qty)}
                          {rec.contract.contractType === 'put' && (
                            <>{' · '}Cash reserved: {formatCurrency(rec.contract.strikePrice * 100 * qty)}</>
                          )}
                        </span>
                        <Button size="sm" onClick={() => handleConfirm(rec)} disabled={adding}>
                          {adding ? '...' : 'Confirm'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setAddingRec(null)}>Cancel</Button>
                        {addError && <span className="text-xs text-red-400">{addError}</span>}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
