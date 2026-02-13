
import { authService } from './authService';
import { portfolioService } from './portfolioService';
import { transactionService } from './transactionService';
import { watchlistService } from './watchlistService';
import { goalService } from './goalService';
import { newsService } from './newsService';
import { marketService } from './marketService';
import { websocketService } from './websocketService';

// Export a unified API object for the application to use
export const api = {
  auth: authService,
  portfolio: portfolioService,
  transactions: transactionService,
  watchlist: watchlistService,
  goals: goalService,
  news: newsService,
  market: marketService,
  ws: websocketService
};
