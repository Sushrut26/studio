import { NextRequest } from 'next/server';
import { fail, ok, ready } from '@/lib/api';
import { updateImportSchema } from '@/lib/schemas';
import { finishImport } from '@/lib/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await ready();
    const { id } = await ctx.params;
    const patch = updateImportSchema.parse(await req.json());
    await finishImport(Number(id), patch);
    return ok({ updated: true });
  } catch (error) {
    return fail(error);
  }
}
