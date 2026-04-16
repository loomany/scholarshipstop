import 'server-only';

import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import { resolveScholarshipCardAwardDisplay } from '@/app/scholarships/scholarshipsData';
import type { Database } from '@/types_db';
import { sendWeeklyFreeDigestEmail } from '@/lib/email/sendWeeklyFreeDigestEmail';
import type { WeeklyFreeDigestPremiumRow } from '@/lib/email/templates/weeklyFreeDigestEmailHtml';
import { profileMatchesBest } from '@/lib/notifications/runGrantNotificationDispatch';
import { getEasternMondayYmd } from '@/lib/notifications/weeklyDigestEastern';
import { fetchGlobalFilterBounds } from '@/lib/scholarships/scholarshipListServer';
import { mapScholarshipRow, type ScholarshipRow } from '@/lib/scholarships/supabase';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';

import type { SupabaseClient } from '@supabase/supabase-js';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

const LOOKBACK_DAYS = Math.max(
  1,
  Number(process.env.WEEKLY_FREE_DIGEST_LOOKBACK_DAYS?.trim() || '7') || 7
);
const LOOKBACK_MS = LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

/** More than this many profile matches among new listings → send (default 10 → need 11+). */
const MIN_MATCHES = Math.max(
  2,
  Number(process.env.WEEKLY_FREE_DIGEST_MIN_PROFILE_MATCHES?.trim() || '11') || 11
);

const MAX_PROFILES = Math.max(
  20,
  Number(process.env.WEEKLY_FREE_DIGEST_MAX_PROFILES?.trim() || '500') || 500
);

const MAX_NEW_SCAN = Math.max(
  50,
  Number(process.env.WEEKLY_FREE_DIGEST_MAX_NEW_SCAN?.trim() || '600') || 600
);

const PREMIUM_MIN_AMOUNT = Math.max(
  1000,
  Number(process.env.WEEKLY_FREE_DIGEST_PREMIUM_MIN_AMOUNT?.trim() || '10000') ||
    10000
);

function relevanceScore(s: Scholarship): number {
  const ai = s.aiMatchScore;
  const r = s.rankingScore;
  if (ai != null && Number.isFinite(ai)) return ai;
  if (r != null && Number.isFinite(r)) return r;
  return 0;
}

function sortByRelevance(matches: Scholarship[]): void {
  matches.sort((a, b) => relevanceScore(b) - relevanceScore(a));
}

async function loadPremiumTeaser(
  admin: SupabaseClient<Database>
): Promise<WeeklyFreeDigestPremiumRow> {
  const { data } = await admin
    .from('scholarships')
    .select('*')
    .eq('is_active', true)
    .gte('award_amount_numeric_sort', PREMIUM_MIN_AMOUNT)
    .order('award_amount_numeric_sort', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return {
      title: 'Full-tuition and high-value awards',
      amountLine: 'Amount: $10,000+ | Available for Premium members'
    };
  }

  const s = mapScholarshipRow(data as unknown as ScholarshipRow);
  const award = resolveScholarshipCardAwardDisplay(s);
  const amt = award.isPlaceholder ? '$10,000+' : `${award.line}+`;
  return {
    title: s.title?.trim() || 'Premium scholarship highlight',
    amountLine: `Amount: ${amt} | Available for Premium members`
  };
}

async function collectMatchesForProfile(
  admin: SupabaseClient<Database>,
  profile: ProfileRow,
  bounds: Awaited<ReturnType<typeof fetchGlobalFilterBounds>>,
  newRows: ScholarshipRow[]
): Promise<Scholarship[]> {
  const out: Scholarship[] = [];
  for (const row of newRows) {
    const ok = await profileMatchesBest(admin, profile, bounds, row.id);
    if (ok) out.push(mapScholarshipRow(row));
  }
  return out;
}

export type WeeklyFreeDigestResult = {
  ok: boolean;
  weekStartMondayEt: string;
  platformNew7d: number;
  profilesScanned: number;
  emailsAttempted: number;
  emailsSent: number;
  skippedAlreadySent: number;
  skippedBelowThreshold: number;
  errors: number;
  message?: string;
};

