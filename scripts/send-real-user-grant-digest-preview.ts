/**
 * Send a production-style daily grant digest for one real user profile.
 *
 * Safe for manual QA: this sends only to the requested email and does not run
 * the global cron dispatcher.
 *
 * Usage:
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/send-real-user-grant-digest-preview.ts user@email.com
 */

import { createClient } from '@supabase/supabase-js';

import type { Scholarship } from '../app/scholarships/scholarshipsData';
import {
  sendGrantDigestBatchEmail,
  type GrantDigestCategory
} from '../lib/email/sendGrantDigestEmail';
import { createGrantDigestToken } from '../lib/notifications/grantDigestToken';
import {
  profileMatchesBest,
  profileMatchesSavedFilters
} from '../lib/notifications/runGrantNotificationDispatch';
import { applyProfileMatchPercentToScholarships } from '../lib/scholarships/profileMatchBadge';
import { preferredHostCountryCodesFromProfileJson } from '../lib/scholarships/profilePreferredHostCountries';
import {
  fetchGlobalFilterBounds,
  scholarshipListRequestFromParts,
  scholarshipMatchesTabListSql
} from '../lib/scholarships/scholarshipListServer';
import { mapScholarshipRow, type ScholarshipRow } from '../lib/scholarships/supabase';
import { cloneMoreFilters, defaultMoreFiltersFromBounds } from '../app/scholarships/moreFilters';
import type { Database } from '../types_db';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

