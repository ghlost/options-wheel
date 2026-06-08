import { useState, Fragment } from 'react';
import { ChevronRight } from 'lucide-react';
import type { OptionContract } from '../../types/options';
import type { AddTradeRequest } from '../../types/portfolio';
import { formatCurrency, formatDate, formatNumber, formatPercent, formatVolumeToOI } from '../../utils/formatters';
import { probabilityOfProfit } from '../../../../shared/utils/blackScholes.js';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { clsx } from 'clsx';

interface Props {
  contracts: OptionContract[];
  underlyingPrice: number;
  underlyingTicker?: string;
  onAddTrade?: (req: AddTradeRequest) => Promise<void>;
}

function groupByStrike(contracts: OptionContract[]): Map<number, OptionContract[]> {
  const map = new Map<number, OptionContract[]>();
  for (const c of contracts) {
    if (!map.has(c.strikePrice)) map.set(c.strikePrice, []);
    map.get(c.strikePrice)!.push(c);
  }
  for (const group of map.values()) {
    group.sort((a, b) => a.daysToExpiration - b.daysToExpiration);
  }
  return map;
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

function PopCell({ contract, underlyingPrice }: { contract: OptionContract; underlyingPrice: number }) {
  const pop = probabilityOfProfit(
    underlyingPrice,
    contract.strikePrice,
    contract.daysToExpiration,
    contract.impliedVolatility,
    contract.contractType,
  );
  if (pop === 0) return <span className="text-slate-600">—</span>;
  return (
    <span className={clsx('font-semibold', popColor(pop))}>
      {(pop * 100).toFixed(1)}%
    </span>
  );
}

function YieldCell({ contract, underlyingPrice }: { contract: OptionContract; underlyingPrice: number }) {
  const divisor = contract.contractType === 'put' ? contract.strikePrice : underlyingPrice;
  const divisorLabel = contract.contractType === 'put' ? 'strike' : 'price';
  const tooltip = `${formatCurrency(contract.bid)} bid ÷ ${formatCurrency(divisor)} ${divisorLabel} = ${formatPercent(contract.premiumYield)}`;
  return (
    <span className="relative group cursor-default">
      <span className={clsx('font-semibold', yieldColor(contract.premiumYield))}>
        {formatPercent(contract.premiumYield)}
      </span>
      <span className="absolute bottom-full right-0 mb-1.5 bg-slate-900 border border-slate-600 text-slate-300 rounded px-2.5 py-1.5 invisible group-hover:visible z-20 whitespace-nowrap pointer-events-none text-xs font-normal shadow-lg">
        {tooltip}
      </span>
    </span>
  );
}

export function OptionsTable({ contracts, underlyingPrice, underlyingTicker, onAddTrade }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showItm, setShowItm] = useState(false);
  const [addingContract, setAddingContract] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [customBid, setCustomBid] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  if (contracts.length === 0) {
    return <p className="text-sm text-slate-500 py-4 text-center">No contracts found in the 28–60 day window.</p>;
  }

  const contractType = contracts[0].contractType;
  const grouped = groupByStrike(contracts);
  const allStrikes = [...grouped.keys()].sort((a, b) => a - b);

  const isItm = (strike: number) =>
    contractType === 'put' ? strike >= underlyingPrice : strike <= underlyingPrice;

  const itmStrikes = allStrikes.filter(isItm);
  const strikes = showItm ? allStrikes : allStrikes.filter(s => !isItm(s));
  const detailColSpan = onAddTrade ? 10 : 9;

  async function handleConfirmAdd(contract: OptionContract) {
    if (!onAddTrade || !underlyingTicker) return;
    setAdding(true);
    setAddError(null);
    const openPrice = parseFloat(customBid) || contract.bid;
    try {
      await onAddTrade({
        contract_symbol: contract.ticker,
        underlying_ticker: underlyingTicker,
        contract_type: contract.contractType,
        strike_price: contract.strikePrice,
        expiration_date: contract.expirationDate,
        quantity: qty,
        open_price: openPrice,
        underlying_price_at_open: underlyingPrice,
        notes: notes.trim() || undefined,
      });
      setAddingContract(null);
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
    <div className="overflow-x-auto">
      <table className="w-full text-xs">

        <thead>
          <tr className="border-b border-slate-700 text-slate-400 font-medium">
            <th className="px-2 py-2 text-left">Strike</th>
            <th className="px-2 py-2 text-right">Expiries</th>
            <th className="px-2 py-2 text-right">DTE</th>
            <th className="px-2 py-2 text-right">Best Mid</th>
            <th className="px-2 py-2 text-right">Best Yield%</th>
          </tr>
        </thead>
        <tbody>
          {strikes.map(strike => {
            const group = grouped.get(strike)!;
            const itm = isItm(strike);
            const best = group.reduce((b, c) => c.premiumYield > b.premiumYield ? c : b, group[0]);
            const isOpen = expanded === strike;

            return (
              <Fragment key={strike}>
                <tr
                  className={clsx(
                    'border-b border-slate-700/50 cursor-pointer hover:bg-slate-700/40 transition-colors select-none',
                    itm ? 'text-slate-300' : 'text-slate-500',
                    isOpen && 'bg-slate-700/20'
                  )}
                  onClick={() => setExpanded(isOpen ? null : strike)}
                >
                  <td className="px-2 py-2 font-mono text-left">
                    <span className="flex items-center gap-1.5">
                      <ChevronRight size={12} className={clsx('transition-transform shrink-0 text-slate-500', isOpen && 'rotate-90')} />
                      {formatCurrency(strike)}
                      {itm && <span className="text-slate-600 font-sans">ITM</span>}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right">{group.length}</td>
                  <td className="px-2 py-2 text-right">{best.daysToExpiration}d</td>
                  <td className="px-2 py-2 text-right font-mono">{formatCurrency(best.bid)}</td>
                  <td className="px-2 py-2 text-right">
                    <YieldCell contract={best} underlyingPrice={underlyingPrice} />
                  </td>
                </tr>

                {isOpen && (
                  <tr className="border-b border-slate-700/50">
                    <td colSpan={5} className="px-0 py-0">
                      <div className="mx-2 mb-2 mt-0.5 rounded bg-slate-800/60 border border-slate-700/60">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-slate-500 border-b border-slate-700/50">
                              <th className="px-3 py-2 text-left font-medium">Expiry</th>
                              <th className="px-3 py-2 text-right font-medium">DTE</th>
                              <th className="px-3 py-2 text-right font-medium">Mid</th>
                              <th className="px-3 py-2 text-right font-medium">Ask</th>
                              <th className="px-3 py-2 text-right font-medium">Vol</th>
                              <th className="px-3 py-2 text-right font-medium">OI</th>
                              <th className="px-3 py-2 text-right font-medium">V/OI</th>
                              <th className="px-3 py-2 text-right font-medium">Yield%</th>
                              <th className="px-3 py-2 text-right font-medium">PoP</th>
                              {onAddTrade && <th className="px-3 py-2" />}
                            </tr>
                          </thead>
                          <tbody>
                            {group.map(c => (
                              <Fragment key={c.ticker}>
                                <tr className="border-b border-slate-700/30 last:border-0 text-slate-300">
                                  <td className="px-3 py-1.5 text-left">{formatDate(c.expirationDate)}</td>
                                  <td className="px-3 py-1.5 text-right text-slate-400">{c.daysToExpiration}d</td>
                                  <td className="px-3 py-1.5 text-right font-mono">{formatCurrency(c.bid)}</td>
                                  <td className="px-3 py-1.5 text-right font-mono text-slate-500">{formatCurrency(c.ask)}</td>
                                  <td className="px-3 py-1.5 text-right">{formatNumber(c.volume)}</td>
                                  <td className="px-3 py-1.5 text-right">{formatNumber(c.openInterest)}</td>
                                  <td className="px-3 py-1.5 text-right">{formatVolumeToOI(c.volumeToOI)}</td>
                                  <td className="px-3 py-1.5 text-right">
                                    <YieldCell contract={c} underlyingPrice={underlyingPrice} />
                                  </td>
                                  <td className="px-3 py-1.5 text-right">
                                    <PopCell contract={c} underlyingPrice={underlyingPrice} />
                                  </td>
                                  {onAddTrade && (
                                    <td className="px-3 py-1.5 text-right">
                                      <button
                                        onClick={() => { setAddingContract(c.ticker); setQty(1); setCustomBid(c.bid.toFixed(2)); setNotes(''); setAddError(null); }}
                                        className="text-indigo-400 hover:text-indigo-300 font-bold text-sm leading-none"
                                        title="Add as trade"
                                      >+</button>
                                    </td>
                                  )}
                                </tr>

                                {addingContract === c.ticker && (
                                  <tr className="bg-slate-700/30 border-b border-indigo-500/30">
                                    <td colSpan={detailColSpan} className="px-3 py-2">
                                      <div className="flex items-center gap-3 flex-wrap">
                                        <span className="text-slate-400">Qty:</span>
                                        <Input
                                          type="number"
                                          min={1}
                                          max={100}
                                          value={qty}
                                          onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                                          className="w-16 py-0.5 px-2 text-xs"
                                        />
                                        <span className="text-slate-400">Bid:</span>
                                        <Input
                                          type="number"
                                          min={0}
                                          step={0.01}
                                          value={customBid}
                                          onChange={e => setCustomBid(e.target.value)}
                                          className="w-20 py-0.5 px-2 text-xs"
                                        />
                                        <span className="text-slate-400">Notes:</span>
                                        <Input
                                          value={notes}
                                          onChange={e => setNotes(e.target.value)}
                                          placeholder="optional"
                                          className="w-36 py-0.5 px-2 text-xs"
                                        />
                                        <span className="text-slate-500 text-xs">
                                          Premium: {formatCurrency((parseFloat(customBid) || c.bid) * 100 * qty)}
                                          {c.contractType === 'put' && (
                                            <>{' · '}Cash reserved: {formatCurrency(c.strikePrice * 100 * qty)}</>
                                          )}
                                        </span>
                                        <Button size="sm" onClick={() => handleConfirmAdd(c)} disabled={adding}>
                                          {adding ? '...' : 'Confirm'}
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => setAddingContract(null)}>
                                          Cancel
                                        </Button>
                                        {addError && <span className="text-xs text-red-400">{addError}</span>}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {itmStrikes.length > 0 && (
        <button
          onClick={() => setShowItm(v => !v)}
          className="w-full mt-1 py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors text-center"
        >
          {showItm
            ? `Hide ${itmStrikes.length} ITM strike${itmStrikes.length !== 1 ? 's' : ''}`
            : `Show ${itmStrikes.length} ITM strike${itmStrikes.length !== 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  );
}
