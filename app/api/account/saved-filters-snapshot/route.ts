import { NextResponse } from 'next/server';

import type { Json } from '@/types_db';
import type { MoreFiltersJson } from '@/lib/scholarships/scholarshipListApiCodec';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { snapshot?: MoreFiltersJson };
  try {
    body = (await request.json()) as { snapshot?: MoreFiltersJson };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.snapshot || typeof body.snapshot !== 'object') {
    return NextResponse.json({ error: 'Missing snapshot' }, { status: 400 });
  }

  const { error } = await supabase
    .schema('public')
    .from('profiles')
    .update({ saved_filters_snapshot: body.snapshot as unknown as Json })
    .eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
