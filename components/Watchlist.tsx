
import React, { useState, useEffect, useRef } from 'react';
import { WatchlistItem, InstrumentSearch } from '../types';
import { ArrowUpRight, ArrowDownRight, Eye, Star, Search, Trash2, ShoppingCart, Activity, Filter, Plus, X, Loader2, MinusSquare } from 'lucide-react';
import { watchlistService } from '../services/watchlistService';
import { marketService } from '../services/marketService';
import { isMarketOpen } from '../services/apiConfig';

// No props needed - component manages its own data
interface WatchlistProps {
  onViewDetails?: (item: WatchlistItem) => void;  // Optional callback to open asset details modal
}

const Watchlist: React.FC<WatchlistProps> = ({ onViewDetails }) => {
  // Local data management
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});

  const [searchTerm, setSearchTerm] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Real-time data state
  const [flashStates, setFlashStates] = useState<Record<string, 'green' | 'red' | undefined>>({});
  const lastPricesRef = useRef<Record<string, number>>({});

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<InstrumentSearch[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentSearch | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load watchlist data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await watchlistService.getAll();
        setWatchlist(data);
      } catch (error) {
        console.error('[Watchlist] Failed to load:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // TODO: Add real-time price updates during market hours
  // useEffect for WebSocket connection can be added later

  // Sync flash states with livePrices
  useEffect(() => {
    const newFlashes: Record<string, 'green' | 'red'> = {};
    let hasChanges = false;

    Object.keys(livePrices).forEach(id => {
      const prev = lastPricesRef.current[id];
      const curr = livePrices[id];
      if (prev !== undefined && curr !== prev) {
        newFlashes[id] = curr > prev ? 'green' : 'red';
        hasChanges = true;
      }
      lastPricesRef.current[id] = curr;
    });

    if (hasChanges) {
      setFlashStates(prev => ({ ...prev, ...newFlashes }));
      const timer = setTimeout(() => setFlashStates({}), 1000);
      return () => clearTimeout(timer);
    }
  }, [livePrices]);

  const filteredList = watchlist.map(item => {
    const price = livePrices[item.id] || item.price;
    return { ...item, price };
  }).filter(item => {
    const matchesSearch = item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMin = minPrice ? item.price >= parseFloat(minPrice) : true;
    const matchesMax = maxPrice ? item.price <= parseFloat(maxPrice) : true;
    return matchesSearch && matchesMin && matchesMax;
  });

  // Debounced search handler  
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewSymbol(value);
    setSelectedInstrument(null);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!value.trim()) {
      setSearchResults([]);
      return;
    }

    // Debounce search by 300ms
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await marketService.searchInstruments(value, 10);
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  // Select a result from search dropdown
  const selectSearchResult = (instrument: InstrumentSearch) => {
    setSelectedInstrument(instrument);
    setNewSymbol(instrument.symbol);
    setSearchResults([]);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstrument) return;

    setIsAdding(true);
    try {
      await watchlistService.add(selectedInstrument.symbol);
      // Reload watchlist
      const updated = await watchlistService.getAll();
      setWatchlist(updated);
    } catch (error) {
      console.error('[Watchlist] Failed to add:', error);
    } finally {
      setIsAdding(false);
      setNewSymbol('');
      setSelectedInstrument(null);
      setSearchResults([]);
      setIsAddModalOpen(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await watchlistService.remove(id);
      setWatchlist(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('[Watchlist] Failed to remove:', error);
    }
  };

  const handleBuy = (item: WatchlistItem) => {
    console.log('[Watchlist] Buy clicked for:', item.symbol);
    // In future, can open a buy modal or navigate to trading page
  };

  const handleViewDetails = (item: WatchlistItem) => {
    if (onViewDetails) {
      onViewDetails(item);
    } else {
      console.log('[Watchlist] View details for:', item.symbol);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Watchlist</h2>
          <p className="text-slate-500 dark:text-slate-400">Track potential investment opportunities with live updates.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search watchlist..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-slate-100 dark:disabled:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${showFilters ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'}`}
            >
              <Filter className="w-4 h-4" /> Filters
            </button>
            {showFilters && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-4 z-10 animate-fade-in">
                <h4 className="font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase mb-3">Price Range</h4>
                <div className="flex gap-2 items-center mb-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={e => setMinPrice(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white rounded-lg text-sm"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={e => setMaxPrice(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white rounded-lg text-sm"
                  />
                </div>
                <button
                  onClick={() => { setMinPrice(''); setMaxPrice(''); }}
                  className="w-full text-xs text-blue-600 dark:text-blue-400 hover:underline text-center mt-1"
                >
                  Reset
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Symbol</span>
          </button>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6 relative border border-slate-200 dark:border-slate-800">
            <button onClick={() => { setIsAddModalOpen(false); setNewSymbol(''); setSearchResults([]); }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Add to Watchlist</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Search for a stock to add to your watchlist</p>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Search Stock</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={newSymbol}
                    onChange={handleSearchChange}
                    placeholder="Search by symbol or name..."
                    className="w-full pl-10 pr-4 p-3 border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium placeholder:font-normal"
                    autoFocus
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-indigo-500" />
                  )}
                </div>

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                    {searchResults.map(result => (
                      <button
                        key={result.instrumentKey}
                        type="button"
                        onClick={() => selectSearchResult(result)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{result.symbol}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{result.name}</div>
                          </div>
                          <div className="text-xs text-slate-400 dark:text-slate-500">{result.exchange}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {newSymbol && searchResults.length === 0 && !isSearching && (
                  <div className="absolute z-10 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">
                    No results found. Try a different search.
                  </div>
                )}
              </div>

              {/* Selected Stock Indicator */}
              {selectedInstrument && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-blue-900 dark:text-blue-100">{selectedInstrument.symbol}</div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">{selectedInstrument.name}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedInstrument(null)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isAdding || !selectedInstrument}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-400 dark:disabled:from-slate-700 dark:disabled:to-slate-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                {isAdding ? 'Adding to Watchlist...' : selectedInstrument ? `Add ${selectedInstrument.symbol}` : 'Select a Stock First'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 animate-pulse">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800"></div>
                  <div className="space-y-2">
                    <div className="w-16 h-4 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="w-24 h-3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                  </div>
                </div>
              </div>
              <div className="space-y-2 mb-6">
                <div className="w-full h-8 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="w-1/2 h-6 bg-slate-200 dark:bg-slate-800 rounded ml-auto"></div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 h-10 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                <div className="flex-1 h-10 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
              </div>
            </div>
          ))
        ) : filteredList.length === 0 ? (
          <div className="col-span-full text-center py-16 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 border-dashed flex flex-col items-center justify-center">
            <Star className="w-8 h-8 mb-2 opacity-50" />
            <p>No matching items. Try adding a new symbol.</p>
          </div>
        ) : (
          filteredList.map((item) => {
            const flashColor = flashStates[item.id];

            return (
              <div key={item.id} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all group relative overflow-hidden flex flex-col">
                <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 dark:bg-slate-800 group-hover:bg-blue-500 transition-colors"></div>

                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleViewDetails(item)}>
                      <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-slate-700">
                        {item.symbol[0]}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.symbol}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.name}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors p-1"
                      title="Remove from Watchlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-end justify-between mb-6">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Current Price</p>
                      <p className={`text-2xl font-bold font-mono tracking-tight transition-colors duration-500 ${flashColor === 'green' ? 'text-emerald-600 dark:text-emerald-400' :
                        flashColor === 'red' ? 'text-red-600 dark:text-red-400' :
                          'text-slate-900 dark:text-white'
                        }`}>
                        ${item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className={`text-right ${item.change24h >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'} bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-lg`}>
                      <div className="flex items-center font-bold text-sm">
                        {item.change24h >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                        {Math.abs(item.change24h).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Action Footer */}
                <div className="bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-800">
                  <button
                    onClick={() => handleBuy(item)}
                    className="py-3 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 text-xs font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Buy
                  </button>
                  <button
                    onClick={() => handleViewDetails(item)}
                    className="py-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 text-xs font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Details
                  </button>
                  <button
                    onClick={() => { }} // Placeholder for Quick Sell if owned, or just disabled
                    className="py-3 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-colors"
                    disabled
                  >
                    <MinusSquare className="w-4 h-4" />
                    Sell
                  </button>
                </div>

                <div className="px-6 py-2 bg-white dark:bg-slate-900 text-[10px] text-slate-400 dark:text-slate-500 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
                  <span>Cap: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.marketCap}</span></span>
                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                    <Activity className={`w-3 h-3 ${flashColor ? 'animate-pulse' : ''}`} />
                    {flashColor ? 'Updating...' : 'Live'}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  );
};

export default Watchlist;
