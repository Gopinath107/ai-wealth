
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { AssetType, Asset, Portfolio as PortfolioType, InvestmentGoal, RebalancingSuggestion, WatchlistItem } from '../types';
import { auditPortfolio, getRebalancingSuggestions } from '../services/geminiService';
import { api } from '../services/api';
import { ArrowUpRight, ArrowDownRight, Sparkles, Loader2, Download, Search, RefreshCw, Eye, Plus, Minus, History, Filter, X, ChevronDown, Check, DollarSign, BarChart3, TrendingUp as TrendingUpIcon, BrainCircuit, Activity, ShieldAlert, Wifi, WifiOff } from 'lucide-react';

const AssetLogo = ({ asset }: { asset: Asset }) => {
  const [imgError, setImgError] = useState(false);

  const getLogoUrl = () => {
    if (asset.type === AssetType.Crypto) {
        if (asset.symbol === 'BTC') return 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png';
        if (asset.symbol === 'ETH') return 'https://assets.coingecko.com/coins/images/279/large/ethereum.png';
        if (asset.symbol === 'SOL') return 'https://assets.coingecko.com/coins/images/4128/large/solana.png';
    }
    const namePart = asset.name ? asset.name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '') : 'stock';
    return `https://logo.clearbit.com/${namePart}.com`;
  };

  if (imgError || !asset.symbol) {
    return (
      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-sm">
         {asset.symbol ? asset.symbol[0] : '?'}
      </div>
    );
  }

  return (
    <img 
      src={getLogoUrl()} 
      alt={asset.symbol}
      className="w-10 h-10 rounded-full object-cover bg-white dark:bg-white border border-slate-200 dark:border-slate-700 shadow-sm"
      onError={() => setImgError(true)}
    />
  );
};

interface PortfolioProps {
  portfolio: PortfolioType; 
  goals?: InvestmentGoal[];
  livePrices?: Record<string, number>;
  onBuy: (asset: any) => void;
  onSell: (asset: any) => void;
  onViewDetails: (asset: any) => void;
  onExecuteRebalance: (suggestions: RebalancingSuggestion[]) => void;
  onViewTransactions: () => void;
  onAddAsset: (asset: any) => void;
  isLoading?: boolean;
}

