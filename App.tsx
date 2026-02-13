import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Watchlist from './components/Watchlist';
import NewsFeed from './components/NewsFeed';
import AssetDetails from './components/AssetDetails';
import Goals from './components/Goals';
import LiveVoiceMode from './components/LiveVoiceMode';
import Settings from './components/Settings';
import Auth from './components/Auth';
import Advisor from './components/Advisor';
import { ViewState, Asset, WatchlistItem, Transaction, AssetType, PriceAlert, RebalancingSuggestion, User } from './types';
import { api } from './services/api';
import * as chartDataService from './services/chartDataService';
import { isMarketOpen } from './services/apiConfig';

// ── Route mapping ──────────────────────────────────────────────
const VIEW_TO_PATH: Record<ViewState, string> = {
  [ViewState.Dashboard]: '/dashboard',
  [ViewState.Watchlist]: '/watchlist',
  [ViewState.Advisor]: '/advisor',
  [ViewState.News]: '/news',
  [ViewState.Goals]: '/goals',
  [ViewState.Settings]: '/settings',
};

const PATH_TO_VIEW: Record<string, ViewState> = Object.fromEntries(
  Object.entries(VIEW_TO_PATH).map(([view, path]) => [path, view as ViewState])
) as Record<string, ViewState>;

const getViewFromPath = (): ViewState => {
  const pathname = window.location.pathname || '/dashboard';
  return PATH_TO_VIEW[pathname] || ViewState.Dashboard;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [appLoading, setAppLoading] = useState(false);

  const [currentView, setCurrentView] = useState<ViewState>(getViewFromPath);

  // Navigate: update URL + state together using History API
  const navigate = useCallback((view: ViewState) => {
    const path = VIEW_TO_PATH[view];
    window.history.pushState({}, '', path);
    setCurrentView(view);
  }, []);

  // Sync state when browser back/forward buttons are used
  useEffect(() => {
    const onPopState = () => setCurrentView(getViewFromPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Enforce clean URL when not logged in
  useEffect(() => {
    if (!user && window.location.pathname !== '/') {
      window.history.replaceState({}, '', '/');
    }
  }, [user]);

  const [portfolio, setPortfolio] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [contextAsset, setContextAsset] = useState<Asset | null>(null);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
      // Default to dark mode if no preference saved
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const livePricesRef = useRef<Record<string, number>>({});

  // Keep ref in sync with state
  useEffect(() => {
    livePricesRef.current = livePrices;
  }, [livePrices]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const loadUserData = async () => {
    setAppLoading(true);
    try {
      // Only load Dashboard essentials on login
      const [p, t] = await Promise.all([
        api.portfolio.get(),
        api.transactions.getAll()
      ]);
      setPortfolio(p);
      setTransactions(t);
    } catch (e) {
      console.error("Data Load Error:", e);
      setPortfolio({ totalValue: 0, change24hValue: 0, change24hPercent: 0, assets: [] });
    } finally {
      setAppLoading(false);
    }
  };

  // One-time instruments sync on app startup
  useEffect(() => {
    const synced = localStorage.getItem('instruments_synced');
    if (!synced) {
      console.log('[App] Performing one-time instruments sync...');
      chartDataService.syncInstruments()
        .then((result) => {
          console.log('[App] Instruments synced:', result);
          localStorage.setItem('instruments_synced', 'true');
        })
        .catch((e) => {
          console.error('[App] Instruments sync failed:', e);
          // Don't set the flag so it retries on next load
        });
    }
  }, []);

  // Live price simulation - ONLY during market hours
  useEffect(() => {
    if (!user || !portfolio || appLoading) return;

    // Check if market is open before starting interval
    if (!isMarketOpen()) {
      console.log('[App] Market is closed, no live price updates');
      return;
    }

    console.log('[App] Market is open, starting live price simulation');
    const interval = setInterval(() => {
      if (!portfolio.assets) return;

      const allSymbols = [
        ...portfolio.assets.map((a: any) => ({ id: a.id, symbol: a.symbol, price: a.price }))
      ];
      if (allSymbols.length === 0) return;
      const target = allSymbols[Math.floor(Math.random() * allSymbols.length)];
      const drift = (Math.random() - 0.48) * 0.003;
      const currentPrice = livePricesRef.current[target.id] || target.price;
      const newPrice = currentPrice * (1 + drift);
      setLivePrices(prev => ({ ...prev, [target.id]: newPrice }));
    }, 2500); // Update every 2.5 seconds during market hours

    return () => clearInterval(interval);
  }, [user, portfolio, appLoading]);

  const handleLogin = (responseUser: User) => {
    setUser(responseUser);
    loadUserData();
    if (window.location.pathname === '/' || window.location.pathname === '') {
      navigate(ViewState.Dashboard);
    }
  };

  const handleLogout = async () => {
    await api.auth.logout();
    setUser(null);
    setPortfolio(null);
    navigate(ViewState.Dashboard);
  };

  const handleBuy = async (asset: Asset | WatchlistItem, quantity: number = 1) => {
    await api.portfolio.trade({
      symbol: asset.symbol,
      action: 'BUY',
      quantity,
      price: livePrices[asset.id] || asset.price
    });
    await loadUserData();
  };

  const handleSell = async (asset: Asset, quantity: number = 1) => {
    await api.portfolio.trade({
      symbol: asset.symbol,
      action: 'SELL',
      quantity,
      price: livePrices[asset.id] || asset.price
    });
    await loadUserData();
  };

  const handleAddAsset = async (assetData: Partial<Asset>) => {
    await api.portfolio.addAsset(assetData);
    setNotifications(prev => [`Added ${assetData.symbol} to portfolio`, ...prev]);
    loadUserData();
  };

  const handleEditTransaction = async (updatedTx: Transaction) => {
    await api.transactions.update(updatedTx);
    const updated = await api.transactions.getAll();
    setTransactions(updated);
  };

  // Normalized handler that accepts Asset, WatchlistItem, or MarketStock
  const handleOpenDetails = (item: any) => {
    // If it's a raw market stock, it might not have an ID or ID might be missing from livePrices
    const id = item.id || `temp-${item.symbol}`;
    const price = livePrices[id] || livePrices[item.id] || item.price || 0;
    const change = item.change24h || item.changePercent || 0;

    const assetView: Asset = {
      id: id,
      symbol: item.symbol,
      name: item.name,
      price: price,
      change24h: change,
      quantity: item.quantity || 0,
      value: item.value || (price * (item.quantity || 0)),
      type: item.type || AssetType.Stock
    };
    setSelectedAsset(assetView);

    // Store context for Chat, preserving instrumentKey if available in the input item
    setContextAsset({
      ...assetView,
      ...((item.instrumentKey) ? { instrumentKey: item.instrumentKey } : {})
    } as Asset);
  };

  const handleSetAlert = (symbol: string, price: number, condition: 'above' | 'below') => {
    setAlerts(prev => [...prev, {
      id: Date.now().toString(),
      symbol,
      targetPrice: price,
      condition,
      isActive: true
    }]);
    setNotifications(prev => [`Alert set for ${symbol} ${condition} $${price}`, ...prev]);
  };

  const handleExecuteRebalance = (suggestions: RebalancingSuggestion[]) => {
    setNotifications(prev => ["Portfolio rebalancing complete.", ...prev]);
  };

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  const activeDetailedAsset = selectedAsset ? {
    ...selectedAsset,
    // Ensure we keep using live price if available for the modal updates
    price: livePrices[selectedAsset.id] || selectedAsset.price,
    value: (livePrices[selectedAsset.id] || selectedAsset.price) * selectedAsset.quantity
  } : null;

  return (
    <Layout
      currentView={currentView}
      setView={navigate}
      notifications={notifications}
      clearNotifications={() => setNotifications([])}
      onLogout={handleLogout}
      theme={theme}
      toggleTheme={toggleTheme}
    >
      <div className="pb-20 md:pb-0">
        {renderView()}
      </div>

      {/* Global Asset Details Modal */}
      <AssetDetails
        asset={activeDetailedAsset}
        isOpen={!!selectedAsset}
        onClose={() => setSelectedAsset(null)}
        onBuy={(a, qty) => handleBuy(a, qty)}
        onSell={(a, qty) => handleSell(a, qty)}
        onSetAlert={handleSetAlert}
        cashBalance={portfolio ? portfolio.assets.find((a: Asset) => a.symbol === 'USD')?.value || 0 : 0}
        portfolio={portfolio}
      />

      {/* Live Voice Mode Overlay */}
      {isLiveVoiceOpen && portfolio && (
        <LiveVoiceMode
          onClose={() => setIsLiveVoiceOpen(false)}
          portfolio={portfolio}
        />
      )}
    </Layout>
  );

  function renderView() {
    switch (currentView) {
      case ViewState.Dashboard:
        return (
          <Dashboard
            portfolio={portfolio}
            isLoading={appLoading}
            onViewAsset={handleOpenDetails}
          />
        );
      case ViewState.Watchlist:
        return <Watchlist onViewDetails={handleOpenDetails} />;
      case ViewState.Advisor:
        return (
          <Advisor
            portfolio={portfolio}
            isLoading={appLoading}
            onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
            onViewAsset={handleOpenDetails}
            userId={user!.id}
            contextAsset={contextAsset}
          />
        );
      case ViewState.News:
        return <NewsFeed isLoading={appLoading} />;
      case ViewState.Goals:
        return (
          <Goals
            totalPortfolioValue={portfolio ? portfolio.totalValue : 0}
            userId={user?.id}
          />
        );
      case ViewState.Settings:
        return (
          <Settings
            user={user}
            theme={theme}
            toggleTheme={toggleTheme}
            onLogout={handleLogout}
          />
        );
      default:
        return <Dashboard portfolio={portfolio} isLoading={appLoading} />;
    }
  }
};

export default App;
