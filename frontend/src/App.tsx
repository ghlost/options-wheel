import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { useWatchlist } from './hooks/useWatchlist';
import { usePortfolio } from './hooks/usePortfolio';
import { WatchlistPanel } from './components/watchlist/WatchlistPanel';
import { Dashboard } from './components/dashboard/Dashboard';
import { PortfolioDashboard } from './components/portfolio/PortfolioDashboard';
import { Spinner } from './components/ui/Spinner';

type View = 'screener' | 'portfolio';

export default function App() {
  const [view, setView] = useState<View>(() =>
    window.location.pathname === '/portfolio' ? 'portfolio' : 'screener'
  );

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
  const { stocks, loading, error, add, remove } = useWatchlist();
  const portfolio = usePortfolio();

  const openCount = portfolio.trades.filter(t => t.status === 'open').length;

  return (
    <div className="h-screen bg-slate-900 text-slate-100 flex flex-col overflow-hidden">
      <header className="border-b border-slate-700 px-6 py-3 flex items-center gap-3">
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
                activeTicker={null}
                onSelect={ticker => {
                  document.getElementById(`stock-${ticker.toLowerCase()}`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                onAdd={add}
                onRemove={remove}
              />
            )}
          </div>
        )}

        <main className="flex-1 p-6 overflow-y-auto">
          {view === 'screener' ? (
            <Dashboard stocks={stocks} onAddTrade={portfolio.addTrade} />
          ) : (
            <PortfolioDashboard
              trades={portfolio.trades}
              loading={portfolio.loading}
              error={portfolio.error}
              onClose={portfolio.closeTrade}
              onDelete={portfolio.deleteTrade}
              onRefresh={portfolio.refresh}
            />
          )}
        </main>
      </div>
    </div>
  );
}
