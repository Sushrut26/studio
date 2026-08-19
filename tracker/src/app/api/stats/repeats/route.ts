import { NextRequest } from 'next/server';
import { fail, ok, ready } from '@/lib/api';
import { repeatsQuerySchema } from '@/lib/schemas';
import { catalogRepeats, dashboardStats } from '@/lib/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await ready();
    const params = repeatsQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const [repeats, stats] = await Promise.all([catalogRepeats(params), dashboardStats()]);
    return ok({ repeats, stats });
  } catch (error) {
    return fail(error);
  }
}
