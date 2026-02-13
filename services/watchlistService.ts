
import { WatchlistItem } from '../types';
import { MOCK_WATCHLIST, updateMockWatchlist } from './mockData';
import { BASE_URL, getHeaders, simulateDelay, shouldUseBackend } from './apiConfig';

// API response structure
interface WatchlistApiResponse<T> {
  success: boolean;
  result: T;
  errors: string[];
  errorCount: number;
}

// Backend watchlist item structure
interface BackendWatchlistItem {
  userId: number;
  query?: string | null;
  id: number;
  instrumentKey: string;
  tradingSymbol: string;
  name: string;
  exchange: string;
  createdAt: string;
  ltp: number;
  prevClose: number;
  change: number;
  changePercent: number;
  asOf: string;
}

// Get userId from localStorage (from JWT or session)
const getUserId = (): number => {
  // Try to get userId from localStorage first
  const userId = localStorage.getItem('userId');
  if (userId) return parseInt(userId, 10);

  // If not found, use a default for demo/development
  console.warn('[Watchlist] No userId found, using default');
  return 2; // Default user ID for development
};

export const watchlistService = {
  // GET /api/watchlist?userId=X
  getAll: async (): Promise<WatchlistItem[]> => {
    if (shouldUseBackend()) {
      try {
        const userId = getUserId();
        const res = await fetch(`${BASE_URL}/watchlist?userId=${userId}`, {
          headers: getHeaders()
        });

        if (res.ok) {
          const data: WatchlistApiResponse<BackendWatchlistItem[]> = await res.json();

          if (data.success && Array.isArray(data.result)) {
            // Map backend response to frontend WatchlistItem type
            return data.result.map(item => ({
              id: String(item.id),
              instrumentKey: item.instrumentKey,
              tradingSymbol: item.tradingSymbol,
              symbol: item.tradingSymbol, // Map tradingSymbol to symbol for backward compat
              name: item.name,
              exchange: item.exchange,
              price: item.ltp,
              ltp: item.ltp,
              prevClose: item.prevClose,
              change: item.change,
              changePercent: item.changePercent,
              change24h: item.changePercent, // Map for backward compat
              marketCap: '', // Not provided by backend
              asOf: item.asOf,
              createdAt: item.createdAt
            }));
          }
        }

        console.warn('[Watchlist] API call failed, no watchlist items');
        return [];
      } catch (e) {
        console.error('[Watchlist] Error fetching watchlist:', e);
        return [];
      }
    }

    await simulateDelay();
    return [...MOCK_WATCHLIST];
  },

  // POST /api/watchlist with { userId, query }
  add: async (query: string): Promise<WatchlistItem> => {
    if (shouldUseBackend()) {
      const userId = getUserId();
      const res = await fetch(`${BASE_URL}/watchlist`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ userId, query })
      });

      if (!res.ok) {
        throw new Error(`Failed to add to watchlist: ${res.statusText}`);
      }

      const data: WatchlistApiResponse<BackendWatchlistItem> = await res.json();

      if (!data.success) {
        throw new Error(data.errors?.[0] || 'Add to watchlist failed');
      }

      const item = data.result;

      // Map backend response to frontend WatchlistItem
      return {
        id: String(item.id),
        instrumentKey: item.instrumentKey,
        tradingSymbol: item.tradingSymbol,
        symbol: item.tradingSymbol,
        name: item.name,
        exchange: item.exchange,
        price: item.ltp,
        ltp: item.ltp,
        prevClose: item.prevClose,
        change: item.change,
        changePercent: item.changePercent,
        change24h: item.changePercent,
        marketCap: '',
        asOf: item.asOf,
        createdAt: item.createdAt
      };
    }

    await simulateDelay(500);
    const newItem: WatchlistItem = {
      id: Date.now().toString(),
      symbol: query.toUpperCase(),
      tradingSymbol: query.toUpperCase(),
      name: `${query.toUpperCase()} Corp (Mock)`,
      price: Math.random() * 500 + 50,
      change24h: (Math.random() * 5) - 2,
      changePercent: (Math.random() * 5) - 2,
      marketCap: '100B',
      instrumentKey: `NSE_EQ|${query.toUpperCase()}`,
      exchange: 'NSE',
      ltp: Math.random() * 500 + 50,
      prevClose: Math.random() * 500 + 50,
      change: Math.random() * 10 - 5
    };
    updateMockWatchlist([...MOCK_WATCHLIST, newItem]);
    return newItem;
  },

  // DELETE /api/watchlist/:id?userId=X
  remove: async (id: string): Promise<void> => {
    if (shouldUseBackend()) {
      const userId = getUserId();
      const res = await fetch(`${BASE_URL}/watchlist/${id}?userId=${userId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (!res.ok) {
        throw new Error(`Failed to remove from watchlist: ${res.statusText}`);
      }

      const data: WatchlistApiResponse<{ userId: number; id: number; deleted: boolean }> = await res.json();

      if (!data.success || !data.result.deleted) {
        throw new Error('Delete failed');
      }

      return;
    }

    await simulateDelay(500);
    updateMockWatchlist(MOCK_WATCHLIST.filter(w => w.id !== id));
  }
};