const emailArg = process.argv[2]?.trim().toLowerCase();
if (!emailArg) {
  console.error('Usage: npx tsx scripts/send-real-user-grant-digest-preview.ts <email>');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const admin = createClient<Database>(url, serviceKey);

function score(s: Scholarship): number {
  const match = typeof s.profileMatchPercent === 'number' ? s.profileMatchPercent : 0;
  const updatedAtMs = s.updatedAt ? Date.parse(s.updatedAt) : 0;
  return match * 100_000_000 + (Number.isFinite(updatedAtMs) ? updatedAtMs : 0);
}

function profileCountry(profile: ProfileRow): string | null {
  const code = profile.country_code?.trim().toUpperCase();
  return code && /^[A-Z]{2}$/.test(code) ? code : null;
}

function hasCountry(codes: string[] | undefined, country: string): boolean {
  return Boolean(codes?.some((code) => code.trim().toUpperCase() === country));
}

function matchesIntent(s: Scholarship, profile: ProfileRow): boolean {
  const country = profileCountry(profile);
  if (!country || !hasCountry(s.applicantCountryCodes, country)) return false;

  const preferredHosts = preferredHostCountryCodesFromProfileJson(
    profile.preferred_host_country_codes
  );
  if (preferredHosts.length === 0) return true;
  return Boolean(
    s.hostCountryCodes?.some((code) => preferredHosts.includes(code.trim().toUpperCase()))
  );
}

function matchesStudyAbroadIntent(s: Scholarship, profile: ProfileRow): boolean {
  const country = profileCountry(profile);
  if (!country || !hasCountry(s.applicantCountryCodes, country)) return false;

  const preferredHosts = preferredHostCountryCodesFromProfileJson(
    profile.preferred_host_country_codes
  );
  return Boolean(
    s.hostCountryCodes?.some((code) => {
      const normalized = code.trim().toUpperCase();
      if (!/^[A-Z]{2}$/.test(normalized) || normalized === country) return false;
      return preferredHosts.length === 0 || preferredHosts.includes(normalized);
    })
  );
}

function hasHostCountry(s: Scholarship, country: string): boolean {
  return Boolean(s.hostCountryCodes?.some((code) => code.trim().toUpperCase() === country));
}

function isInternationalFriendly(s: Scholarship): boolean {
  if (s.internationalFriendlyListing) return true;
  if ((s.applicantCountryCodes?.length ?? 0) >= 3) return true;
  return s.locationScope?.trim().toLowerCase() === 'global';
}

function uniqueById(items: Scholarship[]): Scholarship[] {
  const seen = new Set<string>();
  const out: Scholarship[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function takeCategory(
  id: GrantDigestCategory['id'],
  label: string,
  items: Scholarship[],
  limit: number,
  viewAllUrl: string,
  usedIds: Set<string>
): GrantDigestCategory | null {
  const unique = uniqueById(items)
    .filter((item) => !usedIds.has(item.id))
    .sort((a, b) => score(b) - score(a));
  const selected = unique.slice(0, limit);
  for (const item of selected) usedIds.add(item.id);
  if (selected.length === 0) return null;
  return {
    id,
    label,
    totalCount: unique.length,
    viewAllUrl,
    items: selected
  };
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((user) => (user.email ?? '').toLowerCase() === email);
    if (found) return found.id;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function recentlyShownScholarshipIds(userId: string): Promise<Set<string>> {
  const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [deliveries, digestItems] = await Promise.all([
    admin
      .from('grant_notification_deliveries')
      .select('scholarship_id')
      .eq('user_id', userId)
      .eq('medium', 'email')
      .gte('created_at', sinceIso),
    admin
      .from('grant_email_digest_items')
      .select('scholarship_id')
      .eq('user_id', userId)
      .gte('created_at', sinceIso)
  ]);

  if (deliveries.error) throw deliveries.error;
  if (digestItems.error && digestItems.error.code !== 'PGRST205') throw digestItems.error;

  return new Set([
    ...(deliveries.data ?? []).map((row) => row.scholarship_id),
    ...(digestItems.data ?? []).map((row) => row.scholarship_id)
  ]);
}

async function main() {
  const userId = await findUserIdByEmail(emailArg);
  if (!userId) {
    console.error(`No auth user found for email: ${emailArg}`);
    process.exit(1);
  }

  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (profileErr || !profile) {
    console.error('Profile load failed:', profileErr?.message ?? 'missing profile');
    process.exit(1);
  }

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

  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [recentRows, fallbackRows, seenIds] = await Promise.all([
    admin
      .from('scholarships')
      .select('*')
      .eq('is_active', true)
      .or(`created_at.gte.${sinceIso},updated_at.gte.${sinceIso}`)
      .order('updated_at', { ascending: false })
      .limit(80),
    admin
      .from('scholarships')
      .select('*')
      .eq('is_active', true)
      .order('ranking_score', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
      .limit(160),
    recentlyShownScholarshipIds(userId)
  ]);

  if (recentRows.error) throw recentRows.error;
  if (fallbackRows.error) throw fallbackRows.error;

  const recent = ((recentRows.data ?? []) as unknown as ScholarshipRow[]).map(mapScholarshipRow);
  const fallbackPool = ((fallbackRows.data ?? []) as unknown as ScholarshipRow[]).map(
    mapScholarshipRow
  );

  const best: Scholarship[] = [];
  const saved: Scholarship[] = [];
  const easy: Scholarship[] = [];
  const hot: Scholarship[] = [];

  for (const scholarship of recent) {
    if (seenIds.has(scholarship.id)) continue;
    const scored =
      applyProfileMatchPercentToScholarships([scholarship], profile)[0] ?? scholarship;

    if (
      profile.email_notify_best_matches &&
      (await profileMatchesBest(admin, profile, bounds, scholarship.id))
    ) {
      best.push(scored);
    }
    if (
      profile.email_notify_saved_filters &&
      (await profileMatchesSavedFilters(admin, profile, bounds, scholarship.id))
    ) {
      saved.push(scored);
    }
    if (
      profile.email_notify_easy_apply &&
      matchesIntent(scored, profile) &&
      (await scholarshipMatchesTabListSql(admin, easyReq, 'easy-apply', scholarship.id))
    ) {
      easy.push(scored);
    }
    if (
      profile.email_notify_hot_deadlines &&
      matchesIntent(scored, profile) &&
      (await scholarshipMatchesTabListSql(admin, hotReq, 'hot-deadlines', scholarship.id))
    ) {
      hot.push(scored);
    }
  }

  const usedIds = new Set([
    ...best.map((s) => s.id),
    ...saved.map((s) => s.id),
    ...easy.map((s) => s.id),
    ...hot.map((s) => s.id)
  ]);
  const recommended = applyProfileMatchPercentToScholarships(fallbackPool, profile)
    .filter((s) => !seenIds.has(s.id) && !usedIds.has(s.id))
    .filter((s) => matchesStudyAbroadIntent(s, profile))
    .sort((a, b) => score(b) - score(a));

  const selectedBest = uniqueById(best).sort((a, b) => score(b) - score(a)).slice(0, 2);
  const selectedRecommended = uniqueById(recommended).slice(0, 2);
  const selectedSaved = uniqueById(saved).sort((a, b) => score(b) - score(a)).slice(0, 4);
  const selectedEasy = uniqueById(easy).sort((a, b) => score(b) - score(a)).slice(0, 4);
  const selectedHot = uniqueById(hot).sort((a, b) => score(b) - score(a)).slice(0, 4);

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.trim()?.replace(/\/+$/, '') || 'https://scholarshiptop.com';
  const fallbackViewAllUrl = `${origin}/scholarships`;

  let categories: GrantDigestCategory[] = [
    {
      id: 'best',
      label: 'Best recommendations',
      totalCount: best.length,
      viewAllUrl: fallbackViewAllUrl,
      items: selectedBest
    },
    {
      id: 'recommended',
      label: 'Recommended for you',
      totalCount: recommended.length,
      viewAllUrl: fallbackViewAllUrl,
      items: selectedRecommended
    },
    {
      id: 'saved_filters',
      label: 'Saved filters',
      totalCount: saved.length,
      viewAllUrl: fallbackViewAllUrl,
      items: selectedSaved
    },
    {
      id: 'easy_apply',
      label: 'Easy apply',
      totalCount: easy.length,
      viewAllUrl: fallbackViewAllUrl,
      items: selectedEasy
    },
    {
      id: 'hot_deadlines',
      label: 'Hot deadlines',
      totalCount: hot.length,
      viewAllUrl: fallbackViewAllUrl,
      items: selectedHot
    }
  ].filter((category) => category.totalCount > 0 && category.items.length > 0);

  const fallbackScored = applyProfileMatchPercentToScholarships(fallbackPool, profile)
    .filter((s) => !seenIds.has(s.id))
    .sort((a, b) => score(b) - score(a));
  if (categories.length === 0) {
    const fallbackUsedIds = new Set<string>();
    categories = profileCountry(profile)
      ? [
          takeCategory(
            'recommended',
            'Worth checking today',
            fallbackScored.filter((item) => isInternationalFriendly(item)),
            2,
            fallbackViewAllUrl,
            fallbackUsedIds
          ),
          takeCategory(
            'best',
            'Popular scholarships',
            fallbackScored,
            2,
            fallbackViewAllUrl,
            fallbackUsedIds
          )
        ].filter((category): category is GrantDigestCategory => category != null)
      : [
          takeCategory(
            'recommended',
            'International friendly USA',
            fallbackScored.filter((item) => isInternationalFriendly(item) && hasHostCountry(item, 'US')),
            2,
            fallbackViewAllUrl,
            fallbackUsedIds
          ),
          takeCategory(
            'best',
            'Global opportunities',
            fallbackScored.filter((item) => isInternationalFriendly(item)),
            2,
            fallbackViewAllUrl,
            fallbackUsedIds
          )
        ].filter((category): category is GrantDigestCategory => category != null);
  }

  const rankedIds = [
    ...categories.flatMap((category) => category.items.map((item) => item.id)),
    ...fallbackScored.map((item) => item.id)
  ];
  const token = createGrantDigestToken(rankedIds);
  const viewAllUrl = token
    ? `${origin}/scholarships/email-digest/${encodeURIComponent(token)}`
    : fallbackViewAllUrl;
  categories = categories.map((category) => ({
    ...category,
    viewAllUrl
  }));

  console.log(
    JSON.stringify({
      userId,
      email: emailArg,
      country_code: profile.country_code,
      preferred_host_country_codes: profile.preferred_host_country_codes,
      categories: categories.map((category) => ({
        id: category.id,
        totalCount: category.totalCount,
        shown: category.items.length
      }))
    })
  );

  const result = await sendGrantDigestBatchEmail({
    toEmail: emailArg,
    categories,
    firstName: profile.first_name
  });

  console.log(JSON.stringify({ ok: result.ok, skipped: result.skipped ?? null, viewAllUrl }));
  if (!result.ok) process.exit(1);
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
