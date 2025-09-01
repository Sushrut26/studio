"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import type { Question } from "@/types";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { firebaseUidToUuid } from "@/lib/id";
import Comments from "./Comments";

export default function QuestionCard({ question }: { question: Question }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [interactionState, setInteractionState] = useState<'idle' | 'voting' | 'voted'>('idle');
  const [userVote, setUserVote] = useState<"yes" | "no" | null>(null);
  const [yesVotes, setYesVotes] = useState(question.initialYesVotes);
  const [noVotes, setNoVotes] = useState(question.initialNoVotes);
  const [isVoting, setIsVoting] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(question.commentsCount);

  const totalVotes = yesVotes + noVotes;
  const yesPercentage = totalVotes > 0 ? Math.round((yesVotes / totalVotes) * 100) : 0;
  const noPercentage = totalVotes > 0 ? 100 - yesPercentage : 0;

  const handleVote = async (vote: "yes" | "no") => {
    if (userVote || isVoting || !user) return;

    setIsVoting(true);
    setInteractionState('voted');
    setUserVote(vote);

    try {
      const userId = firebaseUidToUuid(user.uid);
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      console.log('Voting with user ID:', userId);
      console.log('User ID length:', userId.length);
      console.log('Voting on question ID:', question.id);
      console.log('Vote value:', vote === 'yes' ? 1 : -1);
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration missing');
      }

      // Vote via secure API; backend returns updated counts
      const idToken = await user.getIdToken();
      const voteRes = await fetch(`/api/votes`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: question.id, value: vote === 'yes' ? 1 : -1 }),
      });

      if (voteRes.status === 409) {
        const dup = await voteRes.json();
        setInteractionState('voted');
        setUserVote(dup?.value === 1 ? 'yes' : 'no');
        if (dup?.counts) {
          setYesVotes(dup.counts.yes_votes ?? 0);
          setNoVotes(dup.counts.no_votes ?? 0);
        }
        toast({ title: 'Already voted', description: 'You have already voted on this poll.' });
        setIsVoting(false);
        return;
      }

      if (!voteRes.ok) {
        const txt = await voteRes.text();
        throw new Error(`Vote API failed: ${voteRes.status} ${voteRes.statusText} - ${txt}`);
      }

      const json = await voteRes.json().catch(() => ({} as any));
      if (json?.counts) {
        setYesVotes(json.counts.yes_votes ?? 0);
        setNoVotes(json.counts.no_votes ?? 0);
      } else {
        // Fallback: optimistic local increment
        if (vote === 'yes') {
          setYesVotes(prev => prev + 1);
        } else {
          setNoVotes(prev => prev + 1);
        }
      }

      toast({
        title: "Vote recorded!",
        description: `Your ${vote} vote has been recorded.`,
      });
    } catch (error) {
      console.error('Error voting:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      toast({
        title: "Vote failed",
        description: error instanceof Error ? error.message : "Failed to record your vote. Please try again.",
        variant: "destructive",
      });
      // Reset state on error
      setInteractionState('voting');
      setUserVote(null);
    } finally {
      setIsVoting(false);
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel('votes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes', filter: `question_id=eq.${question.id}` },
        async () => {
          try {
            const { data, error } = await supabase
              .from('questions')
              .select('yes_votes,no_votes')
              .eq('id', question.id)
              .single();
            
            if (error) {
              console.error('Error fetching updated vote counts:', error);
              return;
            }
            
            if (data) {
              setYesVotes(data.yes_votes ?? 0);
              setNoVotes(data.no_votes ?? 0);
            }
          } catch (error) {
            console.error('Error in real-time vote update:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [question.id]);
  
  const showVotingOptions = interactionState === 'voting';
  const showResults = interactionState === 'voted';

  return (
    <Card 
      className={cn(
        "transition-all", 
        interactionState === 'idle' && "cursor-pointer hover:shadow-md"
      )}
      onClick={() => interactionState === 'idle' && setInteractionState('voting')}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={question.author.avatarUrl} alt={question.author.name} data-ai-hint="person avatar" />
              <AvatarFallback>{question.author.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{question.author.name}</p>
              <p className="text-xs text-muted-foreground">{question.createdAt}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm">Follow</Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-medium">{question.questionText}</p>
      </CardContent>
      <CardFooter className="flex-col items-start">
        <div className="w-full transition-all duration-300 ease-in-out">
          {showVotingOptions && (
            <div className="animate-in fade-in slide-in-from-top-2 flex w-full gap-2">
              <Button 
                className="w-full" 
                variant="outline" 
                onClick={(e) => { e.stopPropagation(); handleVote('yes'); }}
                disabled={isVoting}
              >
                Yes
              </Button>
              <Button 
                className="w-full" 
                variant="outline" 
                onClick={(e) => { e.stopPropagation(); handleVote('no'); }}
                disabled={isVoting}
              >
                No
              </Button>
            </div>
          )}
          {showResults && (
            <div className="animate-in fade-in w-full space-y-2">
              <div className="space-y-1">
                <div className="flex justify-between text-sm mb-1">
                  <span>Yes</span>
                  <span>{yesPercentage}%</span>
                </div>
                <Progress value={yesPercentage} className={cn(userVote === 'yes' && '[&>div]:bg-primary')} />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm mb-1">
                  <span>No</span>
                  <span>{noPercentage}%</span>
                </div>
                <Progress value={noPercentage} className={cn(userVote === 'no' && '[&>div]:bg-primary')} />
              </div>
              <p className="text-xs text-muted-foreground text-center pt-2">{totalVotes.toLocaleString()} votes</p>
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 p-0 h-auto"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{commentCount} comments</span>
            {showComments ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardFooter>
      
      {/* Comments Section */}
      {showComments && (
        <CardContent className="pt-0 border-t">
          <Comments 
            questionId={question.id} 
            onCommentAdded={() => {
              // Update the comment count locally when a comment is added
              setCommentCount(prev => prev + 1);
            }}
            onCommentDeleted={() => {
              // Update the comment count locally when a comment is deleted
              setCommentCount(prev => Math.max(0, prev - 1));
            }}
          />
        </CardContent>
      )}
    </Card>
  );
}
