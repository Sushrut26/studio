import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

export function getSupabaseForUser(userId: string, role: 'authenticated' | 'admin' = 'authenticated') {
  console.log('getSupabaseForUser - Starting with userId:', userId, 'role:', role);
  
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

  console.log('getSupabaseForUser - Environment check:', {
    hasUrl: !!SUPABASE_URL,
    hasAnonKey: !!SUPABASE_ANON_KEY,
    hasJwtSecret: !!SUPABASE_JWT_SECRET,
    urlLength: SUPABASE_URL?.length || 0,
    anonKeyLength: SUPABASE_ANON_KEY?.length || 0,
    jwtSecretLength: SUPABASE_JWT_SECRET?.length || 0
  });

  if (!SUPABASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable. Please set it in your .env.local file.');
  }
  if (!SUPABASE_ANON_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable. Please set it in your .env.local file.');
  }
  if (!SUPABASE_JWT_SECRET) {
    throw new Error('Missing SUPABASE_JWT_SECRET environment variable. Please set it in your .env.local file. This should match your Supabase project\'s JWT secret.');
  }

  try {
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

    console.log('getSupabaseForUser - JWT token created, length:', token.length);

    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    console.log('getSupabaseForUser - Supabase client created successfully');
    return client;
  } catch (error) {
    console.error('getSupabaseForUser - Error creating client:', error);
    throw error;
  }
}


