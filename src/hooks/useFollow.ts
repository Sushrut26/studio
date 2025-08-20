"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export function useFollow(targetUserId: string) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkFollowing = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", user.uid)
      .eq("followee_id", targetUserId);
    if (error) return;
    setIsFollowing((data ?? []).length > 0);
  }, [user, targetUserId]);

  useEffect(() => {
    checkFollowing();
  }, [checkFollowing]);

  const toggleFollow = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.uid)
        .eq("followee_id", targetUserId);
      setIsFollowing(false);
    } else {
      await supabase.from("follows").insert({
        follower_id: user.uid,
        followee_id: targetUserId,
      });
      setIsFollowing(true);
    }
    setLoading(false);
    window.dispatchEvent(new Event("follow-change"));
  }, [user, isFollowing, targetUserId]);

  return { isFollowing, toggleFollow, loading };
}
