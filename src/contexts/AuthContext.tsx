'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  type User,
  onAuthStateChanged,
  signOut,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Handle auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Resolve redirect sign-in results (no-op if there isn't one)
  useEffect(() => {
    // Avoid double calls if SSR/hydration quirks
    let active = true;
    (async () => {
      try {
        await getRedirectResult(auth);
      } catch (e) {
        // Swallow to avoid breaking page load; useful for debugging if needed
        console.error('Redirect sign-in failed:', e);
      } finally {
        if (active) {
          // nothing else to do; onAuthStateChanged will set the user
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = async () => {
    const inIframe =
      typeof window !== 'undefined' && window.self !== window.top;

    try {
      if (inIframe) {
        // Embedded contexts (Firebase Studio preview) often block popups.
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      // Fallback if popup is blocked or closed
      if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/popup-closed-by-user') {
        await signInWithRedirect(auth, googleProvider);
      } else {
        throw e;
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user && pathname !== '/login') {
        router.replace('/login');
      } else if (user && pathname === '/login') {
        router.replace('/');
      }
    }
  }, [user, loading, pathname, router]);

  // Optional: show nothing while deciding; you can render a spinner here
  if (loading || (!user && pathname !== '/login')) return null;

  return <>{children}</>;
};
