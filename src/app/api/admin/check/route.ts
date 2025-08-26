import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/firebaseAdmin';
import { firebaseUidToUuid } from '@/lib/id';
import { getSupabaseService } from '@/lib/supabaseService';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const [, token] = authHeader.split(' ');
    if (!token) {
      return NextResponse.json({ message: 'Missing Authorization Bearer token' }, { status: 401 });
    }

    const decoded = await verifyFirebaseIdToken(token);
    const userId = firebaseUidToUuid(decoded.uid);

    const supabase = getSupabaseService();
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      return NextResponse.json({ message: 'Role lookup failed', details: error.message }, { status: 500 });
    }

    if (data?.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ message: 'Admin check failed', details: err?.message || String(err) }, { status: 500 });
  }
}
