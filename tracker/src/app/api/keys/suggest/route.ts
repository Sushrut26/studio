import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api';
import { suggestKeys } from '@/lib/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q') ?? '';
    if (q.length < 2) return ok({ suggestions: [] });
    return ok({ suggestions: await suggestKeys(q, 10) });
  } catch (error) {
    return fail(error);
  }
}
