import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/firebaseAdmin';
import { firebaseUidToUuid } from '@/lib/id';
import { getSupabaseService } from '@/lib/supabaseService';

export const runtime = 'nodejs';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const [, token] = authHeader.split(' ');
    if (!token) {
      return NextResponse.json({ message: 'Missing Authorization Bearer token' }, { status: 401 });
    }

    const decoded = await verifyFirebaseIdToken(token);
    const userId = firebaseUidToUuid(decoded.uid);
    const supabase = getSupabaseService();

    const { data: roleData, error: roleErr } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    if (roleErr || roleData?.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', params.id);
    if (error) {
      return NextResponse.json({ message: 'Delete failed', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ message: 'Delete question failed', details: err?.message || String(err) }, { status: 500 });
  }
}
