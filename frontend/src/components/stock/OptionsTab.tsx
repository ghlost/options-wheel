import { useState } from 'react';
import type { OptionsChain, OptionContract } from '../../types/options';
import type { AddTradeRequest } from '../../types/portfolio';
import { OptionsTable } from './OptionsTable';
import { Badge } from '../ui/Badge';

interface Props {
  chain: OptionsChain;
  onAddTrade?: (req: AddTradeRequest) => Promise<void>;
}

type Tab = 'puts' | 'calls';

const STRIKE_OPTIONS = [
  { label: '±8', value: 8 },
  { label: '±16', value: 16 },
  { label: '±24', value: 24 },
  { label: 'All', value: 0 },
];

function filterByStrikeRange(contracts: OptionContract[], range: number, currentPrice: number): OptionContract[] {
  if (range === 0) return contracts;
  const strikes = [...new Set(contracts.map(c => c.strikePrice))].sort((a, b) => a - b);
  const atmIdx = strikes.reduce((best, s, i) =>
    Math.abs(s - currentPrice) < Math.abs(strikes[best] - currentPrice) ? i : best, 0);
  const allowed = new Set(strikes.slice(Math.max(0, atmIdx - range), atmIdx + range + 1));
  return contracts.filter(c => allowed.has(c.strikePrice));
}

export function OptionsTab({ chain, onAddTrade }: Props) {
  const [tab, setTab] = useState<Tab>('puts');
  const [strikeRange, setStrikeRange] = useState(8);

  const raw = tab === 'puts' ? chain.puts : chain.calls;
  const contracts = filterByStrikeRange(raw, strikeRange, chain.underlyingPrice);
  const strikeCount = new Set(contracts.map(c => c.strikePrice)).size;

  return (
    <div>
      <div className="flex items-center gap-1 mb-3 flex-wrap">
        <button
          onClick={() => setTab('puts')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
            tab === 'puts' ? 'bg-rose-900/40 text-rose-300' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Badge variant="put">Puts</Badge>
          <span className="text-slate-500">{new Set(chain.puts.map(c => c.strikePrice)).size} strikes</span>
        </button>
        <button
          onClick={() => setTab('calls')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
            tab === 'calls' ? 'bg-emerald-900/40 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Badge variant="call">Calls</Badge>
          <span className="text-slate-500">{new Set(chain.calls.map(c => c.strikePrice)).size} strikes</span>
        </button>

        <select
          value={strikeRange}
          onChange={e => setStrikeRange(Number(e.target.value))}
          className="ml-1 bg-slate-800 border border-slate-600 text-slate-300 text-xs rounded px-2 py-1 cursor-pointer hover:border-slate-500 focus:outline-none focus:border-indigo-500"
        >
          {STRIKE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="text-xs text-slate-600">{strikeCount} shown</span>

        <span className="ml-auto text-xs text-slate-500 self-center">Data delayed · 14–60 DTE</span>
      </div>
      <OptionsTable
        contracts={contracts}
        underlyingPrice={chain.underlyingPrice}
        underlyingTicker={chain.ticker}
        onAddTrade={onAddTrade}
      />
    </div>
  );
}
