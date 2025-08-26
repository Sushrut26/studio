import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/firebaseAdmin';
import { firebaseUidToUuid } from '@/lib/id';
import { getSupabaseForUser } from '@/lib/supabaseRls';
import rateLimit from '@/lib/rate-limiter';

const limiter = rateLimit({
  interval: 60 * 1000, // 60 seconds
});

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    console.log('GET /api/questions - Starting request');
    const ip = req.ip ?? '127.0.0.1';
    await limiter.check(60, ip); // 60 requests per minute per IP

    const authHeader = req.headers.get('authorization') || '';
    const [, token] = authHeader.split(' ');
    if (!token) {
      console.log('GET /api/questions - Missing token');
      return NextResponse.json({ message: 'Missing Authorization Bearer token' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = await verifyFirebaseIdToken(token);
      console.log('GET /api/questions - Token verified for user:', decoded.uid);
    } catch (error) {
      console.log('GET /api/questions - Token verification failed:', error);
      return NextResponse.json({ message: 'Invalid token' }, { status: 403 });
    }
    const userId = firebaseUidToUuid(decoded.uid);
    console.log('GET /api/questions - User ID:', userId);

    const page = Number(req.nextUrl.searchParams.get('page') ?? '0');
    const pageSize = Number(req.nextUrl.searchParams.get('pageSize') ?? '10');
    const from = page * pageSize;
    const to = from + pageSize - 1;
    console.log('GET /api/questions - Pagination:', { page, pageSize, from, to });

    try {
      const supabase = getSupabaseForUser(userId);
      console.log('GET /api/questions - Supabase client created');
      
      const { data: questions, error } = await supabase
        .from('questions')
        .select('id, question_text, yes_votes, no_votes, comments_count, created_at, user_id')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('GET /api/questions - Supabase error fetching questions:', error);
        return NextResponse.json({ message: 'Fetch failed', details: error.message }, { status: 400 });
      }

      console.log('GET /api/questions - Questions fetched:', questions?.length || 0);

      const uniqueUserIds = Array.from(new Set((questions ?? []).map((q: any) => q.user_id)));
      let profilesById: Record<string, { name: string | null; avatar_url: string | null }> = {};
      if (uniqueUserIds.length > 0) {
        console.log('GET /api/questions - Fetching profiles for:', uniqueUserIds);
        const { data: profiles, error: profileErr } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', uniqueUserIds);
        if (profileErr) {
          console.error('GET /api/questions - Supabase error fetching profiles:', profileErr);
        } else {
          profilesById = (profiles ?? []).reduce((acc: any, p: any) => {
            acc[p.id] = { name: p.name ?? null, avatar_url: p.avatar_url ?? null };
            return acc;
          }, {} as Record<string, { name: string | null; avatar_url: string | null }>);
          console.log('GET /api/questions - Profiles fetched:', Object.keys(profilesById).length);
        }
      }

      const result = (questions ?? []).map((q: any) => ({
        id: q.id,
        user_id: q.user_id,
        question_text: q.question_text,
        yes_votes: q.yes_votes ?? 0,
        no_votes: q.no_votes ?? 0,
        comments_count: q.comments_count ?? 0,
        created_at: q.created_at,
        profile: profilesById[q.user_id] ?? null,
      }));

      console.log('GET /api/questions - Returning result with', result.length, 'items');
      return NextResponse.json({ items: result }, { status: 200 });
    } catch (supabaseError) {
      console.error('GET /api/questions - Supabase client error:', supabaseError);
      throw supabaseError;
    }
  } catch (err: any) {
    console.error('GET /api/questions - Top level error:', err);
    if (err.message === 'Rate limit exceeded') {
      return NextResponse.json({ message: 'Rate limit exceeded' }, { status: 429 });
    }
    return NextResponse.json({ 
      message: 'Fetch questions failed', 
      details: err?.message || String(err),
      stack: err?.stack
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.ip ?? '127.0.0.1';
    await limiter.check(10, ip); // 10 requests per minute per IP

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

    if (error) {
      console.error('Supabase error creating question:', error);
      return NextResponse.json({
        message: 'Create failed',
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 400 });
    }
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (err: any) {
    if (err.message === 'Rate limit exceeded') {
      return NextResponse.json({ message: 'Rate limit exceeded' }, { status: 429 });
    }
    return NextResponse.json({ message: 'Create question failed', details: err?.message || String(err) }, { status: 500 });
  }
}