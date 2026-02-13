import { BASE_URL, getHeaders } from './apiConfig';

export const newsService = {
  /**
   * Get news feed with optional filtering by impact category
   * @param tab - 'all' | 'bullish' | 'bearish' | 'neutral'
   * @param limit - Number of articles to fetch
   * @param page - Page number for pagination
   */
  getFeed: async (tab: string = 'all', limit: number = 20, page: number = 1) => {
    try {
      const response = await fetch(
        `${BASE_URL}/news/feed?tab=${tab}&limit=${limit}&page=${page}`,
        {
          headers: getHeaders()
        }
      );
      if (!response.ok) {
        throw new Error(`Feed API failed: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('[newsService] getFeed error:', error);
      throw error;
    }
  },

  /**
   * Search news articles by query
   * @param query - Search query string
   * @param limit - Number of results to return
   */
  search: async (query: string, limit: number = 10) => {
    try {
      const response = await fetch(
        `${BASE_URL}/news/search?q=${encodeURIComponent(query)}&limit=${limit}`,
        {
          headers: getHeaders()
        }
      );
      if (!response.ok) {
        throw new Error(`Search API failed: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('[newsService] search error:', error);
      throw error;
    }
  }
};
