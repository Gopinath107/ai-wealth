
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { X, TrendingUp, TrendingDown, AlertCircle, Loader2, Sparkles, LineChart as LineIcon, CandlestickChart, BarChart2, Wifi, WifiOff, Radio } from 'lucide-react';
import { getAIStrategy, AIStrategyResult } from '../services/aiStrategyService';
import { Asset, Portfolio, InvestmentGoal, CandleData } from '../types';
import * as chartDataService from '../services/chartDataService';
import { isMarketOpen } from '../services/apiConfig';

interface AssetDetailsProps {
    asset: Asset | null;
    isOpen: boolean;
    onClose: () => void;
    onBuy: (asset: Asset, quantity: number) => Promise<void>;
    onSell: (asset: Asset, quantity: number) => Promise<void>;
    onSetAlert: (symbol: string, price: number, condition: 'above' | 'below') => void;
    cashBalance: number;
    portfolio?: Portfolio;
    goals?: InvestmentGoal[];
}

type ChartType = 'line' | 'candle' | 'bar' | 'heikin';
type ConnectionStatus = 'disconnected' | 'connected' | 'polling' | 'error';

interface ChartCandle extends CandleData {
    date: string; // Formatted date for display (e.g., "Jan 24")
    timeDisplay: string; // Formatted time for display (e.g., "09:15")
}

