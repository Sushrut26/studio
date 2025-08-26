import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QuestionCard from './QuestionCard';
import { useAuth } from '@/contexts/AuthContext';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    })),
    removeChannel: jest.fn(),
  },
}));

jest.mock('@/components/ui/avatar', () => {
  const React = require('react');
  const Avatar = ({ children }) => <div>{children}</div>;
  const AvatarImage = ({ src, alt }) => <img src={src} alt={alt} />;
  const AvatarFallback = ({ children }) => <span>{children}</span>;
  return { Avatar, AvatarImage, AvatarFallback };
});

jest.mock('lucide-react', () => ({
  MessageCircle: (props: any) => <svg {...props} />,
}));

describe('QuestionCard URL encoding', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.com';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    (useAuth as jest.Mock).mockReturnValue({
      user: { uid: 'user', getIdToken: jest.fn().mockResolvedValue('token') },
    });
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}), text: async () => '' })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [{ yes_votes: 0, no_votes: 0 }] })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [{ yes_votes: 0, no_votes: 0 }] });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('encodes question id in REST calls', async () => {
    const question = {
      id: 'a/b?c=d',
      author: { name: 'Alice', avatarUrl: '' },
      questionText: 'Is encoding correct?',
      initialYesVotes: 0,
      initialNoVotes: 0,
      commentsCount: 0,
      createdAt: 'today',
    } as any;

    render(<QuestionCard question={question} />);

    fireEvent.click(screen.getByText(question.questionText));
    fireEvent.click(await screen.findByText('Yes'));

    await waitFor(() => {
      const encoded = encodeURIComponent(question.id);
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining(`id=eq.${encoded}`), expect.any(Object));
    });
  });
});

