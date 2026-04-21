import 'server-only';

import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import {
  cloneMoreFilters,
  defaultMoreFiltersFromBounds
} from '@/app/scholarships/moreFilters';
import type { Database } from '@/types_db';
import { sendGrantDigestBatchEmail, type GrantDigestCategory } from '@/lib/email/sendGrantDigestEmail';
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
import { userHasSavedScholarship } from '@/lib/account/userSavedScholarships';
import { grantNotifyTelegramCardCategoryLabel } from '@/lib/notifications/grantNotificationPrefs';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';
import { sendScholarshipTelegramCardToChat } from '@/lib/telegram/scholarshipTelegramCard';

import type { SupabaseClient } from '@supabase/supabase-js';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ChannelId = 'best' | 'saved_filters' | 'easy_apply' | 'hot_deadlines';

const LOOKBACK_HOURS = Number(
  process.env.GRANT_NOTIFICATION_LOOKBACK_HOURS?.trim() || '24'
);
const MAX_SCHOLARSHIPS = Number(process.env.GRANT_NOTIFICATION_MAX_SCHOLARSHIPS?.trim() || '40');
const MAX_PROFILES = Number(process.env.GRANT_NOTIFICATION_MAX_PROFILES?.trim() || '500');
const MAX_OPS = Number(process.env.GRANT_NOTIFICATION_MAX_OPS?.trim() || '2500');
const EMAIL_COOLDOWN_HOURS = Math.max(
  1,
  Number(process.env.GRANT_NOTIFICATION_EMAIL_COOLDOWN_HOURS?.trim() || '24')
);
/** Max grant cards per single digest email (remaining matches stay queued for the next run). */
const GRANT_DIGEST_EMAIL_MAX_ITEMS = Math.max(
  1,
  Number(process.env.GRANT_DIGEST_EMAIL_MAX_ITEMS?.trim() || '4')
);

const CHANNEL_LABEL: Record<ChannelId, string> = {
  best: 'Best recommendation',
  saved_filters: 'Saved Filters',
  easy_apply: 'Easy apply',
  hot_deadlines: 'Hot Deadlines'
};

const EMAIL_CHANNEL_ORDER: ChannelId[] = ['best', 'easy_apply', 'hot_deadlines', 'saved_filters'];
const MAX_EMAIL_ITEMS_PER_TOPIC = 4;

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

