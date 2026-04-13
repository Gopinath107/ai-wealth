import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, ColorType, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import {
    TrendingUp,
    TrendingDown,
    Activity,
    Clock,
    AlertCircle,
    RefreshCw,
    ExternalLink,
} from 'lucide-react';
import { InstrumentQuote } from '../../services/aiChatService';
import { BASE_URL, getHeaders } from '../../services/apiConfig';
import './PriceChart.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CandleData {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface PriceChartProps {
    instrumentKeys: string[];
    instrumentQuotes: InstrumentQuote[] | null;  // Rich metadata from backend
    userQuery?: string;                           // Fallback label (user's original query)
}

// ── IST helpers ───────────────────────────────────────────────────────────────

/** Formats an ISO-8601 timestamp (with or without offset) in IST */
const formatIST = (iso: string): string => {
    try {
        const d = new Date(iso);
        return d.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata',
        });
    } catch {
        return '--:--';
    }
};

/** Returns true if the timestamp is > 15 minutes in the past */
const isStale = (iso: string): boolean => {
    try {
        const diff = Date.now() - new Date(iso).getTime();
        return diff > 15 * 60 * 1000;
    } catch {
        return true;
    }
};

/** Returns true if NSE market is currently closed (outside 09:15–15:30 IST, Mon–Fri) */
const isMarketClosed = (): boolean => {
    const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const day = ist.getDay(); // 0=Sun … 6=Sat
    if (day === 0 || day === 6) return true;
    const h = ist.getHours();
    const m = ist.getMinutes();
    const mins = h * 60 + m;
    return mins < 9 * 60 + 15 || mins > 15 * 60 + 30;
};

// ── Colour palette ─────────────────────────────────────────────────────────────

const UP_COLOR   = '#22c55e';
const DOWN_COLOR = '#ef4444';

// ── Main Component ─────────────────────────────────────────────────────────────