export async function runWeeklyFreeDigestDispatch(): Promise<WeeklyFreeDigestResult> {
  const adminRaw = createServiceRoleSupabaseClient();
  if (!adminRaw) {
    return {
      ok: false,
      weekStartMondayEt: getEasternMondayYmd(),
      platformNew7d: 0,
      profilesScanned: 0,
      emailsAttempted: 0,
      emailsSent: 0,
      skippedAlreadySent: 0,
      skippedBelowThreshold: 0,
      errors: 0,
      message: 'Service role client unavailable'
    };
  }
  const admin = adminRaw;

  const sinceIso = new Date(Date.now() - LOOKBACK_MS).toISOString();

  const { count: platformCount, error: cErr } = await admin
    .from('scholarships')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .gte('created_at', sinceIso);

  if (cErr) {
    return {
      ok: false,
      weekStartMondayEt: getEasternMondayYmd(),
      platformNew7d: 0,
      profilesScanned: 0,
      emailsAttempted: 0,
      emailsSent: 0,
      skippedAlreadySent: 0,
      skippedBelowThreshold: 0,
      errors: 1,
      message: cErr.message
    };
  }

  const platformNew7d = platformCount ?? 0;

  const { data: newRowData, error: nErr } = await admin
    .from('scholarships')
    .select('*')
    .eq('is_active', true)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(MAX_NEW_SCAN);

  if (nErr) {
    return {
      ok: false,
      weekStartMondayEt: getEasternMondayYmd(),
      platformNew7d,
      profilesScanned: 0,
      emailsAttempted: 0,
      emailsSent: 0,
      skippedAlreadySent: 0,
      skippedBelowThreshold: 0,
      errors: 1,
      message: nErr.message
    };
  }

  const newRows = (newRowData ?? []) as unknown as ScholarshipRow[];
  if (newRows.length === 0) {
    return {
      ok: true,
      weekStartMondayEt: getEasternMondayYmd(),
      platformNew7d,
      profilesScanned: 0,
      emailsAttempted: 0,
      emailsSent: 0,
      skippedAlreadySent: 0,
      skippedBelowThreshold: 0,
      errors: 0,
      message: 'No new scholarships in lookback window'
    };
  }

  const bounds = await fetchGlobalFilterBounds(admin);
  const premiumTeaser = await loadPremiumTeaser(admin);

  const { data: profileRows, error: pErr } = await admin
    .from('profiles')
    .select('*')
    .eq('email_weekly_free_digest', true)
    .eq('is_subscribed', false)
    .order('created_at', { ascending: true })
    .limit(MAX_PROFILES);

  if (pErr) {
    return {
      ok: false,
      weekStartMondayEt: getEasternMondayYmd(),
      platformNew7d,
      profilesScanned: 0,
      emailsAttempted: 0,
      emailsSent: 0,
      skippedAlreadySent: 0,
      skippedBelowThreshold: 0,
      errors: 1,
      message: pErr.message
    };
  }

  const profiles = (profileRows ?? []) as ProfileRow[];
  const weekStart = getEasternMondayYmd();

  const emailCache = new Map<string, string | null>();
  async function getEmail(userId: string): Promise<string | null> {
    if (emailCache.has(userId)) return emailCache.get(userId) ?? null;
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data.user?.email) {
      emailCache.set(userId, null);
      return null;
    }
    emailCache.set(userId, data.user.email);
    return data.user.email;
  }

  let emailsAttempted = 0;
  let emailsSent = 0;
  let skippedAlreadySent = 0;
  let skippedBelowThreshold = 0;
  let errors = 0;

  for (const profile of profiles) {
    const uid = profile.id;

    const { data: existing } = await admin
      .from('weekly_free_digest_sent')
      .select('id')
      .eq('user_id', uid)
      .eq('week_start_monday_et', weekStart)
      .maybeSingle();

    if (existing) {
      skippedAlreadySent += 1;
      continue;
    }

    const matches = await collectMatchesForProfile(admin, profile, bounds, newRows);
    if (matches.length < MIN_MATCHES) {
      skippedBelowThreshold += 1;
      continue;
    }

    sortByRelevance(matches);
    const topThree = matches.slice(0, 3);
    const email = await getEmail(uid);
    if (!email) {
      errors += 1;
      continue;
    }

    emailsAttempted += 1;

    const r = await sendWeeklyFreeDigestEmail({
      toEmail: email,
      firstName: profile.first_name,
      platformNewScholarships7d: platformNew7d,
      profileMatchNewCount: matches.length,
      topThree,
      premiumTeaser
    });

    if (!r.ok) {
      errors += 1;
      continue;
    }

    const { error: insErr } = await admin.from('weekly_free_digest_sent').insert({
      user_id: uid,
      week_start_monday_et: weekStart,
      match_count: matches.length,
      grant_ids: topThree.map((s) => s.id)
    });

    if (insErr) {
      if (insErr.code === '23505') skippedAlreadySent += 1;
      else {
        console.error('[weekly-free-digest] insert', insErr.message);
        errors += 1;
      }
      continue;
    }

    emailsSent += 1;
  }

  return {
    ok: true,
    weekStartMondayEt: weekStart,
    platformNew7d,
    profilesScanned: profiles.length,
    emailsAttempted,
    emailsSent,
    skippedAlreadySent,
    skippedBelowThreshold,
    errors
  };
}

