"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MessageCircle } from "lucide-react";
import type { Question } from "@/types";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// Function to generate UUID from Firebase UID (same as in AuthContext)
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

export default function QuestionCard({ question }: { question: Question }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [interactionState, setInteractionState] = useState<'idle' | 'voting' | 'voted'>('idle');
  const [userVote, setUserVote] = useState<"yes" | "no" | null>(null);
  const [yesVotes, setYesVotes] = useState(question.initialYesVotes);
  const [noVotes, setNoVotes] = useState(question.initialNoVotes);
  const [isVoting, setIsVoting] = useState(false);

  const totalVotes = yesVotes + noVotes;
  const yesPercentage = totalVotes > 0 ? Math.round((yesVotes / totalVotes) * 100) : 0;
  const noPercentage = totalVotes > 0 ? 100 - yesPercentage : 0;

  const handleVote = async (vote: "yes" | "no") => {
    if (userVote || isVoting || !user) return;

    setIsVoting(true);
    setInteractionState('voted');
    setUserVote(vote);

    try {
      const userId = generateUUID(user.uid);
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      console.log('Voting with user ID:', userId);
      console.log('User ID length:', userId.length);
      console.log('Voting on question ID:', question.id);
      console.log('Vote value:', vote === 'yes' ? 1 : -1);
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration missing');
      }

      // Check if user already voted for this question
      try {
        const existingRes = await fetch(
          `${supabaseUrl}/rest/v1/votes?question_id=eq.${question.id}&user_id=eq.${userId}&select=value`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }
        );
        if (existingRes.ok) {
          const existing = await existingRes.json();
          if (Array.isArray(existing) && existing.length > 0) {
            const prior = existing[0];
            setInteractionState('voted');
            setUserVote(prior?.value === 1 ? 'yes' : 'no');

            // Fetch current counts to display results
            const countsRes = await fetch(`${supabaseUrl}/rest/v1/questions?id=eq.${question.id}&select=yes_votes,no_votes`, {
              headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
            });
            if (countsRes.ok) {
              const counts = await countsRes.json();
              if (counts && counts[0]) {
                setYesVotes(counts[0].yes_votes ?? 0);
                setNoVotes(counts[0].no_votes ?? 0);
              }
            }

            toast({ title: 'Already voted', description: 'You have already voted on this poll.' });
            setIsVoting(false);
            return;
          }
        }
      } catch (preErr) {
        console.log('Pre-check vote lookup failed; continuing to insert.', preErr);
      }
      
      // Insert vote using REST API
      const votePayload = {
        question_id: question.id,
        user_id: userId,
        value: vote === 'yes' ? 1 : -1,
      };

      const voteResponse = await fetch(`${supabaseUrl}/rest/v1/votes`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(votePayload),
      });

      console.log('Vote response status:', voteResponse.status, voteResponse.statusText);
      
      if (!voteResponse.ok) {
        const errorText = await voteResponse.text();
        console.error('Vote insert error response:', errorText);

        // Handle duplicate key by showing results instead of updating
        if (voteResponse.status === 409 || errorText.includes('23505') || errorText.toLowerCase().includes('duplicate')) {
          console.log('Duplicate vote detected. Showing existing results.');

          // Look up prior vote to reflect selection
          try {
            const priorRes = await fetch(`${supabaseUrl}/rest/v1/votes?question_id=eq.${question.id}&user_id=eq.${userId}&select=value`, {
              headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
            });
            if (priorRes.ok) {
              const arr = await priorRes.json();
              if (Array.isArray(arr) && arr.length > 0) {
                setUserVote(arr[0]?.value === 1 ? 'yes' : 'no');
              }
            }
          } catch (ignored) {}

          // Fetch current counts
          try {
            const countsRes = await fetch(`${supabaseUrl}/rest/v1/questions?id=eq.${question.id}&select=yes_votes,no_votes`, {
              headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
            });
            if (countsRes.ok) {
              const counts = await countsRes.json();
              if (counts && counts[0]) {
                setYesVotes(counts[0].yes_votes ?? 0);
                setNoVotes(counts[0].no_votes ?? 0);
              }
            }
          } catch (ignored) {}

          setInteractionState('voted');
          toast({ title: 'Already voted', description: 'You have already voted on this poll.' });
          setIsVoting(false);
          return;
        } else {
          throw new Error(`Failed to insert vote: ${voteResponse.status} ${voteResponse.statusText} - ${errorText}`);
        }
      }

      let voteData = null;
      try {
        voteData = await voteResponse.json();
        console.log('Vote insert result:', voteData);
      } catch (error) {
        console.log('Vote insert successful (empty response)');
      }

      // Update question vote counts
      const questionResponse = await fetch(`${supabaseUrl}/rest/v1/questions?id=eq.${question.id}&select=yes_votes,no_votes`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      });

      console.log('Question response status:', questionResponse.status, questionResponse.statusText);
      
      if (!questionResponse.ok) {
        const errorText = await questionResponse.text();
        console.error('Question update error response:', errorText);
        throw new Error(`Failed to update question: ${questionResponse.status} ${questionResponse.statusText} - ${errorText}`);
      }

      let questionData = null;
      try {
        questionData = await questionResponse.json();
        console.log('Question update result:', questionData);

        if (questionData && questionData[0]) {
          setYesVotes(questionData[0].yes_votes ?? 0);
          setNoVotes(questionData[0].no_votes ?? 0);
        }
      } catch (error) {
        console.log('Question update successful (empty response)');
        // If we can't get the updated counts, just increment locally
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
          <MessageCircle className="h-4 w-4" />
          <span>{question.commentsCount} comments</span>
        </div>
      </CardFooter>
    </Card>
  );
}
