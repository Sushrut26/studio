import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/firebaseAdmin';
import { firebaseUidToUuid } from '@/lib/id';
import { getSupabaseForUser } from '@/lib/supabaseRls';
import rateLimit from '@/lib/rate-limiter';

const limiter = rateLimit({
  interval: 60 * 1000, // 60 seconds
});

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const ip = req.ip ?? '127.0.0.1';
    await limiter.check(20, ip); // 20 requests per minute per IP

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

    const { question_id, value } = await req.json();
    if (!question_id || typeof question_id !== 'string') {
      return NextResponse.json({ message: 'Invalid question_id' }, { status: 400 });
    }
    if (![1, -1].includes(value)) {
      return NextResponse.json({ message: 'Invalid vote value' }, { status: 400 });
    }

    // Check duplicate
    const { data: existing, error: existingErr } = await supabase
      .from('votes')
      .select('id, value')
      .eq('question_id', question_id)
      .eq('user_id', userId);
    if (existingErr) return NextResponse.json({ message: 'Lookup failed', details: existingErr.message }, { status: 400 });
    if (existing && existing.length > 0) {
      const { data: counts, error: countsErr } = await supabase
        .from('questions')
        .select('yes_votes,no_votes')
        .eq('id', question_id)
        .single();
      if (countsErr) return NextResponse.json({ message: 'Counts failed', details: countsErr.message }, { status: 400 });
      return NextResponse.json({ message: 'Already voted', value: existing[0].value, counts }, { status: 409 });
    }

    const { error: insertErr } = await supabase
      .from('votes')
      .insert({ question_id, user_id: userId, value });
    if (insertErr) return NextResponse.json({ message: 'Insert failed', details: insertErr.message }, { status: 400 });

    // Fetch counts
    const { data: counts, error: countsErr } = await supabase
      .from('questions')
      .select('yes_votes,no_votes')
      .eq('id', question_id)
      .single();
    if (countsErr) return NextResponse.json({ message: 'Counts failed', details: countsErr.message }, { status: 400 });

    return NextResponse.json({ ok: true, counts }, { status: 201 });
  } catch (err: any) {
    if (err.message === 'Rate limit exceeded') {
      return NextResponse.json({ message: 'Rate limit exceeded' }, { status: 429 });
    }
    return NextResponse.json({ message: 'Vote failed', details: err?.message || String(err) }, { status: 500 });
  }
}