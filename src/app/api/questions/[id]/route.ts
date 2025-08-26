import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/firebaseAdmin';
import { firebaseUidToUuid } from '@/lib/id';
import { getSupabaseForUser } from '@/lib/supabaseRls';
import rateLimit from '@/lib/rate-limiter';

const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
});

export const runtime = 'nodejs';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ip = req.ip ?? '127.0.0.1';
    await limiter.check(5, ip); // 5 requests per minute per IP

    const authHeader = req.headers.get('authorization') || '';
    const [, token] = authHeader.split(' ');
    if (!token) return NextResponse.json({ message: 'Missing Authorization Bearer token' }, { status: 401 });

    let decoded;
    try {
      decoded = await verifyFirebaseIdToken(token);
    } catch {
      return NextResponse.json({ message: 'Invalid token' }, { status: 403 });
    }
    const userId = firebaseUidToUuid(decoded.uid);
    const supabase = getSupabaseForUser(userId);

    const { error } = await supabase.from('questions').delete().eq('id', params.id);
    if (error) return NextResponse.json({ message: 'Delete failed', details: error.message }, { status: 400 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    if (err.message === 'Rate limit exceeded') {
      return NextResponse.json({ message: 'Rate limit exceeded' }, { status: 429 });
    }
    return NextResponse.json({ message: 'Delete question failed', details: err?.message || String(err) }, { status: 500 });
  }
}