async function userHasRecentEmailDelivery(
  admin: SupabaseClient<Database>,
  userId: string
): Promise<boolean> {
  const sinceIso = new Date(Date.now() - EMAIL_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from('grant_notification_deliveries')
    .select('id')
    .eq('user_id', userId)
    .eq('medium', 'email')
    .gte('created_at', sinceIso)
    .limit(1);
  if (error) {
    console.error('[grant-notify] recent-email-check', userId, error.message);
    return false;
  }
  return Array.isArray(data) && data.length > 0;
}

function viewAllUrlForChannel(origin: string, channel: ChannelId): string {
  const base = origin.replace(/\/+$/, '');
  switch (channel) {
    case 'best':
      return `${base}/scholarships?tab=best-recommendation`;
    case 'easy_apply':
      return `${base}/scholarships?tab=easy-apply`;
    case 'hot_deadlines':
      return `${base}/scholarships?tab=hot-deadlines`;
    case 'saved_filters':
      return `${base}/scholarships?tab=recommended`;
  }
}

export async function profileMatchesBest(
  admin: SupabaseClient<Database>,
  profile: ProfileRow,
  bounds: Awaited<ReturnType<typeof fetchGlobalFilterBounds>>,
  scholarshipId: string
): Promise<boolean> {
  const profileSeed = buildScholarshipProfileFilterSeed(profile);
  const mf = mergeBestRecommendationFiltersFromProfile(
    'best-recommendation',
    defaultMoreFiltersFromBounds(bounds),
    profileSeed,
    bounds
  );
  const req = scholarshipListRequestFromParts({
    page: 1,
    limit: 12,
    sort: 'best_match',
    tab: 'best-recommendation',
    q: '',
    deadline: 'any',
    moreFilters: mf
  });
  return scholarshipMatchesTabListSql(
    admin,
    req,
    'best-recommendation',
    scholarshipId
  );
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
  bottleneckHint?: string;
  diagnostics?: {
    profilesLoaded: number;
    telegramUsersLoaded: number;
    matchedPairs: number;
    emailCandidates: number;
    telegramCandidates: number;
    emailSkippedCooldownUsers: number;
    emailDigestAttempts: number;
    emailDigestFailed: number;
  };
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
  let matchedPairs = 0;
  let emailCandidates = 0;
  let telegramCandidates = 0;
  let emailSkippedCooldownUsers = 0;
  let emailDigestAttempts = 0;
  let emailDigestFailed = 0;

  const channels: ChannelId[] = ['best', 'saved_filters', 'easy_apply', 'hot_deadlines'];
  const savedGrantByUserScholarship = new Map<string, boolean>();

  type PendingEmailLine = {
    scholarshipId: string;
    scholarship: Scholarship;
    channel: ChannelId;
    firstName: string | null;
  };
  const pendingEmailByUser = new Map<string, PendingEmailLine[]>();
  const publicOrigin =
    process.env.NEXT_PUBLIC_SITE_URL?.trim()?.replace(/\/+$/, '') || 'https://scholarshiptop.com';

  console.log(
    '[grant-notify] config',
    JSON.stringify({
      lookbackHours: LOOKBACK_HOURS,
      maxScholarships: MAX_SCHOLARSHIPS,
      maxProfiles: MAX_PROFILES,
      maxOps: MAX_OPS,
      emailCooldownHours: EMAIL_COOLDOWN_HOURS,
      digestMaxItems: GRANT_DIGEST_EMAIL_MAX_ITEMS
    })
  );
  console.log(
    '[grant-notify] loaded',
    JSON.stringify({
      scholarships: scholarships.length,
      profiles: profiles.length,
      telegramUsers: telegramByUser.size
    })
  );

  for (let i = 0; i < scholarships.length; i++) {
    const s = scholarships[i]!;
    const sid = s.id;
    if (i === 0 || (i + 1) % 5 === 0) {
      console.log(
        '[grant-notify] progress',
        JSON.stringify({
          scholarshipIndex: i + 1,
          scholarshipsTotal: scholarships.length,
          currentScholarshipId: sid,
          ops,
          emailSent,
          telegramSent,
          skippedDup,
          errors
        })
      );
    }

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
      const savedKey = `${uid}:${sid}`;
      let savedInitially = savedGrantByUserScholarship.get(savedKey);
      if (savedInitially === undefined) {
        savedInitially = await userHasSavedScholarship(admin, uid, sid);
        savedGrantByUserScholarship.set(savedKey, savedInitially);
      }

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
        matchedPairs += 1;

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
            emailCandidates += 1;
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
          telegramCandidates += 1;
          const dupT = await alreadySent(admin, uid, sid, ch, 'telegram');
          if (dupT) {
            skippedDup += 1;
          } else {
            const ok = await sendScholarshipTelegramCardToChat(tg.telegram_chat_id, s, {
              categoryLabel: grantNotifyTelegramCardCategoryLabel(ch),
              savedInitially
            });
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
    const email = await getEmail(uid);
    if (!email) continue;
    if (await userHasRecentEmailDelivery(admin, uid)) {
      emailSkippedCooldownUsers += 1;
      continue;
    }

    const categories: GrantDigestCategory[] = EMAIL_CHANNEL_ORDER.map((channel) => {
      const categoryLines = lines.filter((line) => line.channel === channel);
      return {
        id: channel,
        label: CHANNEL_LABEL[channel],
        totalCount: categoryLines.length,
        viewAllUrl: viewAllUrlForChannel(publicOrigin, channel),
        items: categoryLines.slice(0, MAX_EMAIL_ITEMS_PER_TOPIC).map((line) => line.scholarship)
      };
    }).filter((c) => c.totalCount > 0 && c.items.length > 0);

    if (categories.length === 0) {
      const fallbackLines = lines.slice(0, GRANT_DIGEST_EMAIL_MAX_ITEMS);
      if (fallbackLines.length === 0) continue;
      categories.push({
        id: 'best',
        label: 'Matches',
        totalCount: fallbackLines.length,
        viewAllUrl: `${publicOrigin}/scholarships`,
        items: fallbackLines.map((line) => line.scholarship)
      });
    }

    emailDigestAttempts += 1;
    const r = await sendGrantDigestBatchEmail({
      toEmail: email,
      categories,
      firstName: lines[0]?.firstName ?? null
    });
    if (r.ok) {
      for (const line of lines) {
        await recordDelivery(admin, uid, line.scholarshipId, line.channel, 'email');
        emailSent += 1;
      }
    } else {
      errors += 1;
      emailDigestFailed += 1;
      console.error(
        '[grant-notify] digest-send-failed',
        JSON.stringify({
          userId: uid,
          toEmail: email,
          reason: r.skipped ?? 'unknown',
          lines: lines.length,
          categories: categories.map((c) => ({ id: c.id, totalCount: c.totalCount }))
        })
      );
    }
  }

  let bottleneckHint = '';
  if (cappedOps) bottleneckHint = 'MAX_OPS cap reached; increase limit or narrow audience.';
  else if (emailDigestFailed > 0) bottleneckHint = 'Email digest failures occurred; inspect sendGrantDigestBatchEmail reasons.';
  else if (emailSkippedCooldownUsers > 0 && emailSent === 0)
    bottleneckHint = 'Most email candidates skipped by cooldown window.';
  else if (matchedPairs === 0) bottleneckHint = 'No profile/scholarship matches found for enabled channels.';
  else if (telegramSent === 0 && emailSent === 0)
    bottleneckHint = 'Matches exist but all deliveries were duplicates or skipped.';
  else bottleneckHint = 'Dispatch completed with deliveries.';

  console.log(
    '[grant-notify] summary',
    JSON.stringify({
      scholarshipsConsidered: scholarships.length,
      profilesLoaded: profiles.length,
      telegramUsersLoaded: telegramByUser.size,
      matchedPairs,
      emailCandidates,
      telegramCandidates,
      emailDigestAttempts,
      emailSkippedCooldownUsers,
      emailSent,
      telegramSent,
      skippedDup,
      errors,
      cappedOps,
      bottleneckHint
    })
  );

  return {
    ok: true,
    scholarshipsConsidered: scholarships.length,
    emailSent,
    telegramSent,
    skippedDup,
    errors,
    cappedOps,
    bottleneckHint,
    diagnostics: {
      profilesLoaded: profiles.length,
      telegramUsersLoaded: telegramByUser.size,
      matchedPairs,
      emailCandidates,
      telegramCandidates,
      emailSkippedCooldownUsers,
      emailDigestAttempts,
      emailDigestFailed
    }
  };
}
