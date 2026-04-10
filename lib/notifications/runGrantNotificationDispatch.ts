import 'server-only';

import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import {
  cloneMoreFilters,
  defaultMoreFiltersFromBounds
} from '@/app/scholarships/moreFilters';
import type { Database } from '@/types_db';
import { sendGrantDigestBatchEmail } from '@/lib/email/sendGrantDigestEmail';
import {
  buildScholarshipProfileFilterSeed,
  mergeBestRecommendationFiltersFromProfile
} from '@/lib/scholarships/profileFilterDefaults';
import { moreFiltersFromJson, type MoreFiltersJson } from '@/lib/scholarships/scholarshipListApiCodec';
import {
  fetchGlobalFilterBounds,
  moreFiltersForRecommendedSidebarCount,
  scholarshipListRequestFromParts,
  scholarshipMatchesTabListSql,
  type ScholarshipListRequest
} from '@/lib/scholarships/scholarshipListServer';
import { mapScholarshipRow, type ScholarshipRow } from '@/lib/scholarships/supabase';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';
import { sendScholarshipTelegramCardToChat } from '@/lib/telegram/scholarshipTelegramCard';

import type { SupabaseClient } from '@supabase/supabase-js';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ChannelId = 'best' | 'saved_filters' | 'easy_apply' | 'hot_deadlines';

const LOOKBACK_HOURS = Number(
  process.env.GRANT_NOTIFICATION_LOOKBACK_HOURS?.trim() || '36'
);
const MAX_SCHOLARSHIPS = Number(process.env.GRANT_NOTIFICATION_MAX_SCHOLARSHIPS?.trim() || '40');
const MAX_PROFILES = Number(process.env.GRANT_NOTIFICATION_MAX_PROFILES?.trim() || '500');
const MAX_OPS = Number(process.env.GRANT_NOTIFICATION_MAX_OPS?.trim() || '2500');
/** Max grant cards per single digest email (remaining matches stay queued for the next run). */
const GRANT_DIGEST_EMAIL_MAX_ITEMS = Math.max(
  1,
  Number(process.env.GRANT_DIGEST_EMAIL_MAX_ITEMS?.trim() || '4')
);

const CHANNEL_LABEL: Record<ChannelId, string> = {
  best: 'Best recommendations',
  saved_filters: 'Saved filters',
  easy_apply: 'Easy apply',
  hot_deadlines: 'Hot deadlines'
};

function channelProfileColumn(c: ChannelId): keyof ProfileRow {
  switch (c) {
    case 'best':
      return 'email_notify_best_matches';
    case 'saved_filters':
      return 'email_notify_saved_filters';
    case 'easy_apply':
      return 'email_notify_easy_apply';
    case 'hot_deadlines':
      return 'email_notify_hot_deadlines';
  }
}

function telegramColumn(c: ChannelId): keyof Database['public']['Tables']['telegram_users']['Row'] {
  switch (c) {
    case 'best':
      return 'notify_best_matches';
    case 'saved_filters':
      return 'notify_saved_filters';
    case 'easy_apply':
      return 'notify_easy_apply';
    case 'hot_deadlines':
      return 'notify_hot_deadlines';
  }
}

async function alreadySent(
  admin: SupabaseClient<Database>,
  userId: string,
  scholarshipId: string,
  channel: ChannelId,
  medium: 'email' | 'telegram'
): Promise<boolean> {
  const { data } = await admin
    .from('grant_notification_deliveries')
    .select('id')
    .eq('user_id', userId)
    .eq('scholarship_id', scholarshipId)
    .eq('channel', channel)
    .eq('medium', medium)
    .maybeSingle();
  return data != null;
}

async function recordDelivery(
  admin: SupabaseClient<Database>,
  userId: string,
  scholarshipId: string,
  channel: ChannelId,
  medium: 'email' | 'telegram'
): Promise<void> {
  const { error } = await admin.from('grant_notification_deliveries').insert({
    user_id: userId,
    scholarship_id: scholarshipId,
    channel,
    medium
  });
  if (error && error.code !== '23505') {
    console.error('[grant-notify] delivery insert', error.message);
  }
}

