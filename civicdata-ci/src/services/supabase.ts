import { createClient } from '@supabase/supabase-js';

// Supabase credentials (environment variables or fallback defaults for local demo)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://demo-civic-ci.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.demo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && 
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    !import.meta.env.VITE_SUPABASE_URL.includes('demo')
  );
};
