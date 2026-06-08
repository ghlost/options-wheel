import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { TradeWithSnapshots, CloseTradeRequest } from '../../types/portfolio';
import { formatCurrency, formatDate, formatPercent, formatPnl } from '../../utils/formatters';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { PriceSparkline } from './PriceSparkline';
import { CloseTradePanel } from './CloseTradePanel';
import { clsx } from 'clsx';

interface Props {
  trade: TradeWithSnapshots;
  onClose: (id: number, req: CloseTradeRequest) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

function pnlColor(v: number | null) {
  if (v === null) return 'text-slate-400';
  return v >= 0 ? 'text-emerald-400' : 'text-red-400';
}

function dteColor(dte: number) {
  if (dte === 0) return 'text-red-400';
  if (dte <= 7) return 'text-amber-400';
  return 'text-slate-400';
}

export function TradeRow({ trade, onClose, onDelete }: Props) {
  const [closing, setClosing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOpen = trade.status === 'open';
  const realizedPnl = !isOpen
    ? (trade.open_price - (trade.close_price ?? 0)) * 100 * trade.quantity
    : null;

  async function handleDelete() {
    setDeleting(true);
    try { await onDelete(trade.id); } catch { setDeleting(false); }
  }

  return (
    <>
      <tr className="border-b border-slate-700/50 hover:bg-slate-800/40 transition-colors text-xs">
        {/* Ticker + type */}
        <td className="px-3 py-2.5 text-left">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-semibold text-slate-100">{trade.underlying_ticker}</span>
            <Badge variant={trade.contract_type === 'put' ? 'put' : 'call'}>
              {trade.contract_type === 'put' ? 'P' : 'C'}
            </Badge>
          </div>
          {trade.notes && <p className="text-slate-500 text-xs mt-0.5 truncate max-w-24">{trade.notes}</p>}
        </td>
        {/* Strike */}
        <td className="px-3 py-2.5 text-right font-mono">{formatCurrency(trade.strike_price)}</td>
        {/* Expiry */}
        <td className="px-3 py-2.5 text-right whitespace-nowrap">{formatDate(trade.expiration_date)}</td>
        {/* Qty */}
        <td className="px-3 py-2.5 text-right text-slate-400">{trade.quantity}</td>
        {/* DTE */}
        <td className={clsx('px-3 py-2.5 text-right', isOpen ? dteColor(trade.dte_remaining) : 'text-slate-500')}>
          {isOpen ? `${trade.dte_remaining}d` : '—'}
        </td>
        {/* Days held */}
        <td className="px-3 py-2.5 text-right text-slate-400">{trade.days_held}d</td>
        {/* Premium received */}
        <td className="px-3 py-2.5 text-right font-mono text-emerald-400">
          {formatCurrency(trade.premium_received)}
        </td>
        {/* Cash reserved */}
        <td className="px-3 py-2.5 text-right font-mono text-slate-400">
          {isOpen && trade.cash_reserved > 0 ? formatCurrency(trade.cash_reserved) : '—'}
        </td>
        {/* Current mid / sparkline */}
        <td className="px-3 py-2.5 text-right">
          <div className="flex items-center justify-end gap-2">
            <PriceSparkline snapshots={trade.snapshots} />
            <span className="font-mono text-slate-300">
              {trade.latest_bid != null && trade.latest_ask != null
                ? formatCurrency((trade.latest_bid + trade.latest_ask) / 2)
                : trade.latest_bid != null ? formatCurrency(trade.latest_bid) : '—'}
            </span>
          </div>
        </td>
        {/* Underlying price */}
        <td className="px-3 py-2.5 text-right font-mono text-slate-400">
          {trade.latest_underlying_price != null ? formatCurrency(trade.latest_underlying_price) : '—'}
        </td>
        {/* Open interest */}
        <td className="px-3 py-2.5 text-right text-slate-400">
          {trade.latest_open_interest != null ? trade.latest_open_interest.toLocaleString() : '—'}
        </td>
        {/* P&L */}
        <td className={clsx('px-3 py-2.5 text-right font-mono font-semibold',
          isOpen ? pnlColor(trade.unrealized_pnl) : pnlColor(realizedPnl))}>
          {isOpen ? formatPnl(trade.unrealized_pnl) : formatPnl(realizedPnl)}
        </td>
        {/* P&L% */}
        <td className={clsx('px-3 py-2.5 text-right',
          isOpen ? pnlColor(trade.unrealized_pnl_pct) : pnlColor(realizedPnl))}>
          {isOpen
            ? (trade.unrealized_pnl_pct != null ? formatPercent(trade.unrealized_pnl_pct) : '—')
            : (realizedPnl != null && trade.premium_received > 0
              ? formatPercent((realizedPnl / trade.premium_received) * 100) : '—')}
        </td>
        {/* Ann. return */}
        <td className={clsx('px-3 py-2.5 text-right', pnlColor(trade.annualized_return))}>
          {isOpen && trade.annualized_return != null ? formatPercent(trade.annualized_return) : '—'}
        </td>
        {/* Actions */}
        <td className="px-3 py-2.5 text-right">
          <div className="flex items-center justify-end gap-1">
            {isOpen && (
              <Button size="sm" variant="ghost" onClick={() => setClosing(c => !c)}
                className="text-amber-400 hover:text-amber-300 text-xs px-2">
                Close
              </Button>
            )}
            <Button size="sm" variant="danger" onClick={handleDelete} disabled={deleting} className="p-1">
              <Trash2 size={12} />
            </Button>
          </div>
        </td>
      </tr>

      {closing && (
        <tr className="border-b border-slate-700/50">
          <td colSpan={15} className="px-3 py-2">
            <CloseTradePanel
              trade={trade}
              onClose={async (id, req) => { await onClose(id, req); setClosing(false); }}
              onCancel={() => setClosing(false)}
            />
          </td>
        </tr>
      )}
    </>
  );
}
