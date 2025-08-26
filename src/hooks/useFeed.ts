"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { Question, FollowResponse, QuestionResponse } from "@/types";
import { firebaseUidToUuid } from "@/lib/id";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Debug logging
console.log('Environment variables:', {
  supabaseUrl: supabaseUrl ? 'SET' : 'NOT SET',
  supabaseKey: supabaseKey ? 'SET' : 'NOT SET',
  supabaseUrlValue: supabaseUrl
});

type QuestionWithAuthorId = Question & { authorId: string };

export function useFeed(pageSize = 10) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<QuestionWithAuthorId[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFollowedIds = useCallback(async (): Promise<string[]> => {
    if (!user) return [];
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/follows`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) return [];
      const data: { following_id: string }[] = await res.json();
      return data.map((f) => f.following_id);
    } catch {
      return [];
    }
  }, [user]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    setError(null);

    try {
      const followedIds = await fetchFollowedIds();

      const from = page * pageSize;
      const to = from + pageSize - 1;
      
      const idToken = await user?.getIdToken();
      const res = await fetch(`/api/questions?page=${page}&pageSize=${pageSize}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      
      console.log('Response status:', res.status, res.statusText);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Error response body:', errorText);
        throw new Error(`Failed to fetch questions: ${res.status} ${res.statusText} - ${errorText}`);
      }
      
      const { items } = await res.json();
      const data: QuestionResponse[] = items;
      
      const mapped: QuestionWithAuthorId[] = data.map((q: any) => ({
               id: q.id,
               authorId: q.user_id,
        author: {
          name: q.profile?.name ?? "Anonymous",
          avatarUrl: q.profile?.avatar_url ?? "",
        },
        questionText: q.question_text,
        initialYesVotes: q.yes_votes ?? 0,
        initialNoVotes: q.no_votes ?? 0,
        commentsCount: q.comments_count ?? 0,
        createdAt: q.created_at,
      }));

      setQuestions(prev => {
        // Create a map of existing questions by ID to prevent duplicates
        const existingQuestions = new Map(prev.map(q => [q.id, q]));
        
        // Add new questions, overwriting any duplicates
        mapped.forEach(q => {
          existingQuestions.set(q.id, q);
        });
        
        // Convert back to array and sort
        const allQuestions = Array.from(existingQuestions.values());
        return allQuestions.sort((a, b) => {
          const aFollowed = followedIds.includes(a.authorId) ? 1 : 0;
          const bFollowed = followedIds.includes(b.authorId) ? 1 : 0;
          if (aFollowed !== bFollowed) return bFollowed - aFollowed;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      });

      if (mapped.length < pageSize) {
        setHasMore(false);
      } else {
        setPage(prev => prev + 1);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load questions';
      setError(errorMessage);
      console.error('Error loading questions:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchFollowedIds, page, pageSize, loading, hasMore]);

  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { questions: questions as Question[], loadMore, hasMore, loading, error };
}

