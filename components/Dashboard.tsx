
import React, { useState } from 'react';
import { Portfolio } from '../types';
import { PERFORMANCE_DATA, ALLOCATION_DATA } from '../services/mockData';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Brush, Sector, BarChart, Bar, LineChart, Line
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, DollarSign, Wallet, Activity, Settings2, Grid3X3, Palette, TrendingUp } from 'lucide-react';
import MarketOverview from './MarketOverview';
import MarketIndices from './MarketIndices';

interface DashboardProps {
  portfolio: Portfolio | null;
  isLoading?: boolean;
  onViewAsset?: (asset: any) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#64748b', '#8b5cf6'];

const renderActiveShape = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const RADIAN = Math.PI / 180;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} className="text-sm font-bold">
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
    </g>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl z-50">
        <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">{label || payload[0].name}</p>
        <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
          ${payload[0].value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
        </p>
        {payload[0].payload.percent && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {payload[0].name}: {(payload[0].payload.percent * 100).toFixed(0)}%
            </p>
        )}
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC<DashboardProps> = ({ portfolio, isLoading, onViewAsset }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Chart Customization State
  const [chartType, setChartType] = useState<'area' | 'line' | 'bar'>('area');
  const [curveType, setCurveType] = useState<'monotone' | 'linear' | 'step'>('monotone');
  const [showGrid, setShowGrid] = useState(false);
  const [chartColor, setChartColor] = useState('#3b82f6'); // Default Blue

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const ChartComponent = chartType === 'bar' ? BarChart : chartType === 'line' ? LineChart : AreaChart;
  // @ts-ignore
  const DataComponent = chartType === 'bar' ? Bar : chartType === 'line' ? Line : Area;

  const cycleColor = () => {
      const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];
      const idx = colors.indexOf(chartColor);
      setChartColor(colors[(idx + 1) % colors.length]);
  };

  if (isLoading || !portfolio) {
    return (
      <div className="space-y-6 animate-pulse">
         <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-xl w-full md:w-1/2 mb-8"></div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
         </div>
      </div>
    );
  }

  const pieProps: any = {
    activeIndex: activeIndex,
    activeShape: renderActiveShape,
    data: ALLOCATION_DATA,
    cx: "50%",
    cy: "50%",
    innerRadius: 60,
    outerRadius: 80,
    fill: "#8884d8",
    dataKey: "value",
    onMouseEnter: onPieEnter,
    paddingAngle: 2
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Financial Overview</h2>
          <p className="text-slate-500 dark:text-slate-400">Real-time market insights and portfolio tracking.</p>
        </div>
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
            Market Open
          </span>
        </div>
      </div>

      {/* INDICES BAR */}
      <MarketIndices variant="dashboard" />

      {/* Indian Markets Overview (Prominent Search & Feed) */}
      <MarketOverview onViewDetails={onViewAsset} />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {/* Total Net Worth */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className={`flex items-center text-sm font-bold ${portfolio.change24hPercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {portfolio.change24hPercent >= 0 ? <ArrowUpRight className="w-4 h-4 mr-1"/> : <ArrowDownRight className="w-4 h-4 mr-1"/>}
              {Math.abs(portfolio.change24hPercent).toFixed(2)}%
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Net Worth</p>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 truncate">
            ${portfolio.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h3>
        </div>

        {/* 24h Profit/Loss */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
              <Activity className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">24h Profit/Loss</p>
          <h3 className={`text-2xl sm:text-3xl font-black mt-1 truncate ${portfolio.change24hValue >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {portfolio.change24hValue >= 0 ? '+' : '-'}${Math.abs(portfolio.change24hValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h3>
        </div>

        {/* Total Assets */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all sm:col-span-2 md:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
              <Wallet className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Active Assets</p>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
            {portfolio.assets.length}
          </h3>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart with Controls */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
             <h3 className="text-lg font-bold text-slate-900 dark:text-white">Portfolio Performance</h3>
             
             {/* Chart Controls */}
             <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1">
                <button 
                  onClick={() => setChartType(prev => prev === 'area' ? 'line' : prev === 'line' ? 'bar' : 'area')}
                  className="p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-all"
                  title="Toggle Chart Type"
                >
                   {chartType === 'area' ? <TrendingUp className="w-4 h-4" /> : chartType === 'bar' ? <div className="w-4 h-4 flex items-end justify-center gap-[1px]"><div className="w-1 h-2 bg-current"></div><div className="w-1 h-4 bg-current"></div><div className="w-1 h-3 bg-current"></div></div> : <div className="w-4 h-4 border-b-2 border-l-2 border-current"></div>}
                </button>
                <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                <button 
                  onClick={() => setCurveType(prev => prev === 'monotone' ? 'linear' : prev === 'linear' ? 'step' : 'monotone')}
                  className="p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-all"
                  title="Toggle Curve Style"
                  disabled={chartType === 'bar'}
                >
                   <Settings2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setShowGrid(!showGrid)}
                  className={`p-1.5 rounded-md transition-all ${showGrid ? 'bg-white dark:bg-slate-700 text-indigo-500' : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'}`}
                  title="Toggle Grid"
                >
                   <Grid3X3 className="w-4 h-4" />
                </button>
                <button 
                  onClick={cycleColor}
                  className="p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-all"
                  title="Cycle Color Theme"
                >
                   <Palette className="w-4 h-4" style={{ color: chartColor }} />
                </button>
             </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {/* @ts-ignore */}
              <ChartComponent data={PERFORMANCE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.1}/>
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />}
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value: any) => `$${value/1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                {/* @ts-ignore */}
                <DataComponent 
                    type={curveType} 
                    dataKey="value" 
                    stroke={chartColor} 
                    fill={chartType === 'area' ? "url(#colorValue)" : chartColor} 
                    fillOpacity={chartType === 'bar' ? 0.8 : 1}
                    strokeWidth={2} 
                    animationDuration={1500} 
                    dot={chartType === 'line'}
                />
                <Brush dataKey="name" height={30} stroke={chartColor} fill="transparent" className="dark:fill-slate-900" tickFormatter={() => ''} />
              </ChartComponent>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Allocation Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Asset Allocation</h3>
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie {...pieProps}>
                  {ALLOCATION_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
