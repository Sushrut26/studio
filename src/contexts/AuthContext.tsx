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
  AuthError,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

const isDev = process.env.NODE_ENV === 'development';

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
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);
  const router = useRouter();
  const pathname = usePathname();

  // Function to create user in our database via secure API
  const createUserInDatabase = async (firebaseUser: User) => {
    const now = Date.now();
    // Debounce: only sync if 5 seconds have passed since last sync
    if (now - lastSyncTime < 5000) {
      return;
    }
    
    try {
      setLastSyncTime(now);
      const idToken = await firebaseUser.getIdToken();
      const res = await fetch('/api/users/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: firebaseUser.displayName || undefined,
          avatar_url: firebaseUser.photoURL || undefined,
          email: firebaseUser.email || undefined,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        // Don't log rate limit errors as they're expected during auth state changes
        if (res.status !== 429) {
          if (isDev) console.error('users/sync failed:', text);
        }
      }
    } catch (error) {
      if (isDev) console.error('Error creating user in database:', error);
    }
  };

  // Keep auth state in sync
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      // Create user in our database when they sign in
      if (firebaseUser) {
        await createUserInDatabase(firebaseUser);
      }
      
      setLoading(false);
    });
    return unsub;
  }, []);

  // Resolve redirect sign-in results and navigate if needed
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const result = await getRedirectResult(auth);
        const u = result?.user ?? auth.currentUser ?? null;
        if (!active) return;

        if (u) {
          // Ensure context reflects the signed-in user
          setUser(u);
          setLoading(false);

          // Create user in our database
          await createUserInDatabase(u);

          // If we landed back on /login after redirect, go home
          if (pathname === '/login') {
            router.replace('/');
          }
        }
      } catch (error) {
        // Useful for debugging; don't throw to avoid breaking page load
        if (isDev) console.error('Redirect sign-in failed:', error);
      }
    })();
    return () => {
      active = false;
    };
    // Include pathname/router so we can route out of /login after redirect
  }, [pathname, router]);

  const login = async () => {
    const inIframe =
      typeof window !== 'undefined' && window.self !== window.top;

    try {
      if (inIframe) {
        // Embedded contexts (e.g., Firebase Studio preview) often block popups
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      await signInWithPopup(auth, googleProvider);
    } catch (error: unknown) {
      // Fallback if popup is blocked or closed
      if (error instanceof Error && 
          (error.message.includes('popup-blocked') || 
           error.message.includes('popup-closed-by-user'))) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        throw error;
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

  // Render nothing while deciding; swap for a spinner if you like
  if (loading || (!user && pathname !== '/login')) return null;

  return <>{children}</>;
};
