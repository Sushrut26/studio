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

export default function QuestionCard({ question }: { question: Question }) {
  const { user } = useAuth();
  const [interactionState, setInteractionState] = useState<'idle' | 'voting' | 'voted'>('idle');
  const [userVote, setUserVote] = useState<"yes" | "no" | null>(null);
  const [yesVotes, setYesVotes] = useState(question.vote_yes_count);
  const [noVotes, setNoVotes] = useState(question.vote_no_count);

  const fetchCounts = async () => {
    const { data } = await supabase
      .from('questions')
      .select('vote_yes_count, vote_no_count')
      .eq('id', question.id)
      .single();
    if (data) {
      setYesVotes(data.vote_yes_count);
      setNoVotes(data.vote_no_count);
    }
  };

  useEffect(() => {
    if (!user) return;

    const loadUserVote = async () => {
      const { data } = await supabase
        .from('votes')
        .select('vote')
        .eq('question_id', question.id)
        .eq('user_id', user.uid)
        .single();
      if (data) {
        setUserVote(data.vote);
        setInteractionState('voted');
      }
    };

    loadUserVote();

    const channel = supabase
      .channel('public:votes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes', filter: `question_id=eq.${question.id}` },
        () => fetchCounts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, question.id]);

  const totalVotes = yesVotes + noVotes;
  const yesPercentage = totalVotes > 0 ? Math.round((yesVotes / totalVotes) * 100) : 0;
  const noPercentage = totalVotes > 0 ? 100 - yesPercentage : 0;

  const handleVote = async (vote: "yes" | "no") => {
    if (!user || userVote) return;

    setInteractionState('voted');
    setUserVote(vote);
    await supabase.from('votes').insert({
      question_id: question.id,
      user_id: user.uid,
      vote,
    });
    await fetchCounts();
  };

  const showVotingOptions = interactionState === 'voting' && !userVote;
  const showResults = interactionState === 'voted' || !!userVote;

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
              <Button className="w-full" variant="outline" onClick={(e) => { e.stopPropagation(); handleVote('yes'); }}>Yes</Button>
              <Button className="w-full" variant="outline" onClick={(e) => { e.stopPropagation(); handleVote('no'); }}>No</Button>
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
