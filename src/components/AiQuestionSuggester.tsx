"use client";

import { useState } from "react";
import { suggestRelevantQuestions } from "@/ai/flows/suggest-relevant-questions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Lightbulb, Loader2 } from "lucide-react";
import type { Question } from "@/types";

export default function AiQuestionSuggester({ questions }: { questions: Question[] }) {
  const [interests, setInterests] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSuggest = async () => {
    if (!interests.trim()) {
      toast({
        title: "Interests required",
        description: "Please enter some interests to get suggestions.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    setSuggestions([]);

    const questionList = questions.map(q => q.questionText).join("\n");
    
    try {
      const result = await suggestRelevantQuestions({ interests, questionList });
      if (result && result.suggestedQuestions) {
        setSuggestions(result.suggestedQuestions.map(q => q.questionText));
      }
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to get suggestions. Please try again.",
        variant: "destructive",
      });
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="text-accent" />
          Need Inspiration?
        </CardTitle>
        <CardDescription>
          Enter some interests and we'll suggest new poll questions for you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex w-full items-center space-x-2">
          <Input 
            type="text" 
            placeholder="e.g., technology, gaming, movies" 
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            disabled={isLoading}
          />
          <Button onClick={handleSuggest} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Suggest"}
          </Button>
        </div>
        
        {suggestions.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="font-semibold">Here are some ideas:</h4>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
