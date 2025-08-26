/** @jest-environment node */

import { POST } from '@/app/api/votes/route';

jest.mock('@/lib/firebaseAdmin', () => ({
  verifyFirebaseIdToken: jest.fn().mockRejectedValue(new Error('Invalid token')),
}));

describe('votes API auth', () => {
  it('returns 401 when no token provided', async () => {
    const req = new Request('http://localhost/api/votes', {
      method: 'POST',
      body: JSON.stringify({ question_id: '1', value: 1 }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('returns 403 with invalid token', async () => {
    const req = new Request('http://localhost/api/votes', {
      method: 'POST',
      headers: { Authorization: 'Bearer bad' },
      body: JSON.stringify({ question_id: '1', value: 1 }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(403);
  });
});