export async function sendWeeklyFreeDigestPreview(
  toEmail: string,
  options?: { profileUserId?: string | null }
): Promise<{
  ok: boolean;
  skipped?: string;
  detail?: string;
}> {
  const adminRaw = createServiceRoleSupabaseClient();
  if (!adminRaw) {
    return { ok: false, skipped: 'Service role client unavailable' };
  }
  const admin = adminRaw;
  const sinceIso = new Date(Date.now() - LOOKBACK_MS).toISOString();

  const { count: platformCount } = await admin
    .from('scholarships')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .gte('created_at', sinceIso);

  const platformNew7d = platformCount ?? 0;

  const { data: newRowData } = await admin
    .from('scholarships')
    .select('*')
    .eq('is_active', true)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(MAX_NEW_SCAN);

  const newRowsFull = (newRowData ?? []) as unknown as ScholarshipRow[];
  if (newRowsFull.length === 0) {
    return {
      ok: false,
      skipped: 'No new scholarships in lookback window',
      detail: 'Nothing to preview'
    };
  }

  /** Preview must stay fast (hundreds of SQL checks, not tens of thousands). */
  const previewNewCap = Math.min(
    newRowsFull.length,
    Number(process.env.WEEKLY_FREE_DIGEST_PREVIEW_NEW_CAP?.trim() || '36') || 36
  );
  const previewProfileCap = Math.min(
    120,
    Number(process.env.WEEKLY_FREE_DIGEST_PREVIEW_PROFILE_CAP?.trim() || '10') || 10
  );
  const previewMinMatches = Math.min(
    MIN_MATCHES,
    Math.max(
      3,
      Number(process.env.WEEKLY_FREE_DIGEST_PREVIEW_MIN_MATCHES?.trim() || '8') || 8
    )
  );

  const onlyId = options?.profileUserId?.trim();
  const newRows = onlyId ? newRowsFull : newRowsFull.slice(0, previewNewCap);

  const bounds = await fetchGlobalFilterBounds(admin);
  const premiumTeaser = await loadPremiumTeaser(admin);
  if (onlyId) {
    const { data: one, error: oneErr } = await admin
      .from('profiles')
      .select('*')
      .eq('id', onlyId)
      .eq('email_weekly_free_digest', true)
      .eq('is_subscribed', false)
      .maybeSingle();

    if (oneErr || !one) {
      return {
        ok: false,
        skipped: 'Preview profile not found or not eligible',
        detail: oneErr?.message
      };
    }

    const matches = await collectMatchesForProfile(
      admin,
      one as ProfileRow,
      bounds,
      newRowsFull
    );
    if (matches.length < previewMinMatches) {
      return {
        ok: false,
        skipped: 'Preview profile has too few matches in sample',
        detail: `Need at least ${previewMinMatches} (preview threshold)`
      };
    }
    sortByRelevance(matches);
    const topThree = matches.slice(0, 3);
    return sendWeeklyFreeDigestEmail({
      toEmail: toEmail.trim(),
      firstName: (one as ProfileRow).first_name,
      platformNewScholarships7d: platformNew7d,
      profileMatchNewCount: matches.length,
      topThree,
      premiumTeaser
    });
  }

  const { data: profileRows } = await admin
    .from('profiles')
    .select('*')
    .eq('email_weekly_free_digest', true)
    .eq('is_subscribed', false)
    .order('created_at', { ascending: true })
    .limit(previewProfileCap);

  const profiles = (profileRows ?? []) as ProfileRow[];

  for (const profile of profiles) {
    const matches = await collectMatchesForProfile(admin, profile, bounds, newRows);
    if (matches.length < previewMinMatches) continue;
    sortByRelevance(matches);
    const topThree = matches.slice(0, 3);
    return sendWeeklyFreeDigestEmail({
      toEmail: toEmail.trim(),
      firstName: profile.first_name,
      platformNewScholarships7d: platformNew7d,
      profileMatchNewCount: matches.length,
      topThree,
      premiumTeaser
    });
  }

  return {
    ok: false,
    skipped: 'No qualifying free user for preview',
    detail: `Try WEEKLY_FREE_DIGEST_PREVIEW_USER_ID or lower WEEKLY_FREE_DIGEST_PREVIEW_MIN_MATCHES (now preview uses ${previewMinMatches})`
  };
}
