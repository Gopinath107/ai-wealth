
export enum AssetType {
  Stock = 'Stock',
  Crypto = 'Crypto',
  Bond = 'Bond',
  Cash = 'Cash',
  RealEstate = 'Real Estate'
}

export interface User {
  id: string | number; // Backend uses Long, Frontend handles as number/string
  fullName: string;    // Backend uses 'fullName'
  email: string;
  avatar?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
export interface InstrumentSearch {
  instrumentKey: string;
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

// Matches Backend 'MarketQuoteDto'
export interface MarketQuote {
  instrumentKey: string;
  ltp: number;
  prevClose: number;
  change: number;
  changePercent: number;
  asOf?: string;
}

// Used for UI display
export interface MarketStock extends MarketQuote {
  symbol: string; // Enriched from instrument details
  name: string;
}

export interface MarketIndex {
  name: string;
  value: number;
  change: number;
  percent: number;
}

// Matches Backend 'ClientWsCommand'
export interface WsCommand {
  action: 'subscribe' | 'unsubscribe';
  mode: 'ltpc' | 'full';
  instrumentKeys: string[];
}

// Matches Backend 'ServerMarketEvent'
export interface MarketEvent {
  type: 'tick' | 'candle';
  instrumentKey: string;
  ltp?: number;
  ltt?: string;
  change?: number;
  // Candle specific
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  vol?: number;
  ts?: string;
}

// Benchmark Index (NIFTY 50, BANK NIFTY, SENSEX)
export interface BenchmarkIndex {
  name: string;
  instrumentKey: string;
  ltp: number;
  change: number;
  changePercent: number;
}

// Market Feed Item with optional market cap
export interface MarketFeedItem {
  instrumentKey: string;
  tradingSymbol?: string; // API returns tradingSymbol
  symbol: string;
  name: string;
  ltp: number;
  prevClose: number;
  change: number;
  changePercent: number;
  marketCap?: string | number;
  exchange: string;
  asOf?: string; // Timestamp from API
  currency?: string; // Currency code (e.g., "INR")
}

// Candle/OHLC data from API
export interface CandleData {
  time: number; // Unix timestamp in seconds for chart X-axis
  ts: string; // ISO timestamp for display
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  oi?: number;
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  quantity: number;
  price: number;
  change24h: number; // Percentage
  value: number;
}

export interface Portfolio {
  totalValue: number;
  change24hValue: number;
  change24hPercent: number;
  assets: Asset[];
}

export interface Transaction {
  id: string;
  date: string;
  type: 'Buy' | 'Sell' | 'Dividend' | 'Deposit';
  assetSymbol: string;
  amount: number;
  price: number;
  total: number;
  status: 'Completed' | 'Pending';
  fees?: number;
  notes?: string;
}

export interface WatchlistItem {
  id: string;

  // Backend API fields
  instrumentKey: string;
  tradingSymbol: string;
  exchange: string;
  ltp: number;               // Last traded price
  prevClose: number;
  change: number;
  changePercent: number;
  asOf?: string;             // Timestamp from API
  createdAt?: string;

  // Legacy fields for backward compatibility
  symbol: string;            // Maps to tradingSymbol
  name: string;
  price: number;             // Maps to ltp
  change24h: number;         // Maps to changePercent
  marketCap?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isThinking?: boolean;
  sources?: { title: string; uri: string }[];
}

export enum ViewState {
  Dashboard = 'Dashboard',
  Watchlist = 'Watchlist',
  Advisor = 'Advisor',
  News = 'News',
  Goals = 'Goals',
  Settings = 'Settings',
}

export interface NewsItem {
  id: string;
  title: string;
  description: string;  // Backend uses 'description' not 'summary'
  source: string;
  provider?: string;
  publishedAt: string;  // ISO timestamp from backend
  url: string;
  imageUrl?: string;

  // Backend AI analysis fields (already included in response)
  aiImpactLabel: 'Bullish' | 'Bearish' | 'Neutral';
  aiImpactSummary: string;
  aiKeyPoints: string;  // Bullet points separated by \n
  disclaimer: string;
}

export interface GoalAllocation {
  assetClass: 'Stocks' | 'Crypto' | 'Bonds' | 'Cash' | 'Real Estate';
  percentage: number;
}

export interface GoalRecommendation {
  monthlyContribution: number;
  riskProfile: string;
  allocationStrategy: GoalAllocation[];
  milestones: string[];
}

export type GoalType =
  | 'Retirement'
  | 'Purchase'
  | 'Savings'
  | 'Emergency Fund'
  | 'Education'
  | 'Vacation'
  | 'House Down Payment'
  | 'Wedding'
  | 'Debt Payoff'
  | 'Custom';

export interface Contribution {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface InvestmentGoal {
  id: string;
  userId?: string | number;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  type: GoalType;

  // AI Generated Strategy
  monthlyContribution: number;
  riskProfile: string;
  allocationStrategy: GoalAllocation[];
  milestones: string[];

  // Contribution tracking
  contributions?: Contribution[];

  // Progress projection
  projectedCompletionDate?: string;

  // AI Chatbot fields
  question?: string;
  suggestions?: string[];

  // Optional flag for UI state
  hasPlan?: boolean;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  isActive: boolean;
}

export interface RebalancingSuggestion {
  symbol: string;
  action: 'Buy' | 'Sell';
  quantity: number;
  reason: string;
}

// UI-friendly MarketStock for display (backward compatible)
export interface MarketStockUI {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: string | number;
  exchange: 'NSE' | 'BSE';
}
