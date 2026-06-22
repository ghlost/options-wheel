import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { useWatchlist } from './hooks/useWatchlist';
import { usePortfolio } from './hooks/usePortfolio';
import { useRecommendations } from './hooks/useRecommendations';
import { WatchlistPanel } from './components/watchlist/WatchlistPanel';
import { Dashboard } from './components/dashboard/Dashboard';
import { PortfolioDashboard } from './components/portfolio/PortfolioDashboard';
import { Spinner } from './components/ui/Spinner';

type View = 'screener' | 'portfolio';

export default function App() {
  const [view, setView] = useState<View>(() =>
    window.location.pathname === '/portfolio' ? 'portfolio' : 'screener'
  );
  const [screenerKey, setScreenerKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefreshAll() {
    setRefreshing(true);
    try {
      await fetch('/api/cache', { method: 'DELETE' });
    } finally {
      setRefreshing(false);
      setScreenerKey(k => k + 1);
    }
  }

  useEffect(() => {
    const onPop = () =>
      setView(window.location.pathname === '/portfolio' ? 'portfolio' : 'screener');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function navigate(v: View) {
    const path = v === 'portfolio' ? '/portfolio' : '/';
    history.pushState(null, '', path);
    setView(v);
  }
  const { stocks, loading, error, add, remove, updateShares, updateAvgCost } = useWatchlist();
  const portfolio = usePortfolio();
  const recs = useRecommendations(stocks);

  function handleSharesChange(ticker: string, shares: number) {
    updateShares(ticker, shares);
    recs.refresh();
  }

  // Custom order persisted to localStorage; synced when watchlist changes
  const [tickerOrder, setTickerOrder] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('wheel-ticker-order') ?? '[]'); } catch { return []; }
  });

  useEffect(() => {
    if (stocks.length === 0) return;
    setTickerOrder(prev => {
      const existing = prev.filter(t => stocks.some(s => s.ticker === t));
      const newTickers = stocks.map(s => s.ticker).filter(t => !existing.includes(t));
      return [...existing, ...newTickers];
    });
  }, [stocks]);

  function handleReorder(newOrder: string[]) {
    setTickerOrder(newOrder);
    localStorage.setItem('wheel-ticker-order', JSON.stringify(newOrder));
  }

  const openCount = portfolio.trades.filter(t => t.status === 'open').length;

  return (
    <div className="h-screen bg-slate-900 text-slate-100 flex flex-col overflow-hidden">
      <header className="border-b border-slate-700 px-6 py-3 flex items-center gap-3 flex-shrink-0">
        <span className="text-lg font-bold text-indigo-400">options-wheel</span>
        <span className="text-slate-500 text-sm hidden sm:block">Options Wheel Screener</span>
        <nav className="ml-4 flex gap-1">
          <button
            onClick={() => navigate('screener')}
            className={clsx(
              'px-3 py-1.5 rounded text-sm font-medium transition-colors',
              view === 'screener' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
            )}
          >
            Screener
          </button>
          <button
            onClick={() => navigate('portfolio')}
            className={clsx(
              'px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5',
              view === 'portfolio' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
            )}
          >
            Portfolio
            {openCount > 0 && (
              <span className="bg-indigo-600 text-white text-xs rounded px-1.5 py-0.5 leading-none">
                {openCount}
              </span>
            )}
          </button>
        </nav>
        {view === 'screener' && (
          <button
            onClick={handleRefreshAll}
            disabled={refreshing}
            className="ml-auto text-xs text-slate-400 hover:text-slate-200 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            <svg
              className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? 'Refreshing…' : 'Refresh All'}
          </button>
        )}
      </header>

      <div className="flex flex-1 gap-0 overflow-hidden">
        {view === 'screener' && (
          <div className="w-56 flex-shrink-0 border-r border-slate-700 p-4 overflow-y-auto overflow-x-hidden">
            {loading ? (
              <div className="flex justify-center pt-8"><Spinner className="w-5 h-5" /></div>
            ) : error ? (
              <p className="text-xs text-red-400">{error}</p>
            ) : (
              <WatchlistPanel
                stocks={stocks}
                tickerOrder={tickerOrder}
                onReorder={handleReorder}
                activeTicker={null}
                onSelect={ticker => {
                  document.getElementById(`stock-${ticker.toLowerCase()}`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                onAdd={add}
                onRemove={remove}
                onSharesChange={handleSharesChange}
                onAvgCostChange={updateAvgCost}
              />
            )}
          </div>
        )}

        <main className="flex-1 p-6 overflow-y-auto">
          {view === 'screener' ? (
            <Dashboard key={screenerKey} stocks={stocks} tickerOrder={tickerOrder} onAddTrade={portfolio.addTrade} />
          ) : (
            <PortfolioDashboard
              trades={portfolio.trades}
              loading={portfolio.loading}
              error={portfolio.error}
              onClose={portfolio.closeTrade}
              onDelete={portfolio.deleteTrade}
              onRefresh={portfolio.refresh}
              recommendations={recs.recommendations}
              recsLoading={recs.loading}
              recsError={recs.error}
              onRecsRefresh={recs.refresh}
              onAddTrade={portfolio.addTrade}
            />
          )}
        </main>
      </div>
    </div>
  );
}
