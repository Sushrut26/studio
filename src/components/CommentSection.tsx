"use client";

import { useEffect, useState, FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id?: string;
}

export default function CommentSection({ questionId }: { questionId: string | number }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    const loadComments = async () => {
      const { data } = await supabase
        .from("comments")
        .select("id, content, created_at, user_id")
        .eq("question_id", questionId)
        .order("created_at", { ascending: true });
      setComments(data ?? []);
    };
    loadComments();

    const channel = supabase
      .channel(`comments-question-${questionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: `question_id=eq.${questionId}`,
        },
        (payload: { new: Comment }) => {
          setComments((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [questionId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await supabase.from("comments").insert({ question_id: questionId, content: newComment });
    setNewComment("");
  };

  return (
    <div className="w-full space-y-4">
      <div className="space-y-2">
        {comments.map((c) => (
          <div key={c.id} className="text-sm">
            {c.content}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment"
        />
        <Button type="submit" disabled={!newComment.trim()}>
          Submit
        </Button>
      </form>
    </div>
  );
}

