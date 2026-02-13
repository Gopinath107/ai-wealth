

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { newsService } from '../services/newsService';
import { Newspaper, ExternalLink, Loader2, X, Search, AlertCircle, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { NewsItem } from '../types';

interface NewsFeedProps {
  isLoading?: boolean;
}

// Helper to format time ago
const formatTimeAgo = (publishedAt: string): string => {
  const now = new Date().getTime();
  const published = new Date(publishedAt).getTime();
  const diffMs = now - published;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

const NewsFeed: React.FC<NewsFeedProps> = () => {
  // Data state
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NewsItem[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Filter state
  const [filter, setFilter] = useState<'All' | 'Bullish' | 'Bearish' | 'Neutral'>('All');

  // Expanded article state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Ref to prevent double API calls in StrictMode
  const hasLoadedRef = useRef(false);

  // Load news feed on mount
  useEffect(() => {
    // Prevent double call in React StrictMode (dev only)
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const loadFeed = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await newsService.getFeed('all', 20, 1);
        console.log('[NewsFeed] API response:', response);

        // Handle different response structures
        let newsData: NewsItem[] = [];
        if (Array.isArray(response)) {
          newsData = response;
        } else if (response && Array.isArray(response.result)) {
          newsData = response.result;
        } else if (response && Array.isArray(response.data)) {
          newsData = response.data;
        } else if (response && Array.isArray(response.news)) {
          newsData = response.news;
        } else if (response && Array.isArray(response.content)) {
          newsData = response.content;
        } else {
          console.warn('[NewsFeed] Unexpected response structure:', response);
          newsData = [];
        }

        setNews(newsData);
      } catch (err) {
        console.error('[NewsFeed] Failed to load:', err);
        setError('Failed to load news. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    loadFeed();
  }, []);

  // Search handler
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const response = await newsService.search(searchQuery, 10);
      console.log('[NewsFeed] Search response:', response);

      // Handle different response structures
      let searchData: NewsItem[] = [];
      if (Array.isArray(response)) {
        searchData = response;
      } else if (response && Array.isArray(response.result)) {
        searchData = response.result;
      } else if (response && Array.isArray(response.data)) {
        searchData = response.data;
      } else if (response && Array.isArray(response.news)) {
        searchData = response.news;
      } else if (response && Array.isArray(response.content)) {
        searchData = response.content;
      } else {
        console.warn('[NewsFeed] Unexpected search response:', response);
        searchData = [];
      }

      setSearchResults(searchData);
    } catch (err) {
      console.error('[NewsFeed] Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  // Retry handler
  const handleRetry = () => {
    setNews([]);
    setError(null);
    setIsLoading(true);
    newsService.getFeed('all', 20, 1)
      .then(data => setNews(data))
      .catch(err => setError('Failed to load news'))
      .finally(() => setIsLoading(false));
  };

  // Filtered news based on tab
  const filteredNews = useMemo(() => {
    const source = searchResults || news;
    if (filter === 'All') return source;
    return source.filter(article => article.aiImpactLabel === filter);
  }, [filter, news, searchResults]);

  // Impact label styling
  const getImpactStyles = (label: string) => {
    switch (label) {
      case 'Bullish':
        return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'Bearish':
        return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'Neutral':
        return 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
      default:
        return 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getImpactIcon = (label: string) => {
    switch (label) {
      case 'Bullish': return <TrendingUp className="w-4 h-4" />;
      case 'Bearish': return <TrendingDown className="w-4 h-4" />;
      default: return <Minus className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Market News
            {searchResults && <span className="bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full">SEARCH RESULTS</span>}
          </h2>
          <p className="text-slate-500 dark:text-slate-400">AI-powered news analysis with market impact insights</p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="relative w-full sm:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search news (e.g. 'Fed Rate Cut')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-10 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-sm dark:text-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
        {(['All', 'Bullish', 'Bearish', 'Neutral'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all border whitespace-nowrap ${filter === tab
              ? 'bg-slate-900 dark:bg-indigo-600 text-white border-transparent shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-700 dark:text-red-300 font-medium mb-3">{error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* News Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
        {isLoading || isSearching ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 animate-pulse">
              <div className="flex justify-between mb-3">
                <div className="w-20 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="w-12 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
              <div className="w-full h-8 bg-slate-200 dark:bg-slate-800 rounded mb-3" />
              <div className="w-full h-20 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          ))
        ) : filteredNews.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
            <Newspaper className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              {searchQuery ? `No news found for "${searchQuery}"` : 'No news available'}
            </p>
            {searchQuery && (
              <button onClick={handleClearSearch} className="mt-2 text-indigo-600 dark:text-indigo-400 text-sm font-bold hover:underline">
                Clear Search
              </button>
            )}
          </div>
        ) : (
          filteredNews.map(article => {
            const isExpanded = expandedId === article.id;
            return (
              <div
                key={article.id}
                className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-md transition-all"
              >
                {/* Image */}
                {article.imageUrl && (
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    className="w-full h-48 object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}

                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">{article.source}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500 dark:text-slate-400">{formatTimeAgo(article.publishedAt)}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 leading-tight">{article.title}</h3>

                  {/* Description */}
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-3">{article.description}</p>

                  {/* AI Impact Badge */}
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border mb-4 ${getImpactStyles(article.aiImpactLabel)}`}>
                    {getImpactIcon(article.aiImpactLabel)}
                    AI Impact: {article.aiImpactLabel}
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="mt-4 space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                      {/* AI Summary */}
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800">
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-2">
                          <Sparkles className="w-4 h-4" />
                          AI Analysis
                        </div>
                        <p className="text-sm text-indigo-900 dark:text-indigo-100">{article.aiImpactSummary}</p>
                      </div>

                      {/* Key Points */}
                      {article.aiKeyPoints && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Key Points</h4>
                          <ul className="space-y-1">
                            {article.aiKeyPoints.split('\n').filter(p => p.trim()).map((point, i) => (
                              <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                                <span className="text-indigo-500 mt-1">•</span>
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Disclaimer */}
                      {article.disclaimer && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic border-t border-slate-100 dark:border-slate-800 pt-3">
                          {article.disclaimer}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 mt-4">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : article.id)}
                      className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {isExpanded ? 'Show Less' : 'Show AI Analysis'}
                    </button>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto flex items-center gap-1.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Read Article
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NewsFeed;
