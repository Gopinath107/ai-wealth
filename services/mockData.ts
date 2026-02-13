
import { Asset, AssetType, Portfolio, NewsItem, Transaction, WatchlistItem, InvestmentGoal, MarketStockUI } from '../types';

// --- MUTABLE MOCK DATABASE ---

export let MOCK_ASSETS: Asset[] = [
  { id: '1', symbol: 'AAPL', name: 'Apple Inc.', type: AssetType.Stock, quantity: 50, price: 175.45, change24h: 1.25, value: 8772.50 },
  { id: '2', symbol: 'MSFT', name: 'Microsoft Corp.', type: AssetType.Stock, quantity: 30, price: 380.10, change24h: -0.5, value: 11403.00 },
  { id: '3', symbol: 'BTC', name: 'Bitcoin', type: AssetType.Crypto, quantity: 0.45, price: 64200.00, change24h: 3.5, value: 28890.00 },
  { id: '4', symbol: 'ETH', name: 'Ethereum', type: AssetType.Crypto, quantity: 5.0, price: 3450.00, change24h: 2.1, value: 17250.00 },
  { id: '5', symbol: 'VND', name: 'Vanguard Total Bond', type: AssetType.Bond, quantity: 200, price: 74.20, change24h: 0.1, value: 14840.00 },
  { id: '6', symbol: 'USD', name: 'Cash Reserve', type: AssetType.Cash, quantity: 1, price: 15000, change24h: 0, value: 15000.00 },
];

export let MOCK_TRANSACTIONS: Transaction[] = [
  { id: 't1', date: '2023-10-24', type: 'Buy', assetSymbol: 'BTC', amount: 0.1, price: 34000, total: 3400, status: 'Completed', fees: 15.00, notes: 'Long term crypto allocation.' },
  { id: 't2', date: '2023-10-22', type: 'Dividend', assetSymbol: 'AAPL', amount: 0, price: 0, total: 45.50, status: 'Completed', fees: 0, notes: 'Quarterly dividend payment.' },
  { id: 't3', date: '2023-10-20', type: 'Sell', assetSymbol: 'TSLA', amount: 10, price: 210.50, total: 2105.00, status: 'Completed', fees: 5.20, notes: 'Profit taking on recent rally.' },
  { id: 't4', date: '2023-10-15', type: 'Deposit', assetSymbol: 'USD', amount: 1, price: 5000, total: 5000, status: 'Completed', fees: 0, notes: 'Manual monthly savings deposit.' },
  { id: 't5', date: '2023-10-10', type: 'Buy', assetSymbol: 'MSFT', amount: 5, price: 330.20, total: 1651.00, status: 'Completed', fees: 2.50, notes: 'DCA into tech sector.' },
];

export let MOCK_WATCHLIST: WatchlistItem[] = [
  { id: 'w1', symbol: 'NVDA', name: 'NVIDIA Corp.', price: 875.30, change24h: 4.2, marketCap: '2.2T' },
  { id: 'w2', symbol: 'GOOGL', name: 'Alphabet Inc.', price: 172.50, change24h: -1.2, marketCap: '1.9T' },
  { id: 'w3', symbol: 'AMZN', name: 'Amazon.com', price: 180.10, change24h: 0.8, marketCap: '1.8T' },
  { id: 'w4', symbol: 'SOL', name: 'Solana', price: 145.20, change24h: 8.5, marketCap: '65B' },
];

