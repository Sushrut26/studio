"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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

export default function NewPollPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!question.trim()) {
      toast({
        title: "Question required",
        description: "Please enter a question for your poll.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Configuration error",
        description: "Unable to create poll. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const idToken = await user.getIdToken();
      const response = await fetch(`/api/questions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: question.trim(),
          question_text: question.trim(),
          yes_votes: 0,
          no_votes: 0,
          comments_count: 0,
          expires_at: expiresAt.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to create poll: ${response.status} ${response.statusText} - ${errorData}`);
      }

      toast({
        title: "Poll created!",
        description: "Your poll has been successfully created.",
      });

      router.push('/');
    } catch (error) {
      console.error('Error creating poll:', error);
      toast({
        title: "Failed to create poll",
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container mx-auto max-w-2xl flex-1 px-4 py-8">
        <Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to polls
        </Link>
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col">
            <CardHeader>
              <CardTitle>Create a new poll</CardTitle>
              <CardDescription>
                What question is on your mind?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="question">Your Question</Label>
                  <Textarea
                    id="question"
                    placeholder="e.g., Is pineapple on pizza a crime?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" asChild disabled={isSubmitting}>
                <Link href="/">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting || !question.trim()}>
                {isSubmitting ? "Creating..." : "Create Poll"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