const Portfolio: React.FC<PortfolioProps> = ({ portfolio, goals, livePrices = {}, onBuy, onSell, onViewDetails, onExecuteRebalance, onViewTransactions, onAddAsset, isLoading }) => {
  const [auditResult, setAuditResult] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [rebalanceSuggestions, setRebalanceSuggestions] = useState<any[]>([]);
  const [showRebalanceModal, setShowRebalanceModal] = useState(false);

  // Add Asset State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [symbolQuery, setSymbolQuery] = useState('');
  const [symbolSuggestions, setSymbolSuggestions] = useState<any[]>([]);
  const [isSearchingSymbols, setIsSearchingSymbols] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [newAsset, setNewAsset] = useState<{
      symbol: string; name: string; type: AssetType; quantity: number; price: number
  }>({
      symbol: '', name: '', type: AssetType.Stock, quantity: 1, price: 0
  });

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (symbolQuery.trim().length > 1 && isAddModalOpen) {
        setIsSearchingSymbols(true);
        try {
          const results = await api.market.searchStocks(symbolQuery);
          setSymbolSuggestions(results);
          setShowSuggestions(true);
        } catch (e) {
          console.error(e);
        } finally {
          setIsSearchingSymbols(false);
        }
      } else {
        setSymbolSuggestions([]);
        setShowSuggestions(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [symbolQuery, isAddModalOpen]);

  const handleSelectSuggestion = (stock: any) => {
    setNewAsset({
      ...newAsset,
      symbol: stock.symbol,
      name: stock.name,
      price: stock.price,
      quantity: 1
    });
    setSymbolQuery(stock.symbol);
    setShowSuggestions(false);
  };

  const handleAudit = async () => {
    if (isAuditing || !portfolio) return;
    setIsAuditing(true);
    setAuditResult(null);
    const result = await auditPortfolio(portfolio);
    setAuditResult(result);
    setIsAuditing(false);
  };

  const handleRebalance = async () => {
    if (isRebalancing || !portfolio) return;
    setIsRebalancing(true);
    const suggestions = await getRebalancingSuggestions(portfolio);
    setRebalanceSuggestions(suggestions);
    setIsRebalancing(false);
    setShowRebalanceModal(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      // Basic validation
      if (!newAsset.symbol || newAsset.quantity <= 0) {
          alert("Please enter valid symbol and quantity.");
          return;
      }
      
      setIsAddingAsset(true);
      try {
        // Ensure name fallback if manual entry
        const assetPayload = {
            ...newAsset,
            name: newAsset.name || newAsset.symbol
        };
        await onAddAsset(assetPayload);
        setIsAddModalOpen(false);
        setNewAsset({ symbol: '', name: '', type: AssetType.Stock, quantity: 1, price: 0 });
        setSymbolQuery('');
      } catch (e) {
        console.error("Failed to add asset", e);
      } finally {
        setIsAddingAsset(false);
      }
  };

  const handleExport = () => {
    if (!portfolio) return;
    const headers = ["Symbol", "Name", "Type", "Quantity", "Price", "Value", "24h Change %"];
    const rows = portfolio.assets.map((a: any) => [
      a.symbol, a.name, a.type, a.quantity, (livePrices[a.id] || a.price).toFixed(2), ((livePrices[a.id] || a.price) * a.quantity).toFixed(2), a.change24h.toFixed(2)
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `dj-ai_portfolio_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredAssets = portfolio ? portfolio.assets.filter((asset: any) => {
    const matchesSearch = asset.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || asset.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || asset.type === filterType;
    const val = asset.value;
    const min = minValue ? parseFloat(minValue) : -Infinity;
    const max = maxValue ? parseFloat(maxValue) : Infinity;
    return matchesSearch && matchesType && val >= min && val <= max;
  }) : [];

  const TableSkeleton = () => (
      <>
        {[1, 2, 3, 4, 5, 6].map(i => (
            <tr key={i} className="animate-pulse border-b border-slate-50 dark:border-slate-800">
                <td className="px-6 py-4"><div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto"></div></td>
                <td className="px-6 py-4"><div className="space-y-2"><div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div><div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div></div></td>
                <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded ml-auto"></div></td>
                <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded ml-auto"></div></td>
                <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded ml-auto"></div></td>
                <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded ml-auto"></div></td>
                <td className="px-6 py-4"><div className="flex justify-center gap-2"><div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-lg"></div><div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-lg"></div></div></td>
            </tr>
        ))}
      </>
  );

  return (
    <div className="space-y-6 animate-fade-in relative pb-20">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Portfolio Holdings</h2>
            <p className="text-slate-500 dark:text-slate-400">Real-time tracking and management.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <button onClick={() => setIsAddModalOpen(true)} disabled={isLoading || !portfolio} className="flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2.5 rounded-lg font-medium shadow-sm transition-all text-sm disabled:opacity-50">
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Asset</span>
             </button>
             <button onClick={onViewTransactions} disabled={isLoading} className="flex items-center justify-center space-x-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2.5 rounded-lg font-medium shadow-sm transition-all text-sm disabled:opacity-50">
                <History className="w-4 h-4" /> <span className="hidden sm:inline">History</span>
             </button>
             <button onClick={handleExport} disabled={isLoading || !portfolio} className="flex items-center justify-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2.5 rounded-xl font-semibold shadow-sm transition-all text-sm disabled:opacity-50">
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export</span>
            </button>
            <button onClick={handleAudit} disabled={isLoading || isAuditing || !portfolio} className="flex items-center justify-center gap-2 bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 hover:brightness-110 text-white px-5 py-2.5 rounded-xl font-bold shadow-xl shadow-blue-200 dark:shadow-none transition-all disabled:opacity-70 text-sm">
              {isAuditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} <span>{isAuditing ? 'Analyzing...' : 'AI Deep Audit'}</span>
            </button>
          </div>
        </div>

        {auditResult && (
           <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm animate-slide-up relative">
              <button onClick={() => setAuditResult(null)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white"><X className="w-5 h-5"/></button>
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="w-6 h-6 text-indigo-600" />
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">AI Audit Intelligence</h3>
              </div>
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <ReactMarkdown>{auditResult}</ReactMarkdown>
              </div>
           </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search assets..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                disabled={isLoading || !portfolio} 
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:cursor-not-allowed" 
              />
            </div>
            <div className="flex gap-2">
                <div className="relative w-full sm:w-48">
                    <select 
                        value={filterType} 
                        onChange={(e) => setFilterType(e.target.value)} 
                        disabled={isLoading || !portfolio} 
                        className="w-full pl-3 pr-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm appearance-none cursor-pointer dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:cursor-not-allowed"
                    >
                        <option value="All">All Types</option>
                        <option value={AssetType.Stock}>Stocks</option>
                        <option value={AssetType.Crypto}>Crypto</option>
                        <option value={AssetType.Bond}>Bonds</option>
                        <option value={AssetType.Cash}>Cash</option>
                    </select>
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                </div>
                <div className="relative">
                   <button 
                        onClick={() => setShowFilters(!showFilters)} 
                        disabled={isLoading}
                        className={`h-full px-4 py-3 border rounded-xl flex items-center gap-2 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${showFilters ? 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white'}`}
                   >
                      <Filter className="w-4 h-4" /> <span className="hidden sm:inline">Range</span> <ChevronDown className={`w-3 h-3 ${showFilters ? 'rotate-180' : ''}`} />
                   </button>
                   {showFilters && (
                     <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-4 z-20 animate-fade-in">
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3">Asset Value ($)</h4>
                        <div className="flex items-center gap-2 mb-3">
                           <input type="number" placeholder="Min" value={minValue} onChange={(e) => setMinValue(e.target.value)} className="w-full p-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" />
                           <span className="text-slate-400">-</span>
                           <input type="number" placeholder="Max" value={maxValue} onChange={(e) => setMaxValue(e.target.value)} className="w-full p-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" />
                        </div>
                        <button onClick={() => { setMinValue(''); setMaxValue(''); }} className="w-full text-xs text-indigo-600 dark:text-indigo-400 hover:underline text-center">Clear Range</button>
                     </div>
                   )}
                </div>
            </div>
        </div>
      </div>

      {/* Add Asset Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6 relative border border-slate-200 dark:border-slate-800">
              <button onClick={() => setIsAddModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="w-5 h-5"/></button>
              <h3 className="text-xl font-bold mb-1 dark:text-white">Add New Asset</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Manually track an asset in your portfolio.</p>
              
              <form onSubmit={handleAddSubmit} className="space-y-4">
                  {/* Symbol Search */}
                  <div className="relative">
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Symbol</label>
                      <input 
                          type="text" 
                          required
                          value={symbolQuery} 
                          onChange={e => { setSymbolQuery(e.target.value.toUpperCase()); setNewAsset({...newAsset, symbol: e.target.value.toUpperCase()}); }}
                          placeholder="e.g. AAPL, BTC"
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold dark:text-white"
                          autoFocus
                      />
                      {showSuggestions && symbolSuggestions.length > 0 && (
                          <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                              {symbolSuggestions.map((s, i) => (
                                  <div key={i} onClick={() => handleSelectSuggestion(s)} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0">
                                      <div className="font-bold text-sm dark:text-white">{s.symbol}</div>
                                      <div className="text-xs text-slate-500 dark:text-slate-400">{s.name}</div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>

                  {/* Asset Type Selector */}
                  <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Type</label>
                      <select 
                        value={newAsset.type} 
                        onChange={(e) => setNewAsset({...newAsset, type: e.target.value as AssetType})}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold dark:text-white"
                      >
                          <option value={AssetType.Stock}>Stock</option>
                          <option value={AssetType.Crypto}>Crypto</option>
                          <option value={AssetType.Bond}>Bond</option>
                          <option value={AssetType.RealEstate}>Real Estate</option>
                          <option value={AssetType.Cash}>Cash</option>
                      </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Quantity</label>
                          <input type="number" step="any" required min="0.000001" value={newAsset.quantity} onChange={e => setNewAsset({...newAsset, quantity: parseFloat(e.target.value)})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold dark:text-white" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Avg Price</label>
                          <input type="number" step="any" required min="0" value={newAsset.price} onChange={e => setNewAsset({...newAsset, price: parseFloat(e.target.value)})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold dark:text-white" />
                      </div>
                  </div>
                  <button type="submit" disabled={isAddingAsset} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 mt-4 shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-70 disabled:cursor-not-allowed">
                      {isAddingAsset ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                      {isAddingAsset ? 'Adding...' : 'Add to Portfolio'}
                  </button>
              </form>
           </div>
        </div>
      )}

      {/* Main Asset View */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-16 text-center hidden md:table-cell">Identity</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Holding</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Market Price</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right hidden sm:table-cell">Quantity</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right hidden md:table-cell">Net Value</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right hidden sm:table-cell">24H Trend</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {isLoading || !portfolio ? (
                <TableSkeleton />
              ) : filteredAssets.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400 dark:text-slate-500 font-medium">No matching assets found.</td></tr>
              ) : (
                filteredAssets.map((asset: any) => {
                  const livePrice = livePrices[asset.id] || asset.price;
                  return (
                    <tr key={asset.id} className={`hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all group cursor-pointer`} onClick={() => onViewDetails(asset)}>
                      <td className="px-6 py-6 text-center hidden md:table-cell"><div className="flex justify-center"><AssetLogo asset={asset} /></div></td>
                      <td className="px-6 py-6">
                        <div>
                            <div className="font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{asset.symbol}</div>
                            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">{asset.name}</div>
                        </div>
                      </td>
                      <td className={`px-6 py-6 text-right text-sm font-black transition-all duration-300 text-slate-700 dark:text-slate-300`}>
                        ${livePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-6 text-right hidden sm:table-cell">
                        <div className="text-sm font-black text-slate-900 dark:text-slate-200">{asset.quantity.toLocaleString()}</div>
                        <div className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">{asset.type}</div>
                      </td>
                      <td className="px-6 py-6 text-right text-sm font-black text-slate-900 dark:text-slate-200 hidden md:table-cell">
                        ${(livePrice * asset.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-6 text-right hidden sm:table-cell">
                        <div className={`flex items-center justify-end text-sm font-black ${asset.change24h >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {asset.change24h >= 0 ? <ArrowUpRight className="w-4 h-4 mr-0.5"/> : <ArrowDownRight className="w-4 h-4 mr-0.5"/>}
                          {Math.abs(asset.change24h).toFixed(2)}%
                        </div>
                      </td>
                      <td className="px-6 py-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => onViewDetails(asset)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all"><Eye className="w-4.5 h-4.5" /></button>
                          {asset.type !== AssetType.Cash && (
                            <>
                              <button onClick={() => onBuy(asset)} className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all"><Plus className="w-4.5 h-4.5" /></button>
                              <button onClick={() => onSell(asset)} className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all"><Minus className="w-4.5 h-4.5" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
