import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/firebaseAdmin';
import { firebaseUidToUuid } from '@/lib/id';
import { getSupabaseService } from '@/lib/supabaseService';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const [, token] = authHeader.split(' ');
    if (!token) return NextResponse.json({ message: 'Missing Authorization Bearer token' }, { status: 401 });

    const decoded = await verifyFirebaseIdToken(token);
    const userId = firebaseUidToUuid(decoded.uid);

    const { question_id, value } = await req.json();
    if (!question_id || typeof question_id !== 'string') {
      return NextResponse.json({ message: 'Invalid question_id' }, { status: 400 });
    }
    if (![1, -1].includes(value)) {
      return NextResponse.json({ message: 'Invalid vote value' }, { status: 400 });
    }

    // Check duplicate
    const { data: existing, error: existingErr } = await getSupabaseService()
      .from('votes')
      .select('id, value')
      .eq('question_id', question_id)
      .eq('user_id', userId);
    if (existingErr) return NextResponse.json({ message: 'Lookup failed', details: existingErr.message }, { status: 400 });
    if (existing && existing.length > 0) {
      const { data: counts, error: countsErr } = await getSupabaseService()
        .from('questions')
        .select('yes_votes,no_votes')
        .eq('id', question_id)
        .single();
      if (countsErr) return NextResponse.json({ message: 'Counts failed', details: countsErr.message }, { status: 400 });
      return NextResponse.json({ message: 'Already voted', value: existing[0].value, counts }, { status: 409 });
    }

    const { error: insertErr } = await getSupabaseService()
      .from('votes')
      .insert({ question_id, user_id: userId, value });
    if (insertErr) return NextResponse.json({ message: 'Insert failed', details: insertErr.message }, { status: 400 });

    // Fetch counts
    const { data: counts, error: countsErr } = await getSupabaseService()
      .from('questions')
      .select('yes_votes,no_votes')
      .eq('id', question_id)
      .single();
    if (countsErr) return NextResponse.json({ message: 'Counts failed', details: countsErr.message }, { status: 400 });

    return NextResponse.json({ ok: true, counts }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: 'Vote failed', details: err?.message || String(err) }, { status: 500 });
  }
}


