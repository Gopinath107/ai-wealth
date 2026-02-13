
// --- BACKEND CONFIGURATION ---
// Set to true to enable real backend API integration
const CONFIGURED_REAL_BACKEND = true;

export const BASE_URL = "http://localhost:8080/api";
export const WS_BASE_URL = "ws://localhost:8080";

// --- MARKET HOURS (IST) ---
// Market open: 9:15 AM IST, Market close: 3:30 PM IST
// Only poll continuously during market hours, otherwise fetch once per action

export const isMarketOpen = (): boolean => {
  const now = new Date();

  // Get IST time (UTC + 5:30)
  const istOffset = 5.5 * 60; // minutes
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istTime = new Date(utc + istOffset * 60000);

  const day = istTime.getDay(); // 0 = Sunday, 6 = Saturday
  const hours = istTime.getHours();
  const minutes = istTime.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // Weekdays only (Mon-Fri)
  if (day === 0 || day === 6) return false;

  // Market hours: 9:15 AM (555 min) to 3:30 PM (930 min)
  const marketOpen = 9 * 60 + 15;  // 9:15 AM = 555 minutes
  const marketClose = 15 * 60 + 30; // 3:30 PM = 930 minutes

  return timeInMinutes >= marketOpen && timeInMinutes <= marketClose;
};

export const getMarketStatus = (): { isOpen: boolean; message: string } => {
  const open = isMarketOpen();
  if (open) {
    return { isOpen: true, message: 'Market Open' };
  }

  const now = new Date();
  const istOffset = 5.5 * 60;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istTime = new Date(utc + istOffset * 60000);
  const hours = istTime.getHours();

  if (hours < 9 || (hours === 9 && istTime.getMinutes() < 15)) {
    return { isOpen: false, message: 'Pre-Market' };
  } else if (hours >= 15 && istTime.getMinutes() > 30 || hours > 15) {
    return { isOpen: false, message: 'Market Closed' };
  }
  return { isOpen: false, message: 'Market Closed' };
};

// --- DEMO MODE MANAGEMENT ---
const DEMO_STORAGE_KEY = 'dj_ai_demo_mode';

export const isDemoMode = (): boolean => {
  // If backend is disabled, always return true (simulated mode)
  if (!CONFIGURED_REAL_BACKEND) return true;
  return localStorage.getItem(DEMO_STORAGE_KEY) === 'true';
};

export const setDemoMode = (enable: boolean) => {
  if (enable) {
    localStorage.setItem(DEMO_STORAGE_KEY, 'true');
  } else {
    localStorage.removeItem(DEMO_STORAGE_KEY);
  }
};

// Global helper to check if we should use the real backend
export const shouldUseBackend = (): boolean => {
  return CONFIGURED_REAL_BACKEND && !isDemoMode();
};

// --- ENDPOINTS ---
export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    SIGNUP: '/auth/signup',
    LOGOUT: '/auth/logout',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  PORTFOLIO: {
    GET: '/portfolio',
    TRADE: '/portfolio/trade', // POST
    ASSETS: '/portfolio/assets', // POST
  },
  TRANSACTIONS: {
    GET: '/transactions',
    UPDATE: '/transactions/:id', // PUT
  },
  WATCHLIST: {
    GET: '/watchlist',
    ADD: '/watchlist', // POST
    REMOVE: '/watchlist/:id', // DELETE
  },
  GOALS: {
    GET: '/goals',
    ADD: '/goals', // POST
    UPDATE: '/goals/:id', // PUT
    REMOVE: '/goals/:id', // DELETE
    AI_PLAN: '/goals/ai-plan', // POST
  },
  NEWS: {
    GET: '/news',
  },
  AI: {
    CHAT: '/ai/chat',
    SESSIONS: '/ai/sessions', // GET /ai/sessions/{userId}
    SESSION_MESSAGES: '/ai/session', // GET /ai/session/{sessionId}/messages
    AUDIT: '/ai/audit',
    REBALANCE: '/ai/rebalance',
    SENTIMENT: '/ai/sentiment',
  },
  MARKET: {
    BENCHMARKS: '/market/benchmarks',
    TOP_GAINERS: '/market/top-gainers',
    TOP_LOSERS: '/market/top-losers',
    FEED: '/market/feed',
    MARKET_CAP: '/market/market-cap',
    MARKET_CAPS: '/market/market-caps',
    CANDLES_INTRADAY: '/market/candles/intraday',
    CANDLES_HISTORY: '/market/candles/history',
  },
  INSTRUMENTS: {
    SEARCH: '/instruments/search',
    RESOLVE: '/instruments/resolve',
  }
};

// --- TOKEN MANAGEMENT ---
export const setToken = (token: string) => {
  if (!token) return;
  localStorage.setItem('jwt_token', token);
};

export const getToken = () => {
  return localStorage.getItem('jwt_token');
};

export const clearToken = () => {
  localStorage.removeItem('jwt_token');
};

export const getHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

// Helper to simulate network latency for UI testing (mock mode)
export const simulateDelay = (ms: number = 800) => new Promise(resolve => setTimeout(resolve, ms));
