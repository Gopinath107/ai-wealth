
import React, { useState } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { DEMO_USER } from '../config/demoUser';
import { TrendingUp, ArrowRight, Lock, Mail, User as UserIcon, Loader2, ShieldCheck, PieChart, ArrowLeft, KeyRound, PlayCircle } from 'lucide-react';
import MarketIndices from './MarketIndices';

interface AuthProps {
  onLogin: (user: User) => void;
}

type AuthMode = 'LOGIN' | 'SIGNUP' | 'FORGOT_PASSWORD' | 'RESET_PASSWORD';

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Form Data
  const [formData, setFormData] = useState({ name: '', email: '', password: '', newPassword: '' });
  const [resetToken, setResetToken] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (mode === 'LOGIN') {
        const response = await api.auth.login(formData.email, formData.password);
        onLogin(response.user);
      } 
      else if (mode === 'SIGNUP') {
        await api.auth.signup(formData.name, formData.email, formData.password);
        setSuccessMsg("Account created successfully! Please log in.");
        setMode('LOGIN'); 
      }
      else if (mode === 'FORGOT_PASSWORD') {
        const token = await api.auth.forgotPassword(formData.email);
        setResetToken(token);
        setMode('RESET_PASSWORD');
        setSuccessMsg(`We found your account. Please set a new password.`);
      }
      else if (mode === 'RESET_PASSWORD') {
        await api.auth.resetPassword(resetToken, formData.newPassword);
        setSuccessMsg("Password reset successfully. Please login.");
        setTimeout(() => setMode('LOGIN'), 2000);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
      setIsLoading(true);
      setError('');
      try {
          const response = await api.auth.login(DEMO_USER.email, DEMO_USER.password);
          onLogin(response.user);
      } catch (err: any) {
          setError('Demo login failed. Please try again.');
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-white">
      
      {/* Left Side - Visuals */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative flex-col justify-between p-16 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute top-[-20%] left-[-20%] w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://images.unsplash.com/photo-1611974765270-ca1258634369?q=80&w=2664&auto=format&fit=crop')] bg-cover opacity-10 mix-blend-overlay"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-900/50">
               <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">DJ-AI Advisor</span>
          </div>
          
          <h1 className="text-5xl font-bold text-white leading-tight mb-6">
            Wealth management <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              reimagined for you.
            </span>
          </h1>
          <p className="text-slate-400 text-lg max-w-md leading-relaxed">
            Harness the power of artificial intelligence to analyze markets, optimize your portfolio, and reach your financial goals faster.
          </p>
        </div>

        <div className="relative z-10">
            <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-2xl">
                    <PieChart className="w-8 h-8 text-blue-400 mb-3" />
                    <h3 className="text-white font-semibold mb-1">Smart Analytics</h3>
                    <p className="text-slate-400 text-sm">Real-time portfolio tracking.</p>
                </div>
                <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-2xl">
                    <ShieldCheck className="w-8 h-8 text-emerald-400 mb-3" />
                    <h3 className="text-white font-semibold mb-1">Secure & Private</h3>
                    <p className="text-slate-400 text-sm">Bank-grade encryption.</p>
                </div>
            </div>
            
            {/* Live Indices Ticker */}
            <MarketIndices variant="login" />
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-white relative">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900">
              {mode === 'LOGIN' && 'Welcome Back'}
              {mode === 'SIGNUP' && 'Create Account'}
              {mode === 'FORGOT_PASSWORD' && 'Reset Password'}
              {mode === 'RESET_PASSWORD' && 'New Password'}
            </h2>
            <p className="mt-2 text-slate-500">
              {mode === 'LOGIN' && 'Enter your credentials to access your account.'}
              {mode === 'SIGNUP' && 'Start your journey to financial freedom today.'}
              {mode === 'FORGOT_PASSWORD' && 'Enter your email to receive a reset token.'}
              {mode === 'RESET_PASSWORD' && 'Enter your new password below.'}
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center gap-2 animate-fade-in">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
              {error}
            </div>
          )}
          
          {successMsg && (
            <div className="p-4 bg-emerald-50 text-emerald-600 text-sm rounded-xl border border-emerald-100 flex items-center gap-2 animate-fade-in">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              {successMsg}
            </div>
          )}

          {mode === 'LOGIN' && (
             <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between">
                <div>
                    <h4 className="font-bold text-indigo-900 text-sm">New here?</h4>
                    <p className="text-xs text-indigo-600/80">Try out the platform with a demo account.</p>
                </div>
                <button 
                  onClick={handleDemoLogin}
                  disabled={isLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                   <PlayCircle className="w-4 h-4" /> Try Demo
                </button>
             </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'SIGNUP' && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input 
                    type="text" 
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900 font-medium placeholder:text-slate-400"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>
            )}

            {(mode !== 'RESET_PASSWORD') && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input 
                    type="email" 
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900 font-medium placeholder:text-slate-400"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>
            )}

            {(mode === 'LOGIN' || mode === 'SIGNUP') && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-700">Password</label>
                    {mode === 'LOGIN' && (
                        <button type="button" onClick={() => setMode('FORGOT_PASSWORD')} className="text-xs text-blue-600 hover:underline">
                            Forgot?
                        </button>
                    )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input 
                    type="password" 
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900 font-medium placeholder:text-slate-400"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>
            )}

            {mode === 'RESET_PASSWORD' && (
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">New Password</label>
                    <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input 
                        type="password" 
                        required
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900 font-medium placeholder:text-slate-400"
                        placeholder="New strong password"
                        value={formData.newPassword}
                        onChange={e => setFormData({...formData, newPassword: e.target.value})}
                    />
                    </div>
                </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold text-lg transition-all transform hover:translate-y-[-1px] active:translate-y-[1px] shadow-xl shadow-slate-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-8"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {mode === 'LOGIN' && 'Sign In'}
                  {mode === 'SIGNUP' && 'Create Account'}
                  {mode === 'FORGOT_PASSWORD' && 'Send Reset Link'}
                  {mode === 'RESET_PASSWORD' && 'Set Password'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-4">
            {mode === 'LOGIN' ? (
                <p className="text-slate-500">
                Don't have an account?
                <button 
                    onClick={() => { setMode('SIGNUP'); setError(''); setSuccessMsg(''); }}
                    className="ml-2 text-blue-600 font-bold hover:text-blue-700 hover:underline transition-colors"
                >
                    Sign Up
                </button>
                </p>
            ) : mode === 'SIGNUP' ? (
                <p className="text-slate-500">
                Already have an account?
                <button 
                    onClick={() => { setMode('LOGIN'); setError(''); setSuccessMsg(''); }}
                    className="ml-2 text-blue-600 font-bold hover:text-blue-700 hover:underline transition-colors"
                >
                    Sign In
                </button>
                </p>
            ) : (
                <button 
                    onClick={() => { setMode('LOGIN'); setError(''); setSuccessMsg(''); }}
                    className="text-slate-500 hover:text-slate-800 flex items-center justify-center gap-2 mx-auto transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Login
                </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
