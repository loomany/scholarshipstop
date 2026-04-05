import { NextResponse } from 'next/server';

import {
  bumpScholarshipMatchCacheBust,
  canBuildPersonalizedMatchIndex,
  getCachedScholarshipMatchIndex
} from '@/lib/scholarships/scholarshipMatchCache';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Best-effort async cache-bust + warm for per-user scholarship match index.
 * Called after profile saves so `/scholarships` can reflect profile edits quickly.
 */
export async function POST() {
  try {
    const supabase = createClient() as any;
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    bumpScholarshipMatchCacheBust(user.id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profile && canBuildPersonalizedMatchIndex(profile)) {
      void getCachedScholarshipMatchIndex(supabase, user.id, profile).catch(() => undefined);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
