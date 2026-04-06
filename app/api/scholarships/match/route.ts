import { NextResponse } from 'next/server';

import { citizenshipLabelForValue } from '@/lib/constants/onboardingCitizenshipAndLocation';
import { schoolLevelLabelForValue } from '@/lib/constants/scholarshipProfileOptions';
import {
  canBuildPersonalizedMatchIndex,
  getCachedScholarshipMatchIndex
} from '@/lib/scholarships/scholarshipMatchCache';
import {
  filterIdsByIgnored,
  mergeMatchOntoScholarships
} from '@/lib/scholarships/scholarshipMatchIndex';
import { LIST_CARD_SELECT, mapScholarshipRow } from '@/lib/scholarships/supabase';
import { createClient } from '@/utils/supabase/server';
import { getSubscription } from '@/utils/supabase/queries';

export const dynamic = 'force-dynamic';

const FREE_PREVIEW = 8;

/**
 * POST /api/scholarships/match
 * Body: { page?, limit?, bucket?: 'best' | 'recommended' | 'matches' | 'easy', ignored?: string[] }
 * Returns scored rows (cached server-side per user + profile version).
 */
export async function POST(request: Request) {
  try {
    const supabase = createClient() as any;
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      page?: number;
      limit?: number;
      bucket?: 'best' | 'recommended' | 'matches' | 'easy';
      ignored?: string[];
    };
    const page = Math.max(1, Number(body.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(body.limit) || 24));
    const bucket = body.bucket ?? 'matches';
    const ignored = Array.isArray(body.ignored)
      ? body.ignored.filter(
          (id) => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)
        )
      : [];

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || !canBuildPersonalizedMatchIndex(profile)) {
      return NextResponse.json({
        items: [] as unknown[],
        counts: null,
        profileSummary: null,
        matchedTotal: 0,
        isPro: false,
        message:
          'Add field of study, school level, citizenship, or state to enable matching.'
      });
    }

    const bundle = await getCachedScholarshipMatchIndex(supabase, user.id, profile);
    const subscription = await getSubscription(supabase);
    const isPro = Boolean(subscription);

    let ids: string[] = [];
    switch (bucket) {
      case 'best':
        ids = bundle.idsBest;
        break;
      case 'recommended':
        ids = bundle.idsRecommended;
        break;
      case 'easy':
        ids = bundle.idsEasy;
        break;
      default:
        ids = bundle.idsMatches;
    }

    ids = filterIdsByIgnored(ids, ignored);

    const profileSummary = {
      field:
        profile.field_of_study_label?.trim() ||
        profile.field_of_study?.trim() ||
        '—',
      level:
        schoolLevelLabelForValue(profile.school_level ?? '') ||
        profile.school_level?.trim() ||
        '—',
      gpa:
        profile.gpa != null && String(profile.gpa).trim() !== ''
          ? String(profile.gpa)
          : '—',
      citizenship:
        citizenshipLabelForValue(profile.citizenship_status ?? '') || '—',
      state: profile.state_region?.trim() || '—'
    };

    const matchedTotal = filterIdsByIgnored(bundle.idsMatches, ignored).length;
    const from = (page - 1) * limit;
    let pageIds = ids.slice(from, from + limit);

    if (!isPro && pageIds.length > FREE_PREVIEW) {
      pageIds = pageIds.slice(0, FREE_PREVIEW);
    }

    if (pageIds.length === 0) {
      return NextResponse.json({
        items: [],
        counts: bundle.countsUnfiltered,
        profileSummary,
        matchedTotal,
        isPro,
        page,
        limit,
        lockedCount: !isPro && matchedTotal > FREE_PREVIEW ? matchedTotal - FREE_PREVIEW : 0
      });
    }

    const { data, error } = await supabase
      .from('scholarships')
      .select(LIST_CARD_SELECT)
      .eq('is_active', true)
      .in('id', pageIds);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const rows = data ?? [];
    const rowById = new Map(rows.map((r: (typeof rows)[0]) => [r.id, r]));
    const orderedRows = pageIds
      .map((id) => rowById.get(id))
      .filter(Boolean) as (typeof rows)[];
    const scholarships = mergeMatchOntoScholarships(
      orderedRows.map((r) => mapScholarshipRow(r as any)),
      bundle.byId
    );

    const items = scholarships.map((s) => {
      const m = bundle.byId.get(s.id);
      return {
        scholarship: s,
        score: m?.score ?? 0,
        reasons: m?.reasons ?? []
      };
    });

    return NextResponse.json({
      items,
      counts: bundle.countsUnfiltered,
      profileSummary,
      matchedTotal,
      isPro,
      page,
      limit,
      lockedCount:
        !isPro && matchedTotal > FREE_PREVIEW ? matchedTotal - FREE_PREVIEW : 0
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
