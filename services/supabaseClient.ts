/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('[Supabase] Client initialized successfully.');
} else {
  console.warn(
    'Missing Supabase environment variables. Social auth will not work.',
    'VITE_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING',
    'VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET' : 'MISSING'
  );
}

export { supabase };
