import { NextRequest } from 'next/server';
import { fail, ok, ready } from '@/lib/api';
import { createImportSchema } from '@/lib/schemas';
import { createImport, listImports } from '@/lib/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ready();
    return ok({ imports: await listImports() });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ready();
    const { kind, filename } = createImportSchema.parse(await req.json());
    return ok({ importId: await createImport(kind, filename ?? null) });
  } catch (error) {
    return fail(error);
  }
}
