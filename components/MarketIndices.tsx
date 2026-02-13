
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { isMarketOpen, getMarketStatus } from '../services/apiConfig';
import { TrendingUp, TrendingDown, Activity, RefreshCw } from 'lucide-react';

interface MarketIndicesProps {
  variant?: 'dashboard' | 'login';
}

const MarketIndices: React.FC<MarketIndicesProps> = ({ variant = 'dashboard' }) => {
  const [indices, setIndices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [marketStatus, setMarketStatus] = useState(getMarketStatus());

  const fetchIndices = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.market.getIndices();
      if (Array.isArray(data) && data.length > 0) {
        setIndices(data);
      }
    } catch (e) {
      console.error("Failed to fetch indices", e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchIndices();
    setMarketStatus(getMarketStatus());

    // Check market status every minute
    const statusInterval = setInterval(() => {
      setMarketStatus(getMarketStatus());
    }, 60000);

    // Only poll during market hours
    let dataInterval: NodeJS.Timeout | null = null;

    if (isMarketOpen()) {
      dataInterval = setInterval(() => {
        fetchIndices(true);
      }, 3000); // Poll every 3 seconds during market hours
    }

    return () => {
      clearInterval(statusInterval);
      if (dataInterval) clearInterval(dataInterval);
    };
  }, [fetchIndices]);

  const handleManualRefresh = () => {
    fetchIndices();
  };

  if (variant === 'login') {
    return (
      <div className="w-full mt-8 animate-fade-in">
        <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
          <Activity className={`w-4 h-4 ${marketStatus.isOpen ? 'text-emerald-400' : 'text-slate-400'}`} />
          {marketStatus.isOpen ? 'Live Market Pulse' : `Market ${marketStatus.message}`}
        </h3>
        <div className="space-y-3">
          {indices.map((idx) => (
            <div key={idx.name} className="flex items-center justify-between bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-xl transition-all hover:bg-white/15">
              <div>
                <div className="text-white/80 text-[10px] font-bold uppercase tracking-wider">{idx.name}</div>
                <div className="text-white font-mono font-bold text-lg">{idx.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold ${idx.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {idx.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(idx.percent).toFixed(2)}%
              </div>
            </div>
          ))}
          {indices.length === 0 && (
            <div className="text-white/40 text-xs animate-pulse italic">Connecting to exchange feeds...</div>
          )}
        </div>
      </div>
    );
  }

  // Default Dashboard Layout
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded ${marketStatus.isOpen
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}>
            <Activity className="w-3 h-3" /> {marketStatus.message}
          </span>
        </div>
        <button
          onClick={handleManualRefresh}
          className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-3 h-3 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {indices.map((idx) => (
          <div key={idx.name} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center relative overflow-hidden group hover:shadow-md transition-all">
            <div className={`absolute top-0 left-0 w-1 h-full transition-colors ${idx.change >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{idx.name}</h3>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
              {idx.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`flex items-center gap-1 text-sm font-bold mt-1 ${idx.change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {idx.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(idx.change).toFixed(2)} ({Math.abs(idx.percent).toFixed(2)}%)
            </div>
          </div>
        ))}
        {indices.length === 0 && (
          <div className="col-span-3 text-center p-4 text-slate-400 text-sm animate-pulse">Loading Market Indices...</div>
        )}
      </div>
    </div>
  );
};

export default MarketIndices;
