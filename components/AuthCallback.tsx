import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { api } from '../services/api';
import { Loader2 } from 'lucide-react';
import { User } from '../types';

interface AuthCallbackProps {
  onLogin: (user: User) => void;
}

const AuthCallback: React.FC<AuthCallbackProps> = ({ onLogin }) => {
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    
    const processAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (!session) {
          // If no session is found, it's possible it's still being processed from hash fragment
          // We can let Supabase's internal listener grab it, or if it isn't there, we just fail gracefully
          const { data: { subscription: _subscription } } = supabase.auth.onAuthStateChange(
            async (event, sessionState) => {
              if (event === 'SIGNED_IN' && sessionState && isMounted) {
                const provider = sessionState.user?.app_metadata?.provider || 'unknown';
                const supabaseToken = sessionState.access_token;
                const authResponse = await api.auth.handleAuthCallback(supabaseToken, provider);
                onLogin(authResponse.user);
              }
            }
          );
          
          // Fallback check after 3 seconds: if still no session, go back
          setTimeout(() => {
              if (isMounted && !error) {
                 window.location.href = '/';
              }
          }, 3000);

          return;
        }

        const provider = session.user?.app_metadata?.provider || 'unknown';
        const supabaseToken = session.access_token;

        const authResponse = await api.auth.handleAuthCallback(supabaseToken, provider);
        
        if (isMounted) {
            onLogin(authResponse.user);
        }

      } catch (err: any) {
        console.error("Auth callback error:", err);
        if (isMounted) {
            setError(err.message || 'Authentication failed');
        }
      }
    };
    
    processAuth();
    
    return () => {
        isMounted = false;
    };
  }, [onLogin]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-100 w-full max-w-md text-center animate-fade-in">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-500 font-bold text-2xl">!</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Login Failed</h2>
            <p className="text-slate-500 mb-6">{error}</p>
            <button 
               onClick={() => window.location.href = '/'} 
               className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition-colors w-full">
               Return to Login
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 flex flex-col items-center animate-pulse">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <h2 className="text-xl font-bold text-slate-800">Completing Sign In...</h2>
          <p className="text-slate-500 mt-2 text-sm text-center">Please wait while we securely verify your account.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