const PriceChart: React.FC<PriceChartProps> = ({ instrumentKeys, instrumentQuotes, userQuery = '' }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef          = useRef<IChartApi | null>(null);
    const candleSeriesRef   = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const volumeSeriesRef   = useRef<ISeriesApi<'Histogram'> | null>(null);

    const [candles, setCandles]   = useState<CandleData[]>([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState<string | null>(null);
    const [chartInterval, setChartInterval] = useState<'1D' | '5' | '15' | '60'>('5');
    const [activeKey, setActiveKey] = useState<string | null>(null);

    // Resolve which instrument to display
    const primaryKey = instrumentKeys?.[0] ?? null;

    // Rich metadata for the primary key (from backend)
    const primaryQuote: InstrumentQuote | null =
        instrumentQuotes?.find(q => q.instrumentKey === primaryKey) ??
        instrumentQuotes?.[0] ??
        null;

    // ── Display fallback chain ─────────────────────────────────────────────────
    // Priority: instrumentQuotes (rich) → split instrumentKey → userQuery → '—'
    const rawExchange    = primaryKey?.split('|')?.[0] ?? '';      // e.g. "NSE_EQ"
    const rawExchangeClean = rawExchange.replace(/_EQ$|_BE$|_MF$|_FO$/, '');  // "NSE"
    const displaySymbol  = (primaryQuote?.tradingSymbol ?? userQuery) || '—';
    const displayName    = primaryQuote?.name            ?? (userQuery ? userQuery.replace(/\s*price\s*/i, '').trim() : 'Unknown Instrument');
    const displayExchange = primaryQuote?.exchange        ?? (rawExchangeClean || '—');
    const displayLtp     = primaryQuote?.ltp             ?? null;
    const displayPrevClose  = primaryQuote?.prevClose    ?? null;
    const displayChange     = primaryQuote?.change       ?? 0;
    const displayChangePct  = primaryQuote?.changePercent ?? 0;
    const displayAsOf       = primaryQuote?.asOf         ?? null;
    const displayDelayed    = primaryQuote?.delayed       ?? (displayAsOf ? isStale(displayAsOf) : true);
    const displayClosed     = primaryQuote?.marketClosed ?? isMarketClosed();

    // True symbol: from quotes, or fallback to show raw exchange:symbol cleanly
    const symbolBadge = primaryQuote?.tradingSymbol
        ? `${displayExchange}: ${primaryQuote.tradingSymbol}`
        : primaryKey
        ? `${rawExchangeClean}`
        : userQuery || '—';

    const priceColor = displayChange >= 0 ? UP_COLOR : DOWN_COLOR;

    // ── Fetch candle data ──────────────────────────────────────────────────────

    const fetchCandles = useCallback(async (key: string, iv: string) => {
        setLoading(true);
        setError(null);
        try {
            const url = `${BASE_URL}/api/market/chart/candles`
                + `?instrumentKey=${encodeURIComponent(key)}&interval=${iv}`;
            // Include JWT auth header — candle endpoint is protected
            const res = await fetch(url, { headers: { ...getHeaders(), 'Content-Type': 'application/json' } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            const data: CandleData[] = (json.candles ?? json.data ?? json ?? []).map((c: any) => ({
                time:   c.time   ?? c.timestamp,
                open:   c.open,
                high:   c.high,
                low:    c.low,
                close:  c.close,
                volume: c.volume ?? 0,
            }));
            if (!data.length) throw new Error('No candle data returned');
            setCandles(data);
        } catch (err: any) {
            setError(err.message ?? 'Failed to load chart');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (primaryKey) {
            setActiveKey(primaryKey);
            fetchCandles(primaryKey, chartInterval);
        }
    }, [primaryKey, chartInterval, fetchCandles]);

    // ── Build / update chart ───────────────────────────────────────────────────

    useEffect(() => {
        if (!chartContainerRef.current || candles.length === 0) return;

        if (!chartRef.current) {
            chartRef.current = createChart(chartContainerRef.current, {
                layout: {
                    background: { type: ColorType.Solid, color: 'transparent' },
                    textColor:  '#94a3b8',
                },
                grid: {
                    vertLines:  { color: 'rgba(148,163,184,0.08)' },
                    horzLines:  { color: 'rgba(148,163,184,0.08)' },
                },
                crosshair: { mode: 1 },
                rightPriceScale: { borderColor: 'rgba(148,163,184,0.15)', scaleMargins: { top: 0.1, bottom: 0.25 } },
                timeScale: { borderColor: 'rgba(148,163,184,0.15)', timeVisible: true, secondsVisible: false },
                width:  chartContainerRef.current.clientWidth,
                height: 240,
            });

            candleSeriesRef.current = chartRef.current.addSeries(CandlestickSeries, {
                upColor:       UP_COLOR,
                downColor:     DOWN_COLOR,
                borderVisible: false,
                wickUpColor:   UP_COLOR,
                wickDownColor: DOWN_COLOR,
            });

            volumeSeriesRef.current = chartRef.current.addSeries(HistogramSeries, {
                color:  'rgba(99,102,241,0.2)',
                priceFormat: { type: 'volume' },
                priceScaleId: 'volume',
            });
            chartRef.current.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

            // Resize observer
            const ro = new ResizeObserver(() => {
                if (chartRef.current && chartContainerRef.current) {
                    chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
                }
            });
            ro.observe(chartContainerRef.current);
        }

        // Prepare sorted candle data
        const sorted = [...candles].sort((a, b) => a.time - b.time);
        const candleSeries = sorted.map(c => ({
            time: (c.time > 1e10 ? Math.floor(c.time / 1000) : c.time) as any,
            open: c.open, high: c.high, low: c.low, close: c.close,
        }));
        const volumeSeries = sorted.map(c => ({
            time:  (c.time > 1e10 ? Math.floor(c.time / 1000) : c.time) as any,
            value: c.volume,
            color: c.close >= c.open ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)',
        }));

        candleSeriesRef.current?.setData(candleSeries);
        volumeSeriesRef.current?.setData(volumeSeries);
        chartRef.current.timeScale().fitContent();

    }, [candles]);

    // Cleanup on unmount
    useEffect(() => () => {
        chartRef.current?.remove();
        chartRef.current = null;
    }, []);

    // ── Render ─────────────────────────────────────────────────────────────────

    const intervals: { label: string; value: '1D' | '5' | '15' | '60' }[] = [
        { label: '1D',  value: '1D' },
        { label: '5m',  value: '5'  },
        { label: '15m', value: '15' },
        { label: '1h',  value: '60' },
    ];

    return (
        <div className="price-chart-card">

            {/* ── Prominent Instrument Identity Header ────────────────────── */}
            <div className="chart-instrument-identity">
                <div className="chart-identity-left">
                    {/* Full instrument name — biggest text */}
                    <div className="chart-identity-name">{displayName}</div>
                    {/* Exchange:Symbol badge row */}
                    <div className="chart-identity-badge-row">
                        <span className="chart-identity-exchange">{symbolBadge}</span>
                        {displayClosed ? (
                            <span className="chart-status-badge closed">Market Closed</span>
                        ) : displayDelayed ? (
                            <span className="chart-status-badge delayed">Delayed</span>
                        ) : (
                            <span className="chart-status-badge live">Live</span>
                        )}
                    </div>
                </div>

                <div className="chart-identity-right">
                    {displayLtp !== null ? (
                        <>
                            <div className="chart-ltp" style={{ color: priceColor }}>
                                ₹{displayLtp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="chart-change" style={{ color: priceColor }}>
                                {displayChange >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                                <span>
                                    {displayChange >= 0 ? '+' : ''}{displayChange.toFixed(2)}
                                    &nbsp;({displayChangePct >= 0 ? '+' : ''}{displayChangePct.toFixed(2)}%)
                                </span>
                            </div>
                        </>
                    ) : (
                        <div className="chart-ltp-na">Price unavailable</div>
                    )}
                    {displayAsOf && (
                        <div className="chart-timestamp">
                            <Clock size={11} />
                            <span>Updated {formatIST(displayAsOf)} IST</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Per-quote tabs when multiple instruments are returned */}
            {instrumentQuotes && instrumentQuotes.length > 1 && (
                <div className="chart-tab-row">
                    {instrumentQuotes.map(q => (
                        <button
                            key={q.instrumentKey}
                            className={`chart-tab ${activeKey === q.instrumentKey ? 'active' : ''}`}
                            onClick={() => {
                                setActiveKey(q.instrumentKey);
                                fetchCandles(q.instrumentKey, chartInterval);
                            }}
                        >
                            {q.tradingSymbol}
                        </button>
                    ))}
                </div>
            )}

            {/* Interval selector */}
            <div className="chart-interval-row">
                {intervals.map(iv => (
                    <button
                        key={iv.value}
                        className={`interval-btn ${chartInterval === iv.value ? 'active' : ''}`}
                        onClick={() => setChartInterval(iv.value)}
                    >
                        {iv.label}
                    </button>
                ))}

                <button
                    className="interval-btn refresh-btn"
                    onClick={() => activeKey && fetchCandles(activeKey, chartInterval)}
                    title="Refresh chart"
                >
                    <RefreshCw size={13} />
                </button>

                {activeKey && (
                    <a
                        className="interval-btn external-btn"
                        href={`https://finance.yahoo.com/quote/${displaySymbol}.NS`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open in Yahoo Finance"
                    >
                        <ExternalLink size={13} />
                    </a>
                )}

                {/* Delayed notice in the toolbar */}
                {displayDelayed && !displayClosed && (
                    <span className="chart-delayed-notice">
                        <AlertCircle size={11} />
                        Chart data ~5 min delayed
                    </span>
                )}
            </div>

            {/* Chart area */}
            <div className="chart-area-wrapper">
                {loading && (
                    <div className="chart-loading-overlay">
                        <Activity size={20} className="spin" />
                        <span>Loading chart…</span>
                    </div>
                )}
                {error && !loading && (
                    <div className="chart-error-overlay">
                        <AlertCircle size={20} />
                        <span>{error}</span>
                        <button
                            className="retry-btn"
                            onClick={() => activeKey && fetchCandles(activeKey, chartInterval)}
                        >
                            Retry
                        </button>
                    </div>
                )}
                <div
                    ref={chartContainerRef}
                    className="chart-canvas"
                    style={{ opacity: loading || error ? 0 : 1 }}
                />
            </div>

            {/* Prev close row */}
            {displayPrevClose !== null && (
                <div className="chart-prev-close">
                    Prev Close &nbsp;
                    <strong>₹{displayPrevClose.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
            )}
        </div>
    );
};

export default PriceChart;
