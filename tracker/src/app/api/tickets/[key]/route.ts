import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api';
import { getTicket } from '@/lib/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await ctx.params;
    const result = await getTicket(decodeURIComponent(key));
    return ok(result ?? { ticket: null, keys: [] });
  } catch (error) {
    return fail(error);
  }
}
