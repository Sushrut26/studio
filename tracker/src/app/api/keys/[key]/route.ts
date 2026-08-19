import { NextRequest } from 'next/server';
import { fail, ok, ready } from '@/lib/api';
import { getChildren, getKey, getParent, listsForKey, ticketsForKey } from '@/lib/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ key: string }> }) {
  try {
    await ready();
    const { key: rawKey } = await ctx.params;
    const keyText = decodeURIComponent(rawKey);
    const key = await getKey(keyText);
    if (!key) return ok({ key: null, tickets: [], lists: [], children: [], parent: null });

    const [tickets, lists, children, parent] = await Promise.all([
      ticketsForKey(keyText),
      listsForKey(keyText),
      getChildren(key.id),
      getParent(key.parent_key_id),
    ]);

    return ok({ key, tickets, lists, children, parent });
  } catch (error) {
    return fail(error);
  }
}
