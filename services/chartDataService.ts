import { CandleData, InstrumentSearch } from '../types';
import { BASE_URL, ENDPOINTS, getHeaders, getToken, WS_BASE_URL, isMarketOpen } from './apiConfig';

// ================== TYPES ==================

export type Timeframe = '1D' | '1W' | '1M' | '2M' | '3M' | '1Y';
export type CandleInterval = '1m' | '5m' | '15m' | '1h' | '1d';

interface CandleOptions {
    unit: 'minutes' | 'hours' | 'days';
    interval: number;
    limit?: number;
    order?: 'asc' | 'desc';
}

interface WebSocketMessage {
    action: 'subscribe' | 'unsubscribe';
    mode: 'ltpc' | 'full';
    instrumentKeys: string[];
}

interface MarketTickEvent {
    type: 'tick' | 'candle';
    instrumentKey: string;
    ltp?: number;
    ltt?: string;
    change?: number;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    vol?: number;
    ts?: string;
}

// ================== STATE ==================

let wsConnection: WebSocket | null = null;
let wsReconnectAttempts = 0;
let wsReconnectTimer: NodeJS.Timeout | null = null;
const MAX_RECONNECT_ATTEMPTS = 5;

let pollingInterval: NodeJS.Timeout | null = null;
let currentPollingInstrument: string | null = null;

// Cache: key = instrumentKey + timeframe + interval, value = { data, timestamp }
const candleCache = new Map<string, { data: CandleData[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Active request tracking for cancellation
let activeRequests = new Map<string, AbortController>();

// ================== INSTRUMENTS SYNC ==================

export const syncInstruments = async (): Promise<{ upserted: number }> => {
    console.log('[Chart Data] Syncing instruments...');
    try {
        const res = await fetch(`${BASE_URL}/instruments/sync`, {
            method: 'POST',
            headers: getHeaders()
        });

        if (res.ok) {
            const data = await res.json();
            console.log('[Chart Data] Instruments synced:', data);
            return data.result || { upserted: 0 };
        } else {
            console.warn('[Chart Data] Instruments sync failed:', res.status);
            throw new Error('Instruments sync failed');
        }
    } catch (e) {
        console.error('[Chart Data] Instruments sync error:', e);
        throw e;
    }
};

// ================== INSTRUMENT SEARCH ==================

export const searchInstruments = async (query: string, limit: number = 100): Promise<InstrumentSearch[]> => {
    if (!query || query.trim().length === 0) return [];

    console.log('[Chart Data] Searching instruments:', query);
    try {
        const params = new URLSearchParams({ q: query.trim(), limit: String(limit) });
        const res = await fetch(`${BASE_URL}${ENDPOINTS.INSTRUMENTS.SEARCH}?${params}`, {
            headers: getHeaders()
        });

        if (res.ok) {
            const data = await res.json();
            const results = data.result || data || [];
            console.log('[Chart Data] Search results:', results.length);
            return results;
        }
    } catch (e) {
        console.error('[Chart Data] Search error:', e);
    }

    return [];
};

export const resolveInstrument = async (query: string): Promise<InstrumentSearch | null> => {
    if (!query) return null;

    console.log('[Chart Data] Resolving instrument:', query);
    try {
        const params = new URLSearchParams({ q: query });
        const res = await fetch(`${BASE_URL}${ENDPOINTS.INSTRUMENTS.RESOLVE}?${params}`, {
            headers: getHeaders()
        });

        if (res.ok) {
            const data = await res.json();
            console.log('[Chart Data] Resolved instrument:', data);
            return data;
        }
    } catch (e) {
        console.error('[Chart Data] Resolve error:', e);
    }

    return null;
};

// ================== CANDLE DATA ==================

const getCacheKey = (instrumentKey: string, timeframe: Timeframe, interval: CandleInterval): string => {
    return `${instrumentKey}|${timeframe}|${interval}`;
};

const getCachedData = (key: string): CandleData[] | null => {
    const cached = candleCache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > CACHE_TTL) {
        candleCache.delete(key);
        return null;
    }

    console.log('[Chart Data] Using cached data:', key);
    return cached.data;
};

const setCachedData = (key: string, data: CandleData[]): void => {
    candleCache.set(key, { data, timestamp: Date.now() });
};

// ================== MARKET DAY HELPERS ==================

/**
 * Get the last market trading day accounting for weekends and pre-market hours
 * Rules:
 * - Saturday/Sunday → Previous Friday
 * - Monday-Friday before 9:15 AM → Previous trading day
 * - Market hours (9:15-15:29 IST) → Today
 */
export const getLastMarketDay = (): Date => {
    const now = new Date();

    // Convert to IST
    const istOffset = 5.5 * 60 * 60 * 1000;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
    const istTime = new Date(utc + istOffset);

    const dayOfWeek = istTime.getDay(); // 0 = Sunday, 6 = Saturday
    const hours = istTime.getHours();
    const minutes = istTime.getMinutes();

    // Check if it's weekend
    if (dayOfWeek === 0) {
        // Sunday → Go back to Friday (2 days)
        istTime.setDate(istTime.getDate() - 2);
    } else if (dayOfWeek === 6) {
        // Saturday → Go back to Friday (1 day)
        istTime.setDate(istTime.getDate() - 1);
    } else if (hours < 9 || (hours === 9 && minutes < 15)) {
        // Before market open (9:15 AM) → Previous trading day
        if (dayOfWeek === 1) {
            // Monday before market → Previous Friday (3 days back)
            istTime.setDate(istTime.getDate() - 3);
        } else {
            // Tuesday-Friday before market → Previous day
            istTime.setDate(istTime.getDate() - 1);
        }
    }
    // else: During or after market hours → Use today

    return istTime;
};

/**
 * Check if current time is within market hours (9:15 AM - 3:29 PM IST, Mon-Fri)
 */
export const isWithinMarketHours = (): boolean => {
    const now = new Date();

    // Convert to IST
    const istOffset = 5.5 * 60 * 60 * 1000;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
    const istTime = new Date(utc + istOffset);

    const dayOfWeek = istTime.getDay();
    const hours = istTime.getHours();
    const minutes = istTime.getMinutes();

    // Not a weekday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return false;
    }

    // Before 9:15 AM
    if (hours < 9 || (hours === 9 && minutes < 15)) {
        return false;
    }

    // After 3:29 PM
    if (hours > 15 || (hours === 15 && minutes >= 30)) {
        return false;
    }

    return true;
};

