import type { TradeWithSnapshots } from '../../types/portfolio';
import { formatCurrency, formatPnl } from '../../utils/formatters';
import { clsx } from 'clsx';

interface Props {
  trades: TradeWithSnapshots[];
}

interface Stat {
  label: string;
  value: string;
  color?: string;
}

export function PortfolioSummaryBar({ trades }: Props) {
  const open = trades.filter(t => t.status === 'open');
  const closed = trades.filter(t => t.status === 'closed');

  const cashReserved = open.reduce((s, t) => s + t.cash_reserved, 0);
  const premiumReceived = open.reduce((s, t) => s + t.premium_received, 0);

  const allHavePnl = open.length > 0 && open.every(t => t.unrealized_pnl !== null);
  const unrealizedPnl = allHavePnl
    ? open.reduce((s, t) => s + (t.unrealized_pnl ?? 0), 0)
    : null;

  const realizedPnl = closed.reduce((s, t) => {
    const realized = (t.open_price - (t.close_price ?? t.open_price)) * 100 * t.quantity;
    return s + realized;
  }, 0);

  const stats: Stat[] = [
    { label: 'Open trades', value: `${open.length}` },
    { label: 'Cash reserved', value: formatCurrency(cashReserved) },
    { label: 'Premium rec\'d', value: formatCurrency(premiumReceived), color: 'text-emerald-400' },
    {
      label: 'Unrealized P&L',
      value: formatPnl(unrealizedPnl),
      color: unrealizedPnl === null ? undefined : unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400',
    },
    {
      label: 'Realized P&L',
      value: closed.length > 0 ? formatPnl(realizedPnl) : '—',
      color: realizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400',
    },
    { label: 'Closed', value: `${closed.length}` },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-px bg-slate-700 rounded-xl overflow-hidden border border-slate-700">
      {stats.map(s => (
        <div key={s.label} className="bg-slate-800 px-4 py-3">
          <p className="text-xs text-slate-500 mb-0.5">{s.label}</p>
          <p className={clsx('text-sm font-semibold font-mono', s.color ?? 'text-slate-100')}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}
