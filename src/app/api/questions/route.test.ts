/** @jest-environment node */

import { POST } from '@/app/api/questions/route';
import { DELETE } from '@/app/api/questions/[id]/route';

jest.mock('@/lib/firebaseAdmin', () => ({
  verifyFirebaseIdToken: jest.fn().mockRejectedValue(new Error('Invalid token')),
}));

describe('questions API auth', () => {
  it('returns 401 when no token provided on POST', async () => {
    const req = new Request('http://localhost/api/questions', {
      method: 'POST',
      body: JSON.stringify({ question_text: 'Hi', title: 'T' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('returns 403 with invalid token on POST', async () => {
    const req = new Request('http://localhost/api/questions', {
      method: 'POST',
      headers: { Authorization: 'Bearer bad' },
      body: JSON.stringify({ question_text: 'Hi', title: 'T' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(403);
  });

  it('returns 401 when no token provided on DELETE', async () => {
    const req = new Request('http://localhost/api/questions/123', {
      method: 'DELETE',
    });
    const res = await DELETE(req as any, { params: { id: '123' } });
    expect(res.status).toBe(401);
  });

  it('returns 403 with invalid token on DELETE', async () => {
    const req = new Request('http://localhost/api/questions/123', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer bad' },
    });
    const res = await DELETE(req as any, { params: { id: '123' } });
    expect(res.status).toBe(403);
  });
});
