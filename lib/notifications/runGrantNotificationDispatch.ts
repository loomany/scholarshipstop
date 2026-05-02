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
import { createGrantDigestToken } from '@/lib/notifications/grantDigestToken';
import { applyProfileMatchPercentToScholarships } from '@/lib/scholarships/profileMatchBadge';
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

const EMAIL_DIGEST_MIN_MATCH_PERCENT = 50;

function createChannelCounts(): Record<ChannelId, number> {
  return {
    best: 0,
    saved_filters: 0,
    easy_apply: 0,
    hot_deadlines: 0
  };
}

function incrementChannelCount(counts: Record<ChannelId, number>, channel: ChannelId): void {
  counts[channel] += 1;
}

function logGrantNotify(event: string, payload: Record<string, unknown>): void {
  console.log(`[grant-notify] ${event}`, JSON.stringify(payload));
}

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

function scoreForEmailOrdering(s: Scholarship): number {
  const match = typeof s.profileMatchPercent === 'number' ? s.profileMatchPercent : 0;
  const updatedAtMs = s.updatedAt ? Date.parse(s.updatedAt) : 0;
  return match * 100_000_000 + (Number.isFinite(updatedAtMs) ? updatedAtMs : 0);
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
    freshSelected: number;
    tailSelected: number;
    fallbackUsers: number;
  };
  message?: string;
};

