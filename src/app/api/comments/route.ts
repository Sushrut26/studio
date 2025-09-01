import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/firebaseAdmin';
import { firebaseUidToUuid } from '@/lib/id';
import { getSupabaseForUser } from '@/lib/supabaseRls';
import rateLimit from '@/lib/rate-limiter';

const limiter = rateLimit({ interval: 60 * 1000 });

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
    await limiter.check(60, ip);

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
    const questionId = req.nextUrl.searchParams.get('question_id');
    
    if (!questionId) {
      return NextResponse.json({ message: 'Missing question_id parameter' }, { status: 400 });
    }

    const supabase = getSupabaseForUser(userId);
    const { data: comments, error } = await supabase
      .from('comments')
      .select('id, content, created_at, user_id')
      .eq('question_id', questionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Supabase error fetching comments:', error);
      return NextResponse.json({ message: 'Fetch failed', details: error.message }, { status: 400 });
    }

    // Fetch profiles separately for all comment authors
    const uniqueUserIds = Array.from(new Set((comments ?? []).map((comment: any) => comment.user_id)));
    let profilesById: Record<string, { name: string | null; avatar_url: string | null }> = {};
    
    if (uniqueUserIds.length > 0) {
      const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', uniqueUserIds);
      
      if (profileErr) {
        console.error('Supabase error fetching profiles:', profileErr);
      } else {
        profilesById = (profiles ?? []).reduce((acc: any, p: any) => {
          acc[p.id] = { name: p.name ?? null, avatar_url: p.avatar_url ?? null };
          return acc;
        }, {} as Record<string, { name: string | null; avatar_url: string | null }>);
      }
    }

    const result = (comments ?? []).map((comment: any) => ({
      id: comment.id,
      content: comment.content,
      created_at: comment.created_at,
      user_id: comment.user_id,
      author: {
        name: profilesById[comment.user_id]?.name ?? 'Anonymous',
        avatar_url: profilesById[comment.user_id]?.avatar_url ?? '',
      },
    }));

    return NextResponse.json({ items: result }, { status: 200 });
  } catch (err: any) {
    if (err.message === 'Rate limit exceeded') {
      return NextResponse.json({ message: 'Rate limit exceeded' }, { status: 429 });
    }
    return NextResponse.json({ message: 'Fetch comments failed', details: err?.message || String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
    await limiter.check(10, ip); // 10 comments per minute per IP

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
    const { question_id, content } = await req.json();

    if (!question_id || typeof question_id !== 'string') {
      return NextResponse.json({ message: 'Invalid question_id' }, { status: 400 });
    }
    if (!content || typeof content !== 'string' || content.trim().length < 1) {
      return NextResponse.json({ message: 'Invalid content' }, { status: 400 });
    }
    if (content.trim().length > 1000) {
      return NextResponse.json({ message: 'Content too long (max 1000 characters)' }, { status: 400 });
    }

    const supabase = getSupabaseForUser(userId);
    const { data, error } = await supabase
      .from('comments')
      .insert({
        question_id,
        user_id: userId,
        content: content.trim(),
      })
      .select('id, content, created_at, user_id')
      .single();

    if (error) {
      console.error('Supabase error creating comment:', error);
      return NextResponse.json({ message: 'Create failed', details: error.message }, { status: 400 });
    }

    // Fetch the author's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, avatar_url')
      .eq('id', userId)
      .single();

    const result = {
      id: data.id,
      content: data.content,
      created_at: data.created_at,
      user_id: data.user_id,
      author: {
        name: profile?.name ?? 'Anonymous',
        avatar_url: profile?.avatar_url ?? '',
      },
    };

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    if (err.message === 'Rate limit exceeded') {
      return NextResponse.json({ message: 'Rate limit exceeded' }, { status: 429 });
    }
    return NextResponse.json({ message: 'Create comment failed', details: err?.message || String(err) }, { status: 500 });
  }
}
