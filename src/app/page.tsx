"use client";

import { useEffect, useRef } from "react";
import Header from "@/components/Header";
import QuestionCard from "@/components/QuestionCard";
import { useFeed } from "@/hooks/useFeed";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function Home() {
  const { questions, loadMore, hasMore, loading, error } = useFeed();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadMore();
      }
    });
    const node = loadMoreRef.current;
    if (node) observer.observe(node);
    return () => {
      if (node) observer.unobserve(node);
    };
  }, [loadMore, hasMore]);

  // Remove duplicates based on question ID
  const uniqueQuestions = questions.filter((question, index, self) => 
    index === self.findIndex(q => q.id === question.id)
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container mx-auto max-w-2xl flex-1 px-4 py-8">
        <div className="space-y-6">
          <h2 className="text-xl font-semibold tracking-tight">Recent Polls</h2>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {uniqueQuestions.length === 0 && !loading && !error && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No polls found.</p>
              <p className="text-sm text-muted-foreground">
                Be the first to create a poll!
              </p>
            </div>
          )}
          
          {uniqueQuestions.map((q) => (
            <QuestionCard key={q.id} question={q} />
          ))}
          
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading polls...</p>
            </div>
          )}
          
          {hasMore && <div ref={loadMoreRef} className="h-1" />}
        </div>
      </main>
    </div>
  );
}
