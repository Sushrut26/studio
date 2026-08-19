import { NextRequest } from 'next/server';
import { fail, ok, ready } from '@/lib/api';
import { searchTickets } from '@/lib/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await ready();
    const q = req.nextUrl.searchParams.get('q') ?? '';
    const page = Number(req.nextUrl.searchParams.get('page') ?? '0');
    return ok({ tickets: await searchTickets(q, page) });
  } catch (error) {
    return fail(error);
  }
}
