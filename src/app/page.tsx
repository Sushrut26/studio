import type { Question } from "@/types";
import Header from "@/components/Header";
import QuestionCard from "@/components/QuestionCard";

const questions: Question[] = [
  {
    id: 1,
    author: {
      name: 'Startup Sam',
      avatarUrl: 'https://placehold.co/40x40.png',
    },
    questionText: 'Is remote work the future for all tech companies?',
    vote_yes_count: 256,
    vote_no_count: 88,
    commentsCount: 64,
    createdAt: '2h ago',
  },
  {
    id: 2,
    author: {
      name: 'Design Dana',
      avatarUrl: 'https://placehold.co/40x40.png',
    },
    questionText: 'Should designers learn to code?',
    vote_yes_count: 420,
    vote_no_count: 150,
    commentsCount: 128,
    createdAt: '5h ago',
  },
  {
    id: 3,
    author: {
      name: 'Foodie Frank',
      avatarUrl: 'https://placehold.co/40x40.png',
    },
    questionText: 'Is pineapple on pizza a crime against humanity?',
    vote_yes_count: 180,
    vote_no_count: 320,
    commentsCount: 256,
    createdAt: '1d ago',
  },
  {
    id: 4,
    author: {
      name: 'Travel Tina',
      avatarUrl: 'https://placehold.co/40x40.png',
    },
    questionText: 'Do you prefer mountains or beaches for a vacation?',
    vote_yes_count: 512,
    vote_no_count: 488,
    commentsCount: 96,
    createdAt: '2d ago',
  },
];


export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container mx-auto max-w-2xl flex-1 px-4 py-8">
        <div className="space-y-6">
          <h2 className="text-xl font-semibold tracking-tight">Recent Polls</h2>
          {questions.map((q) => (
            <QuestionCard key={q.id} question={q} />
          ))}
        </div>
      </main>
    </div>
  );
}