async function profileMatchesBest(
  admin: SupabaseClient<Database>,
  profile: ProfileRow,
  bounds: Awaited<ReturnType<typeof fetchGlobalFilterBounds>>,
  scholarshipId: string
): Promise<boolean> {
  const seed = buildScholarshipProfileFilterSeed(profile);
  const mf = mergeBestRecommendationFiltersFromProfile(
    'best-matches',
    defaultMoreFiltersFromBounds(bounds),
    seed,
    bounds
  );
  const req = scholarshipListRequestFromParts({
    page: 1,
    limit: 12,
    sort: 'best_match',
    tab: 'best-matches',
    q: '',
    deadline: 'any',
    moreFilters: mf
  });
  return scholarshipMatchesTabListSql(admin, req, 'best-matches', scholarshipId);
}

async function profileMatchesSavedFilters(
  admin: SupabaseClient<Database>,
  profile: ProfileRow,
  bounds: Awaited<ReturnType<typeof fetchGlobalFilterBounds>>,
  scholarshipId: string
): Promise<boolean> {
  const raw = profile.saved_filters_snapshot;
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const snap = moreFiltersFromJson(raw as MoreFiltersJson, bounds);
  const draftReq: ScholarshipListRequest = {
    ...scholarshipListRequestFromParts({
      page: 1,
      limit: 12,
      sort: 'best_match',
      tab: 'recommended',
      q: '',
      deadline: 'any',
      moreFilters: defaultMoreFiltersFromBounds(bounds)
    }),
    personalizedProfile: profile,
    savedFiltersSnapshot: snap
  };
  const mf = moreFiltersForRecommendedSidebarCount(draftReq, bounds);
  if (mf === null) return false;
  const finalReq: ScholarshipListRequest = {
    ...draftReq,
    moreFilters: mf,
    tab: 'recommended'
  };
  return scholarshipMatchesTabListSql(admin, finalReq, 'recommended', scholarshipId);
}

export type GrantNotificationDispatchResult = {
  ok: boolean;
  scholarshipsConsidered: number;
  emailSent: number;
  telegramSent: number;
  skippedDup: number;
  errors: number;
  cappedOps: boolean;
  message?: string;
};

