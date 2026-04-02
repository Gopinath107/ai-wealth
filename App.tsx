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
import AuthCallback from './components/AuthCallback';
import Advisor from './components/Advisor';
import { ViewState, Asset, WatchlistItem, Transaction, AssetType, PriceAlert, RebalancingSuggestion, User } from './types';
import { api } from './services/api';
import * as chartDataService from './services/chartDataService';
import { isMarketOpen } from './services/apiConfig';
import { supabase } from './services/supabaseClient';

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
  // Track OAuth-in-progress using state (not hash check, which doesn't re-render)
  const [isOAuthLoading, setIsOAuthLoading] = useState<boolean>(
    !!(window.location.hash && window.location.hash.includes('access_token'))
  );
  // Ref mirrors user state so async callbacks always read the CURRENT value
  // (avoids stale closure bug in useCallback/useEffect with [] deps)
  const userRef = useRef<User | null>(null);

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

  // Keep userRef in sync so async OAuth callbacks read the live user value
  useEffect(() => { userRef.current = user; }, [user]);

  // ── Global Supabase OAuth handler ─────────────────────────────
  // Two-pronged approach to handle race conditions:
  //   1. getSession() on mount: catches the case where Supabase processes
  //      the #access_token hash BEFORE our onAuthStateChange listener registers.
  //   2. onAuthStateChange: catches normal SIGNED_IN events.
  // Both paths: call backend, then handleLogin. On failure: show login form.
  const processSupabaseSession = useCallback(async (session: any) => {
    if (!session || userRef.current) return; // use ref to avoid stale closure
    setIsOAuthLoading(true);
    try {
      const provider = session.user?.app_metadata?.provider || 'google';
      const supabaseToken = session.access_token;
      try {
        // Primary: call backend for JWT
        const authResponse = await api.auth.handleAuthCallback(supabaseToken, provider);
        handleLogin(authResponse.user);
      } catch (backendErr) {
        // Fallback: backend unreachable (cold start, etc.) — build user from Supabase session
        console.warn('[App] Backend call failed, using Supabase session as fallback:', backendErr);
        const fbUser: User = {
          id: session.user.id,
          fullName: session.user.user_metadata?.full_name ||
                    session.user.user_metadata?.name ||
                    session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          avatar: session.user.user_metadata?.avatar_url ||
                  session.user.user_metadata?.picture || undefined,
        };
        handleLogin(fbUser);
      }
    } catch (err) {
      console.error('[App] OAuth processing error:', err);
      setIsOAuthLoading(false); // Stop spinner → show login form
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!supabase) { setIsOAuthLoading(false); return; }

    // Only process an OAuth session if this looks like an actual OAuth redirect.
    // The URL will contain #access_token when Supabase redirects back from Google/GitHub.
    // Without this guard, a stale Supabase session from a previous OAuth login would
    // silently intercept the manual email/password login flow.
    const isOAuthRedirect = !!(window.location.hash && window.location.hash.includes('access_token'));

    // 1. Immediately check for existing session (race condition fix for OAuth redirects only)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && isOAuthRedirect) {
        processSupabaseSession(session);
      } else {
        setIsOAuthLoading(false);
      }
    });

    // 2. Subscribe for future events (normal OAuth flow)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        // Only handle SIGNED_IN if it's an actual OAuth redirect, not a manual login side-effect
        if (_event === 'SIGNED_IN' && session && isOAuthRedirect) {
          await processSupabaseSession(session);
        }
        if (_event === 'SIGNED_OUT') {
          setIsOAuthLoading(false); // Ensure spinner never shows after logout
        }
      }
    );
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enforce clean URL when not logged in
  useEffect(() => {
    if (!user) {
      const path = window.location.pathname;
      // Keep /auth/callback and /login paths as-is - needed for OAuth flow and routing
      if (path !== '/' && path !== '/login' && path !== '/auth/callback') {
        window.history.replaceState({}, '', '/login');
      }
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
    // Always navigate to dashboard after any login (OAuth, email, demo)
    navigate(ViewState.Dashboard);
  };

  const handleLogout = async () => {
    setIsOAuthLoading(false);        // Reset spinner state before clearing user
    setUser(null);                   // Clear React state first
    userRef.current = null;          // Clear ref immediately (not waiting for effect)
    setPortfolio(null);
    await api.auth.logout();         // Clear backend JWT
    if (supabase) {
      await supabase.auth.signOut(); // Clear Supabase session so getSession() returns null
    }
    window.history.replaceState({}, '', '/login');
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
    if (window.location.pathname === '/auth/callback') {
      return <AuthCallback onLogin={handleLogin} />;
    }
    // Show spinner while OAuth is being processed (state-based, not hash-based)
    if (isOAuthLoading) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <h2 className="text-xl font-bold text-slate-800">Signing you in...</h2>
            <p className="text-slate-500 mt-2 text-sm text-center">Please wait while we verify your account.</p>
          </div>
        </div>
      );
    }
    // Show auth screen for /login or / or any unmatched route
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
