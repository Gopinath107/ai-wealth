
import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, AreaSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, AreaSeriesOptions } from 'lightweight-charts';
import { BASE_URL, ENDPOINTS, getHeaders } from '../../services/apiConfig';

interface PriceChartProps {
    instrumentKeys: string[];
}

interface CandleData {
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

type TimeRange = '1D' | '5D' | '1M' | '6M' | '1Y';

const PriceChart: React.FC<PriceChartProps> = ({ instrumentKeys }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
    const [activeRange, setActiveRange] = useState<TimeRange>('1D');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [priceInfo, setPriceInfo] = useState<{
        name: string;
        ltp: number;
        change: number;
        changePercent: number;
    } | null>(null);

    // Only render chart for the first instrument key
    const instrumentKey = instrumentKeys[0];

    const fetchCandleData = async (range: TimeRange) => {
        try {
            const encodedKey = encodeURIComponent(instrumentKey);
            let url: string;

            if (range === '1D') {
                url = `${BASE_URL}${ENDPOINTS.MARKET.CANDLES_INTRADAY}/${encodedKey}?unit=minutes&interval=5&limit=200&order=asc`;
            } else {
                const to = new Date();
                const from = new Date();
                let unit = 'day';
                let interval = 1;

                switch (range) {
                    case '5D':
                        from.setDate(from.getDate() - 5);
                        unit = 'minutes';
                        interval = 15;
                        break;
                    case '1M':
                        from.setMonth(from.getMonth() - 1);
                        unit = 'day';
                        interval = 1;
                        break;
                    case '6M':
                        from.setMonth(from.getMonth() - 6);
                        unit = 'day';
                        interval = 1;
                        break;
                    case '1Y':
                        from.setFullYear(from.getFullYear() - 1);
                        unit = 'week';
                        interval = 1;
                        break;
                }

                const fromStr = from.toISOString().split('T')[0];
                const toStr = to.toISOString().split('T')[0];
                url = `${BASE_URL}${ENDPOINTS.MARKET.CANDLES_HISTORY}/${encodedKey}?unit=${unit}&interval=${interval}&from=${fromStr}&to=${toStr}&limit=300&order=asc`;
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: getHeaders(),
            });

            if (!response.ok) throw new Error('Failed to fetch candle data');

            const json = await response.json();
            const candles: CandleData[] = json.data || json.content || [];

            if (!candles || candles.length === 0) return [];

            // Set price info from last candle
            const lastCandle = candles[candles.length - 1];
            const firstCandle = candles[0];
            if (lastCandle) {
                const change = lastCandle.close - firstCandle.open;
                const changePercent = (change / firstCandle.open) * 100;
                setPriceInfo({
                    name: instrumentKey.split('|')[1] || instrumentKey,
                    ltp: lastCandle.close,
                    change: Math.round(change * 100) / 100,
                    changePercent: Math.round(changePercent * 100) / 100,
                });
            }

            // Convert to lightweight-charts format
            return candles.map((c) => {
                const time = Math.floor(new Date(c.timestamp).getTime() / 1000);
                return {
                    time: time as any,
                    value: c.close,
                };
            });
        } catch (err) {
            console.error('Error fetching candle data:', err);
            throw err;
        }
    };

    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Create chart
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#ffffff' },
                textColor: '#333',
                fontFamily: "'Inter', -apple-system, sans-serif",
            },
            grid: {
                vertLines: { color: '#f0f0f0' },
                horzLines: { color: '#f0f0f0' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 280,
            timeScale: {
                borderColor: '#e0e0e0',
                timeVisible: true,
                secondsVisible: false,
            },
            rightPriceScale: {
                borderColor: '#e0e0e0',
            },
            crosshair: {
                vertLine: { color: '#6366f1', width: 1, style: 2 },
                horzLine: { color: '#6366f1', width: 1, style: 2 },
            },
        });

        // v5 API: use chart.addSeries(AreaSeries, options) instead of chart.addAreaSeries()
        const series = chart.addSeries(AreaSeries, {
            lineColor: '#22c55e',
            topColor: 'rgba(34, 197, 94, 0.3)',
            bottomColor: 'rgba(34, 197, 94, 0.02)',
            lineWidth: 2,
            priceLineVisible: true,
            priceLineColor: '#22c55e',
            crosshairMarkerVisible: true,
            crosshairMarkerRadius: 4,
            crosshairMarkerBorderColor: '#22c55e',
            crosshairMarkerBackgroundColor: '#ffffff',
        });

        chartRef.current = chart;
        seriesRef.current = series as any;

        // Handle resize
        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);

    // Fetch data when range changes
    useEffect(() => {
        if (!seriesRef.current) return;

        setLoading(true);
        setError(null);

        fetchCandleData(activeRange)
            .then((data) => {
                if (data && data.length > 0 && seriesRef.current && chartRef.current) {
                    seriesRef.current.setData(data);
                    chartRef.current.timeScale().fitContent();

                    // Update line color based on performance
                    const firstVal = (data[0] as any).value;
                    const lastVal = (data[data.length - 1] as any).value;
                    const isPositive = lastVal >= firstVal;

                    seriesRef.current.applyOptions({
                        lineColor: isPositive ? '#22c55e' : '#ef4444',
                        topColor: isPositive
                            ? 'rgba(34, 197, 94, 0.3)'
                            : 'rgba(239, 68, 68, 0.3)',
                        bottomColor: isPositive
                            ? 'rgba(34, 197, 94, 0.02)'
                            : 'rgba(239, 68, 68, 0.02)',
                        priceLineColor: isPositive ? '#22c55e' : '#ef4444',
                    } as Partial<AreaSeriesOptions>);
                } else {
                    setError('No chart data available');
                }
                setLoading(false);
            })
            .catch(() => {
                setError('Failed to load chart');
                setLoading(false);
            });
    }, [activeRange, instrumentKey]);

    const ranges: TimeRange[] = ['1D', '5D', '1M', '6M', '1Y'];

    return (
        <div className="price-chart-container">
            {/* Price Header */}
            {priceInfo && (
                <div className="price-chart-header">
                    <span className="price-chart-ltp">₹{priceInfo.ltp.toFixed(2)}</span>
                    <span
                        className={`price-chart-change ${priceInfo.change >= 0 ? 'positive' : 'negative'
                            }`}
                    >
                        {priceInfo.change >= 0 ? '↑' : '↓'}{' '}
                        {priceInfo.change >= 0 ? '+' : ''}
                        {priceInfo.changePercent.toFixed(2)}% today
                    </span>
                </div>
            )}

            {/* Chart */}
            <div
                ref={chartContainerRef}
                className="price-chart-canvas"
                style={{ position: 'relative' }}
            >
                {loading && (
                    <div className="price-chart-loading">
                        <div className="price-chart-spinner" />
                    </div>
                )}
                {error && <div className="price-chart-error">{error}</div>}
            </div>

            {/* Time Range Buttons */}
            <div className="price-chart-ranges">
                {ranges.map((range) => (
                    <button
                        key={range}
                        className={`price-chart-range-btn ${activeRange === range ? 'active' : ''
                            }`}
                        onClick={() => setActiveRange(range)}
                    >
                        {range}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default PriceChart;
