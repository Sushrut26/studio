"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { Question, FollowResponse, QuestionResponse } from "@/types";
import { firebaseUidToUuid } from "@/lib/id";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const isDev = process.env.NODE_ENV === 'development';

// Debug logging
if (isDev) {
  console.log('Environment variables:', {
    supabaseUrl: supabaseUrl ? 'SET' : 'NOT SET',
    supabaseKey: supabaseKey ? 'SET' : 'NOT SET',
    supabaseUrlValue: supabaseUrl
  });
}

type QuestionWithAuthorId = Question & { authorId: string };

export function useFeed(pageSize = 10) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<QuestionWithAuthorId[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFollowedIds = useCallback(async (): Promise<string[]> => {
    if (!user || !supabaseUrl || !supabaseKey) return [];
    
    try {
  const userId = firebaseUidToUuid(user.uid);
    if (isDev) console.log('Fetching follows for user ID:', userId);
      
      const res = await fetch(
        `${supabaseUrl}/rest/v1/follows?select=following_id&follower_id=eq.${encodeURIComponent(userId)}`,
        {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        }
      );
      
      if (isDev) console.log('Follows response status:', res.status, res.statusText);
      
      if (!res.ok) {
        // If user doesn't exist in follows table yet, that's okay - just return empty array
        if (res.status === 400 || res.status === 401 || res.status === 404) {
          if (isDev) console.log('User not found in follows table or no follows exist, continuing without follows');
          return [];
        }
        console.error('Failed to fetch followed IDs:', res.status, res.statusText);
        return [];
      }
      
      const data: FollowResponse[] = await res.json();
      if (isDev) console.log('Follows data:', data);
      return data.map((f: FollowResponse) => f.following_id);
    } catch (err) {
      console.error('Error fetching followed IDs:', err);
      return [];
    }
  }, [user]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !supabaseUrl || !supabaseKey) return;
    
    setLoading(true);
    setError(null);

    try {
      const followedIds = await fetchFollowedIds();

      const from = page * pageSize;
      const to = from + pageSize - 1;
      
      // Debug logging
      if (isDev) {
        console.log('Making API call to:', `${supabaseUrl}/rest/v1/questions?select=id,question_text,yes_votes,no_votes,comments_count,created_at,author_id&order=created_at.desc`);
        console.log('Headers:', {
          apikey: supabaseKey ? 'SET' : 'NOT SET',
          Authorization: supabaseKey ? 'SET' : 'NOT SET'
        });
      }
      
                   const res = await fetch(
               `${supabaseUrl}/rest/v1/questions?select=id,question_text,yes_votes,no_votes,comments_count,created_at,user_id&order=created_at.desc`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            Range: `${from}-${to}`,
          },
        }
      );
      
      if (isDev) console.log('Response status:', res.status, res.statusText);
      
      if (!res.ok) {
        const errorText = await res.text();
        if (isDev) console.error('Error response body:', errorText);
        throw new Error(`Failed to fetch questions: ${res.status} ${res.statusText} - ${errorText}`);
      }
      
      const data: QuestionResponse[] = await res.json();
      if (isDev) console.log('Questions data:', data);
      
      // Fetch profiles separately for each question
                   const questionsWithProfiles = await Promise.all(
               data.map(async (q: QuestionResponse) => {
                 try {
                   const profileRes = await fetch(
                     `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(q.user_id)}`,
              {
                headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
              }
            );
            
            let profile = null;
            if (profileRes.ok) {
              const profileData = await profileRes.json();
              profile = profileData[0];
            }
            
            return {
              ...q,
              profile
            };
          } catch (err) {
            console.error('Error fetching profile for question:', q.id, err);
            return {
              ...q,
              profile: null
            };
          }
        })
      );
      
                   const mapped: QuestionWithAuthorId[] = questionsWithProfiles.map((q: any) => ({
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

