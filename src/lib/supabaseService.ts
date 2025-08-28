import { createClient } from '@supabase/supabase-js';

export function getSupabaseService(jwt?: string) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  const headers: { [key: string]: string } = {
    'apikey': SUPABASE_ANON_KEY,
  };

  if (jwt) {
    headers['Authorization'] = `Bearer ${jwt}`;
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      headers,
    }
  });
}
