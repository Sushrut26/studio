'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type Question = { id: string; question_text: string };

export default function AdminPage() {
  const { toast } = useToast();
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [closedQuestions, setClosedQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const fetchQuestions = useCallback(async () => {
    if (!supabaseUrl || !supabaseKey) {
      toast({
        title: "Configuration error",
        description: "Unable to load questions. Please check your configuration.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
    
    try {
      const [activeRes, closedRes] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/questions?status=eq.active&select=id,question_text`, { headers }),
        fetch(`${supabaseUrl}/rest/v1/questions?status=eq.closed&select=id,question_text`, { headers }),
      ]);
      
      if (activeRes.ok) {
        const activeData = await activeRes.json();
        setActiveQuestions(activeData);
      } else {
        console.error('Failed to fetch active questions:', activeRes.status, activeRes.statusText);
      }
      
      if (closedRes.ok) {
        const closedData = await closedRes.json();
        setClosedQuestions(closedData);
      } else {
        console.error('Failed to fetch closed questions:', closedRes.status, closedRes.statusText);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: "Failed to load questions",
        description: "An error occurred while loading questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const deleteQuestion = async (id: string) => {
    if (!supabaseUrl || !supabaseKey) {
      toast({
        title: "Configuration error",
        description: "Unable to delete question. Please check your configuration.",
        variant: "destructive",
      });
      return;
    }

    setDeletingIds(prev => new Set(prev).add(id));

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/questions?id=eq.${id}`, {
        method: 'DELETE',
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to delete question: ${response.status} ${response.statusText} - ${errorData}`);
      }

      toast({
        title: "Question deleted",
        description: "The question has been successfully deleted.",
      });

      // Refresh the questions list
      await fetchQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({
        title: "Failed to delete question",
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const renderList = (items: Question[], title: string) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">No {title.toLowerCase()} found.</div>
        ) : (
          <ul className="space-y-2">
            {items.map((q) => (
              <li key={q.id} className="flex items-center justify-between p-3 border rounded-lg">
                <span className="flex-1 mr-4">{q.question_text}</span>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => deleteQuestion(q.id)}
                  disabled={deletingIds.has(q.id)}
                >
                  {deletingIds.has(q.id) ? "Deleting..." : "Delete"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto max-w-4xl space-y-8 py-8 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage polls and questions</p>
      </div>
      
      <div className="grid gap-8 md:grid-cols-2">
        {renderList(activeQuestions, "Active Questions")}
        {renderList(closedQuestions, "Closed Questions")}
      </div>
    </div>
  );
}
