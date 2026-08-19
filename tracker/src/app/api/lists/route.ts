import { NextRequest } from 'next/server';
import { fail, ok, ready } from '@/lib/api';
import { createListSchema } from '@/lib/schemas';
import { createList, getLists } from '@/lib/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    await ready();
    return ok({ lists: await getLists() });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ready();
    const input = createListSchema.parse(await req.json());
    return ok(await createList(input));
  } catch (error) {
    return fail(error);
  }
}
