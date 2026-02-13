
import React, { useState, useEffect, useCallback } from 'react';
import { MarketStockUI } from '../types';
import { api } from '../services/api';
import { isMarketOpen, getMarketStatus } from '../services/apiConfig';
import { TrendingUp, TrendingDown, Search, RefreshCw, Activity, ArrowUpRight, ArrowDownRight, Globe } from 'lucide-react';

// Format market cap to Indian Crore/Lakh format
const formatMarketCap = (marketCap: string | number | undefined): string => {
  if (!marketCap) return '-';

  // If it's already a string (formatted), return as is
  if (typeof marketCap === 'string') return marketCap;

  // Convert number to Indian format (Crores)
  const inCrores = marketCap / 10000000; // 1 Crore = 10 million

  if (inCrores >= 100000) {
    return `₹${(inCrores / 100000).toFixed(2)}L Cr`; // Lakh Crores
  } else if (inCrores >= 1000) {
    return `₹${(inCrores / 1000).toFixed(2)}K Cr`; // Thousand Crores  
  } else if (inCrores >= 1) {
    return `₹${inCrores.toFixed(2)} Cr`;
  } else {
    const inLakhs = marketCap / 100000; // 1 Lakh = 100 thousand
    return `₹${inLakhs.toFixed(2)} L`;
  }
};

interface MarketOverviewProps {
  onViewDetails?: (stock: MarketStockUI) => void;
}

