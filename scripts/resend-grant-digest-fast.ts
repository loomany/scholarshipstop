/**
 * One-off fast repair resend for the daily grant digest.
 *
 * This intentionally avoids the heavy scholarship x profile SQL matcher used by
 * the daily cron. It uses catalog/profile fields already present in Supabase and
 * sends at most one corrected digest per eligible user.
 *
 * Usage:
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/resend-grant-digest-fast.ts
 */

import { createClient } from '@supabase/supabase-js';

import type { Scholarship } from '../app/scholarships/scholarshipsData';
import {
  sendGrantDigestBatchEmail,
  type GrantDigestCategory
} from '../lib/email/sendGrantDigestEmail';
import { createGrantDigestToken } from '../lib/notifications/grantDigestToken';
import { isEasyApplyScholarship } from '../lib/scholarships/easyApply';
import { applyProfileMatchPercentToScholarships } from '../lib/scholarships/profileMatchBadge';
import { preferredHostCountryCodesFromProfileJson } from '../lib/scholarships/profilePreferredHostCountries';
import { mapScholarshipRow, type ScholarshipRow } from '../lib/scholarships/supabase';
import type { Database } from '../types_db';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const admin = createClient<Database>(url, serviceKey);
const siteOrigin =
  process.env.NEXT_PUBLIC_SITE_URL?.trim()?.replace(/\/+$/, '') || 'https://scholarshiptop.com';
const poolSize = Math.max(50, Number(process.env.GRANT_DIGEST_FAST_POOL_SIZE?.trim() || '500'));
const maxProfiles = Math.max(1, Number(process.env.GRANT_DIGEST_FAST_MAX_PROFILES?.trim() || '1000'));
const sendDelayMs = Math.max(0, Number(process.env.GRANT_DIGEST_FAST_SEND_DELAY_MS?.trim() || '250'));
const onlyMissingCountry = process.argv.includes('--missing-country-only');
const onlyNoItemsFallback = process.argv.includes('--no-items-fallback-only');
const emailArgIndex = process.argv.indexOf('--email');
const targetEmail =
  emailArgIndex >= 0
    ? process.argv[emailArgIndex + 1]?.trim().toLowerCase()
    : process.argv
        .find((arg) => arg.startsWith('--email='))
        ?.slice('--email='.length)
        .trim()
        .toLowerCase();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function score(s: Scholarship): number {
  const match = typeof s.profileMatchPercent === 'number' ? s.profileMatchPercent : 0;
  const rank = typeof s.rankingScore === 'number' ? s.rankingScore : 0;
  const updatedAtMs = s.updatedAt ? Date.parse(s.updatedAt) : 0;
  return match * 100_000_000 + rank * 100_000 + (Number.isFinite(updatedAtMs) ? updatedAtMs : 0);
}

function profileCountry(profile: ProfileRow): string | null {
  const code = profile.country_code?.trim().toUpperCase();
  return code && /^[A-Z]{2}$/.test(code) ? code : null;
}

function hasCountry(codes: string[] | undefined, country: string): boolean {
  return Boolean(codes?.some((code) => code.trim().toUpperCase() === country));
}

function preferredHosts(profile: ProfileRow): string[] {
  return preferredHostCountryCodesFromProfileJson(profile.preferred_host_country_codes);
}

function matchesApplicantCountry(s: Scholarship, profile: ProfileRow): boolean {
  const country = profileCountry(profile);
  return Boolean(country && hasCountry(s.applicantCountryCodes, country));
}

function matchesPreferredHost(s: Scholarship, profile: ProfileRow): boolean {
  const hosts = preferredHosts(profile);
  if (hosts.length === 0) return true;
  return Boolean(s.hostCountryCodes?.some((code) => hosts.includes(code.trim().toUpperCase())));
}

function matchesIntent(s: Scholarship, profile: ProfileRow): boolean {
  return matchesApplicantCountry(s, profile) && matchesPreferredHost(s, profile);
}

