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

    const { question_text, title, expires_at } = await req.json();
    if (!question_text || typeof question_text !== 'string' || question_text.trim().length < 3) {
      return NextResponse.json({ message: 'Invalid question_text' }, { status: 400 });
    }
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ message: 'Invalid title' }, { status: 400 });
    }

    const { data, error } = await getSupabaseService()
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
    return NextResponse.json({ message: 'Create question failed', details: err?.message || String(err) }, { status: 500 });
  }
}


