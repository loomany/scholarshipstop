import { NextResponse } from 'next/server';

import type { Json } from '@/types_db';
import { PROFILE_GPA_SELECTION_SNAPSHOT_KEY } from '@/lib/constants/scholarshipGpaOptions';
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

  const { data: currentProfile } = await supabase
    .schema('public')
    .from('profiles')
    .select('saved_filters_snapshot')
    .eq('id', user.id)
    .maybeSingle();

  const currentSnapshot =
    currentProfile?.saved_filters_snapshot &&
    typeof currentProfile.saved_filters_snapshot === 'object' &&
    !Array.isArray(currentProfile.saved_filters_snapshot)
      ? (currentProfile.saved_filters_snapshot as Record<string, unknown>)
      : null;

  const mergedSnapshot: Record<string, unknown> = {
    ...(body.snapshot as Record<string, unknown>)
  };
  const preservedGpaSelection = currentSnapshot?.[PROFILE_GPA_SELECTION_SNAPSHOT_KEY];
  if (
    typeof preservedGpaSelection === 'string' &&
    !Object.prototype.hasOwnProperty.call(
      mergedSnapshot,
      PROFILE_GPA_SELECTION_SNAPSHOT_KEY
    )
  ) {
    mergedSnapshot[PROFILE_GPA_SELECTION_SNAPSHOT_KEY] = preservedGpaSelection;
  }

  const { error } = await supabase
    .schema('public')
    .from('profiles')
    .update({ saved_filters_snapshot: mergedSnapshot as unknown as Json })
    .eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
