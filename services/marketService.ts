
import { MarketStockUI, BenchmarkIndex, MarketFeedItem, CandleData, InstrumentSearch } from '../types';
import { MOCK_INDIAN_STOCKS } from './mockData';
import { BASE_URL, ENDPOINTS, getHeaders, simulateDelay, shouldUseBackend } from './apiConfig';

export interface MarketFeedOptions {
    limit?: number;
    q?: string;
    includeMarketCap?: boolean;
}

export interface CandleOptions {
    unit?: 'minutes' | 'hours' | 'days';
    interval?: number;
    limit?: number;
    order?: 'asc' | 'desc';
}

export interface HistoricalCandleOptions extends CandleOptions {
    from: string; // YYYY-MM-DD
    to: string;   // YYYY-MM-DD
}

export const marketService = {
    // Get benchmark indices (NIFTY 50, BANK NIFTY, SENSEX) - poll 2-5s
    getBenchmarks: async (): Promise<BenchmarkIndex[]> => {
        if (shouldUseBackend()) {
            try {
                console.log('[Market API] Fetching benchmarks from backend...');
                const res = await fetch(`${BASE_URL}${ENDPOINTS.MARKET.BENCHMARKS}`, { headers: getHeaders() });
                console.log('[Market API] Benchmarks response status:', res.status);

                if (res.ok) {
                    const data = await res.json();
                    console.log('[Market API] Benchmarks data:', data);

                    // Handle the actual API response format: { success: true, result: { NIFTY_50: {...}, NIFTY_BANK: {...}, SENSEX: {...} } }
                    const result = data.result || data;

                    // If result is an object with keys (not an array), convert to array
                    if (result && typeof result === 'object' && !Array.isArray(result)) {
                        const benchmarks: BenchmarkIndex[] = [];

                        // Map the response object to array with proper field mapping
                        if (result.NIFTY_50) {
                            benchmarks.push({
                                name: result.NIFTY_50.name || 'NIFTY 50',
                                instrumentKey: result.NIFTY_50.instrumentKey || '',
                                ltp: result.NIFTY_50.ltp,
                                change: result.NIFTY_50.change,
                                changePercent: result.NIFTY_50.changePercent
                            });
                        }

                        if (result.NIFTY_BANK) {
                            benchmarks.push({
                                name: result.NIFTY_BANK.name || 'NIFTY BANK',
                                instrumentKey: result.NIFTY_BANK.instrumentKey || '',
                                ltp: result.NIFTY_BANK.ltp,
                                change: result.NIFTY_BANK.change,
                                changePercent: result.NIFTY_BANK.changePercent
                            });
                        }

                        if (result.SENSEX) {
                            benchmarks.push({
                                name: result.SENSEX.name || 'SENSEX',
                                instrumentKey: result.SENSEX.instrumentKey || '',
                                ltp: result.SENSEX.ltp,
                                change: result.SENSEX.change,
                                changePercent: result.SENSEX.changePercent
                            });
                        }

                        if (benchmarks.length > 0) {
                            console.log('[Market API] Parsed benchmarks:', benchmarks);
                            return benchmarks;
                        }
                    }
                    // Legacy: Handle array format if API changes back
                    else if (Array.isArray(result) && result.length > 0) {
                        return result;
                    }
                } else {
                    console.warn('[Market API] Benchmarks failed with status:', res.status);
                }
            } catch (e) {
                console.error('[Market API] Benchmarks API Error:', e);
            }
        } else {
            console.log('[Market API] Using mock data (demo mode or backend disabled)');
        }

        // Mock fallback
        await simulateDelay(200);
        const volatility = 0.002;
        const simulate = (name: string, basePrice: number) => {
            const change = basePrice * (Math.random() * volatility * 2 - volatility);
            return { name, instrumentKey: '', ltp: basePrice + change, change, changePercent: (change / basePrice) * 100 };
        };
        return [
            simulate('NIFTY 50', 22450.00),
            simulate('NIFTY BANK', 47800.50),
            simulate('SENSEX', 73900.20),
        ];
    },

    // Get indices (alias for backwards compatibility)
    getIndices: async () => {
        const benchmarks = await marketService.getBenchmarks();
        return benchmarks.map(b => ({
            name: b.name,
            value: b.ltp,
            change: b.change,
            percent: b.changePercent
        }));
    },

    // Get top gainers - poll 10-30s
    getTopGainers: async (limit: number = 5): Promise<MarketFeedItem[]> => {
        if (shouldUseBackend()) {
            try {
                console.log('[Market API] Fetching top gainers...');
                const res = await fetch(`${BASE_URL}${ENDPOINTS.MARKET.TOP_GAINERS}?limit=${limit}`, { headers: getHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    console.log('[Market API] Top gainers data:', data);
                    const items = data.result || data;
                    if (Array.isArray(items) && items.length > 0) {
                        // Map API response fields to expected format
                        const mapped = items.map(item => ({
                            instrumentKey: item.instrumentKey || `${item.exchange}_EQ|${item.tradingSymbol || item.symbol}`,
                            tradingSymbol: item.tradingSymbol || item.symbol,
                            symbol: item.tradingSymbol || item.symbol,
                            name: item.name,
                            exchange: item.exchange,
                            ltp: item.ltp,
                            prevClose: item.prevClose,
                            change: item.change,
                            changePercent: item.changePercent,
                            marketCap: item.marketCap,
                            asOf: item.asOf
                        }));
                        console.log('[Market API] Mapped top gainers:', mapped);
                        return mapped;
                    }
                } else {
                    console.warn('[Market API] Top gainers failed:', res.status);
                }
            } catch (e) {
                console.error('[Market API] Top Gainers API Error:', e);
            }
        }

        // Mock fallback
        await simulateDelay(300);
        const sorted = [...MOCK_INDIAN_STOCKS].sort((a, b) => b.changePercent - a.changePercent);
        return sorted.slice(0, limit).map(s => ({
            instrumentKey: `NSE_EQ|${s.symbol}`,
            symbol: s.symbol,
            name: s.name,
            ltp: s.price,
            prevClose: s.price - s.change,
            change: s.change,
            changePercent: s.changePercent,
            marketCap: s.marketCap,
            exchange: s.exchange
        }));
    },

    // Get top losers - poll 10-30s
    getTopLosers: async (limit: number = 5): Promise<MarketFeedItem[]> => {
        if (shouldUseBackend()) {
            try {
                console.log('[Market API] Fetching top losers...');
                const res = await fetch(`${BASE_URL}${ENDPOINTS.MARKET.TOP_LOSERS}?limit=${limit}`, { headers: getHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    console.log('[Market API] Top losers data:', data);
                    const items = data.result || data;
                    if (Array.isArray(items) && items.length > 0) {
                        // Map API response fields to expected format
                        const mapped = items.map(item => ({
                            instrumentKey: item.instrumentKey || `${item.exchange}_EQ|${item.tradingSymbol || item.symbol}`,
                            tradingSymbol: item.tradingSymbol || item.symbol,
                            symbol: item.tradingSymbol || item.symbol,
                            name: item.name,
                            exchange: item.exchange,
                            ltp: item.ltp,
                            prevClose: item.prevClose,
                            change: item.change,
                            changePercent: item.changePercent,
                            marketCap: item.marketCap,
                            asOf: item.asOf
                        }));
                        console.log('[Market API] Mapped top losers:', mapped);
                        return mapped;
                    }
                } else {
                    console.warn('[Market API] Top losers failed:', res.status);
                }
            } catch (e) {
                console.error('[Market API] Top Losers API Error:', e);
            }
        }

        // Mock fallback
        await simulateDelay(300);
        const sorted = [...MOCK_INDIAN_STOCKS].sort((a, b) => a.changePercent - b.changePercent);
        return sorted.slice(0, limit).map(s => ({
            instrumentKey: `NSE_EQ|${s.symbol}`,
            symbol: s.symbol,
            name: s.name,
            ltp: s.price,
            prevClose: s.price - s.change,
            change: s.change,
            changePercent: s.changePercent,
            marketCap: s.marketCap,
            exchange: s.exchange
        }));
    },

    // Get market stats (gainers + losers combined) - for backward compatibility
    getMarketStats: async (): Promise<{ gainers: MarketStockUI[], losers: MarketStockUI[] }> => {
        const [gainers, losers] = await Promise.all([
            marketService.getTopGainers(5),
            marketService.getTopLosers(5)
        ]);

        const mapToMarketStock = (items: MarketFeedItem[]): MarketStockUI[] =>
            items.map(i => ({
                symbol: i.symbol,
                name: i.name,
                price: i.ltp,
                change: i.change,
                changePercent: i.changePercent,
                marketCap: i.marketCap || '',
                exchange: i.exchange as 'NSE' | 'BSE'
            }));

        return {
            gainers: mapToMarketStock(gainers),
            losers: mapToMarketStock(losers)
        };
    },

    // Get market feed - poll 2-5s
    getMarketFeed: async (options: MarketFeedOptions = {}): Promise<MarketFeedItem[]> => {
        const { limit = 10, q, includeMarketCap = true } = options;

        if (shouldUseBackend()) {
            try {
                console.log('[Market API] Fetching market feed...', { limit, q, includeMarketCap });
                const params = new URLSearchParams();
                params.set('limit', String(limit));
                params.set('includeMarketCap', String(includeMarketCap));
                if (q) params.set('q', q);

                const res = await fetch(`${BASE_URL}${ENDPOINTS.MARKET.FEED}?${params}`, { headers: getHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    console.log('[Market API] Market feed data:', data);
                    const items = data.result || data;
                    if (Array.isArray(items) && items.length > 0) {
                        // Map API response fields to expected format
                        const mapped = items.map(item => ({
                            instrumentKey: item.instrumentKey || `${item.exchange}_EQ|${item.tradingSymbol || item.symbol}`,
                            tradingSymbol: item.tradingSymbol || item.symbol,
                            symbol: item.tradingSymbol || item.symbol,
                            name: item.name,
                            exchange: item.exchange,
                            ltp: item.ltp,
                            prevClose: item.prevClose,
                            change: item.change,
                            changePercent: item.changePercent,
                            marketCap: item.marketCap,
                            asOf: item.asOf,
                            currency: item.currency
                        }));
                        console.log('[Market API] Mapped market feed:', mapped);
                        return mapped;
                    }
                } else {
                    console.warn('[Market API] Market feed failed:', res.status);
                }
            } catch (e) {
                console.error('[Market API] Market Feed API Error:', e);
            }
        }

        // Mock fallback
        await simulateDelay(300);
        let stocks = MOCK_INDIAN_STOCKS;

        if (q) {
            const lowerQ = q.toLowerCase();
            stocks = stocks.filter(s =>
                s.symbol.toLowerCase().includes(lowerQ) ||
                s.name.toLowerCase().includes(lowerQ)
            );
        }

        return stocks.slice(0, limit).map(s => ({
            instrumentKey: `NSE_EQ|${s.symbol}`,
            symbol: s.symbol,
            name: s.name,
            ltp: s.price * (1 + (Math.random() * 0.01 - 0.005)), // Simulate movement
            prevClose: s.price - s.change,
            change: s.change,
            changePercent: s.changePercent,
            marketCap: includeMarketCap ? s.marketCap : undefined,
            exchange: s.exchange
        }));
    },

    // Get top stocks (backward compatible wrapper for UI)
    getTopStocks: async (limit: number = 10): Promise<MarketStockUI[]> => {
        const feed = await marketService.getMarketFeed({ limit, includeMarketCap: true });
        return feed.map(i => ({
            symbol: i.symbol,
            name: i.name,
            price: i.ltp,
            change: i.change,
            changePercent: i.changePercent,
            marketCap: i.marketCap || '',
            exchange: i.exchange as 'NSE' | 'BSE'
        }));
    },

    // Search stocks (backward compatible)
    searchStocks: async (query: string): Promise<MarketStockUI[]> => {
        if (!query) return [];
        const feed = await marketService.getMarketFeed({ limit: 20, q: query });
        return feed.map(i => ({
            symbol: i.symbol,
            name: i.name,
            price: i.ltp,
            change: i.change,
            changePercent: i.changePercent,
            marketCap: i.marketCap || '',
            exchange: i.exchange as 'NSE' | 'BSE'
        }));
    },

    // Search instruments (more detailed)
    searchInstruments: async (q: string, limit: number = 10): Promise<InstrumentSearch[]> => {
        if (!q) return [];

        if (shouldUseBackend()) {
            try {
                const params = new URLSearchParams({ q, limit: String(limit) });
                const res = await fetch(`${BASE_URL}${ENDPOINTS.INSTRUMENTS.SEARCH}?${params}`, { headers: getHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    const items = data.result || data;

                    // Map backend response to InstrumentSearch interface
                    if (Array.isArray(items)) {
                        return items.map(item => ({
                            instrumentKey: item.instrumentKey,
                            symbol: item.tradingSymbol || item.symbol, // API returns tradingSymbol
                            name: item.name,
                            exchange: item.exchange,
                            type: item.instrumentType || item.type || 'EQ'
                        }));
                    }
                    return [];
                }
            } catch (e) {
                console.error('Instrument Search API Error', e);
            }
        }

        // Mock fallback
        await simulateDelay(200);
        const lowerQ = q.toLowerCase();
        return MOCK_INDIAN_STOCKS
            .filter(s => s.symbol.toLowerCase().includes(lowerQ) || s.name.toLowerCase().includes(lowerQ))
            .slice(0, limit)
            .map(s => ({
                instrumentKey: `NSE_EQ|${s.symbol}`,
                symbol: s.symbol,
                name: s.name,
                exchange: s.exchange,
                type: 'EQ'
            }));
    },

    // Resolve instrument by query
    resolveInstrument: async (q: string): Promise<InstrumentSearch | null> => {
        if (!q) return null;

        if (shouldUseBackend()) {
            try {
                const params = new URLSearchParams({ q });
                const res = await fetch(`${BASE_URL}${ENDPOINTS.INSTRUMENTS.RESOLVE}?${params}`, { headers: getHeaders() });
                if (res.ok) {
                    return await res.json();
                }
            } catch (e) {
                console.error('Instrument Resolve API Error', e);
            }
        }

        // Mock fallback - find exact match
        await simulateDelay(100);
        const lowerQ = q.toLowerCase();
        const match = MOCK_INDIAN_STOCKS.find(s =>
            s.symbol.toLowerCase() === lowerQ ||
            s.name.toLowerCase() === lowerQ
        );

        if (match) {
            return {
                instrumentKey: `NSE_EQ|${match.symbol}`,
                symbol: match.symbol,
                name: match.name,
                exchange: match.exchange,
                type: 'EQ'
            };
        }
        return null;
    },

    // Get intraday candle data
    getIntradayCandles: async (instrumentKey: string, options: CandleOptions = {}): Promise<CandleData[]> => {
        const { unit = 'minutes', interval = 1, limit = 200, order = 'asc' } = options;

        if (shouldUseBackend()) {
            try {
                const params = new URLSearchParams({
                    unit,
                    interval: String(interval),
                    limit: String(limit),
                    order
                });
                const encodedKey = encodeURIComponent(instrumentKey);
                const res = await fetch(`${BASE_URL}${ENDPOINTS.MARKET.CANDLES_INTRADAY}/${encodedKey}?${params}`, { headers: getHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    return data || [];
                }
            } catch (e) {
                console.error('Intraday Candles API Error', e);
            }
        }

        // Mock fallback - generate intraday data
        await simulateDelay(300);
        return marketService._generateMockCandles(60, 'intraday');
    },

    // Get historical candle data
    getHistoricalCandles: async (instrumentKey: string, options: HistoricalCandleOptions): Promise<CandleData[]> => {
        const { from, to, unit = 'days', interval = 1, limit = 200, order = 'asc' } = options;

        if (shouldUseBackend()) {
            try {
                const params = new URLSearchParams({
                    from,
                    to,
                    unit,
                    interval: String(interval),
                    limit: String(limit),
                    order
                });
                const encodedKey = encodeURIComponent(instrumentKey);
                const res = await fetch(`${BASE_URL}${ENDPOINTS.MARKET.CANDLES_HISTORY}/${encodedKey}?${params}`, { headers: getHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    return data || [];
                }
            } catch (e) {
                console.error('Historical Candles API Error', e);
            }
        }

        // Mock fallback - generate daily candles
        await simulateDelay(300);
        return marketService._generateMockCandles(60, 'daily');
    },

    // Get market cap for single instrument
    getMarketCap: async (instrumentKey: string): Promise<string | null> => {
        if (shouldUseBackend()) {
            try {
                const encodedKey = encodeURIComponent(instrumentKey);
                const res = await fetch(`${BASE_URL}${ENDPOINTS.MARKET.MARKET_CAP}/${encodedKey}`, { headers: getHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    return data?.marketCap || null;
                }
            } catch (e) {
                console.error('Market Cap API Error', e);
            }
        }

        // Mock fallback
        return '₹1.2L Cr';
    },

    // Get market caps for multiple instruments
    getMarketCaps: async (keys: string[]): Promise<Record<string, string>> => {
        if (shouldUseBackend()) {
            try {
                const params = new URLSearchParams({ keys: keys.join(',') });
                const res = await fetch(`${BASE_URL}${ENDPOINTS.MARKET.MARKET_CAPS}?${params}`, { headers: getHeaders() });
                if (res.ok) {
                    return await res.json();
                }
            } catch (e) {
                console.error('Market Caps API Error', e);
            }
        }

        // Mock fallback
        const result: Record<string, string> = {};
        keys.forEach(k => {
            result[k] = '₹1.2L Cr';
        });
        return result;
    },

    // Internal: Generate mock candle data
    _generateMockCandles: (count: number, type: 'intraday' | 'daily'): CandleData[] => {
        const candles: CandleData[] = [];
        let price = 1500 + Math.random() * 500;
        const now = new Date();

        for (let i = count - 1; i >= 0; i--) {
            const date = new Date(now);
            if (type === 'intraday') {
                date.setMinutes(date.getMinutes() - i);
            } else {
                date.setDate(date.getDate() - i);
            }

            const volatility = price * 0.01;
            const open = price;
            const change = (Math.random() - 0.48) * volatility * 2;
            const close = open + change;
            const high = Math.max(open, close) + Math.random() * volatility * 0.5;
            const low = Math.min(open, close) - Math.random() * volatility * 0.5;

            candles.push({
                ts: date.toISOString(),
                open: parseFloat(open.toFixed(2)),
                high: parseFloat(high.toFixed(2)),
                low: parseFloat(low.toFixed(2)),
                close: parseFloat(close.toFixed(2)),
                volume: Math.floor(Math.random() * 100000 + 10000)
            });

            price = close;
        }

        return candles;
    }
};
