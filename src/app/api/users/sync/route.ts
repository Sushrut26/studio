import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/firebaseAdmin';
import { firebaseUidToUuid } from '@/lib/id';
import { getSupabaseService } from '@/lib/supabaseService';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const [, token] = authHeader.split(' ');
    if (!token) {
      return NextResponse.json({ message: 'Missing Authorization Bearer token' }, { status: 401 });
    }

    const decoded = await verifyFirebaseIdToken(token);
    const firebaseUid = decoded.uid;
    const userId = firebaseUidToUuid(firebaseUid);

    const body = await req.json().catch(() => ({}));
    const name: string | undefined = body.name;
    const avatarUrl: string | undefined = body.avatar_url;
    const email: string | undefined = body.email;
    const username = (email?.split('@')[0] || 'user').toLowerCase();

    const { error: userErr } = await getSupabaseService()
      .from('users')
      .upsert({ id: userId, username, role: 'user' }, { onConflict: 'id' });
    if (userErr) {
      return NextResponse.json({ message: 'Upsert user failed', details: userErr.message }, { status: 400 });
    }

    const { error: profileErr } = await getSupabaseService()
      .from('profiles')
      .upsert({ id: userId, name: name || username, avatar_url: avatarUrl || '' }, { onConflict: 'id' });
    if (profileErr) {
      return NextResponse.json({ message: 'Upsert profile failed', details: profileErr.message }, { status: 400 });
    }

    return NextResponse.json({ id: userId }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ message: 'users/sync failed', details: err?.message || String(err) }, { status: 500 });
  }
}