const AssetDetails: React.FC<AssetDetailsProps> = ({ asset, isOpen, onClose }) => {

    // AI Strategy State
    const [aiStrategy, setAiStrategy] = useState<AIStrategyResult | null>(null);
    const [isGettingStrategy, setIsGettingStrategy] = useState(false);
    const [strategyError, setStrategyError] = useState<string | null>(null);

    // Chart State
    const [chartType, setChartType] = useState<ChartType>('candle');
    const [timeframe, setTimeframe] = useState<chartDataService.Timeframe>('1D');
    const [interval, setInterval] = useState<chartDataService.CandleInterval>('5m');
    const [showGrid, setShowGrid] = useState(true);

    // Data State
    const [chartData, setChartData] = useState<ChartCandle[]>([]);
    const [isLoadingChart, setIsLoadingChart] = useState(false);
    const [chartError, setChartError] = useState<string | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

    // Refs
    const instrumentKeyRef = useRef<string | null>(null);
    const isFirstLoadRef = useRef(true);

    // Load Chart Data
    const loadChartData = useCallback(async (forceRefresh: boolean = false) => {
        if (!asset) return;

        setIsLoadingChart(true);
        setChartError(null);

        try {
            // CRITICAL: First resolve instrument key from search API
            console.log('[AssetDetails] Resolving instrument for:', asset.symbol);
            const searchResults = await chartDataService.searchInstruments(asset.symbol, 1);

            if (!searchResults || searchResults.length === 0) {
                throw new Error(`Instrument not found for ${asset.symbol}`);
            }

            const instrumentKey = searchResults[0].instrumentKey;
            instrumentKeyRef.current = instrumentKey;
            console.log('[AssetDetails] Resolved instrumentKey:', instrumentKey);

            let candles: CandleData[] = [];

            // Use improved market hours check (Mon-Fri 9:15-15:29 IST)
            const withinMarketHours = chartDataService.isWithinMarketHours();

            // CRITICAL: For 1D timeframe during market hours, use intraday
            // Otherwise (including weekends and before market open), use history
            if (timeframe === '1D' && withinMarketHours) {
                console.log('[AssetDetails] Using intraday API (market open)');
                candles = await chartDataService.getCandleIntraday(instrumentKey, interval, forceRefresh);
            } else {
                console.log('[AssetDetails] Using history API (will use last market day for 1D)');
                candles = await chartDataService.getCandleHistory(instrumentKey, timeframe, interval, forceRefresh);
            }

            console.log('[AssetDetails] Received candles:', candles.length);

            if (candles.length === 0) {
                setChartError('No candle data available for this stock');
                setChartData([]);
            } else {
                // Data is already cleaned (validated, deduplicated, sorted) from service
                // Just add display fields for tooltip
                const formattedCandles: ChartCandle[] = candles.map(c => {
                    // c.time is Unix seconds, c.ts is ISO string
                    const date = new Date(c.ts || c.time * 1000);
                    return {
                        ...c,
                        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        timeDisplay: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    };
                });

                setChartData(formattedCandles);
                setChartError(null);
            }
        } catch (e: any) {
            console.error('[AssetDetails] Chart load error:', e);
            setChartError(e.message || 'Failed to load chart data');
            setChartData([]);
        } finally {
            setIsLoadingChart(false);
        }
    }, [asset, timeframe, interval]);

    // Initialize WebSocket or Polling
    const initializeRealtimeData = useCallback(() => {
        if (!asset || !instrumentKeyRef.current) return;

        // Use improved market hours check (9:15-15:29 IST, Mon-Fri only)
        const withinMarketHours = chartDataService.isWithinMarketHours();
        if (!withinMarketHours) {
            setConnectionStatus('disconnected');
            console.log('[AssetDetails] Outside market hours, no WebSocket connection');
            return;
        }

        const handleTick = (event: any) => {
            // Update the last candle with real-time data
            setChartData(prev => {
                if (prev.length === 0) return prev;

                const updated = [...prev];
                const lastCandle = updated[updated.length - 1];

                // Update with new data
                if (event.ltp !== undefined) lastCandle.close = event.ltp;
                if (event.high !== undefined) lastCandle.high = event.high;
                if (event.low !== undefined) lastCandle.low = event.low;
                if (event.vol !== undefined) lastCandle.volume = event.vol;

                return updated;
            });
        };

        const handleConnectionChange = (status: ConnectionStatus) => {
            setConnectionStatus(status);

            // Fallback to polling if WebSocket fails
            if (status === 'error' || status === 'disconnected') {
                console.log('[AssetDetails] WebSocket unavailable, starting polling...');
                setConnectionStatus('polling');
                chartDataService.startPollingFallback(
                    instrumentKeyRef.current!,
                    interval,
                    (candles) => {
                        const formatted = candles.map(c => ({
                            ...c,
                            date: new Date(c.ts || c.time * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                            timeDisplay: new Date(c.ts || c.time * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                        }));
                        setChartData(formatted);
                    }
                );
            }
        };

        chartDataService.connectMarketWebSocket([instrumentKeyRef.current], handleTick, handleConnectionChange);
    }, [asset, interval]);

    // Effect to load initial data
    useEffect(() => {
        if (asset && isOpen) {
            loadChartData(false);
            isFirstLoadRef.current = false;
        }
    }, [asset, isOpen, timeframe, interval, loadChartData]);

    // Effect to initialize real-time updates
    useEffect(() => {
        if (asset && isOpen && timeframe === '1D') {
            initializeRealtimeData();
        }

        return () => {
            chartDataService.disconnectMarketWebSocket();
            chartDataService.stopPollingFallback();
        };
    }, [asset, isOpen, timeframe, initializeRealtimeData]);

    // Fetch AI Strategy
    const fetchStrategy = useCallback(async () => {
        if (!asset) return;

        setIsGettingStrategy(true);
        setStrategyError(null);

        try {
            let instrumentKey = instrumentKeyRef.current;

            // Resolve instrument key if not already available
            if (!instrumentKey) {
                console.log('[AssetDetails] Resolving instrumentKey for strategy:', asset.symbol);
                const searchResults = await chartDataService.searchInstruments(asset.symbol, 1);
                if (searchResults && searchResults.length > 0) {
                    instrumentKey = searchResults[0].instrumentKey;
                    instrumentKeyRef.current = instrumentKey;
                }
            }

            if (!instrumentKey) {
                throw new Error(`Could not resolve instrument key for ${asset.symbol}`);
            }

            const strategy = await getAIStrategy(instrumentKey);
            setAiStrategy(strategy);
        } catch (e: any) {
            console.error('[AssetDetails] Strategy error:', e);
            setStrategyError(e.message || 'Failed to load AI strategy');
        } finally {
            setIsGettingStrategy(false);
        }
    }, [asset]);

    useEffect(() => {
        if (asset && isOpen) {
            fetchStrategy();
        }
    }, [asset, isOpen, fetchStrategy]);

    if (!asset || !isOpen) return null;

    const isPositive = asset.change24h >= 0;

    // Apply Heikin Ashi transformation to display data
    const displayData = chartType === 'heikin'
        ? chartData.map((candle, i, arr) => {
            if (i === 0) {
                return {
                    ...candle,
                    open: (candle.open + candle.close) / 2,
                    close: (candle.open + candle.high + candle.low + candle.close) / 4,
                };
            }
            const prevHA = {
                open: (arr[i - 1].open + arr[i - 1].close) / 2,
                close: (arr[i - 1].open + arr[i - 1].high + arr[i - 1].low + arr[i - 1].close) / 4,
            };
            return {
                ...candle,
                open: (prevHA.open + prevHA.close) / 2,
                close: (candle.open + candle.high + candle.low + candle.close) / 4,
            };
        })
        : chartData;

    // Calculate Y-axis domain based on visible data
    const getYAxisDomain = () => {
        if (displayData.length === 0) return ['auto', 'auto'];

        const highs = displayData.map(d => d.high);
        const lows = displayData.map(d => d.low);
        const maxHigh = Math.max(...highs);
        const minLow = Math.min(...lows);
        const padding = (maxHigh - minLow) * 0.1;

        return [minLow - padding, maxHigh + padding];
    };

    // Custom Tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload || !payload[0]) return null;

        const data = payload[0].payload;

        return (
            <div className="bg-slate-800 text-white p-3 rounded-lg shadow-xl text-xs space-y-1 border border-slate-700">
                <div className="font-bold text-slate-400 mb-2">{data.timeDisplay}, {data.date}</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    <div>
                        <span className="text-emerald-400">Open</span>
                        <span className="ml-2 font-bold">${data.open.toFixed(2)}</span>
                    </div>
                    <div>
                        <span className="text-blue-400">High</span>
                        <span className="ml-2 font-bold">${data.high.toFixed(2)}</span>
                    </div>
                    <div>
                        <span className="text-red-400">Low</span>
                        <span className="ml-2 font-bold">${data.low.toFixed(2)}</span>
                    </div>
                    <div>
                        <span className="text-purple-400">Close</span>
                        <span className="ml-2 font-bold">${data.close.toFixed(2)}</span>
                    </div>
                </div>
                <div className="pt-1 border-t border-slate-700 mt-1">
                    <span className="text-slate-400">Volume</span>
                    <span className="ml-2 font-bold">{data.volume.toLocaleString()}</span>
                </div>
            </div>
        );
    };

    // FIXED: Custom Candlestick Shape Component
    const CandlestickShape = (props: any) => {
        const { x, y, width, height, payload } = props;

        if (!payload) return null;

        const { open, close, high, low } = payload;
        if (open === undefined || close === undefined || high === undefined || low === undefined) return null;

        const isUp = close >= open;
        const color = isUp ? '#10b981' : '#ef4444';

        // Get the Y-axis domain from displayData to calculate pixel positions
        const allPrices = displayData.flatMap(d => [d.high, d.low]);
        const maxPrice = Math.max(...allPrices);
        const minPrice = Math.min(...allPrices);
        const priceRange = maxPrice - minPrice;
        const padding = priceRange * 0.1;
        const yMin = minPrice - padding;
        const yMax = maxPrice + padding;
        const totalRange = yMax - yMin;

        // Chart height (approximate - based on the ResponsiveContainer)
        const chartHeight = 360; // Approximate chart area height

        // Convert price to Y pixel position
        const priceToY = (price: number) => {
            return chartHeight * (1 - (price - yMin) / totalRange);
        };

        const yHigh = priceToY(high);
        const yLow = priceToY(low);
        const yOpen = priceToY(open);
        const yClose = priceToY(close);

        // Body dimensions
        const bodyTop = Math.min(yOpen, yClose);
        const bodyBottom = Math.max(yOpen, yClose);
        const bodyHeight = Math.max(bodyBottom - bodyTop, 1); // Min 1px for doji

        // Bar width
        const barWidth = Math.max(width * 0.7, 3); // 70% of available width, min 3px
        const xCenter = x + width / 2;

        if (chartType === 'bar') {
            // OHLC Bar Chart
            return (
                <g stroke={color} strokeWidth="2" fill="none">
                    {/* Vertical line from high to low */}
                    <line x1={xCenter} y1={yHigh} x2={xCenter} y2={yLow} />
                    {/* Left tick for open */}
                    <line x1={xCenter - barWidth / 2} y1={yOpen} x2={xCenter} y2={yOpen} />
                    {/* Right tick for close */}
                    <line x1={xCenter} y1={yClose} x2={xCenter + barWidth / 2} y2={yClose} />
                </g>
            );
        }

        // Candlestick Chart
        return (
            <g>
                {/* Upper wick */}
                <line
                    x1={xCenter}
                    y1={yHigh}
                    x2={xCenter}
                    y2={bodyTop}
                    stroke={color}
                    strokeWidth="1"
                />
                {/* Lower wick */}
                <line
                    x1={xCenter}
                    y1={bodyBottom}
                    x2={xCenter}
                    y2={yLow}
                    stroke={color}
                    strokeWidth="1"
                />
                {/* Body */}
                <rect
                    x={xCenter - barWidth / 2}
                    y={bodyTop}
                    width={barWidth}
                    height={bodyHeight}
                    fill={isUp ? 'transparent' : color}
                    stroke={color}
                    strokeWidth="1.5"
                />
            </g>
        );
    };

    return (
        <div className={`fixed inset-0 z-50 ${isOpen ? 'block' : 'hidden'}`}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="absolute right-0 top-0 bottom-0 w-full lg:w-3/4 bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto">
                <div className="max-w-[1400px] mx-auto p-6 space-y-6">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                                    <span className="text-white font-black text-lg">{asset.symbol.charAt(0)}</span>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{asset.name}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{asset.symbol}</span>
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                            {asset.type === 'stock' ? 'STOCK' : asset.type.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Market Status & Close Button */}
                        <div className="flex items-center gap-3">
                            {timeframe === '1D' && (
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${isMarketOpen()
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                    }`}>
                                    {isMarketOpen() ? (
                                        <><Wifi className="w-3 h-3" /> Online</>
                                    ) : (
                                        <><WifiOff className="w-3 h-3" /> Market Closed</>
                                    )}
                                </div>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-3 space-y-6">
                            {/* Price and Controls */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter block animate-fade-in">
                                        ${asset.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    <div className={`flex items-center mt-1 px-3 py-1 rounded-xl text-xs font-black w-fit ${isPositive ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
                                        {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                                        {Math.abs(asset.change24h).toFixed(2)}%
                                    </div>
                                </div>

                                {/* Chart Type Controls */}
                                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1 shadow-inner">
                                    <button
                                        onClick={() => setChartType('line')}
                                        className={`p-2 rounded-lg transition-all ${chartType === 'line' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                        title="Line Chart"
                                    >
                                        <LineIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setChartType('candle')}
                                        className={`p-2 rounded-lg transition-all ${chartType === 'candle' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                        title="Candlestick"
                                    >
                                        <CandlestickChart className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setChartType('bar')}
                                        className={`p-2 rounded-lg transition-all ${chartType === 'bar' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                        title="OHLC Bar"
                                    >
                                        <BarChart2 className="w-4 h-4 rotate-90" />
                                    </button>
                                    <button
                                        onClick={() => setChartType('heikin')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${chartType === 'heikin' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                        title="Heikin Ashi"
                                    >
                                        HA
                                    </button>
                                </div>
                            </div>

                            {/* Timeframe Buttons */}
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
                                    {(['1D', '1W', '1M', '2M', '3M', '1Y'] as chartDataService.Timeframe[]).map(tf => (
                                        <button
                                            key={tf}
                                            onClick={() => setTimeframe(tf)}
                                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${timeframe === tf ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                        >
                                            {tf}
                                        </button>
                                    ))}
                                </div>

                                {/* Interval Dropdown */}
                                <select
                                    value={interval}
                                    onChange={(e) => setInterval(e.target.value as chartDataService.CandleInterval)}
                                    className="px-4 py-2 rounded-xl text-xs font-black bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="1m">1 Min</option>
                                    <option value="5m">5 Min</option>
                                    <option value="15m">15 Min</option>
                                    <option value="1h">1 Hour</option>
                                    <option value="1d">1 Day</option>
                                </select>
                            </div>

                            {/* Chart - with horizontal scrolling */}
                            <div className="h-[400px] w-full bg-slate-50 dark:bg-slate-800/30 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 relative overflow-x-auto">
                                {isLoadingChart ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                                        <p className="text-sm font-bold text-slate-400">Loading chart data...</p>
                                    </div>
                                ) : chartError ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                        <AlertCircle className="w-12 h-12 text-red-400" />
                                        <p className="text-sm font-bold text-red-600 dark:text-red-400">{chartError}</p>
                                        <button onClick={() => loadChartData(true)} className="mt-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700">
                                            Retry
                                        </button>
                                    </div>
                                ) : chartData.length === 0 ? (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <p className="text-sm font-bold text-slate-400">No data available</p>
                                    </div>
                                ) : (
                                    <ResponsiveContainer width={Math.max(displayData.length * 12, 800)} height="100%">
                                        {chartType === 'line' ? (
                                            <AreaChart data={displayData}>
                                                <defs>
                                                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.2} />}
                                                <XAxis
                                                    dataKey="time"
                                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                />
                                                <YAxis
                                                    domain={['auto', 'auto']}
                                                    orientation="right"
                                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                                    tickFormatter={(val) => `$${typeof val === 'number' ? val.toFixed(0) : val}`}
                                                    tickLine={false}
                                                    axisLine={false}
                                                />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Area
                                                    type="monotone"
                                                    dataKey="close"
                                                    stroke="#3b82f6"
                                                    strokeWidth={2}
                                                    fill="url(#priceGradient)"
                                                    animationDuration={300}
                                                />
                                            </AreaChart>
                                        ) : (
                                            <ComposedChart
                                                data={displayData}
                                                margin={{ top: 20, right: 10, bottom: 5, left: 0 }}
                                            >
                                                {/* Minimal grid */}
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0} vertical={false} />

                                                {/* X-axis with HIDDEN labels */}
                                                <XAxis
                                                    dataKey="time"
                                                    tick={false}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />

                                                {/* Y-axis - Dynamic domain based on timeframe */}
                                                <YAxis
                                                    orientation="right"
                                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                                                    domain={getYAxisDomain()}
                                                    width={60}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />

                                                {/* Tooltip */}
                                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3' }} />

                                                {/* FIXED: Use a dummy bar with custom shape */}
                                                <Bar
                                                    dataKey="high"
                                                    shape={CandlestickShape}
                                                    isAnimationActive={false}
                                                />
                                            </ComposedChart>
                                        )}
                                    </ResponsiveContainer>
                                )}
                            </div>

                            {/* Personalized Strategy */}
                            <div className={`p-6 rounded-[2rem] border-2 transition-all duration-500 ${isGettingStrategy ? 'bg-slate-50 border-slate-200 border-dashed dark:bg-slate-800/30 dark:border-slate-700' :
                                aiStrategy?.recommendation === 'BUY' ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800' :
                                    aiStrategy?.recommendation === 'SELL' ? 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-800' :
                                        'bg-blue-50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-800'
                                }`}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
                                        <Sparkles className={`w-5 h-5 ${isGettingStrategy ? 'animate-pulse text-indigo-500' : 'text-indigo-600 dark:text-indigo-400'}`} />
                                        Personalized Strategy
                                    </div>
                                    {aiStrategy && (
                                        <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg ${aiStrategy.recommendation === 'BUY' ? 'bg-emerald-600 text-white' :
                                            aiStrategy.recommendation === 'SELL' ? 'bg-red-600 text-white' :
                                                'bg-blue-600 text-white'
                                            }`}>
                                            {aiStrategy.recommendation}
                                        </span>
                                    )}
                                </div>

                                {isGettingStrategy ? (
                                    <div className="flex items-center gap-3 animate-pulse py-2">
                                        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Loading strategy...</span>
                                    </div>
                                ) : strategyError ? (
                                    <div className="space-y-3">
                                        <p className="text-sm text-red-600 dark:text-red-400 font-medium">{strategyError}</p>
                                        <button
                                            onClick={fetchStrategy}
                                            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                                        >
                                            Retry
                                        </button>
                                    </div>
                                ) : aiStrategy ? (
                                    <div className="space-y-4">
                                        {/* Key Metrics Grid */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                                                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Confidence</div>
                                                <div className="text-lg font-black text-slate-900 dark:text-white">{aiStrategy.confidence}%</div>
                                            </div>
                                            <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                                                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Horizon</div>
                                                <div className="text-sm font-black text-slate-900 dark:text-white">{aiStrategy.horizon}</div>
                                            </div>
                                            <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                                                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Risk</div>
                                                <div className={`text-sm font-black ${aiStrategy.riskLevel === 'High' ? 'text-red-600 dark:text-red-400' :
                                                    aiStrategy.riskLevel === 'Medium' ? 'text-amber-600 dark:text-amber-400' :
                                                        'text-emerald-600 dark:text-emerald-400'
                                                    }`}>{aiStrategy.riskLevel}</div>
                                            </div>
                                        </div>

                                        {/* Strategy Text */}
                                        <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{aiStrategy.personalizedStrategy}</p>
                                        </div>

                                        {/* Key Drivers (if available) */}
                                        {aiStrategy.keyDrivers && aiStrategy.keyDrivers.length > 0 && (
                                            <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                                                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Key Drivers</div>
                                                <ul className="space-y-1.5">
                                                    {aiStrategy.keyDrivers.map((driver, idx) => (
                                                        <li key={idx} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                                                            <span className="text-indigo-500 mt-0.5">•</span>
                                                            <span>{driver}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-600 dark:text-slate-400">No strategy available</p>
                                )}
                            </div>
                        </div>

                        {/* Right Sidebar */}
                        <div className="lg:col-span-1 space-y-6">
                            {/* Stock Snapshot */}
                            {chartData.length > 0 && (
                                <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-[2rem] border border-slate-200 dark:border-slate-700 space-y-4">
                                    <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-widest">Stock Snapshot</h4>

                                    {/* Day Range */}
                                    <div>
                                        <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                                            <span>DAY RANGE</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-bold text-slate-700 dark:text-slate-300">
                                                ${Math.min(...chartData.map(c => c.low)).toFixed(2)}
                                            </span>
                                            <div className="flex-1 mx-3 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-red-500 to-emerald-500 rounded-full"
                                                    style={{
                                                        width: `${((asset?.price || 0) - Math.min(...chartData.map(c => c.low))) / (Math.max(...chartData.map(c => c.high)) - Math.min(...chartData.map(c => c.low))) * 100}%`
                                                    }}
                                                />
                                            </div>
                                            <span className="font-bold text-slate-700 dark:text-slate-300">
                                                ${Math.max(...chartData.map(c => c.high)).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Open & Prev Close */}
                                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                                        <div>
                                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">OPEN</div>
                                            <div className="text-base font-black text-slate-900 dark:text-white">
                                                ${chartData[0]?.open.toFixed(2) || '—'}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">PREV CLOSE</div>
                                            <div className="text-base font-black text-slate-900 dark:text-white">
                                                ${chartData.length > 1 ? chartData[chartData.length - 2]?.close.toFixed(2) : chartData[0]?.close.toFixed(2) || '—'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Volume */}
                                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">VOLUME</div>
                                        <div className="text-base font-black text-slate-900 dark:text-white">
                                            {chartData[chartData.length - 1]?.volume.toLocaleString() || '—'}
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            Avg: {Math.round(chartData.reduce((sum, c) => sum + c.volume, 0) / chartData.length).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            )}


                            {/* AI Summary Box */}
                            <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10 rounded-[2rem] border border-indigo-100 dark:border-indigo-800 space-y-4">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-indigo-200 dark:bg-indigo-800 rounded-xl text-indigo-900 dark:text-indigo-100">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <h4 className="font-black text-indigo-900 dark:text-indigo-100 text-sm tracking-tight">AI Summary</h4>
                                </div>

                                {isGettingStrategy ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                                    </div>
                                ) : aiStrategy ? (
                                    <div className="space-y-3">
                                        <div>
                                            <div className="text-xs font-bold text-indigo-900/60 dark:text-indigo-100/60 uppercase mb-1">Recommendation</div>
                                            <div className={`inline-flex px-3 py-1.5 rounded-lg text-sm font-black ${aiStrategy.recommendation === 'BUY' ? 'bg-emerald-600 text-white' :
                                                aiStrategy.recommendation === 'SELL' ? 'bg-red-600 text-white' :
                                                    'bg-blue-600 text-white'
                                                }`}>
                                                {aiStrategy.recommendation}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-indigo-200 dark:border-indigo-800">
                                            <div>
                                                <div className="text-xs font-bold text-indigo-900/60 dark:text-indigo-100/60 uppercase mb-1">Confidence</div>
                                                <div className="text-lg font-black text-indigo-900 dark:text-indigo-100">{aiStrategy.confidence}%</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-indigo-900/60 dark:text-indigo-100/60 uppercase mb-1">Risk Level</div>
                                                <div className={`text-sm font-black ${aiStrategy.riskLevel === 'High' ? 'text-red-600 dark:text-red-400' :
                                                    aiStrategy.riskLevel === 'Medium' ? 'text-amber-600 dark:text-amber-400' :
                                                        'text-emerald-600 dark:text-emerald-400'
                                                    }`}>
                                                    {aiStrategy.riskLevel}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-indigo-200 dark:border-indigo-800">
                                            <div className="text-xs font-bold text-indigo-900/60 dark:text-indigo-100/60 uppercase mb-1">Horizon</div>
                                            <div className="text-sm font-bold text-indigo-900 dark:text-indigo-100">{aiStrategy.horizon}</div>
                                        </div>

                                        <div className="pt-3 border-t border-indigo-200 dark:border-indigo-800">
                                            <div className="text-xs font-bold text-indigo-900/60 dark:text-indigo-100/60 uppercase mb-1">As Of</div>
                                            <div className="text-xs font-medium text-indigo-900/70 dark:text-indigo-100/70">
                                                {new Date(aiStrategy.asOf).toLocaleString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ) : strategyError ? (
                                    <div className="text-center py-4">
                                        <p className="text-sm text-red-600 dark:text-red-400 mb-2">Strategy unavailable</p>
                                        <button
                                            onClick={fetchStrategy}
                                            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                                        >
                                            Retry
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-sm text-indigo-900/60 dark:text-indigo-100/60 text-center py-4">No strategy available</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssetDetails;