// ================== DATA CLEANING HELPERS ==================

/**
 * Remove duplicate candles by timestamp
 * Keeps the first occurrence of each unique timestamp
 */
const deduplicateCandles = (candles: CandleData[]): CandleData[] => {
    const seen = new Set<number>();
    const unique: CandleData[] = [];

    for (const candle of candles) {
        if (!seen.has(candle.time)) {
            seen.add(candle.time);
            unique.push(candle);
        }
    }

    return unique;
};

/**
 * Validate and clean candle data
 * Removes candles with invalid OHLC values
 */
const validateCandles = (candles: CandleData[]): CandleData[] => {
    return candles.filter(c => {
        // Check for valid numbers
        const isValid =
            typeof c.open === 'number' && !isNaN(c.open) && c.open > 0 &&
            typeof c.high === 'number' && !isNaN(c.high) && c.high > 0 &&
            typeof c.low === 'number' && !isNaN(c.low) && c.low > 0 &&
            typeof c.close === 'number' && !isNaN(c.close) && c.close > 0 &&
            typeof c.volume === 'number' && !isNaN(c.volume) && c.volume >= 0;

        if (!isValid) {
            console.warn('[Chart Data] Invalid candle removed:', c);
            return false;
        }

        // Validate OHLC relationships
        if (c.high < c.low) {
            console.warn('[Chart Data] Invalid candle (high < low):', c);
            return false;
        }

        if (c.high < c.open || c.high < c.close || c.low > c.open || c.low > c.close) {
            console.warn('[Chart Data] Invalid candle (OHLC relationship):', c);
            return false;
        }

        return true;
    });
};

/**
 * Sort candles by timestamp ascending
 */
const sortCandles = (candles: CandleData[]): CandleData[] => {
    return [...candles].sort((a, b) => a.time - b.time);
};

/**
 * Clean and prepare candle data for chart rendering
 * - Validates OHLC values
 * - Removes duplicates
 * - Sorts by timestamp
 */
