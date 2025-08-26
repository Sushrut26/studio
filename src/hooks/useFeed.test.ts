import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from '@/contexts/AuthContext';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

describe('useFeed URL encoding', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('encodes dynamic parameters in fetch URLs', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.com';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    (useAuth as jest.Mock).mockReturnValue({
      user: { uid: 'user/id?test' },
    });
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: '1',
            question_text: 'q',
            yes_votes: 0,
            no_votes: 0,
            comments_count: 0,
            created_at: 'now',
            user_id: 'author/id?name',
          },
        ],
      })
      .mockResolvedValueOnce({ ok: true, json: async () => [{ name: 'Auth', avatar_url: '' }] });

    const { useFeed } = await import('./useFeed');
    renderHook(() => useFeed());

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    const generateUUID = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      const hashStr = Math.abs(hash).toString(16).padStart(8, '0');
      const uuid = `${hashStr.slice(0, 8)}-${hashStr.slice(0, 4)}-${hashStr.slice(0, 4)}-${hashStr.slice(0, 4)}-${hashStr.slice(0, 12)}`;
      return uuid.padEnd(36, '0');
    };
    const encodedUserId = encodeURIComponent(generateUUID('user/id?test'));
    const encodedAuthorId = encodeURIComponent('author/id?name');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(`follower_id=eq.${encodedUserId}`),
      expect.any(Object)
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/profiles?id=eq.${encodedAuthorId}`),
      expect.any(Object)
    );
  });
});

