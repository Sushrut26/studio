import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

export function getSupabaseForUser(userId: string, role: 'authenticated' | 'admin' = 'authenticated') {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_JWT_SECRET) {
    throw new Error('Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_JWT_SECRET');
  }

  const token = jwt.sign(
    {
      // Used by RLS policies: auth.uid() derives from sub
      sub: userId,
      // Used by policies like auth.jwt()->>'role' = 'admin'
      role,
      aud: role,
    },
    SUPABASE_JWT_SECRET,
    { expiresIn: '1h' }
  );

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}