export const cleanChartData = (candles: CandleData[]): CandleData[] => {
    if (!candles || candles.length === 0) {
        return [];
    }

    console.log('[Chart Data] Cleaning candles:', candles.length);

    // Step 1: Validate
    let cleaned = validateCandles(candles);
    console.log('[Chart Data] After validation:', cleaned.length);

    // Step 2: Deduplicate
    cleaned = deduplicateCandles(cleaned);
    console.log('[Chart Data] After deduplication:', cleaned.length);

    // Step 3: Sort
    cleaned = sortCandles(cleaned);

    return cleaned;
};

const calculateDateRange = (timeframe: Timeframe): { from: string; to: string } => {
    let fromDate: Date;
    let toDate: Date;

    if (timeframe === '1D') {
        // For 1D, use last market day
        const lastMarketDay = getLastMarketDay();
        fromDate = new Date(lastMarketDay);
        toDate = new Date(lastMarketDay);
    } else {
        // For other timeframes, use current date and calculate back
        const now = new Date();
        toDate = new Date(now);
        fromDate = new Date(now);

        switch (timeframe) {
            case '1W':
                fromDate.setDate(now.getDate() - 7);
                break;
            case '1M':
                fromDate.setDate(now.getDate() - 30);
                break;
            case '2M':
                fromDate.setDate(now.getDate() - 60);
                break;
            case '3M':
                fromDate.setDate(now.getDate() - 90);
                break;
            case '1Y':
                fromDate.setDate(now.getDate() - 365);
                break;
        }
    }

    return {
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0]
    };
};

// Calculate limit based on timeframe - CRITICAL for getting enough data
const calculateLimit = (timeframe: Timeframe, interval: CandleInterval): number => {
    switch (timeframe) {
        case '1D':
            return 500;
        case '1W':
            return 1500;
        case '1M':
            return 6000;
        case '2M':
            return 6000; // Same as 1M due to API constraints
        case '3M':
            return 18000;
        case '1Y':
            return interval === '1d' ? 365 : 18000;
        default:
            return 500;
    }
};

const intervalToApiParams = (interval: CandleInterval): { unit: 'minutes' | 'hours' | 'days'; interval: number } => {
    switch (interval) {
        case '1m': return { unit: 'minutes', interval: 1 };
        case '5m': return { unit: 'minutes', interval: 5 };
        case '15m': return { unit: 'minutes', interval: 15 };
        case '1h': return { unit: 'hours', interval: 1 };
        case '1d': return { unit: 'days', interval: 1 };
        default: return { unit: 'minutes', interval: 5 };
    }
};

export const getCandleHistory = async (
    instrumentKey: string,
    timeframe: Timeframe,
    interval: CandleInterval,
    forceRefresh: boolean = false
): Promise<CandleData[]> => {
    // SPECIAL HANDLING: 1D timeframe should use Intraday API
    if (timeframe === '1D') {
        // User requested specifically for 1D: limit=200
        // Use interval if passed, otherwise default to 1m
        console.log('[Chart Data] 1D timeframe requested, redirecting to Intraday API with limit 200');
        return getCandleIntraday(instrumentKey, interval, forceRefresh, 200);
    }

    const cacheKey = getCacheKey(instrumentKey, timeframe, interval);

    // Check cache first
    if (!forceRefresh) {
        const cached = getCachedData(cacheKey);
        if (cached) return cached;
    }

    // Cancel any previous request for this cache key
    const existingController = activeRequests.get(cacheKey);
    if (existingController) {
        existingController.abort();
        activeRequests.delete(cacheKey);
    }

    const controller = new AbortController();
    activeRequests.set(cacheKey, controller);

    try {
        const { from, to } = calculateDateRange(timeframe);
        const { unit, interval: intervalNum } = intervalToApiParams(interval);
        const limit = calculateLimit(timeframe, interval); // DYNAMIC LIMIT

        const params = new URLSearchParams({
            unit,
            interval: String(intervalNum),
            from,
            to,
            limit: String(limit), // Use dynamic limit
            order: 'asc'
        });

        // CRITICAL: Properly encode instrumentKey (contains |)
        const encodedKey = encodeURIComponent(instrumentKey);
        const url = `${BASE_URL}${ENDPOINTS.MARKET.CANDLES_HISTORY}/${encodedKey}?${params}`;

        console.log('[Chart Data] Fetching history:', { instrumentKey, timeframe, interval, from, to, limit });

        const res = await fetch(url, {
            headers: getHeaders(),
            signal: controller.signal
        });

        if (res.ok) {
            const data = await res.json();
            const candles = data.result?.candles || data.candles || [];
            console.log('[Chart Data] History fetched:', candles.length, 'candles');

            // CRITICAL: Check if empty and log params for debugging
            if (candles.length === 0) {
                console.error('[Chart Data] Empty candles received. Request params:', { from, to, limit, unit, interval: intervalNum });
            }

            // Convert and clean candle data
            const formattedCandles: CandleData[] = candles.map((c: any) => {
                const timestamp = c.timestamp || c.ts;
                const unixTime = Math.floor(new Date(timestamp).getTime() / 1000); // Convert to seconds

                return {
                    time: unixTime, // Use 'time' instead of 'ts' for charts
                    ts: timestamp, // Keep original for debugging
                    open: Number(c.open),
                    high: Number(c.high),
                    low: Number(c.low),
                    close: Number(c.close),
                    volume: Number(c.volume || c.vol || 0)
                };
            });

            // CRITICAL: Clean the data (validate, deduplicate, sort)
            const cleanedCandles = cleanChartData(formattedCandles);

            setCachedData(cacheKey, cleanedCandles);
            activeRequests.delete(cacheKey);
            return cleanedCandles;
        } else {
            console.warn('[Chart Data] History failed:', res.status);
            activeRequests.delete(cacheKey);
            return [];
        }
    } catch (e: any) {
        if (e.name !== 'AbortError') {
            console.error('[Chart Data] History error:', e);
        }
        activeRequests.delete(cacheKey);
        return [];
    }
};

