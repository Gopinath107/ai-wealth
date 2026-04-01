/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read from process.env (injected via vite.config.ts define) with import.meta.env fallback
const supabaseUrl = (process as any).env?.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (process as any).env?.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('[Supabase] Client initialized successfully.');
} else {
  console.warn(
    'Missing Supabase environment variables. Social auth will not work.',
    'URL:', supabaseUrl ? 'SET' : 'MISSING',
    'KEY:', supabaseAnonKey ? 'SET' : 'MISSING'
  );
}

export { supabase };
