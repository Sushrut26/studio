import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const toastMock = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

describe('AdminPage URL encoding', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.com';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    global.fetch = jest.fn((url, options) => {
      if (options && options.method === 'DELETE') {
        return Promise.resolve({ ok: true });
      }
      if ((url as string).includes('status=eq.active')) {
        return Promise.resolve({ ok: true, json: async () => [{ id: 'id/with?special', question_text: 'Q' }] });
      }
      if ((url as string).includes('status=eq.closed')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      return Promise.resolve({ ok: true, json: async () => [] });
    }) as any;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('encodes id when deleting a question', async () => {
    const { default: AdminPage } = await import('./page');
    render(<AdminPage />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    const deleteButton = await screen.findByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      const encoded = encodeURIComponent('id/with?special');
      expect(fetch).toHaveBeenLastCalledWith(
        expect.stringContaining(`id=eq.${encoded}`),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});

