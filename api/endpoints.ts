
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    SIGNUP: '/auth/signup',
    LOGOUT: '/auth/logout',
  },
  PORTFOLIO: {
    GET: '/portfolio',
    TRADE: '/portfolio/trade', // Buy/Sell
    ADD_ASSET: '/portfolio/assets',
  },
  TRANSACTIONS: {
    GET_ALL: '/transactions',
    UPDATE: '/transactions/:id',
  },
  WATCHLIST: {
    GET_ALL: '/watchlist',
    ADD: '/watchlist/add',
    REMOVE: '/watchlist/:id',
  },
  GOALS: {
    GET_ALL: '/goals',
    ADD: '/goals',
    DELETE: '/goals/:id',
  },
  NEWS: {
    GET_ALL: '/news',
  }
};