const MarketOverview: React.FC<MarketOverviewProps> = ({ onViewDetails }) => {
  const [stocks, setStocks] = useState<MarketStockUI[]>([]);
  const [marketStats, setMarketStats] = useState<{ gainers: MarketStockUI[], losers: MarketStockUI[] }>({ gainers: [], losers: [] });
  const [limit, setLimit] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [marketStatus, setMarketStatus] = useState(getMarketStatus());

  // Fetch stocks with proper backend data handling
  const fetchStocks = useCallback(async (n: number, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.market.getTopStocks(n);
      if (Array.isArray(data) && data.length > 0) {
        setStocks(data);
        setLastUpdated(new Date());
      }
    } catch (e) {
      console.error('Failed to fetch stocks:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Fetch gainers/losers stats
  const fetchStats = useCallback(async (silent = false) => {
    if (!silent) setLoadingStats(true);
    try {
      const stats = await api.market.getMarketStats();
      if (stats && stats.gainers && stats.losers) {
        setMarketStats(stats);
      }
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    } finally {
      if (!silent) setLoadingStats(false);
    }
  }, []);

  // Initial Load - fetch once
  useEffect(() => {
    fetchStocks(limit);
    fetchStats();
    setMarketStatus(getMarketStatus());
  }, [limit, fetchStocks, fetchStats]);

  // Auto-refresh ONLY during market hours (9:15 AM - 3:30 PM IST)
  useEffect(() => {
    if (isSearching) return;

    // Check market status periodically
    const statusInterval = setInterval(() => {
      setMarketStatus(getMarketStatus());
    }, 60000); // Check every minute

    // Only poll if market is open
    let dataInterval: NodeJS.Timeout | null = null;

    if (isMarketOpen()) {
      dataInterval = setInterval(() => {
        fetchStocks(limit, true);
        fetchStats(true);
      }, 5000); // Poll every 5 seconds during market hours
    }

    return () => {
      clearInterval(statusInterval);
      if (dataInterval) clearInterval(dataInterval);
    };
  }, [limit, isSearching, fetchStocks, fetchStats]);

  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch(searchQuery);
      } else if (isSearching) {
        fetchStocks(limit);
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, limit, isSearching, fetchStocks]);

  const handleSearch = async (q: string) => {
    setLoading(true);
    setIsSearching(true);
    try {
      const data = await api.market.searchStocks(q);
      if (Array.isArray(data)) {
        setStocks(data);
      }
    } catch (e) {
      console.error('Search failed:', e);
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh handler
  const handleManualRefresh = () => {
    fetchStocks(limit);
    fetchStats();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Gainers & Losers Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gainers */}
        <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-xl p-4 relative overflow-hidden">
          {loadingStats && <div className="absolute inset-0 bg-white/50 dark:bg-black/50 z-10 animate-pulse"></div>}
          <h3 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase mb-3 flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4" /> Top 5 Gainers (Indian Market)
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {marketStats.gainers.map(s => (
              <div
                key={s.symbol}
                onClick={() => onViewDetails?.(s)}
                className="flex-shrink-0 bg-white dark:bg-slate-900 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/50 shadow-sm min-w-[130px] hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-black text-slate-900 dark:text-white text-sm group-hover:text-emerald-600 transition-colors">{s.symbol}</span>
                  <span className="text-[10px] font-black text-emerald-600">+{s.changePercent.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between items-end">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">₹{s.price.toFixed(1)}</div>
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                </div>
              </div>
            ))}
            {marketStats.gainers.length === 0 && <div className="text-xs text-slate-400">Loading market data...</div>}
          </div>
        </div>

        {/* Losers */}
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30 rounded-xl p-4 relative overflow-hidden">
          {loadingStats && <div className="absolute inset-0 bg-white/50 dark:bg-black/50 z-10 animate-pulse"></div>}
          <h3 className="text-xs font-bold text-red-800 dark:text-red-400 uppercase mb-3 flex items-center gap-2">
            <ArrowDownRight className="w-4 h-4" /> Top 5 Losers (Indian Market)
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {marketStats.losers.map(s => (
              <div
                key={s.symbol}
                onClick={() => onViewDetails?.(s)}
                className="flex-shrink-0 bg-white dark:bg-slate-900 p-3 rounded-lg border border-red-200 dark:border-red-800/50 shadow-sm min-w-[130px] hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-black text-slate-900 dark:text-white text-sm group-hover:text-red-600 transition-colors">{s.symbol}</span>
                  <span className="text-[10px] font-black text-red-600">{s.changePercent.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between items-end">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">₹{s.price.toFixed(1)}</div>
                  <TrendingDown className="w-3 h-3 text-red-500" />
                </div>
              </div>
            ))}
            {marketStats.losers.length === 0 && <div className="text-xs text-slate-400">Loading market data...</div>}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-lg">Indian Market Feed</h2>
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">NSE / BSE Real-time Stream</p>
                <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${marketStatus.isOpen
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50 animate-pulse'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                  <Activity className="w-3 h-3" /> {marketStatus.message}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Manual Refresh Button */}
            <button
              onClick={handleManualRefresh}
              className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {!isSearching && (
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start sm:self-center">
                {[10, 20, 50].map((l) => (
                  <button
                    key={l}
                    onClick={() => setLimit(l)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${limit === l ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search symbol or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 w-full sm:w-64 transition-all text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto relative min-h-[200px]">
          {loading ? (
            <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 z-10 flex flex-col justify-center items-center gap-2 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
              <span className="text-sm">Updating live stream...</span>
            </div>
          ) : stocks.length === 0 ? (
            <div className="p-16 text-center text-slate-400 bg-slate-50 dark:bg-slate-900/50">
              <div className="max-w-xs mx-auto">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No results found for "{searchQuery}"</p>
                <p className="text-xs mt-1">Try entering a different ticker or company name.</p>
              </div>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4 text-right">Price (₹)</th>
                  <th className="px-6 py-4 text-right">24h Change</th>
                  <th className="px-6 py-4 text-right hidden sm:table-cell">Mkt Cap</th>
                  <th className="px-6 py-4 text-center hidden sm:table-cell">Exchange</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {stocks.map((stock) => (
                  <tr
                    key={stock.symbol}
                    onClick={() => onViewDetails?.(stock)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      <div className="flex flex-col">
                        <span className="font-bold group-hover:text-orange-500 transition-colors">{stock.symbol}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-normal truncate max-w-[200px]">{stock.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono transition-colors duration-300 dark:text-slate-300">
                      ₹{stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={`flex items-center justify-end gap-1 font-bold ${stock.change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {stock.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {stock.changePercent.toFixed(2)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                      {formatMarketCap(stock.marketCap)}
                    </td>
                    <td className="px-6 py-4 text-center hidden sm:table-cell">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700">
                        {stock.exchange}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!isSearching && stocks.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-800/30 px-6 py-3 border-t border-slate-100 dark:border-slate-800 text-[10px] flex justify-between items-center text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
            <span>Market Overview: Top {stocks.length} entities</span>
            <span>Sync: {lastUpdated.toLocaleTimeString()}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketOverview;
