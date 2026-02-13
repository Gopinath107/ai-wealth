
import React, { useState } from 'react';
import { Transaction, Asset } from '../types';
import { MOCK_ASSETS } from '../services/mockData';
import { ArrowUpRight, ArrowDownLeft, Receipt, DollarSign, Search, Filter, Download, Edit2, X, Info, Calendar, Hash, FileText, CheckCircle2, Clock, Wallet } from 'lucide-react';

interface TransactionsProps {
  transactions: Transaction[];
  isLoading?: boolean;
  onEditTransaction: (tx: Transaction) => void;
}

const Transactions: React.FC<TransactionsProps> = ({ transactions, isLoading, onEditTransaction }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<Transaction | null>(null);

  const getIcon = (type: string) => {
    switch(type) {
      case 'Buy': return <ArrowDownLeft className="w-4 h-4 text-blue-600" />;
      case 'Sell': return <ArrowUpRight className="w-4 h-4 text-slate-600" />;
      case 'Dividend': return <DollarSign className="w-4 h-4 text-emerald-600" />;
      default: return <Receipt className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Completed': 
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-800">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700">
            {status}
          </span>
        );
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const asset = MOCK_ASSETS.find(a => a.symbol === t.assetSymbol);
    const assetName = asset?.name || '';
    const assetType = asset?.type || '';

    const matchesSearch = 
        t.assetSymbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
        assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assetType.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'All' || t.type === filterType;
    const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in relative pb-12">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Transaction History</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Detailed logs of all capital deployments and liquidations.</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
           <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 w-5 h-5 transition-colors" />
              <input 
                type="text" 
                placeholder="Search symbol, company, or type..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isLoading}
                className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 shadow-sm transition-all dark:text-white"
              />
           </div>
           
           <div className="flex gap-3 w-full lg:w-auto">
               <div className="relative flex-1 lg:w-48">
                  <select 
                    value={filterType} 
                    onChange={(e) => setFilterType(e.target.value)}
                    disabled={isLoading}
                    className="w-full pl-4 pr-10 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 shadow-sm appearance-none cursor-pointer dark:text-white font-medium text-slate-700"
                  >
                    <option value="All">All Types</option>
                    <option value="Buy">Buy Positions</option>
                    <option value="Sell">Liquidations</option>
                    <option value="Dividend">Dividends</option>
                    <option value="Deposit">Deposits</option>
                  </select>
                  <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
               </div>
           </div>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedTxForDetail && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-800">
                  <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${
                            selectedTxForDetail.type === 'Buy' ? 'bg-blue-100 text-blue-600' :
                            selectedTxForDetail.type === 'Sell' ? 'bg-slate-100 text-slate-600' :
                            'bg-emerald-100 text-emerald-600'
                        }`}>
                            {getIcon(selectedTxForDetail.type)}
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Protocol Record</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">Transaction Detail</p>
                        </div>
                      </div>
                      <button onClick={() => setSelectedTxForDetail(null)} className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 rounded-full shadow-sm transition-all">
                          <X className="w-5 h-5"/>
                      </button>
                  </div>
                  
                  <div className="p-8 space-y-6">
                      <div className="bg-slate-900 dark:bg-black p-6 rounded-[2rem] text-white shadow-xl flex justify-between items-center border border-white/10">
                          <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Impact Value</p>
                              <div className="text-3xl font-black flex items-center gap-1">
                                  <DollarSign className="w-6 h-6 text-indigo-400" />
                                  {selectedTxForDetail.total.toLocaleString(undefined, {minimumFractionDigits: 2})}
                              </div>
                          </div>
                          <div className="text-right">
                              {getStatusBadge(selectedTxForDetail.status)}
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                              <div className="flex items-center gap-2 text-slate-400 mb-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-black uppercase tracking-tighter">Event Date</span>
                              </div>
                              <p className="font-bold text-slate-900 dark:text-white">{selectedTxForDetail.date}</p>
                          </div>
                          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                              <div className="flex items-center gap-2 text-slate-400 mb-1">
                                  <Hash className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-black uppercase tracking-tighter">Record ID</span>
                              </div>
                              <p className="font-bold text-slate-900 dark:text-white text-xs truncate">{selectedTxForDetail.id}</p>
                          </div>
                      </div>

                      <div className="space-y-4">
                          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                              <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Asset Identity</span>
                              <span className="font-black text-slate-900 dark:text-white">{selectedTxForDetail.assetSymbol}</span>
                          </div>
                          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                              <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Protocol Type</span>
                              <span className="font-black text-slate-900 dark:text-white">{selectedTxForDetail.type}</span>
                          </div>
                          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                              <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Execution Price</span>
                              <span className="font-black text-slate-900 dark:text-white">${selectedTxForDetail.price.toLocaleString()}</span>
                          </div>
                      </div>

                      {selectedTxForDetail.notes && (
                          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                              <div className="flex items-center gap-2 text-indigo-400 mb-2">
                                  <FileText className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-black uppercase tracking-tighter">Protocol Notes</span>
                              </div>
                              <p className="text-sm text-indigo-900 dark:text-indigo-200 italic">"{selectedTxForDetail.notes}"</p>
                          </div>
                      )}

                      <button 
                        onClick={() => setSelectedTxForDetail(null)}
                        className="w-full py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:brightness-110 transition-all"
                      >
                          Close Record
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Protocol Date</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Record Type</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Asset Entity</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Net Impact</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center hidden sm:table-cell">Status</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {isLoading ? (
                 Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                        <td className="px-6 py-6"><div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded"></div></td>
                        <td className="px-6 py-6"><div className="h-6 w-20 bg-slate-100 dark:bg-slate-800 rounded-lg"></div></td>
                        <td className="px-6 py-6"><div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded"></div></td>
                        <td className="px-6 py-6"><div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded ml-auto"></div></td>
                        <td className="px-6 py-6 hidden sm:table-cell text-center"><div className="h-6 w-16 bg-slate-100 dark:bg-slate-800 rounded-full mx-auto"></div></td>
                        <td className="px-6 py-6 text-center"><div className="h-8 w-8 bg-slate-100 dark:bg-slate-800 rounded-full mx-auto"></div></td>
                    </tr>
                 ))
              ) : filteredTransactions.length === 0 ? (
                 <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-400 dark:text-slate-500 font-medium">No protocol records found.</td></tr>
              ) : (
                filteredTransactions.map((t) => {
                  const asset = MOCK_ASSETS.find(a => a.symbol === t.assetSymbol);
                  return (
                    <tr 
                        key={t.id} 
                        className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all cursor-pointer group"
                        onClick={() => setSelectedTxForDetail(t)}
                    >
                      <td className="px-6 py-6 text-sm text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">{t.date}</td>
                      <td className="px-6 py-6">
                         <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border
                            ${t.type === 'Buy' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800' :
                            t.type === 'Sell' ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' :
                            'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800'
                            }`}>
                            {getIcon(t.type)} {t.type}
                         </span>
                      </td>
                      <td className="px-6 py-6">
                        <div className="font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{t.assetSymbol}</div>
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter truncate max-w-[120px]">{asset?.name || 'External'}</div>
                      </td>
                      <td className={`px-6 py-6 text-right text-sm font-black ${['Sell', 'Dividend', 'Deposit'].includes(t.type) ? 'text-emerald-600' : 'text-slate-900 dark:text-slate-200'}`}>
                        {['Sell', 'Dividend', 'Deposit'].includes(t.type) ? '+' : ''}${t.total.toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                      <td className="px-6 py-6 text-center hidden sm:table-cell">{getStatusBadge(t.status)}</td>
                      <td className="px-6 py-6 text-center" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setSelectedTxForDetail(t)} className="p-2 text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"><Info className="w-4.5 h-4.5" /></button>
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

export default Transactions;