export const MOCK_NEWS: NewsItem[] = [
  {
    id: 'n1',
    title: "Fed Signals Potential Rate Cuts Later This Year",
    source: "Global Finance",
    time: "2h ago",
    summary: "Federal Reserve officials have indicated that inflation data is moving in the right direction, opening the door for interest rate reductions.",
    sentiment: "Bullish",
    url: "#"
  },
  {
    id: 'n2',
    title: "Tech Giants Face New Regulatory Scrutiny in EU",
    source: "TechDaily",
    time: "4h ago",
    summary: "New antitrust investigations have been launched against major tech conglomerates regarding their AI partnerships.",
    sentiment: "Bearish",
    url: "#"
  },
  {
    id: 'n3',
    title: "Crypto Markets Rally as Institutional Adoption Grows",
    source: "CoinDesk Mock",
    time: "5h ago",
    summary: "Major banks are increasingly offering crypto custody services, driving a new wave of optimism in digital asset markets.",
    sentiment: "Bullish",
    url: "#"
  },
  {
    id: 'n4',
    title: "Oil Prices Stabilize Amid Geopolitical Tensions",
    source: "Energy Watch",
    time: "7h ago",
    summary: "Brent crude remains steady as supply chain concerns are balanced by weaker demand forecasts.",
    sentiment: "Neutral",
    url: "#"
  },
  {
    id: 'n5',
    title: "EV Sales Slow Down in North America",
    source: "AutoWeekly",
    time: "8h ago",
    summary: "Major manufacturers report a dip in electric vehicle sales as consumer demand cools due to high interest rates.",
    sentiment: "Bearish",
    url: "#"
  }
];

export let MOCK_GOALS: InvestmentGoal[] = [
  {
    id: 'g1',
    name: 'Retirement Fund',
    description: 'Long-term wealth accumulation for a comfortable retirement.',
    targetAmount: 1000000,
    currentAmount: 85000,
    deadline: '2045-01-01',
    type: 'Retirement',
    monthlyContribution: 2500,
    riskProfile: 'Aggressive',
    allocationStrategy: [
      { assetClass: 'Stocks', percentage: 70 },
      { assetClass: 'Bonds', percentage: 20 },
      { assetClass: 'Crypto', percentage: 5 },
      { assetClass: 'Cash', percentage: 5 }
    ],
    milestones: ['Reach $100k by 2025', 'Reach $250k by 2030'],
    contributions: [
      { id: 'c1', amount: 2500, date: '2026-01-15', note: 'Monthly auto-deposit' },
      { id: 'c2', amount: 2500, date: '2025-12-15', note: 'Monthly auto-deposit' },
      { id: 'c3', amount: 5000, date: '2025-11-20', note: 'Year-end bonus allocation' }
    ],
    projectedCompletionDate: '2044-06-15'
  },
  {
    id: 'g2',
    name: 'House Down Payment',
    description: 'Saving for a 20% down payment on a family home.',
    targetAmount: 150000,
    currentAmount: 45000,
    deadline: '2026-12-31',
    type: 'House Down Payment',
    monthlyContribution: 3000,
    riskProfile: 'Moderate',
    allocationStrategy: [
      { assetClass: 'Stocks', percentage: 40 },
      { assetClass: 'Bonds', percentage: 40 },
      { assetClass: 'Cash', percentage: 20 }
    ],
    milestones: ['Reach $75k by end of 2024', 'Start house hunting in 2026'],
    contributions: [
      { id: 'c4', amount: 3000, date: '2026-01-10' },
      { id: 'c5', amount: 3000, date: '2025-12-10' },
      { id: 'c6', amount: 3000, date: '2025-11-10' }
    ],
    projectedCompletionDate: '2027-11-01'
  },
  {
    id: 'g3',
    name: 'Emergency Fund',
    description: '6 months of living expenses kept liquid.',
    targetAmount: 30000,
    currentAmount: 15000,
    deadline: '2024-12-31',
    type: 'Emergency Fund',
    monthlyContribution: 1000,
    riskProfile: 'Conservative',
    allocationStrategy: [
      { assetClass: 'Cash', percentage: 100 }
    ],
    milestones: ['Reach $20k by Q3 2024'],
    contributions: [
      { id: 'c7', amount: 1000, date: '2026-02-01' },
      { id: 'c8', amount: 1000, date: '2026-01-01' }
    ]
  },
  {
    id: 'g4',
    name: 'Europe Vacation',
    description: 'Two-week trip across Italy, France and Spain.',
    targetAmount: 8000,
    currentAmount: 3200,
    deadline: '2026-08-01',
    type: 'Vacation',
    monthlyContribution: 400,
    riskProfile: 'Conservative',
    allocationStrategy: [
      { assetClass: 'Cash', percentage: 80 },
      { assetClass: 'Bonds', percentage: 20 }
    ],
    milestones: ['Book flights by April 2026'],
    contributions: [
      { id: 'c9', amount: 400, date: '2026-02-01' },
      { id: 'c10', amount: 800, date: '2026-01-01', note: 'Double contribution' }
    ]
  },
  {
    id: 'g5',
    name: 'Master\'s Degree Fund',
    description: 'Tuition and living costs for a 2-year MBA program.',
    targetAmount: 120000,
    currentAmount: 22000,
    deadline: '2028-08-01',
    type: 'Education',
    monthlyContribution: 2000,
    riskProfile: 'Moderate',
    allocationStrategy: [
      { assetClass: 'Stocks', percentage: 50 },
      { assetClass: 'Bonds', percentage: 35 },
      { assetClass: 'Cash', percentage: 15 }
    ],
    milestones: ['Reach $50k by 2027', 'Apply to programs by early 2028'],
    contributions: [
      { id: 'c11', amount: 2000, date: '2026-02-05' },
      { id: 'c12', amount: 2000, date: '2026-01-05' }
    ],
    projectedCompletionDate: '2030-02-01'
  }
];

