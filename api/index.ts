
import { Asset, AssetType, Portfolio, Transaction, WatchlistItem, InvestmentGoal, NewsItem, AuthResponse, User } from '../types';
import { MOCK_ASSETS, MOCK_TRANSACTIONS, MOCK_WATCHLIST, MOCK_GOALS, MOCK_NEWS, updatePortfolio, addTransaction, updateGoals, updateWatchlist } from './mockDb';
import { API_ENDPOINTS } from './endpoints';

// Helper to simulate network latency
const simulateDelay = (ms = 600) => new Promise(resolve => setTimeout(resolve, ms));

// --- API Methods ---

export const api = {
  auth: {
    login: async (email: string, password: string): Promise<AuthResponse> => {
      console.log(`[API] POST ${API_ENDPOINTS.AUTH.LOGIN}`, { email });
      await simulateDelay(1000);
      return {
        token: "mock-jwt-token",
        user: {
          id: "user-123",
          name: "Alex Trader",
          email: email,
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"
        }
      };
    },
    signup: async (name: string, email: string, password: string): Promise<AuthResponse> => {
      console.log(`[API] POST ${API_ENDPOINTS.AUTH.SIGNUP}`, { name, email });
      await simulateDelay(1000);
      return {
        token: "mock-jwt-token",
        user: {
          id: "user-new",
          name: name,
          email: email,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
        }
      };
    },
    logout: async () => {
      console.log(`[API] POST ${API_ENDPOINTS.AUTH.LOGOUT}`);
      await simulateDelay(300);
    }
  },

  portfolio: {
    get: async (): Promise<Portfolio> => {
      console.log(`[API] GET ${API_ENDPOINTS.PORTFOLIO.GET}`);
      await simulateDelay();
      
      // Calculate dynamic totals from DB
      const totalValue = MOCK_ASSETS.reduce((acc, asset) => acc + asset.value, 0);
      const change24hValue = MOCK_ASSETS.reduce((acc, asset) => acc + (asset.value * (asset.change24h / 100)), 0);
      const change24hPercent = totalValue > 0 ? (change24hValue / totalValue) * 100 : 0;

      return {
        totalValue,
        change24hValue,
        change24hPercent,
        assets: [...MOCK_ASSETS]
      };
    },

    trade: async (payload: { symbol: string; action: 'BUY' | 'SELL'; quantity: number; price: number }) => {
      console.log(`[API] POST ${API_ENDPOINTS.PORTFOLIO.TRADE}`, payload);
      await simulateDelay(800);

      const { symbol, action, quantity, price } = payload;
      const totalCost = quantity * price;
      
      // Locate Cash Asset
      const cashIndex = MOCK_ASSETS.findIndex(a => a.type === AssetType.Cash);
      let cash = MOCK_ASSETS[cashIndex];

      if (action === 'BUY') {
        if (cash.value < totalCost) throw new Error("Insufficient funds");
        
        // Update Cash
        cash.value -= totalCost;
        cash.quantity = cash.value / cash.price; // Assuming USD price is 1
        
        // Update/Add Asset
        const assetIndex = MOCK_ASSETS.findIndex(a => a.symbol === symbol && a.type !== AssetType.Cash);
        if (assetIndex >= 0) {
          const asset = MOCK_ASSETS[assetIndex];
          const newQty = asset.quantity + quantity;
          const newValue = newQty * asset.price; // Simplified, assuming price doesn't change during trade execution
          MOCK_ASSETS[assetIndex] = { ...asset, quantity: newQty, value: newValue };
        } else {
          MOCK_ASSETS.push({
            id: Date.now().toString(),
            symbol,
            name: symbol, // Simplified
            type: AssetType.Stock, // Default
            quantity,
            price,
            change24h: 0,
            value: totalCost
          });
        }
      } else {
        // SELL
        const assetIndex = MOCK_ASSETS.findIndex(a => a.symbol === symbol);
        if (assetIndex === -1 || MOCK_ASSETS[assetIndex].quantity < quantity) {
          throw new Error("Insufficient holdings");
        }
        
        // Update Asset
        const asset = MOCK_ASSETS[assetIndex];
        const newQty = asset.quantity - quantity;
        
        if (newQty <= 0.000001) {
           MOCK_ASSETS.splice(assetIndex, 1);
        } else {
           MOCK_ASSETS[assetIndex] = { ...asset, quantity: newQty, value: newQty * asset.price };
        }

        // Update Cash
        cash.value += totalCost;
        cash.quantity = cash.value;
      }

      // Record Transaction
      addTransaction({
        id: `tx-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        type: action === 'BUY' ? 'Buy' : 'Sell',
        assetSymbol: symbol,
        amount: quantity,
        price: price,
        total: totalCost,
        status: 'Completed'
      });

      return { success: true };
    },

    addAsset: async (payload: Partial<Asset>) => {
      console.log(`[API] POST ${API_ENDPOINTS.PORTFOLIO.ADD_ASSET}`, payload);
      await simulateDelay();
      const newAsset = {
        id: Date.now().toString(),
        symbol: payload.symbol!,
        name: payload.name!,
        type: payload.type!,
        quantity: payload.quantity!,
        price: payload.price!,
        value: payload.quantity! * payload.price!,
        change24h: 0
      };
      updatePortfolio([...MOCK_ASSETS, newAsset]);
      return newAsset;
    }
  },

  transactions: {
    getAll: async (): Promise<Transaction[]> => {
      console.log(`[API] GET ${API_ENDPOINTS.TRANSACTIONS.GET_ALL}`);
      await simulateDelay();
      return [...MOCK_TRANSACTIONS];
    },
    update: async (tx: Transaction) => {
      console.log(`[API] PUT ${API_ENDPOINTS.TRANSACTIONS.UPDATE.replace(':id', tx.id)}`, tx);
      await simulateDelay();
      const index = MOCK_TRANSACTIONS.findIndex(t => t.id === tx.id);
      if (index !== -1) MOCK_TRANSACTIONS[index] = tx;
      return { success: true };
    }
  },

  watchlist: {
    getAll: async (): Promise<WatchlistItem[]> => {
      console.log(`[API] GET ${API_ENDPOINTS.WATCHLIST.GET_ALL}`);
      await simulateDelay();
      return [...MOCK_WATCHLIST];
    },
    add: async (symbol: string): Promise<WatchlistItem> => {
      console.log(`[API] POST ${API_ENDPOINTS.WATCHLIST.ADD}`, { symbol });
      await simulateDelay();
      const newItem: WatchlistItem = {
        id: `w-${Date.now()}`,
        symbol: symbol.toUpperCase(),
        name: `${symbol.toUpperCase()} Corp`,
        price: Math.random() * 500 + 50,
        change24h: (Math.random() * 10) - 4,
        marketCap: `${(Math.random() * 2).toFixed(1)}T`
      };
      updateWatchlist([...MOCK_WATCHLIST, newItem]);
      return newItem;
    },
    remove: async (id: string) => {
      console.log(`[API] DELETE ${API_ENDPOINTS.WATCHLIST.REMOVE.replace(':id', id)}`);
      await simulateDelay(200);
      updateWatchlist(MOCK_WATCHLIST.filter(w => w.id !== id));
    }
  },

  goals: {
    getAll: async (): Promise<InvestmentGoal[]> => {
      console.log(`[API] GET ${API_ENDPOINTS.GOALS.GET_ALL}`);
      await simulateDelay();
      return [...MOCK_GOALS];
    },
    add: async (goal: InvestmentGoal) => {
      console.log(`[API] POST ${API_ENDPOINTS.GOALS.ADD}`, goal);
      await simulateDelay();
      updateGoals([...MOCK_GOALS, goal]);
    },
    remove: async (id: string) => {
      console.log(`[API] DELETE ${API_ENDPOINTS.GOALS.DELETE.replace(':id', id)}`);
      await simulateDelay();
      updateGoals(MOCK_GOALS.filter(g => g.id !== id));
    }
  },

  news: {
    getAll: async (): Promise<NewsItem[]> => {
      console.log(`[API] GET ${API_ENDPOINTS.NEWS.GET_ALL}`);
      await simulateDelay();
      return [...MOCK_NEWS];
    }
  }
};