export const getCandleIntraday = async (
    instrumentKey: string,
    interval: CandleInterval = '1m',
    forceRefresh: boolean = false,
    customLimit: number = 500
): Promise<CandleData[]> => {
    const cacheKey = getCacheKey(instrumentKey, '1D', interval);

    // Check cache first
    if (!forceRefresh) {
        const cached = getCachedData(cacheKey);
        if (cached) return cached;
    }

    // Cancel any previous request
    const existingController = activeRequests.get(cacheKey);
    if (existingController) {
        existingController.abort();
        activeRequests.delete(cacheKey);
    }

    const controller = new AbortController();
    activeRequests.set(cacheKey, controller);

    try {
        const { unit, interval: intervalNum } = intervalToApiParams(interval);
        const limit = customLimit; // Use custom limit if provided, default 500

        const params = new URLSearchParams({
            unit,
            interval: String(intervalNum),
            limit: String(limit),
            order: 'asc'
        });

        // CRITICAL: Properly encode instrumentKey
        const encodedKey = encodeURIComponent(instrumentKey);
        const url = `${BASE_URL}${ENDPOINTS.MARKET.CANDLES_INTRADAY}/${encodedKey}?${params}`;

        console.log('[Chart Data] Fetching intraday:', { instrumentKey, interval, limit });

        const res = await fetch(url, {
            headers: getHeaders(),
            signal: controller.signal
        });

        if (res.ok) {
            const data = await res.json();
            const candles = data.result?.candles || data.candles || [];
            console.log('[Chart Data] Intraday fetched:', candles.length, 'candles');

            if (candles.length === 0) {
                console.error('[Chart Data] Empty intraday candles. Request params:', { limit, unit, interval: intervalNum });
            }

            // Convert and clean candle data
            const formattedCandles: CandleData[] = candles.map((c: any) => {
                const timestamp = c.timestamp || c.ts;
                const unixTime = Math.floor(new Date(timestamp).getTime() / 1000);

                return {
                    time: unixTime,
                    ts: timestamp,
                    open: Number(c.open),
                    high: Number(c.high),
                    low: Number(c.low),
                    close: Number(c.close),
                    volume: Number(c.volume || c.vol || 0)
                };
            });

            // CRITICAL: Clean the data
            const cleanedCandles = cleanChartData(formattedCandles);

            setCachedData(cacheKey, cleanedCandles);
            activeRequests.delete(cacheKey);
            return cleanedCandles;
        } else {
            console.warn('[Chart Data] Intraday failed:', res.status);
            activeRequests.delete(cacheKey);
            return [];
        }
    } catch (e: any) {
        if (e.name !== 'AbortError') {
            console.error('[Chart Data] Intraday error:', e);
        }
        activeRequests.delete(cacheKey);
        return [];
    }
};

