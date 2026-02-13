
import React, { useState, useEffect } from 'react';
import { ViewState } from '../types';
import {
  LayoutDashboard,
  Bot,
  Newspaper,
  Menu,
  X,
  TrendingUp,
  Eye,
  Target,
  Trash2,
  LogOut,
  AlertTriangle,
  Sun,
  Moon,
  Settings
} from 'lucide-react';

interface LayoutProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  children: React.ReactNode;
  notifications: string[];
  clearNotifications: () => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const Layout: React.FC<LayoutProps> = ({ currentView, setView, children, notifications, clearNotifications, onLogout, theme, toggleTheme }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [latestToast, setLatestToast] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (notifications.length > 0) {
      setLatestToast(notifications[0]);
      const timer = setTimeout(() => setLatestToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notifications]);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    onLogout();
  };

  const navItems = [
    { view: ViewState.Dashboard, label: 'Dashboard', icon: LayoutDashboard },
    { view: ViewState.Watchlist, label: 'Watchlist', icon: Eye },
    { view: ViewState.Goals, label: 'Investment Goals', icon: Target },
    { view: ViewState.Advisor, label: 'AI Analyst Chat', icon: Bot },
    { view: ViewState.News, label: 'Market News', icon: Newspaper },
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 overflow-hidden">

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Sign Out?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">Are you sure you want to end your session?</p>
              <div className="flex w-full gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <aside className="hidden md:flex flex-col w-64 bg-slate-900 dark:bg-slate-950 text-white border-r border-slate-800">
        <div className="p-6 flex items-center space-x-2 border-b border-slate-800">
          <TrendingUp className="text-blue-500 w-8 h-8" />
          <h1 className="text-xl font-bold tracking-tight">DJ-AI</h1>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group relative ${currentView === item.view
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              {currentView === item.view && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></span>
              )}
              <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${currentView === item.view ? 'animate-pulse' : ''}`} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <button
            onClick={() => setView(ViewState.Settings)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${currentView === ViewState.Settings ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </button>
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Sticky Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-slate-900/95 backdrop-blur-md text-white z-50 flex justify-between items-center p-4 border-b border-slate-800 transition-all duration-300">
        <div className="flex items-center space-x-2">
          <TrendingUp className="text-blue-500 w-6 h-6" />
          <span className="font-bold text-lg">DJ-AI</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay with Smooth Transition */}
      <div className={`fixed inset-0 bg-slate-900 z-40 pt-20 px-4 md:hidden flex flex-col justify-between pb-8 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <nav className="space-y-2 mt-4 overflow-y-auto max-h-[60vh]">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => {
                setView(item.view);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-4 px-4 py-4 rounded-xl transition-all duration-200 ${currentView === item.view
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 scale-[1.02]'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="font-semibold text-lg">{item.label}</span>
              {currentView === item.view && <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse" />}
            </button>
          ))}
        </nav>

        <div className="space-y-3">
          <button
            onClick={() => { setView(ViewState.Settings); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center justify-center space-x-3 px-4 py-4 rounded-xl transition-colors font-semibold ${currentView === ViewState.Settings ? 'bg-blue-600 text-white' : 'text-slate-400 bg-slate-800'}`}
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center justify-center space-x-3 px-4 py-4 rounded-xl text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors font-semibold"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <main className={`flex-1 relative bg-slate-50 dark:bg-slate-950 transition-colors duration-300 scroll-smooth ${currentView === ViewState.Advisor
        ? 'overflow-hidden flex flex-col'
        : 'overflow-y-auto md:p-8 p-4 pt-24 md:pt-8'
        }`}>
        {/* Header icons removed - Notifications moved to sidebar */}

        {currentView === ViewState.Advisor ? (
          <div className="flex-1 flex flex-col min-h-0 pt-16 md:pt-0">
            {children}
          </div>
        ) : (
          <div className="max-w-7xl mx-auto pt-16 md:pt-0">
            {children}
          </div>
        )}
      </main>
    </div>
  );
};

export default Layout;
