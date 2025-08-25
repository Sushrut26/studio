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

// Function to create user in our database
const createUserInDatabase = async (firebaseUser: User) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) return;

  try {
               // Generate a UUID from the Firebase UID (simple hash)
           const generateUUID = (str: string) => {
             // Create a simple hash from the string
             let hash = 0;
             for (let i = 0; i < str.length; i++) {
               const char = str.charCodeAt(i);
               hash = ((hash << 5) - hash) + char;
               hash = hash & hash; // Convert to 32-bit integer
             }
             
             // Convert to a proper UUID format (36 characters: 8-4-4-4-12)
             const hashStr = Math.abs(hash).toString(16).padStart(8, '0');
             const uuid = `${hashStr.slice(0, 8)}-${hashStr.slice(0, 4)}-${hashStr.slice(0, 4)}-${hashStr.slice(0, 4)}-${hashStr.slice(0, 12)}`;
             
             // Ensure it's exactly 36 characters by padding if needed
             const paddedUuid = uuid.padEnd(36, '0');
             
             return paddedUuid;
           };

               const userId = generateUUID(firebaseUser.uid);
           console.log('Creating user in database with ID:', userId);
           console.log('Firebase UID:', firebaseUser.uid);

                      // Try to create user record
           const userResponse = await fetch(`${supabaseUrl}/rest/v1/users`, {
             method: 'POST',
             headers: {
               apikey: supabaseKey,
               Authorization: `Bearer ${supabaseKey}`,
               'Content-Type': 'application/json',
               'Prefer': 'resolution=merge-duplicates'
             },
             body: JSON.stringify({
               id: userId,
               username: firebaseUser.email?.split('@')[0] || 'user',
               role: 'user'
             }),
           });

           console.log('User creation response status:', userResponse.status, userResponse.statusText);
           if (!userResponse.ok) {
             const errorText = await userResponse.text();
             console.error('User creation error:', errorText);
           }

               // Try to create profile record
           const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
             method: 'POST',
             headers: {
               apikey: supabaseKey,
               Authorization: `Bearer ${supabaseKey}`,
               'Content-Type': 'application/json',
               'Prefer': 'resolution=merge-duplicates'
             },
             body: JSON.stringify({
               id: userId,
               name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
               avatar_url: firebaseUser.photoURL || ''
             }),
           });

           console.log('Profile creation response status:', profileResponse.status, profileResponse.statusText);
           if (!profileResponse.ok) {
             const errorText = await profileResponse.text();
             console.error('Profile creation error:', errorText);
           }

           console.log('User created in database:', userId);
  } catch (error) {
    console.error('Error creating user in database:', error);
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

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
        console.error('Redirect sign-in failed:', error);
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
