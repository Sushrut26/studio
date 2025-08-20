'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type Question = { id: string; question_text: string };

export default function AdminPage() {
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [closedQuestions, setClosedQuestions] = useState<Question[]>([]);

  const fetchQuestions = async () => {
    if (!supabaseUrl || !supabaseKey) return;
    const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
    const [activeRes, closedRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/questions?status=eq.active&select=id,question_text`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/questions?status=eq.closed&select=id,question_text`, { headers }),
    ]);
    if (activeRes.ok) setActiveQuestions(await activeRes.json());
    if (closedRes.ok) setClosedQuestions(await closedRes.json());
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const deleteQuestion = async (id: string) => {
    if (!supabaseUrl || !supabaseKey) return;
    await fetch(`${supabaseUrl}/rest/v1/questions?id=eq.${id}`, {
      method: 'DELETE',
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    });
    fetchQuestions();
  };

  const renderList = (items: Question[]) => (
    <ul className="space-y-2">
      {items.map((q) => (
        <li key={q.id} className="flex items-center justify-between">
          <span>{q.question_text}</span>
          <Button variant="destructive" size="sm" onClick={() => deleteQuestion(q.id)}>
            Delete
          </Button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="container mx-auto max-w-2xl space-y-8 py-8">
      <section>
        <h2 className="mb-4 text-xl font-semibold">Active Questions</h2>
        {renderList(activeQuestions)}
      </section>
      <section>
        <h2 className="mb-4 text-xl font-semibold">Closed Questions</h2>
        {renderList(closedQuestions)}
      </section>
    </div>
  );
}
