'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

type Question = { id: string; question_text: string };

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [closedQuestions, setClosedQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const fetchQuestions = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [activeRes, closedRes] = await Promise.all([
        fetch(`/api/admin/questions?status=active`, { headers }),
        fetch(`/api/admin/questions?status=closed`, { headers }),
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
        title: 'Failed to load questions',
        description: 'An error occurred while loading questions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, user]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const deleteQuestion = async (id: string) => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to delete questions.',
        variant: 'destructive',
      });
      return;
    }

    setDeletingIds(prev => new Set(prev).add(id));

    try {

      const token = await user.getIdToken();
    

      const response = await fetch(`${supabaseUrl}/rest/v1/questions?id=eq.${encodeURIComponent(id)}`, {

        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to delete question: ${response.status} ${response.statusText} - ${errorData}`);
      }

      toast({
        title: 'Question deleted',
        description: 'The question has been successfully deleted.',
      });

      await fetchQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({
        title: 'Failed to delete question',
        description: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
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
                  {deletingIds.has(q.id) ? 'Deleting...' : 'Delete'}
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
        {renderList(activeQuestions, 'Active Questions')}
        {renderList(closedQuestions, 'Closed Questions')}
      </div>
    </div>
  );
}