function matchesStudyAbroadIntent(s: Scholarship, profile: ProfileRow): boolean {
  const country = profileCountry(profile);
  if (!country || !hasCountry(s.applicantCountryCodes, country)) return false;
  const hosts = preferredHosts(profile);
  return Boolean(
    s.hostCountryCodes?.some((code) => {
      const normalized = code.trim().toUpperCase();
      if (!/^[A-Z]{2}$/.test(normalized) || normalized === country) return false;
      return hosts.length === 0 || hosts.includes(normalized);
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

function daysUntilDeadline(s: Scholarship): number | null {
  if (typeof s.daysUntilDeadline === 'number' && Number.isFinite(s.daysUntilDeadline)) {
    return s.daysUntilDeadline;
  }
  if (!s.deadlineAt) return null;
  const ms = Date.parse(s.deadlineAt) - Date.now();
  if (!Number.isFinite(ms)) return null;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function isHotDeadline(s: Scholarship): boolean {
  const days = daysUntilDeadline(s);
  if (days != null) return days >= 0 && days <= 14;
  const bucket = s.deadlineBucket?.trim().toLowerCase() ?? '';
  return ['d1_7', 'd8_14', 'closing_soon', 'soon'].includes(bucket);
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

function buildMissingCountryCategories(
  scholarships: Scholarship[],
  viewAllUrl: string
): GrantDigestCategory[] {
  const usedIds = new Set<string>();
  return [
    takeCategory(
      'recommended',
      'International friendly USA',
      scholarships.filter((item) => isInternationalFriendly(item) && hasHostCountry(item, 'US')),
      2,
      viewAllUrl,
      usedIds
    ),
    takeCategory(
      'best',
      'Global opportunities',
      scholarships.filter((item) => isInternationalFriendly(item)),
      2,
      viewAllUrl,
      usedIds
    )
  ].filter((category): category is GrantDigestCategory => category != null);
}

function buildNoItemsFallbackCategories(
  scholarships: Scholarship[],
  viewAllUrl: string
): GrantDigestCategory[] {
  const usedIds = new Set<string>();
  return [
    takeCategory(
      'recommended',
      'Worth checking today',
      scholarships.filter((item) => isInternationalFriendly(item)),
      2,
      viewAllUrl,
      usedIds
    ),
    takeCategory(
      'best',
      'Popular scholarships',
      scholarships,
      2,
      viewAllUrl,
      usedIds
    )
  ].filter((category): category is GrantDigestCategory => category != null);
}

async function listUsersByEmail(): Promise<Map<string, { id: string; email: string }>> {
  const out = new Map<string, { id: string; email: string }>();
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    for (const user of data.users) {
      const email = user.email?.trim().toLowerCase();
      if (email) out.set(user.id, { id: user.id, email });
    }
    if (data.users.length < perPage) break;
    page += 1;
  }
  return out;
}

async function recordDigestItems(
  userId: string,
  categories: GrantDigestCategory[]
): Promise<void> {
  const rows = categories.flatMap((category) =>
    category.items.map((item) => ({
      user_id: userId,
      scholarship_id: item.id,
      section: category.id,
      digest_kind: category.id === 'recommended' ? 'fallback' : 'direct'
    }))
  );
  if (rows.length === 0) return;
  const { error } = await admin.from('grant_email_digest_items').insert(rows);
  if (error) console.error('[fast-resend] digest history insert', userId, error.message);
}

async function main() {
  console.log('[fast-resend] loading users/profiles/scholarships');
  const usersById = await listUsersByEmail();
  const targetUser = targetEmail
    ? Array.from(usersById.values()).find((user) => user.email === targetEmail)
    : null;
  if (targetEmail && !targetUser) {
    throw new Error(`No auth user found for email: ${targetEmail}`);
  }

  const profileQuery = admin
    .from('profiles')
    .select('*')
    .or(
      'email_notify_best_matches.eq.true,email_notify_saved_filters.eq.true,email_notify_easy_apply.eq.true,email_notify_hot_deadlines.eq.true'
    )
    .order('updated_at', { ascending: false })
    .limit(maxProfiles);
  if (targetUser) {
    profileQuery.eq('id', targetUser.id);
  }

  const [profilesResult, scholarshipsResult] = await Promise.all([
    profileQuery,
    admin
      .from('scholarships')
      .select('*')
      .eq('is_active', true)
      .order('ranking_score', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
      .limit(poolSize)
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (scholarshipsResult.error) throw scholarshipsResult.error;

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const scholarships = ((scholarshipsResult.data ?? []) as unknown as ScholarshipRow[]).map(
    mapScholarshipRow
  );

  console.log(
    '[fast-resend] loaded',
    JSON.stringify({
      profiles: profiles.length,
      users: usersById.size,
      scholarships: scholarships.length,
      targetEmail: targetEmail ?? null
    })
  );

  let attempted = 0;
  let sent = 0;
  let skippedNoEmail = 0;
  let skippedNoCountry = 0;
  let skippedNoItems = 0;
  let skippedHasCountry = 0;
  let skippedWouldHaveItems = 0;
  let failed = 0;

  for (const profile of profiles) {
    const user = usersById.get(profile.id);
    if (!user) {
      skippedNoEmail += 1;
      continue;
    }
    const country = profileCountry(profile);
    if (onlyMissingCountry && country) {
      skippedHasCountry += 1;
      continue;
    }
    if (onlyNoItemsFallback && !country) {
      skippedNoCountry += 1;
      continue;
    }
    if (!onlyMissingCountry && !onlyNoItemsFallback && !country) {
      skippedNoCountry += 1;
      continue;
    }

    const scored = applyProfileMatchPercentToScholarships(scholarships, profile);
    const fallbackViewAllUrl = `${siteOrigin}/scholarships`;
    let categories = country
      ? (() => {
          const usedIds = new Set<string>();
          return [
            profile.email_notify_best_matches
              ? takeCategory(
                  'best',
                  'Best recommendations',
                  scored.filter((item) => matchesApplicantCountry(item, profile)),
                  2,
                  fallbackViewAllUrl,
                  usedIds
                )
              : null,
            takeCategory(
              'recommended',
              'Recommended for you',
              scored.filter((item) => matchesStudyAbroadIntent(item, profile)),
              2,
              fallbackViewAllUrl,
              usedIds
            ),
            profile.email_notify_easy_apply
              ? takeCategory(
                  'easy_apply',
                  'Easy apply',
                  scored.filter((item) => matchesIntent(item, profile) && isEasyApplyScholarship(item)),
                  4,
                  fallbackViewAllUrl,
                  usedIds
                )
              : null,
            profile.email_notify_hot_deadlines
              ? takeCategory(
                  'hot_deadlines',
                  'Hot deadlines',
                  scored.filter((item) => matchesIntent(item, profile) && isHotDeadline(item)),
                  4,
                  fallbackViewAllUrl,
                  usedIds
                )
              : null
          ].filter((category): category is GrantDigestCategory => category != null);
        })()
      : buildMissingCountryCategories(scored, fallbackViewAllUrl);

    if (onlyNoItemsFallback) {
      if (categories.length > 0) {
        skippedWouldHaveItems += 1;
        continue;
      }
      categories = buildNoItemsFallbackCategories(scored, fallbackViewAllUrl);
    }

    if (categories.length === 0) {
      skippedNoItems += 1;
      continue;
    }

    const tokenIds = [
      ...categories.flatMap((category) => category.items.map((item) => item.id)),
      ...scored.map((item) => item.id)
    ];
    const token = createGrantDigestToken(tokenIds);
    const viewAllUrl = token
      ? `${siteOrigin}/scholarships/email-digest/${encodeURIComponent(token)}`
      : fallbackViewAllUrl;
    categories = categories.map((category) => ({
      ...category,
      viewAllUrl
    }));

    attempted += 1;
    console.log(
      '[fast-resend] send-start',
      JSON.stringify({
        attempted,
        userId: profile.id,
        email: user.email,
        country: profile.country_code,
        mode: onlyNoItemsFallback ? 'no_items_fallback' : country ? 'personalized' : 'missing_country',
        categories: categories.map((category) => ({
          id: category.id,
          shown: category.items.length,
          totalCount: category.totalCount
        }))
      })
    );

    const result = await sendGrantDigestBatchEmail({
      toEmail: user.email,
      categories,
      firstName: profile.first_name
    });

    if (result.ok) {
      sent += 1;
      await recordDigestItems(profile.id, categories);
    } else {
      failed += 1;
      console.error('[fast-resend] send-failed', user.email, result.skipped ?? 'unknown');
    }

    if (sendDelayMs > 0) await sleep(sendDelayMs);
  }

  console.log(
    '[fast-resend] summary',
    JSON.stringify({
      attempted,
      sent,
      failed,
      skippedNoEmail,
      skippedHasCountry,
      skippedWouldHaveItems,
      skippedNoCountry,
      skippedNoItems
    })
  );

  if (failed > 0) process.exitCode = 1;
}

void main().catch((e) => {
  console.error('[fast-resend] fatal', e);
  process.exit(1);
});