export const getMockPortfolio = (): Portfolio => {
  const totalValue = MOCK_ASSETS.reduce((acc, asset) => acc + asset.value, 0);
  const change24hValue = MOCK_ASSETS.reduce((acc, asset) => acc + (asset.value * (asset.change24h / 100)), 0);
  const change24hPercent = totalValue !== 0 ? (change24hValue / totalValue) * 100 : 0;

  return {
    totalValue,
    change24hValue,
    change24hPercent,
    assets: MOCK_ASSETS
  };
};

export const MOCK_INDIAN_STOCKS: MarketStockUI[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', price: 2950.45, change: 15.20, changePercent: 0.52, marketCap: '19.8T', exchange: 'NSE' },
  { symbol: 'TCS', name: 'Tata Consultancy Services', price: 3980.10, change: -12.50, changePercent: -0.31, marketCap: '14.5T', exchange: 'NSE' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', price: 1450.60, change: 2.30, changePercent: 0.16, marketCap: '11.0T', exchange: 'NSE' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', price: 1080.25, change: 10.15, changePercent: 0.95, marketCap: '7.6T', exchange: 'NSE' },
  { symbol: 'INFY', name: 'Infosys Ltd', price: 1560.80, change: -5.40, changePercent: -0.34, marketCap: '6.5T', exchange: 'NSE' },
  { symbol: 'SBIN', name: 'State Bank of India', price: 760.30, change: 8.90, changePercent: 1.18, marketCap: '6.8T', exchange: 'NSE' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', price: 1210.50, change: 4.20, changePercent: 0.35, marketCap: '6.9T', exchange: 'NSE' },
  { symbol: 'ITC', name: 'ITC Ltd', price: 430.20, change: -1.10, changePercent: -0.26, marketCap: '5.4T', exchange: 'NSE' },
  { symbol: 'LICI', name: 'Life Insurance Corp', price: 980.45, change: 12.30, changePercent: 1.27, marketCap: '6.2T', exchange: 'NSE' },
  { symbol: 'LT', name: 'Larsen & Toubro Ltd', price: 3650.00, change: 45.50, changePercent: 1.26, marketCap: '5.0T', exchange: 'NSE' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd', price: 2350.60, change: -8.20, changePercent: -0.35, marketCap: '5.5T', exchange: 'NSE' },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', price: 1740.15, change: 5.60, changePercent: 0.32, marketCap: '3.4T', exchange: 'NSE' },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd', price: 1050.90, change: 7.80, changePercent: 0.75, marketCap: '3.2T', exchange: 'NSE' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', price: 980.50, change: 15.40, changePercent: 1.60, marketCap: '3.2T', exchange: 'NSE' },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical', price: 1590.20, change: 3.10, changePercent: 0.20, marketCap: '3.8T', exchange: 'NSE' },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India', price: 12400.00, change: 120.00, changePercent: 0.98, marketCap: '3.9T', exchange: 'NSE' },
  { symbol: 'HCLTECH', name: 'HCL Technologies', price: 1620.45, change: -4.50, changePercent: -0.28, marketCap: '4.4T', exchange: 'NSE' },
  { symbol: 'TITAN', name: 'Titan Company Ltd', price: 3750.30, change: 2.10, changePercent: 0.06, marketCap: '3.3T', exchange: 'NSE' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd', price: 6950.80, change: 85.20, changePercent: 1.24, marketCap: '4.3T', exchange: 'NSE' },
  { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd', price: 2890.55, change: -10.40, changePercent: -0.36, marketCap: '2.8T', exchange: 'NSE' },
  { symbol: 'ADANIENT', name: 'Adani Enterprises', price: 3250.60, change: 40.50, changePercent: 1.26, marketCap: '3.7T', exchange: 'NSE' },
  { symbol: 'ADANIPORTS', name: 'Adani Ports & SEZ', price: 1340.20, change: 12.80, changePercent: 0.96, marketCap: '2.9T', exchange: 'NSE' },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement', price: 9850.00, change: 50.00, changePercent: 0.51, marketCap: '2.8T', exchange: 'NSE' },
  { symbol: 'POWERGRID', name: 'Power Grid Corp', price: 285.40, change: 1.20, changePercent: 0.42, marketCap: '2.6T', exchange: 'NSE' },
  { symbol: 'NTPC', name: 'NTPC Ltd', price: 345.60, change: 2.40, changePercent: 0.70, marketCap: '3.3T', exchange: 'NSE' },
  { symbol: 'ONGC', name: 'ONGC Ltd', price: 275.80, change: 3.50, changePercent: 1.29, marketCap: '3.4T', exchange: 'NSE' },
  { symbol: 'WIPRO', name: 'Wipro Ltd', price: 485.30, change: -1.20, changePercent: -0.25, marketCap: '2.5T', exchange: 'NSE' },
  { symbol: 'COALINDIA', name: 'Coal India Ltd', price: 450.20, change: 4.10, changePercent: 0.92, marketCap: '2.7T', exchange: 'NSE' },
  { symbol: 'JSWSTEEL', name: 'JSW Steel Ltd', price: 860.50, change: 5.60, changePercent: 0.65, marketCap: '2.1T', exchange: 'NSE' },
  { symbol: 'TATASTEEL', name: 'Tata Steel Ltd', price: 155.40, change: 1.10, changePercent: 0.71, marketCap: '1.9T', exchange: 'NSE' },
  { symbol: 'M&M', name: 'Mahindra & Mahindra', price: 1980.20, change: 25.40, changePercent: 1.30, marketCap: '2.4T', exchange: 'NSE' },
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv Ltd', price: 1650.30, change: 10.20, changePercent: 0.62, marketCap: '2.6T', exchange: 'NSE' },
  { symbol: 'NESTLEIND', name: 'Nestle India Ltd', price: 2560.00, change: -5.00, changePercent: -0.20, marketCap: '2.4T', exchange: 'NSE' },
  { symbol: 'GRASIM', name: 'Grasim Industries', price: 2250.60, change: 15.30, changePercent: 0.68, marketCap: '1.5T', exchange: 'NSE' },
  { symbol: 'TECHM', name: 'Tech Mahindra Ltd', price: 1280.40, change: -8.60, changePercent: -0.67, marketCap: '1.2T', exchange: 'NSE' },
  { symbol: 'HINDALCO', name: 'Hindalco Industries', price: 620.50, change: 7.20, changePercent: 1.17, marketCap: '1.4T', exchange: 'NSE' },
  { symbol: 'EICHERMOT', name: 'Eicher Motors Ltd', price: 4650.00, change: 30.50, changePercent: 0.66, marketCap: '1.3T', exchange: 'NSE' },
  { symbol: 'CIPLA', name: 'Cipla Ltd', price: 1480.20, change: 2.10, changePercent: 0.14, marketCap: '1.2T', exchange: 'NSE' },
  { symbol: 'DRREDDY', name: 'Dr. Reddy\'s Labs', price: 6150.80, change: -12.40, changePercent: -0.20, marketCap: '1.0T', exchange: 'NSE' },
  { symbol: 'BPCL', name: 'Bharat Petroleum', price: 620.30, change: 5.40, changePercent: 0.88, marketCap: '1.3T', exchange: 'NSE' },
  { symbol: 'BRITANNIA', name: 'Britannia Industries', price: 4950.60, change: 10.20, changePercent: 0.21, marketCap: '1.2T', exchange: 'NSE' },
  { symbol: 'INDUSINDBK', name: 'IndusInd Bank Ltd', price: 1520.40, change: 12.60, changePercent: 0.84, marketCap: '1.1T', exchange: 'NSE' },
  { symbol: 'TATACONSUM', name: 'Tata Consumer', price: 1150.20, change: 4.50, changePercent: 0.39, marketCap: '1.1T', exchange: 'NSE' },
  { symbol: 'SBILIFE', name: 'SBI Life Insurance', price: 1480.50, change: 3.20, changePercent: 0.22, marketCap: '1.5T', exchange: 'NSE' },
  { symbol: 'APOLLOHOSP', name: 'Apollo Hospitals', price: 6250.00, change: 20.00, changePercent: 0.32, marketCap: '0.9T', exchange: 'NSE' },
  { symbol: 'DIVISLAB', name: 'Divi\'s Laboratories', price: 3850.40, change: -5.60, changePercent: -0.15, marketCap: '1.0T', exchange: 'NSE' },
  { symbol: 'HEROMOTOCO', name: 'Hero MotoCorp', price: 4560.80, change: 25.40, changePercent: 0.56, marketCap: '0.9T', exchange: 'NSE' },
  { symbol: 'LTIM', name: 'LTIMindtree Ltd', price: 5120.30, change: -15.20, changePercent: -0.30, marketCap: '1.5T', exchange: 'NSE' },
  { symbol: 'PIDILITIND', name: 'Pidilite Industries', price: 2950.00, change: 8.50, changePercent: 0.29, marketCap: '1.5T', exchange: 'NSE' },
  { symbol: 'BEL', name: 'Bharat Electronics', price: 220.40, change: 3.10, changePercent: 1.43, marketCap: '1.6T', exchange: 'NSE' },
];

// Data for charts (Static for now)
export const PERFORMANCE_DATA = [
  { name: 'Jan', value: 85000 },
  { name: 'Feb', value: 87500 },
  { name: 'Mar', value: 86000 },
  { name: 'Apr', value: 89500 },
  { name: 'May', value: 92000 },
  { name: 'Jun', value: 91500 },
  { name: 'Jul', value: 96155 },
];

export const ALLOCATION_DATA = [
  { name: 'Stocks', value: 20175.50 },
  { name: 'Crypto', value: 46140.00 },
  { name: 'Bonds', value: 14840.00 },
  { name: 'Cash', value: 15000.00 },
];

// --- MUTATION HELPERS FOR MOCK MODE ---
export const updateMockAssets = (assets: Asset[]) => { MOCK_ASSETS = assets; };
export const addMockTransaction = (tx: Transaction) => { MOCK_TRANSACTIONS = [tx, ...MOCK_TRANSACTIONS]; };
export const updateMockGoals = (goals: InvestmentGoal[]) => { MOCK_GOALS = goals; };
export const updateMockWatchlist = (list: WatchlistItem[]) => { MOCK_WATCHLIST = list; };