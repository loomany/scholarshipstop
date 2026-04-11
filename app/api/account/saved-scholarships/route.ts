import { NextResponse } from 'next/server';

import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await (supabase as any)
    .from('user_saved_scholarships')
    .select('scholarship_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const scholarshipIds = (data ?? []).map((r: { scholarship_id: string }) => r.scholarship_id);
  return NextResponse.json({ scholarshipIds });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { scholarshipId?: string };
  try {
    body = (await request.json()) as { scholarshipId?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const scholarshipId = typeof body.scholarshipId === 'string' ? body.scholarshipId.trim() : '';
  if (!scholarshipId) {
    return NextResponse.json({ error: 'Missing scholarshipId' }, { status: 400 });
  }

  const { error } = await (supabase as any).from('user_saved_scholarships').insert({
    user_id: user.id,
    scholarship_id: scholarshipId
  });

  if (error && error.code !== '23505') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const scholarshipId = url.searchParams.get('id')?.trim() ?? '';
  if (!scholarshipId) {
    return NextResponse.json({ error: 'Missing id query param' }, { status: 400 });
  }

  const { error } = await (supabase as any)
    .from('user_saved_scholarships')
    .delete()
    .eq('user_id', user.id)
    .eq('scholarship_id', scholarshipId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
