"use client";

import { useEffect, useRef } from "react";
import Header from "@/components/Header";
import QuestionCard from "@/components/QuestionCard";
import { useFeed } from "@/hooks/useFeed";

export default function Home() {
  const { questions, loadMore, hasMore } = useFeed();
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

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container mx-auto max-w-2xl flex-1 px-4 py-8">
        <div className="space-y-6">
          <h2 className="text-xl font-semibold tracking-tight">Recent Polls</h2>
          {questions.map((q) => (
            <QuestionCard key={q.id} question={q} />
          ))}
          {hasMore && <div ref={loadMoreRef} className="h-1" />}
        </div>
      </main>
    </div>
  );
}