// ================== WEBSOCKET ==================

export const connectMarketWebSocket = (
    instrumentKeys: string[],
    onTick: (event: MarketTickEvent) => void,
    onConnectionChange: (status: 'connected' | 'disconnected' | 'error') => void
): void => {
    if (wsConnection) {
        console.log('[WebSocket] Already connected, updating subscription...');
        subscribeToInstruments(instrumentKeys);
        return;
    }

    const token = getToken();
    if (!token) {
        console.error('[WebSocket] No auth token available');
        onConnectionChange('error');
        return;
    }

    const wsUrl = `${WS_BASE_URL}/ws/market?token=${token}`;
    console.log('[WebSocket] Connecting to:', wsUrl);

    try {
        wsConnection = new WebSocket(wsUrl);

        wsConnection.onopen = () => {
            console.log('[WebSocket] Connected');
            wsReconnectAttempts = 0;
            onConnectionChange('connected');

            // Subscribe to instruments
            subscribeToInstruments(instrumentKeys);
        };

        wsConnection.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                onTick(data as MarketTickEvent);
            } catch (e) {
                console.error('[WebSocket] Message parse error:', e);
            }
        };

        wsConnection.onerror = (error) => {
            console.error('[WebSocket] Error:', error);
            onConnectionChange('error');
        };

        wsConnection.onclose = () => {
            console.log('[WebSocket] Connection closed');
            wsConnection = null;
            onConnectionChange('disconnected');

            // Attempt reconnection if within market hours
            if (isMarketOpen() && wsReconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                const delay = Math.min(1000 * Math.pow(2, wsReconnectAttempts), 30000);
                wsReconnectAttempts++;
                console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${wsReconnectAttempts})`);

                wsReconnectTimer = setTimeout(() => {
                    connectMarketWebSocket(instrumentKeys, onTick, onConnectionChange);
                }, delay);
            }
        };
    } catch (e) {
        console.error('[WebSocket] Connection error:', e);
        onConnectionChange('error');
    }
};

const subscribeToInstruments = (instrumentKeys: string[]): void => {
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
        console.warn('[WebSocket] Cannot subscribe, connection not ready');
        return;
    }

    const message: WebSocketMessage = {
        action: 'subscribe',
        mode: 'full',
        instrumentKeys
    };

    console.log('[WebSocket] Subscribing to:', instrumentKeys);
    wsConnection.send(JSON.stringify(message));
};

export const disconnectMarketWebSocket = (): void => {
    if (wsReconnectTimer) {
        clearTimeout(wsReconnectTimer);
        wsReconnectTimer = null;
    }

    if (wsConnection) {
        console.log('[WebSocket] Disconnecting...');
        wsConnection.close();
        wsConnection = null;
    }

    wsReconnectAttempts = 0;
};

// ================== POLLING FALLBACK ==================

export const startPollingFallback = (
    instrumentKey: string,
    interval: CandleInterval,
    onUpdate: (candles: CandleData[]) => void
): void => {
    if (pollingInterval) {
        stopPollingFallback();
    }

    if (!isWithinMarketHours()) {
        console.log('[Polling] Not starting - market closed');
        return;
    }

    currentPollingInstrument = instrumentKey;
    console.log('[Polling] Starting for:', instrumentKey, '(7 sec interval)');

    const poll = async () => {
        if (!isWithinMarketHours()) {
            console.log('[Polling] Market closed, stopping');
            stopPollingFallback();
            return;
        }

        const candles = await getCandleIntraday(instrumentKey, interval, true);
        onUpdate(candles);
    };

    // Initial poll
    poll();

    // Poll every 7 seconds (between 5-10 sec as requested)
    pollingInterval = setInterval(poll, 7000);
};

export const stopPollingFallback = (): void => {
    if (pollingInterval) {
        console.log('[Polling] Stopping');
        clearInterval(pollingInterval);
        pollingInterval = null;
        currentPollingInstrument = null;
    }
};

// ================== CLEANUP ==================

export const cleanupChartDataService = (): void => {
    disconnectMarketWebSocket();
    stopPollingFallback();

    // Cancel all active requests
    activeRequests.forEach(controller => controller.abort());
    activeRequests.clear();

    console.log('[Chart Data] Service cleaned up');
};
