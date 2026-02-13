
import React from 'react';
import { User } from '../types';
import { Moon, Sun, Monitor, User as UserIcon, Shield, Bell, Trash2, LogOut } from 'lucide-react';

interface SettingsProps {
  user: User | null;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onLogout: () => void;
}

const Settings: React.FC<SettingsProps> = ({ user, theme, toggleTheme, onLogout }) => {
  return (
    <div className="space-y-8 animate-fade-in pb-10 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Settings</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Manage your account preferences and appearance.</p>
      </div>

      {/* Account Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-indigo-500" /> Account Information
        </h3>
        
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center overflow-hidden shrink-0">
             {user?.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
             ) : (
                <UserIcon className="w-10 h-10 text-slate-400" />
             )}
          </div>
          
          <div className="flex-1 space-y-6 w-full">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                   <input type="text" value={user?.name || ''} disabled className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-300 font-medium opacity-70 cursor-not-allowed" />
                </div>
                <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                   <input type="text" value={user?.email || ''} disabled className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-300 font-medium opacity-70 cursor-not-allowed" />
                </div>
             </div>
             
             <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <button onClick={onLogout} className="text-red-600 hover:text-red-700 font-medium flex items-center gap-2 text-sm">
                   <LogOut className="w-4 h-4" /> Sign Out of Session
                </button>
             </div>
          </div>
        </div>
      </div>

      {/* Appearance Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <Monitor className="w-5 h-5 text-indigo-500" /> Appearance
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           <button 
             onClick={() => theme === 'dark' && toggleTheme()}
             className={`relative p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${theme === 'light' ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10 ring-1 ring-indigo-500' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
           >
              <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-amber-500">
                 <Sun className="w-6 h-6" />
              </div>
              <div className="text-left">
                 <p className={`font-bold ${theme === 'light' ? 'text-indigo-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>Light Mode</p>
                 <p className="text-xs text-slate-500">Clean and bright interface</p>
              </div>
              {theme === 'light' && <div className="absolute top-4 right-4 w-3 h-3 bg-indigo-500 rounded-full"></div>}
           </button>

           <button 
             onClick={() => theme === 'light' && toggleTheme()}
             className={`relative p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${theme === 'dark' ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10 ring-1 ring-indigo-500' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
           >
              <div className="w-12 h-12 rounded-full bg-slate-800 shadow-sm flex items-center justify-center text-indigo-400">
                 <Moon className="w-6 h-6" />
              </div>
              <div className="text-left">
                 <p className={`font-bold ${theme === 'dark' ? 'text-indigo-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>Dark Mode</p>
                 <p className="text-xs text-slate-500">Easy on the eyes</p>
              </div>
              {theme === 'dark' && <div className="absolute top-4 right-4 w-3 h-3 bg-indigo-500 rounded-full"></div>}
           </button>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-500" /> System & Privacy
        </h3>
        
        <div className="space-y-4">
           <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                 <Bell className="w-5 h-5 text-slate-400" />
                 <div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">Notifications</p>
                    <p className="text-xs text-slate-500">Receive alerts for price changes</p>
                 </div>
              </div>
              <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-indigo-600">
                 <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition" />
              </div>
           </div>

           <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                 <Trash2 className="w-5 h-5 text-red-400" />
                 <div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">Clear Local Data</p>
                    <p className="text-xs text-slate-500">Remove cached portfolio data</p>
                 </div>
              </div>
              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600">
                 Clear & Reload
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
