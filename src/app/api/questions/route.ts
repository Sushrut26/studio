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
    await limiter.check(10, ip); // 10 requests per minute per IP

    const authHeader = req.headers.get('authorization') || '';
    const [, token] = authHeader.split(' ');
    if (!token) return NextResponse.json({ message: 'Missing Authorization Bearer token' }, { status: 401 });

    const decoded = await verifyFirebaseIdToken(token);
    const userId = firebaseUidToUuid(decoded.uid);

    const { question_text, title, expires_at } = await req.json();
    if (!question_text || typeof question_text !== 'string' || question_text.trim().length < 3) {
      return NextResponse.json({ message: 'Invalid question_text' }, { status: 400 });
    }
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ message: 'Invalid title' }, { status: 400 });
    }

    const supabase = getSupabaseForUser(userId);
    const { data, error } = await supabase
      .from('questions')
      .insert({
        user_id: userId,
        question_text: question_text.trim(),
        title: title.trim(),
        expires_at: expires_at || null,
      })
      .select('id')
      .single();

    if (error) return NextResponse.json({ message: 'Create failed', details: error.message }, { status: 400 });
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (err: any) {
    if (err.message === 'Rate limit exceeded') {
      return NextResponse.json({ message: 'Rate limit exceeded' }, { status: 429 });
    }
    return NextResponse.json({ message: 'Create question failed', details: err?.message || String(err) }, { status: 500 });
  }
}