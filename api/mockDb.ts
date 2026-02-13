
import { Asset, AssetType, Portfolio, NewsItem, Transaction, WatchlistItem, InvestmentGoal } from '../types';

// Initial Data
export let MOCK_ASSETS: Asset[] = [
  { id: '1', symbol: 'AAPL', name: 'Apple Inc.', type: AssetType.Stock, quantity: 50, price: 175.45, change24h: 1.25, value: 8772.50 },
  { id: '2', symbol: 'MSFT', name: 'Microsoft Corp.', type: AssetType.Stock, quantity: 30, price: 380.10, change24h: -0.5, value: 11403.00 },
  { id: '3', symbol: 'BTC', name: 'Bitcoin', type: AssetType.Crypto, quantity: 0.45, price: 64200.00, change24h: 3.5, value: 28890.00 },
  { id: '4', symbol: 'ETH', name: 'Ethereum', type: AssetType.Crypto, quantity: 5.0, price: 3450.00, change24h: 2.1, value: 17250.00 },
  { id: '5', symbol: 'VND', name: 'Vanguard Total Bond', type: AssetType.Bond, quantity: 200, price: 74.20, change24h: 0.1, value: 14840.00 },
  { id: '6', symbol: 'USD', name: 'Cash Reserve', type: AssetType.Cash, quantity: 1, price: 15000, change24h: 0, value: 15000.00 },
];

export let MOCK_TRANSACTIONS: Transaction[] = [
  { id: 't1', date: '2023-10-24', type: 'Buy', assetSymbol: 'BTC', amount: 0.1, price: 34000, total: 3400, status: 'Completed' },
  { id: 't2', date: '2023-10-22', type: 'Dividend', assetSymbol: 'AAPL', amount: 0, price: 0, total: 45.50, status: 'Completed' },
  { id: 't3', date: '2023-10-20', type: 'Sell', assetSymbol: 'TSLA', amount: 10, price: 210.50, total: 2105.00, status: 'Completed' },
];

export let MOCK_WATCHLIST: WatchlistItem[] = [
  { id: 'w1', symbol: 'NVDA', name: 'NVIDIA Corp.', price: 875.30, change24h: 4.2, marketCap: '2.2T' },
  { id: 'w2', symbol: 'GOOGL', name: 'Alphabet Inc.', price: 172.50, change24h: -1.2, marketCap: '1.9T' },
];

export let MOCK_GOALS: InvestmentGoal[] = [
  { 
    id: 'g1', 
    name: 'Retirement Fund', 
    targetAmount: 1000000, 
    currentAmount: 85000, 
    deadline: '2045-01-01', 
    type: 'Retirement',
    monthlyContribution: 2500,
    riskProfile: 'Aggressive',
    allocationStrategy: [
      { assetClass: 'Stocks', percentage: 70 },
      { assetClass: 'Bonds', percentage: 20 },
      { assetClass: 'Crypto', percentage: 10 }
    ],
    milestones: ['Reach $100k by 2025', 'Reach $250k by 2030']
  },
];

export const MOCK_NEWS: NewsItem[] = [
  {
    id: 'n1',
    title: "Fed Signals Potential Rate Cuts Later This Year",
    source: "Global Finance",
    time: "2h ago",
    summary: "Federal Reserve officials have indicated that inflation data is moving in the right direction.",
    sentiment: "Bullish",
    url: "#"
  },
  {
    id: 'n2',
    title: "Tech Giants Face New Regulatory Scrutiny in EU",
    source: "TechDaily",
    time: "4h ago",
    summary: "New antitrust investigations have been launched against major tech conglomerates.",
    sentiment: "Bearish",
    url: "#"
  }
];

// Helper to update the mock database
export const updatePortfolio = (newAssets: Asset[]) => {
  MOCK_ASSETS = newAssets;
};

export const addTransaction = (tx: Transaction) => {
  MOCK_TRANSACTIONS = [tx, ...MOCK_TRANSACTIONS];
};

export const updateGoals = (newGoals: InvestmentGoal[]) => {
  MOCK_GOALS = newGoals;
};

export const updateWatchlist = (newList: WatchlistItem[]) => {
  MOCK_WATCHLIST = newList;
};