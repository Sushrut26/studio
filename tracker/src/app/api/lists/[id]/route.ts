import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api';
import { updateListSchema } from '@/lib/schemas';
import { deleteList, getListDetail, updateList } from '@/lib/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const detail = await getListDetail(Number(id));
    if (!detail) return ok({ list: null, items: [] });
    return ok(detail);
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await updateList(Number(id), updateListSchema.parse(await req.json()));
    return ok({ updated: true });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await deleteList(Number(id));
    return ok({ deleted: true });
  } catch (error) {
    return fail(error);
  }
}
