import { fail, ok, ready } from '@/lib/api';
import { listOverlap } from '@/lib/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ready();
    return ok({ overlap: await listOverlap() });
  } catch (error) {
    return fail(error);
  }
}
