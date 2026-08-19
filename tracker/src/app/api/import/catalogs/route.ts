import { NextRequest } from 'next/server';
import { fail, ok, ready } from '@/lib/api';
import { registerCatalogsSchema } from '@/lib/schemas';
import { registerCatalog } from '@/lib/queries';
import { parseKey } from '@/lib/keys/pattern';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Register catalog keys. Each registration adopts any app groups already
 * imported beneath it, which is how earlier heuristic guesses get corrected.
 */
export async function POST(req: NextRequest) {
  try {
    await ready();
    const { keys } = registerCatalogsSchema.parse(await req.json());
    const valid = [...new Set(keys.map((k) => k.trim()).filter((k) => parseKey(k)))];
    const invalid = keys.length - valid.length;

    let adopted = 0;
    for (const key of valid) {
      const result = await registerCatalog(key);
      adopted += result.adopted;
    }

    return ok({ registered: valid.length, adopted, invalid });
  } catch (error) {
    return fail(error);
  }
}
