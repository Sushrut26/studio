'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!loading && user && supabaseUrl && supabaseKey) {
      fetch(`${supabaseUrl}/rest/v1/users?id=eq.${user.uid}&select=role`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to check admin status: ${res.status} ${res.statusText}`);
          }
          return res.json();
        })
        .then((data) => {
          if (Array.isArray(data) && data[0]?.role === 'admin') {
            setIsAdmin(true);
          } else {
            toast({
              title: "Access denied",
              description: "You don't have permission to access this page.",
              variant: "destructive",
            });
            router.replace('/');
          }
          setChecking(false);
        })
        .catch((error) => {
          console.error('Error checking admin status:', error);
          toast({
            title: "Error",
            description: "Failed to verify admin permissions. Please try again.",
            variant: "destructive",
          });
          router.replace('/');
          setChecking(false);
        });
    } else if (!loading && !user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to access this page.",
        variant: "destructive",
      });
      router.replace('/login');
      setChecking(false);
    }
  }, [user, loading, router, toast]);

  if (loading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  return isAdmin ? <>{children}</> : null;
}
