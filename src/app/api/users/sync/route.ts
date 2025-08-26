import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/firebaseAdmin';
import { firebaseUidToUuid } from '@/lib/id';
import { getSupabaseForUser } from '@/lib/supabaseRls';
import { z } from 'zod';
import rateLimit from '@/lib/rate-limiter';

const limiter = rateLimit({
  interval: 60 * 1000, // 60 seconds
  uniqueTokenPerInterval: 500, // 500 users per interval
});

const bodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatar_url: z.string().url().optional(),
  email: z.string().email().optional(),
});

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const ip = req.ip ?? '127.0.0.1';
    await limiter.check(20, ip); // 20 requests per minute per IP (more lenient for auth flows)

    const authHeader = req.headers.get('authorization') || '';
    const [, token] = authHeader.split(' ');
    if (!token) {
      return NextResponse.json({ message: 'Missing Authorization Bearer token' }, { status: 401 });
    }

    const decoded = await verifyFirebaseIdToken(token);
    const firebaseUid = decoded.uid;
    const userId = firebaseUidToUuid(firebaseUid);
    const supabase = getSupabaseForUser(userId);

    const body = await req.json().catch(() => ({}));
    const parsedBody = bodySchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ message: 'Invalid request body', details: parsedBody.error.flatten() }, { status: 400 });
    }

    const { name, avatar_url: avatarUrl, email } = parsedBody.data;

    const baseUsername = (email?.split('@')[0] || 'user').toLowerCase();
    const uniqueUsername = `${baseUsername}-${userId.slice(0, 8)}`;

    // Create user if missing to avoid unique username conflicts
    const { data: existingUser, error: existingLookupErr } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId);

    if (existingLookupErr) {
      return NextResponse.json({ message: 'User lookup failed', details: existingLookupErr.message }, { status: 400 });
    }

    if (!existingUser || existingUser.length === 0) {
      const { error: insertUserErr } = await supabase
        .from('users')
        .insert({ id: userId, username: uniqueUsername, role: 'user' });
      if (insertUserErr) {
        return NextResponse.json({ message: 'Insert user failed', details: insertUserErr.message }, { status: 400 });
      }
    }

    const { error: profileErr } = await supabase
      .from('profiles')
      .upsert({ id: userId, name: name || baseUsername, avatar_url: avatarUrl || '' }, { onConflict: 'id' });
    if (profileErr) {
      return NextResponse.json({ message: 'Upsert profile failed', details: profileErr.message }, { status: 400 });
    }

    return NextResponse.json({ id: userId }, { status: 200 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid request body', details: err.flatten() }, { status: 400 });
    }
    if (err.message === 'Rate limit exceeded') {
      return NextResponse.json({ message: 'Rate limit exceeded' }, { status: 429 });
    }
    return NextResponse.json({ message: 'users/sync failed', details: err?.message || String(err) }, { status: 500 });
  }
}
