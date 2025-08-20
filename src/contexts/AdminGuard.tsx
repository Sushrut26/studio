'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!loading && user && supabaseUrl && supabaseKey) {
      fetch(`${supabaseUrl}/rest/v1/users?id=eq.${user.uid}&select=role`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data) && data[0]?.role === 'admin') {
            setIsAdmin(true);
          } else {
            router.replace('/');
          }
          setChecking(false);
        })
        .catch(() => {
          router.replace('/');
          setChecking(false);
        });
    } else if (!loading && !user) {
      router.replace('/login');
      setChecking(false);
    }
  }, [user, loading, router]);

  if (loading || checking) {
    return null;
  }

  return isAdmin ? <>{children}</> : null;
}