export async function runGrantNotificationDispatch(): Promise<GrantNotificationDispatchResult> {
  const adminRaw = createServiceRoleSupabaseClient();
  if (!adminRaw) {
    return {
      ok: false,
      scholarshipsConsidered: 0,
      emailSent: 0,
      telegramSent: 0,
      skippedDup: 0,
      errors: 0,
      cappedOps: false,
      message: 'Service role client unavailable'
    };
  }
  const admin = adminRaw;

  const bounds = await fetchGlobalFilterBounds(admin);
  const mfBase = defaultMoreFiltersFromBounds(bounds);

  const easyReq = scholarshipListRequestFromParts({
    page: 1,
    limit: 12,
    sort: 'most_recent',
    tab: 'easy-apply',
    q: '',
    deadline: 'any',
    moreFilters: cloneMoreFilters(mfBase)
  });

  const hotReq = scholarshipListRequestFromParts({
    page: 1,
    limit: 12,
    sort: 'closest_deadline',
    tab: 'hot-deadlines',
    q: '',
    deadline: 'any',
    moreFilters: cloneMoreFilters(mfBase)
  });

  const sinceIso = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();

  const { data: scholarshipRows, error: schErr } = await admin
    .from('scholarships')
    .select('*')
    .eq('is_active', true)
    .or(`created_at.gte.${sinceIso},updated_at.gte.${sinceIso}`)
    .order('updated_at', { ascending: false })
    .limit(MAX_SCHOLARSHIPS);

  if (schErr) {
    return {
      ok: false,
      scholarshipsConsidered: 0,
      emailSent: 0,
      telegramSent: 0,
      skippedDup: 0,
      errors: 1,
      cappedOps: false,
      message: schErr.message
    };
  }

  const rows = (scholarshipRows ?? []) as unknown as ScholarshipRow[];
  const scholarships = rows.map((r) => mapScholarshipRow(r));

  const { data: profileRows } = await admin
    .from('profiles')
    .select('*')
    .or(
      'email_notify_best_matches.eq.true,email_notify_saved_filters.eq.true,email_notify_easy_apply.eq.true,email_notify_hot_deadlines.eq.true'
    )
    .order('updated_at', { ascending: false })
    .limit(MAX_PROFILES);

  const profiles = (profileRows ?? []) as ProfileRow[];

  const { data: tgRows } = await admin
    .from('telegram_users')
    .select('*')
    .not('app_user_id', 'is', null)
    .or(
      'notify_best_matches.eq.true,notify_saved_filters.eq.true,notify_easy_apply.eq.true,notify_hot_deadlines.eq.true'
    );

  type TgRow = Database['public']['Tables']['telegram_users']['Row'];
  const telegramByUser = new Map<string, TgRow>();
  for (const t of tgRows ?? []) {
    if (t.app_user_id) telegramByUser.set(t.app_user_id, t);
  }

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

  let emailSent = 0;
  let telegramSent = 0;
  let skippedDup = 0;
  let errors = 0;
  let ops = 0;
  let cappedOps = false;

  const channels: ChannelId[] = ['easy_apply', 'hot_deadlines', 'best', 'saved_filters'];

  type PendingEmailLine = {
    scholarshipId: string;
    scholarship: Scholarship;
    channel: ChannelId;
    firstName: string | null;
  };
  const pendingEmailByUser = new Map<string, PendingEmailLine[]>();

  for (let i = 0; i < scholarships.length; i++) {
    const s = scholarships[i]!;
    const sid = s.id;

    let easyOk = false;
    let hotOk = false;
    try {
      easyOk = await scholarshipMatchesTabListSql(admin, easyReq, 'easy-apply', sid);
      hotOk = await scholarshipMatchesTabListSql(admin, hotReq, 'hot-deadlines', sid);
    } catch (e) {
      errors += 1;
      console.error('[grant-notify] tab precalc', sid, e);
      continue;
    }

    for (const profile of profiles) {
      const uid = profile.id;

      for (const ch of channels) {
        const profCol = channelProfileColumn(ch);
        if (!profile[profCol]) continue;

        if (ch === 'easy_apply' && !easyOk) continue;
        if (ch === 'hot_deadlines' && !hotOk) continue;

        let match = false;
        try {
          if (ch === 'best') {
            match = await profileMatchesBest(admin, profile, bounds, sid);
          } else if (ch === 'saved_filters') {
            match = await profileMatchesSavedFilters(admin, profile, bounds, sid);
          } else {
            match = true;
          }
        } catch (e) {
          errors += 1;
          console.error('[grant-notify] match', uid, sid, ch, e);
          continue;
        }

        if (!match) continue;

        ops += 1;
        if (ops > MAX_OPS) {
          cappedOps = true;
          break;
        }

        const email = await getEmail(uid);
        if (email) {
          const dup = await alreadySent(admin, uid, sid, ch, 'email');
          if (dup) {
            skippedDup += 1;
          } else {
            let lines = pendingEmailByUser.get(uid);
            if (!lines) {
              lines = [];
              pendingEmailByUser.set(uid, lines);
            }
            lines.push({
              scholarshipId: sid,
              scholarship: s,
              channel: ch,
              firstName: profile.first_name ?? null
            });
          }
        }

        const tg = telegramByUser.get(uid);
        if (tg && tg[telegramColumn(ch)]) {
          const dupT = await alreadySent(admin, uid, sid, ch, 'telegram');
          if (dupT) {
            skippedDup += 1;
          } else {
            const ok = await sendScholarshipTelegramCardToChat(tg.telegram_chat_id, s);
            if (ok) {
              await recordDelivery(admin, uid, sid, ch, 'telegram');
              telegramSent += 1;
            } else {
              errors += 1;
            }
          }
        }
      }

      if (cappedOps) break;
    }

    if (cappedOps) break;
  }

  for (const [uid, lines] of pendingEmailByUser) {
    let remaining = lines;
    while (remaining.length > 0) {
      const email = await getEmail(uid);
      if (!email) break;

      const slice = remaining.slice(0, GRANT_DIGEST_EMAIL_MAX_ITEMS);
      remaining = remaining.slice(GRANT_DIGEST_EMAIL_MAX_ITEMS);

      const r = await sendGrantDigestBatchEmail({
        toEmail: email,
        items: slice.map((line) => ({
          scholarship: line.scholarship,
          channelLabel: CHANNEL_LABEL[line.channel]
        })),
        firstName: slice[0]?.firstName ?? null
      });
      if (r.ok) {
        for (const line of slice) {
          await recordDelivery(admin, uid, line.scholarshipId, line.channel, 'email');
          emailSent += 1;
        }
      } else {
        errors += 1;
        break;
      }
    }
  }

  return {
    ok: true,
    scholarshipsConsidered: scholarships.length,
    emailSent,
    telegramSent,
    skippedDup,
    errors,
    cappedOps
  };
}
