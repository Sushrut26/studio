import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/firebaseAdmin';
import { firebaseUidToUuid } from '@/lib/id';
import { getSupabaseService } from '@/lib/supabaseService';

export const runtime = 'nodejs';

async function assertAdmin(token: string) {
  const decoded = await verifyFirebaseIdToken(token);
  const userId = firebaseUidToUuid(decoded.uid);
  const supabase = getSupabaseService();
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  if (error || data?.role !== 'admin') {
    throw new Error('not-admin');
  }
  return supabase;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const [, token] = authHeader.split(' ');
    if (!token) {
      return NextResponse.json({ message: 'Missing Authorization Bearer token' }, { status: 401 });
    }

    const supabase = await assertAdmin(token);
    const status = req.nextUrl.searchParams.get('status');
    let query = supabase.from('questions').select('id,question_text,status');
    if (status) {
      query = query.eq('status', status);
    }
    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ message: 'Fetch failed', details: error.message }, { status: 400 });
    }
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    if (err.message === 'not-admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ message: 'Fetch questions failed', details: err?.message || String(err) }, { status: 500 });
  }
}
