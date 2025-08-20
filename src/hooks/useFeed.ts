"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { Question } from "@/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function useFeed(pageSize = 10) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchFollowedIds = useCallback(async () => {
    if (!user || !supabaseUrl || !supabaseKey) return [] as string[];
    const res = await fetch(
      `${supabaseUrl}/rest/v1/follows?select=followee_id&follower_id=eq.${user.uid}`,
      {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      }
    );
    if (!res.ok) return [] as string[];
    const data = await res.json();
    return data.map((f: any) => f.followee_id as string);
  }, [user]);

  const loadMore = useCallback(
    async (reset = false) => {
      if (loading || (!hasMore && !reset) || !supabaseUrl || !supabaseKey) return;
      setLoading(true);
      if (reset) {
        setPage(0);
        setHasMore(true);
        setQuestions([]);
      }

      const followedIds = await fetchFollowedIds();

      const currentPage = reset ? 0 : page;
      const from = currentPage * pageSize;
      const to = from + pageSize - 1;
      const res = await fetch(
        `${supabaseUrl}/rest/v1/questions?select=id,question_text,yes_votes,no_votes,comments_count,created_at,author_id,profiles!inner(name,avatar_url)&order=created_at.desc`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            Range: `${from}-${to}`,
          },
        }
      );
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      const mapped: Question[] = data.map((q: any) => ({
        id: q.id,
        authorId: q.author_id,
        author: {
          name: q.profiles?.name ?? "",
          avatarUrl: q.profiles?.avatar_url ?? "",
        },
        questionText: q.question_text,
        initialYesVotes: q.yes_votes ?? 0,
        initialNoVotes: q.no_votes ?? 0,
        commentsCount: q.comments_count ?? 0,
        createdAt: q.created_at,
      }));

      setQuestions(prev => {
        const combined = reset ? mapped : [...prev, ...mapped];
        return combined.sort((a, b) => {
          const aFollowed = followedIds.includes(a.authorId) ? 1 : 0;
          const bFollowed = followedIds.includes(b.authorId) ? 1 : 0;
          if (aFollowed !== bFollowed) return bFollowed - aFollowed;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      });

      if (mapped.length < pageSize) {
        setHasMore(false);
      }
      setPage(currentPage + 1);
      setLoading(false);
    },
    [fetchFollowedIds, page, pageSize, loading, hasMore]
  );

  const refresh = useCallback(() => {
    loadMore(true);
  }, [loadMore]);

  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener("follow-change", handler);
    return () => window.removeEventListener("follow-change", handler);
  }, [refresh]);

  return { questions, loadMore, hasMore, loading };
}