export async function runGrantNotificationDispatch(): Promise<GrantNotificationDispatchResult> {
  const dispatchStartedAtMs = Date.now();
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

  logGrantNotify('init', {
    lookbackHours: LOOKBACK_HOURS,
    sinceIso: new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString()
  });

  const bounds = await fetchGlobalFilterBounds(admin);
  logGrantNotify('bounds-loaded', {
    elapsedMs: Date.now() - dispatchStartedAtMs
  });
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

  const { data: tgRows, error: tgErr } = await admin
    .from('telegram_users')
    .select('*')
    .not('app_user_id', 'is', null)
    .or(
      'notify_best_matches.eq.true,notify_saved_filters.eq.true,notify_easy_apply.eq.true,notify_hot_deadlines.eq.true'
    );

  logGrantNotify('telegram-users-query', {
    rows: tgRows?.length ?? 0,
    error: tgErr?.message ?? null,
    elapsedMs: Date.now() - dispatchStartedAtMs
  });

  type TgRow = Database['public']['Tables']['telegram_users']['Row'];
  const telegramByUser = new Map<string, TgRow>();
  for (const t of tgRows ?? []) {
    if (t.app_user_id) telegramByUser.set(t.app_user_id, t);
  }

  const { data: profileRows, error: profileErr } = await admin
    .from('profiles')
    .select('*')
    .or(
      'email_notify_best_matches.eq.true,email_notify_saved_filters.eq.true,email_notify_easy_apply.eq.true,email_notify_hot_deadlines.eq.true'
    )
    .order('updated_at', { ascending: false })
    .limit(MAX_PROFILES);

  logGrantNotify('profiles-query', {
    rows: profileRows?.length ?? 0,
    error: profileErr?.message ?? null,
    elapsedMs: Date.now() - dispatchStartedAtMs
  });

  const profileById = new Map<string, ProfileRow>();
  for (const profile of (profileRows ?? []) as ProfileRow[]) {
    profileById.set(profile.id, profile);
  }

  const telegramOnlyProfileIds = Array.from(telegramByUser.keys())
    .filter((userId) => !profileById.has(userId))
    .slice(0, MAX_PROFILES);
  if (telegramOnlyProfileIds.length > 0) {
    const { data: telegramProfileRows, error: telegramProfileErr } = await admin
      .from('profiles')
      .select('*')
      .in('id', telegramOnlyProfileIds);
    if (telegramProfileErr) {
      console.error('[grant-notify] telegram profile load', telegramProfileErr.message);
    }
    for (const profile of (telegramProfileRows ?? []) as ProfileRow[]) {
      profileById.set(profile.id, profile);
    }
    logGrantNotify('telegram-only-profiles-query', {
      requested: telegramOnlyProfileIds.length,
      loaded: telegramProfileRows?.length ?? 0
    });
  }

  const profiles = Array.from(profileById.values());

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
  let freshSelected = 0;
  let tailSelected = 0;
  let fallbackUsers = 0;
  let missingEmailUsers = 0;
  let emailDup = 0;
  let telegramDup = 0;
  let telegramFailed = 0;
  let emailDigestSentUsers = 0;
  let emailDigestSkippedUnsubscribed = 0;

  const matchedByChannel = createChannelCounts();
  const emailCandidatesByChannel = createChannelCounts();
  const telegramCandidatesByChannel = createChannelCounts();

  const channels: ChannelId[] = ['best', 'saved_filters', 'easy_apply', 'hot_deadlines'];
  const savedGrantByUserScholarship = new Map<string, boolean>();

  type PendingEmailLine = {
    scholarshipId: string;
    scholarship: Scholarship;
    channel: ChannelId;
    firstName: string | null;
  };
  const pendingEmailByUser = new Map<string, PendingEmailLine[]>();
  const scoredScholarshipCache = new Map<string, Map<string, Scholarship>>();
  const publicOrigin =
    process.env.NEXT_PUBLIC_SITE_URL?.trim()?.replace(/\/+$/, '') || 'https://scholarshiptop.com';

  function getScoredScholarshipForUser(
    profile: ProfileRow,
    scholarship: Scholarship
  ): Scholarship {
    let userCache = scoredScholarshipCache.get(profile.id);
    if (!userCache) {
      userCache = new Map<string, Scholarship>();
      scoredScholarshipCache.set(profile.id, userCache);
    }
    const cached = userCache.get(scholarship.id);
    if (cached) return cached;
    const scored =
      applyProfileMatchPercentToScholarships([scholarship], profile)[0] ?? scholarship;
    userCache.set(scholarship.id, scored);
    return scored;
  }

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
    const scholarshipStartedAtMs = Date.now();
    const beforeMatchedPairs = matchedPairs;
    const beforeEmailCandidates = emailCandidates;
    const beforeTelegramCandidates = telegramCandidates;
    const beforeEmailSent = emailSent;
    const beforeTelegramSent = telegramSent;
    const beforeSkippedDup = skippedDup;
    const beforeErrors = errors;
    logGrantNotify('scholarship-start', {
      scholarshipIndex: i + 1,
      scholarshipsTotal: scholarships.length,
      scholarshipId: sid,
      title: s.title?.slice(0, 120) ?? null,
      updatedAt: s.updatedAt ?? null
    });
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
      logGrantNotify('tab-precalc', {
        scholarshipId: sid,
        easyApply: easyOk,
        hotDeadlines: hotOk,
        elapsedMs: Date.now() - scholarshipStartedAtMs
      });
    } catch (e) {
      errors += 1;
      console.error('[grant-notify] tab precalc', sid, e);
      continue;
    }

    for (const profile of profiles) {
      const uid = profile.id;
      const tg = telegramByUser.get(uid);
      const savedKey = `${uid}:${sid}`;
      let savedInitially = savedGrantByUserScholarship.get(savedKey);
      if (savedInitially === undefined) {
        savedInitially = await userHasSavedScholarship(admin, uid, sid);
        savedGrantByUserScholarship.set(savedKey, savedInitially);
      }

      for (const ch of channels) {
        const profCol = channelProfileColumn(ch);
        const wantsEmail = Boolean(profile[profCol]);
        const wantsTelegram = Boolean(tg?.[telegramColumn(ch)]);
        if (!wantsEmail && !wantsTelegram) continue;

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
        incrementChannelCount(matchedByChannel, ch);

        ops += 1;
        if (ops > MAX_OPS) {
          cappedOps = true;
          break;
        }

        if (wantsEmail) {
          const email = await getEmail(uid);
          if (email) {
            const dup = await alreadySent(admin, uid, sid, ch, 'email');
            if (dup) {
              skippedDup += 1;
              emailDup += 1;
            } else {
              emailCandidates += 1;
              incrementChannelCount(emailCandidatesByChannel, ch);
              let lines = pendingEmailByUser.get(uid);
              if (!lines) {
                lines = [];
                pendingEmailByUser.set(uid, lines);
              }
              lines.push({
                scholarshipId: sid,
                scholarship: getScoredScholarshipForUser(profile, s),
                channel: ch,
                firstName: profile.first_name ?? null
              });
            }
          } else {
            missingEmailUsers += 1;
          }
        }

        if (tg && wantsTelegram) {
          telegramCandidates += 1;
          incrementChannelCount(telegramCandidatesByChannel, ch);
          const dupT = await alreadySent(admin, uid, sid, ch, 'telegram');
          if (dupT) {
            skippedDup += 1;
            telegramDup += 1;
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
              telegramFailed += 1;
            }
          }
        }
      }

      if (cappedOps) break;
    }

    logGrantNotify('scholarship-summary', {
      scholarshipIndex: i + 1,
      scholarshipsTotal: scholarships.length,
      scholarshipId: sid,
      matchedPairs: matchedPairs - beforeMatchedPairs,
      emailCandidates: emailCandidates - beforeEmailCandidates,
      telegramCandidates: telegramCandidates - beforeTelegramCandidates,
      emailSent: emailSent - beforeEmailSent,
      telegramSent: telegramSent - beforeTelegramSent,
      skippedDup: skippedDup - beforeSkippedDup,
      errors: errors - beforeErrors,
      ops,
      cappedOps,
      elapsedMs: Date.now() - scholarshipStartedAtMs
    });

    if (cappedOps) break;
  }

  logGrantNotify('matching-complete', {
    matchedPairs,
    matchedByChannel,
    emailCandidates,
    emailCandidatesByChannel,
    telegramCandidates,
    telegramCandidatesByChannel,
    pendingEmailUsers: pendingEmailByUser.size,
    missingEmailUsers,
    emailDup,
    telegramDup,
    telegramFailed,
    ops,
    cappedOps,
    elapsedMs: Date.now() - dispatchStartedAtMs
  });

  for (const profile of profiles) {
    const uid = profile.id;
    const hasAnyEmailChannel =
      Boolean(profile.email_notify_best_matches) ||
      Boolean(profile.email_notify_saved_filters) ||
      Boolean(profile.email_notify_easy_apply) ||
      Boolean(profile.email_notify_hot_deadlines);
    if (!hasAnyEmailChannel) continue;
    const existing = pendingEmailByUser.get(uid);
    if (existing && existing.length > 0) continue;

    const fallbackLines: PendingEmailLine[] = applyProfileMatchPercentToScholarships(
      scholarships,
      profile
    )
      .filter((s) => {
        const p = typeof s.profileMatchPercent === 'number' ? s.profileMatchPercent : 0;
        return p >= EMAIL_DIGEST_MIN_MATCH_PERCENT;
      })
      .sort((a, b) => scoreForEmailOrdering(b) - scoreForEmailOrdering(a))
      .slice(0, Math.max(12, GRANT_DIGEST_EMAIL_MAX_ITEMS))
      .map((s) => ({
        scholarshipId: s.id,
        scholarship: s,
        channel: 'best' as const,
        firstName: profile.first_name ?? null
      }));

    if (fallbackLines.length > 0) {
      pendingEmailByUser.set(uid, fallbackLines);
      fallbackUsers += 1;
    }
  }

  logGrantNotify('fallback-complete', {
    fallbackUsers,
    pendingEmailUsers: pendingEmailByUser.size,
    elapsedMs: Date.now() - dispatchStartedAtMs
  });

  for (const [uid, lines] of pendingEmailByUser) {
    const email = await getEmail(uid);
    if (!email) continue;
    if (await userHasRecentEmailDelivery(admin, uid)) {
      emailSkippedCooldownUsers += 1;
      logGrantNotify('digest-skip-cooldown', {
        userId: uid,
        queuedLines: lines.length
      });
      continue;
    }

    const historySinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentHistoryRows } = await admin
      .from('grant_notification_deliveries')
      .select('scholarship_id')
      .eq('user_id', uid)
      .eq('medium', 'email')
      .gte('created_at', historySinceIso);
    const seenScholarshipIds = new Set(
      (recentHistoryRows ?? []).map((row) => row.scholarship_id)
    );

    const byScholarship = new Map<string, PendingEmailLine>();
    for (const line of lines) {
      const prev = byScholarship.get(line.scholarshipId);
      if (!prev || scoreForEmailOrdering(line.scholarship) > scoreForEmailOrdering(prev.scholarship)) {
        byScholarship.set(line.scholarshipId, line);
      }
    }
    const uniqueLines = Array.from(byScholarship.values());
    if (uniqueLines.length === 0) continue;
    const fresh = uniqueLines
      .filter((line) => !seenScholarshipIds.has(line.scholarshipId))
      .sort((a, b) => scoreForEmailOrdering(b.scholarship) - scoreForEmailOrdering(a.scholarship));
    const tail = uniqueLines
      .filter((line) => seenScholarshipIds.has(line.scholarshipId))
      .sort((a, b) => scoreForEmailOrdering(b.scholarship) - scoreForEmailOrdering(a.scholarship));

    const selectedLines = [...fresh.slice(0, GRANT_DIGEST_EMAIL_MAX_ITEMS)];
    if (selectedLines.length < GRANT_DIGEST_EMAIL_MAX_ITEMS) {
      selectedLines.push(...tail.slice(0, GRANT_DIGEST_EMAIL_MAX_ITEMS - selectedLines.length));
    }
    if (selectedLines.length === 0) continue;

    freshSelected += Math.min(fresh.length, GRANT_DIGEST_EMAIL_MAX_ITEMS);
    tailSelected += Math.max(0, selectedLines.length - Math.min(fresh.length, GRANT_DIGEST_EMAIL_MAX_ITEMS));

    const rankedIds = [...fresh, ...tail].map((line) => line.scholarshipId);
    const token = createGrantDigestToken(rankedIds);
    const digestViewAllUrl = token
      ? `${publicOrigin}/scholarships/email-digest/${encodeURIComponent(token)}`
      : `${publicOrigin}/scholarships?tab=best-recommendation&scope=catalog&sort=best_recommendation`;

    const categories: GrantDigestCategory[] = [
      {
        id: 'best',
        label: 'Best recommendation',
        totalCount: rankedIds.length,
        viewAllUrl: digestViewAllUrl,
        items: selectedLines.map((line) => line.scholarship)
      }
    ];

    emailDigestAttempts += 1;
    logGrantNotify('digest-send-start', {
      userId: uid,
      queuedLines: lines.length,
      uniqueLines: uniqueLines.length,
      selectedLines: selectedLines.length,
      fresh: fresh.length,
      tail: tail.length,
      rankedIds: rankedIds.length
    });
    const r = await sendGrantDigestBatchEmail({
      toEmail: email,
      categories,
      firstName: selectedLines[0]?.firstName ?? null
    });
    if (!r.ok) {
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
    } else if (r.skipped !== 'unsubscribed') {
      for (const line of selectedLines) {
        await recordDelivery(admin, uid, line.scholarshipId, line.channel, 'email');
        emailSent += 1;
      }
      emailDigestSentUsers += 1;
      logGrantNotify('digest-send-ok', {
        userId: uid,
        selectedLines: selectedLines.length,
        emailSent
      });
    } else {
      emailDigestSkippedUnsubscribed += 1;
      logGrantNotify('digest-skip-unsubscribed', {
        userId: uid,
        selectedLines: selectedLines.length
      });
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
      missingEmailUsers,
      freshSelected,
      tailSelected,
      fallbackUsers,
      matchedByChannel,
      emailCandidatesByChannel,
      telegramCandidatesByChannel,
      emailDup,
      telegramDup,
      telegramFailed,
      emailDigestSentUsers,
      emailDigestSkippedUnsubscribed,
      emailSent,
      telegramSent,
      skippedDup,
      errors,
      cappedOps,
      bottleneckHint,
      elapsedMs: Date.now() - dispatchStartedAtMs
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
      emailDigestFailed,
      freshSelected,
      tailSelected,
      fallbackUsers
    }
  };
}
