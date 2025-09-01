import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/firebaseAdmin';
import { firebaseUidToUuid } from '@/lib/id';
import { getSupabaseForUser } from '@/lib/supabaseRls';
import rateLimit from '@/lib/rate-limiter';

const limiter = rateLimit({ interval: 60 * 1000 });

export const runtime = 'nodejs';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
    await limiter.check(10, ip); // 10 deletes per minute per IP

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
    const commentId = params.id;

    if (!commentId) {
      return NextResponse.json({ message: 'Missing comment ID' }, { status: 400 });
    }

    const supabase = getSupabaseForUser(userId);

    // First, get the comment to check ownership and get question_id
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('id, question_id, user_id')
      .eq('id', commentId)
      .single();

    if (fetchError) {
      console.error('Error fetching comment:', fetchError);
      return NextResponse.json({ message: 'Comment not found', details: fetchError.message }, { status: 404 });
    }

    if (!comment) {
      return NextResponse.json({ message: 'Comment not found' }, { status: 404 });
    }

    // Check if the user owns this comment
    if (comment.user_id !== userId) {
      return NextResponse.json({ message: 'Unauthorized to delete this comment' }, { status: 403 });
    }

    // Delete the comment
    const { error: deleteError } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) {
      console.error('Error deleting comment:', deleteError);
      return NextResponse.json({ message: 'Delete failed', details: deleteError.message }, { status: 400 });
    }

    // Comment count is updated by DB trigger
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    if (err.message === 'Rate limit exceeded') {
      return NextResponse.json({ message: 'Rate limit exceeded' }, { status: 429 });
    }
    return NextResponse.json({ message: 'Delete comment failed', details: err?.message || String(err) }, { status: 500 });
  }
}
