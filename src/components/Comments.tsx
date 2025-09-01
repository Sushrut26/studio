"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { firebaseUidToUuid } from "@/lib/id";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  author: {
    name: string;
    avatar_url: string;
  };
}

interface CommentsProps {
  questionId: string;
  onCommentAdded?: () => void;
  onCommentDeleted?: () => void;
}

export default function Comments({ questionId, onCommentAdded, onCommentDeleted }: CommentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  const fetchComments = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/comments?question_id=${questionId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setComments(data.items || []);
      } else {
        console.error('Failed to fetch comments:', response.status);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;
    
    setIsSubmitting(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question_id: questionId,
          content: newComment.trim(),
        }),
      });

      if (response.ok) {
        const newCommentData = await response.json();
        setComments(prev => [...prev, newCommentData]);
        setNewComment("");
        toast({
          title: "Comment posted!",
          description: "Your comment has been added successfully.",
        });
        onCommentAdded?.();
      } else {
        const error = await response.json();
        toast({
          title: "Failed to post comment",
          description: error.message || "Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      toast({
        title: "Failed to post comment",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;
    
    setDeletingCommentId(commentId);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (response.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        toast({
          title: "Comment deleted",
          description: "Your comment has been removed.",
        });
        onCommentDeleted?.();
      } else {
        const error = await response.json();
        toast({
          title: "Failed to delete comment",
          description: error.message || "Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: "Failed to delete comment",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingCommentId(null);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [questionId, user]);

  return (
    <div className="space-y-4">
      {/* Comment Form */}
      {user && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                maxLength={1000}
                rows={3}
                disabled={isSubmitting}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {newComment.length}/1000 characters
                </span>
                <Button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmitting}
                  size="sm"
                >
                  {isSubmitting ? "Posting..." : "Post Comment"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comments List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.author.avatar_url} alt={comment.author.name} />
                    <AvatarFallback>{comment.author.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{comment.author.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {user && comment.user_id === firebaseUidToUuid(user.uid) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                              disabled={deletingCommentId === comment.id}
                            >
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-red-600 focus:text-red-600"
                              disabled={deletingCommentId === comment.id}
                            >
                              <Trash2 className="h-3 w-3 mr-2" />
                              {deletingCommentId === comment.id ? "Deleting..." : "Delete"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed">{comment.content}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
