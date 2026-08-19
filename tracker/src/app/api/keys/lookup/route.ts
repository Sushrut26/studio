import { NextRequest } from 'next/server';
import { fail, ok, ready } from '@/lib/api';
import { bulkLookup } from '@/lib/queries';
import { lookupRequestSchema } from '@/lib/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Bulk cross-reference. Backs the dashboard, the list preview and CSV drop. */
export async function POST(req: NextRequest) {
  try {
    await ready();
    const { keys } = lookupRequestSchema.parse(await req.json());
    return ok({ results: await bulkLookup(keys) });
  } catch (error) {
    return fail(error);
  }
}
