/**
 * Fill missing providers.official_url values with a conservative, auditable
 * enrichment pipeline.
 *
 * Priority:
 *  1) exact College Scorecard school-name match (local static enrichment)
 *  2) first-party URL already present on scholarship rows, when the host matches
 *     provider-name tokens and is not an aggregator/social/form host
 *  3) Wikidata official website (P856), exact label/alias match
 *  4) optional Google SERP via SerpAPI (`SERPAPI_API_KEY`) for remaining rows
 *  5) Wikipedia fallback (Wikidata sitelink or search), if no official site found
 *
 * Usage:
 *   dotenv -e .env.local -- npx tsx scripts/enrich-provider-official-urls.ts --dry-run
 *   dotenv -e .env.local -- npx tsx scripts/enrich-provider-official-urls.ts --no-web --write
 *   dotenv -e .env.local -- npx tsx scripts/enrich-provider-official-urls.ts --no-web --min-confidence=0.86 --write
 *   dotenv -e .env.local -- npx tsx scripts/enrich-provider-official-urls.ts --limit=200 --write
 *   dotenv -e .env.local -- npx tsx scripts/enrich-provider-official-urls.ts --concurrency=8 --write
 *   dotenv -e .env.local -- npx tsx scripts/enrich-provider-official-urls.ts --offset=1000 --limit=500 --quiet --write
 *   dotenv -e .env.local -- npx tsx scripts/enrich-provider-official-urls.ts --only-slug=sonora-area-foundation --write
 *
 * Output:
 *   scripts/output/provider-official-url-enrichment-candidates.csv
 *   scripts/output/provider-official-url-enrichment-summary.json
 */

import fs from 'node:fs';
import path from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { normalizeProviderOfficialUrl } from '../lib/providers/providerOfficialUrl';
import type { Database } from '../types_db';

type ProviderRow = {
  id: string;
  slug: string;
  display_name: string | null;
  state: string | null;
  official_url: string | null;
  sources?: unknown;
  ai_sources?: unknown;
};

type ScholarshipUrlRow = {
  provider_slug: string | null;
  provider_url: string | null;
  apply_url: string | null;
  url: string | null;
  is_active: boolean | null;
};

type CandidateSource =
  | 'school_scorecard_exact'
  | 'curated_manual_official_url'
  | 'scholarship_first_party_url'
  | 'provider_saved_source_url'
  | 'wikidata_official_website'
  | 'google_serp_result'
  | 'wikidata_wikipedia_fallback'
  | 'wikipedia_search_fallback';

type Candidate = {
  slug: string;
  displayName: string;
  url: string;
  source: CandidateSource;
  confidence: number;
  evidence: string;
  fallback: boolean;
};

type SchoolRecord = {
  school_name: string;
  state?: string | null;
  website?: string | null;
};

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'scripts', 'output');
const OUT_CSV = path.join(OUT_DIR, 'provider-official-url-enrichment-candidates.csv');
const OUT_SUMMARY = path.join(OUT_DIR, 'provider-official-url-enrichment-summary.json');

const BLOCKED_HOST_SUFFIXES = [
  'scholarshiptop.com',
  'scholarships.com',
  'fastweb.com',
  'bold.org',
  'niche.com',
  'unigo.com',
  'cappex.com',
  'collegeboard.org',
  'bigfuture.collegeboard.org',
  'studentscholarships.org',
  'scholarships360.org',
  'scholarsapply.org',
  'scholarshipamerica.org',
  'mina7.net',
  'mina7portal.com',
  'google.com',
  'bing.com',
  'duckduckgo.com',
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'twitter.com',
  'x.com',
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  'docs.google.com',
  'forms.gle',
  'jotform.com',
  'typeform.com',
  'formstack.com'
];

const CONTEXT_ONLY_HOST_HINTS = [
  'dailynews',
  'newspaper',
  'herald',
  'gazette',
  'tribune',
  'courier',
  'observer',
  'chronicle',
  'patch',
  'radio'
];

const GENERIC_SAVED_SOURCE_TOKENS = new Set([
  'association',
  'chapter',
  'club',
  'commission',
  'committee',
  'conference',
  'council',
  'department',
  'district',
  'education',
  'educational',
  'federation',
  'international',
  'national',
  'organization',
  'service',
  'services',
  'society',
  'state',
  'student',
  'students'
]);

const SOFT_SINGLE_TOKEN_BLOCK = new Set([
  'alabama',
  'alaska',
  'arizona',
  'arkansas',
  'california',
  'colorado',
  'connecticut',
  'delaware',
  'florida',
  'georgia',
  'hawaii',
  'idaho',
  'illinois',
  'indiana',
  'iowa',
  'kansas',
  'kentucky',
  'louisiana',
  'maine',
  'maryland',
  'massachusetts',
  'michigan',
  'minnesota',
  'mississippi',
  'missouri',
  'montana',
  'nebraska',
  'nevada',
  'hampshire',
  'jersey',
  'mexico',
  'york',
  'carolina',
  'dakota',
  'ohio',
  'oklahoma',
  'oregon',
  'pennsylvania',
  'rhode',
  'tennessee',
  'texas',
  'utah',
  'vermont',
  'virginia',
  'washington',
  'wisconsin',
  'wyoming'
]);

const STOP_TOKENS = new Set([
  'the',
  'and',
  'of',
  'for',
  'in',
  'at',
  'a',
  'an',
  'inc',
  'llc',
  'ltd',
  'corp',
  'corporation',
  'company',
  'foundation',
  'fund',
  'trust',
  'association',
  'program',
  'scholarship',
  'scholarships',
  'college',
  'university',
  'school'
]);

const CURATED_PROVIDER_URLS: Record<string, string> = {
  'unigo-listing': 'https://www.unigo.com/scholarships',
  'bold-org': 'https://bold.org/',
  scholarships360: 'https://scholarships360.org/',
  'community-foundation-of-greater-flint': 'https://www.cfgf.org/',
  'lincoln-community-foundation': 'https://www.lcf.org/',
  'southern-cross-university': 'https://www.scu.edu.au/',
  'the-community-foundation-of-shelby-county': 'https://www.commfoun.com/',
  'university-of-queensland-uq': 'https://www.uq.edu.au/',
  'university-of-lethbridge': 'https://www.ulethbridge.ca/',
  'the-scholarship-foundation-of-st-louis': 'https://sfstl.org/',
  'grand-rapids-community-foundation': 'https://www.grfoundation.org/',
  'conference-of-minority-transportation-officials-philadelphia-chapter':
    'https://www.comtophiladelphia.org/',
  'muscogee-creek-nation-of-oklahoma': 'https://www.muscogeenation.com/',
  'australian-catholic-university-acu': 'https://www.acu.edu.au/',
  'chapel-hill-carrboro-public-school-foundation':
    'https://www.publicschoolfoundation.org/',
  'american-association-of-petroleum-geologists-foundation':
    'https://foundation.aapg.org/',
  'ais-technolabs': 'https://www.aistechnolabs.com/',
  'sprak-design': 'https://www.sprakdesign.com/',
  'sigma-theta-tau-international-honor-society-of-nursing':
    'https://www.sigmanursing.org/',
  setc: 'https://www.setc.org/',
  'heriot-watt-university-malaysia': 'https://www.hw.ac.uk/malaysia/',
  'macquarie-university': 'https://www.mq.edu.au/',
  svcf: 'https://www.siliconvalleycf.org/',
  'global-college-malta': 'https://gcmalta.com/',
  'community-foundation-of-fayette-county': 'https://www.cffayettepa.org/',
  'african-methodist-episcopal-church-fifth-district-lay-organization':
    'https://www.ame5thdistrict.org/',
  'for-a-bright-future-foundation': 'https://www.forabrightfuturefoundation.org/',
  'society-of-women-engineers-swe': 'https://swe.org/',
  'esmt-berlin': 'https://esmt.berlin/',
  'kansas-livestock-association': 'https://www.kla.org/',
  'south-dakota-high-school-rodeo-association': 'https://sdhsra.com/',
  'florida-4-h-foundation': 'https://florida4h.org/foundation/',
  'walailak-university-international-college': 'https://intercollege.wu.ac.th/',
  couponbirds: 'https://www.couponbirds.com/',
  'direct-textbooks-inc': 'https://www.directtextbook.com/',
  'direct-textbook-inc': 'https://www.directtextbook.com/',
  gyandhan: 'https://www.gyandhan.com/',
  'delete-cyberbullying': 'https://www.deletecyberbullying.org/',
  'parents-families-and-friends-of-lesbians-and-gays-pflag-national':
    'https://pflag.org/',
  ivypanda: 'https://ivypanda.com/',
  'hertie-school-berlin': 'https://www.hertie-school.org/',
  'international-society-of-women-airline-pilots': 'https://www.iswap.org/',
  'queens-university-belfast': 'https://www.qub.ac.uk/',
  'illinois-cpa-society': 'https://www.icpas.org/',
  'conference-of-minority-transportation-officials-fort-lauderdale-chapter':
    'https://www.comtofortlauderdale.org/',
  'professional-association-of-georgia-educators': 'https://www.pageinc.org/',
  'centro-einaudi': 'https://www.centroeinaudi.it/',
  'special-libraries-association': 'https://www.sla.org/',
  'society-of-architectural-historians': 'https://www.sah.org/',
  'instituto-franklin-uah': 'https://institutofranklin.net/',
  'chosun-university': 'https://www.chosun.ac.kr/',
  'imt-institute-for-advanced-studies-lucca': 'https://www.imtlucca.it/',
  'john-templeton-foundation': 'https://www.templeton.org/',
  'institute-of-food-technologists': 'https://www.ift.org/',
  'abbey-road-programs-inc': 'https://www.goabbeyroad.com/',
  'gssi-gran-sasso-science-institute': 'https://www.gssi.it/',
  'university-of-the-arts-london-ual': 'https://www.arts.ac.uk/',
  'uwe-bristol-university-of-the-west-of-england': 'https://www.uwe.ac.uk/',
  'loughborough-university-loughborough': 'https://www.lboro.ac.uk/',
  'royal-college-of-art': 'https://www.rca.ac.uk/',
  'restaurant-association-of-maryland-education-foundation':
    'https://www.marylandrestaurants.com/education-foundation',
  'impact-on-education-foundation-for-boulder-valley-schools':
    'https://www.impactoneducation.org/',
  'hawaii-education-association': 'https://www.hawaiieducationassociation.org/',
  'jewish-social-service-agency-of-metropolitan-washington': 'https://www.jssa.org/',
  'ohio-civil-service-employees-association': 'https://www.ocsea.org/'
};

function parseArg(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length).trim() : null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function loadEnvFiles(): void {
  for (const name of ['.env', '.env.local']) {
    const p = path.join(ROOT, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const idx = t.indexOf('=');
      if (idx <= 0) continue;
      const key = t.slice(0, idx).trim();
      let value = t.slice(idx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

function normalizeName(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNameVariants(value: string | null | undefined): string[] {
  const raw = value?.trim();
  if (!raw) return [];
  const withoutParenthetical = raw.replace(/\s*\([^)]*\)\s*/g, ' ');
  const withoutAfterDash = raw.replace(/\s+[-–—]\s+.*$/, ' ');
  const withoutCampusSuffix = raw.replace(
    /\b(?:main campus|online|campus|foundation|inc\.?|llc|ltd\.?)\b/gi,
    ' '
  );
  const variants = [
    raw,
    withoutParenthetical,
    withoutAfterDash,
    withoutCampusSuffix
  ]
    .map(normalizeName)
    .filter(Boolean);

  const expanded: string[] = [];
  for (const variant of variants) {
    expanded.push(variant);
    expanded.push(variant.replace(/^the\s+/, '').trim());
  }
  return [...new Set(expanded.filter((variant) => variant.length >= 3))];
}

function normalizedTokens(value: string): string[] {
  return normalizeName(value)
    .split(' ')
    .filter((token) => token.length >= 3 && !STOP_TOKENS.has(token));
}

function stripOrgSuffixes(value: string): string {
  return normalizeName(value)
    .split(' ')
    .filter((token) => !STOP_TOKENS.has(token))
    .join(' ')
    .trim();
}

function providerDisplayName(row: ProviderRow): string {
  return row.display_name?.trim() || row.slug.replace(/-/g, ' ');
}

function hostnameOf(raw: string): string | null {
  const normalized = normalizeProviderOfficialUrl(raw);
  if (!normalized) return null;
  try {
    return new URL(normalized).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

function isBlockedHost(hostname: string, allowWikipedia = false): boolean {
  const h = hostname.replace(/^www\./i, '').toLowerCase();
  if (allowWikipedia && h === 'en.wikipedia.org') return false;
  return BLOCKED_HOST_SUFFIXES.some((blocked) => {
    const b = blocked.toLowerCase();
    return h === b || h.endsWith(`.${b}`);
  });
}

function safeHttpUrl(raw: string | null | undefined, allowWikipedia = false): string | null {
  const normalized = normalizeProviderOfficialUrl(raw);
  if (!normalized) return null;
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  if (isBlockedHost(parsed.hostname, allowWikipedia)) return null;
  if (/\.(pdf|docx?|xlsx?|pptx?)(?:$|[?#])/i.test(parsed.pathname)) return null;
  return normalized;
}

function hostLooksFirstParty(url: string, providerName: string, slug: string): boolean {
  const host = hostnameOf(url);
  if (!host || isBlockedHost(host)) return false;
  const compactHost = host.replace(/[^a-z0-9]+/g, '');
  const tokens = [
    ...normalizedTokens(providerName),
    ...normalizedTokens(slug.replace(/-/g, ' '))
  ];
  const uniqueTokens = [...new Set(tokens)];
  if (uniqueTokens.some((token) => compactHost.includes(token))) return true;

  const initials = uniqueTokens.map((token) => token[0]).join('');
  return initials.length >= 3 && compactHost.includes(initials);
}

function hostLooksLikeContextPublisher(url: string, providerName: string): boolean {
  let host = '';
  try {
    host = new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return false;
  }
  const compactHost = host.replace(/[^a-z0-9]+/g, '');
  const providerTokens = new Set(normalizedTokens(providerName));
  if (providerTokens.has('news') || providerTokens.has('media')) return false;
  return CONTEXT_ONLY_HOST_HINTS.some((hint) => compactHost.includes(hint));
}

function savedSourceLooksFirstParty(
  url: string,
  providerName: string,
  slug: string
): boolean {
  if (hostLooksLikeContextPublisher(url, providerName)) return false;
  const host = hostnameOf(url);
  if (!host || isBlockedHost(host, true)) return false;
  const compactHost = host.replace(/[^a-z0-9]+/g, '');
  const rootLabel = host.split('.').filter(Boolean).slice(-2, -1)[0] ?? '';
  const tokens = [
    ...normalizedTokens(providerName),
    ...normalizedTokens(slug.replace(/-/g, ' '))
  ].filter((token) => !GENERIC_SAVED_SOURCE_TOKENS.has(token));
  const uniqueTokens = [...new Set(tokens)];
  const included = uniqueTokens.filter((token) => compactHost.includes(token));
  const initials = uniqueTokens.map((token) => token[0]).join('');

  if (initials.length >= 3 && compactHost.includes(initials)) return true;
  if (included.length >= 2) return true;
  if (
    included.length === 1 &&
    rootLabel === included[0] &&
    included[0].length >= 3 &&
    !SOFT_SINGLE_TOKEN_BLOCK.has(included[0])
  ) {
    return true;
  }
  if (
    uniqueTokens.length <= 2 &&
    included.some(
      (token) => token.length >= 4 && !SOFT_SINGLE_TOKEN_BLOCK.has(token)
    )
  ) {
    return true;
  }
  return false;
}

function candidateKey(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.replace(/^www\./i, '').toLowerCase()}${parsed.pathname.replace(/\/+$/, '')}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

function loadSchoolWebsiteIndex(): Map<string, SchoolRecord[]> {
  const p = path.join(
    ROOT,
    'data',
    'external',
    'scholarshiptop-enrichment',
    'school_enrichment.json'
  );
  const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as { records?: SchoolRecord[] };
  const byName = new Map<string, SchoolRecord[]>();
  for (const row of raw.records ?? []) {
    const website = safeHttpUrl(row.website);
    if (!website) continue;
    for (const key of normalizeNameVariants(row.school_name)) {
      const arr = byName.get(key) ?? [];
      arr.push({ ...row, website });
      byName.set(key, arr);
    }
  }
  return byName;
}

async function fetchMissingProviders(
  supabase: ReturnType<typeof createClient<Database>>
): Promise<ProviderRow[]> {
  const onlySlugRaw = parseArg('only-slug');
  const onlySlugs = onlySlugRaw
    ? new Set(onlySlugRaw.split(',').map((s) => s.trim()).filter(Boolean))
    : null;
  const limitRaw = parseArg('limit');
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : null;
  const offsetRaw = parseArg('offset');
  const offset = offsetRaw ? Math.max(0, Number.parseInt(offsetRaw, 10) || 0) : 0;

  const out: ProviderRow[] = [];
  for (let from = offset; ; from += 1000) {
    let query = supabase
      .from('providers')
      .select('id, slug, display_name, state, official_url, sources, ai_sources')
      .or('official_url.is.null,official_url.eq.')
      .order('created_at', { ascending: true })
      .range(from, from + 999);
    if (onlySlugs) query = query.in('slug', [...onlySlugs]);

    const { data, error } = await query;
    if (error) throw error;
    if (!data?.length) break;
    out.push(...(data as ProviderRow[]).filter((row) => row.slug?.trim()));
    if (data.length < 1000) break;
    if (limit && out.length >= limit) break;
  }

  return limit ? out.slice(0, limit) : out;
}

async function fetchScholarshipUrlsBySlug(
  supabase: ReturnType<typeof createClient<Database>>,
  slugs: string[]
): Promise<Map<string, ScholarshipUrlRow[]>> {
  const out = new Map<string, ScholarshipUrlRow[]>();
  const unique = [...new Set(slugs.map((slug) => slug.trim()).filter(Boolean))];
  for (let i = 0; i < unique.length; i += 200) {
    const chunk = unique.slice(i, i + 200);
    const { data, error } = await supabase
      .from('scholarships')
      .select('provider_slug, provider_url, apply_url, url, is_active')
      .in('provider_slug', chunk)
      .not('provider_slug', 'is', null)
      .order('is_active', { ascending: false });
    if (error) throw error;
    for (const row of (data ?? []) as ScholarshipUrlRow[]) {
      const slug = row.provider_slug?.trim();
      if (!slug) continue;
      const arr = out.get(slug) ?? [];
      arr.push(row);
      out.set(slug, arr);
    }
  }
  return out;
}

function fromSchoolIndex(
  row: ProviderRow,
  schoolIndex: Map<string, SchoolRecord[]>
): Candidate | null {
  const displayName = providerDisplayName(row);
  const seen = new Set<SchoolRecord>();
  const candidates = normalizeNameVariants(displayName)
    .flatMap((key) => schoolIndex.get(key) ?? [])
    .filter((candidate) => {
      if (seen.has(candidate)) return false;
      seen.add(candidate);
      return true;
    });
  if (!candidates.length) return null;
  const inState = row.state
    ? candidates.filter(
        (school) =>
          school.state?.trim().toUpperCase() === row.state?.trim().toUpperCase()
      )
    : [];
  const chosen =
    inState.length === 1
      ? inState[0]
      : candidates.length === 1
        ? candidates[0]
        : null;
  const url = safeHttpUrl(chosen?.website);
  if (!chosen || !url) return null;
  return {
    slug: row.slug,
    displayName,
    url,
    source: 'school_scorecard_exact',
    confidence: 0.98,
    evidence: `College Scorecard exact school_name match: ${chosen.school_name}`,
    fallback: false
  };
}

function fromCuratedProviderUrl(row: ProviderRow): Candidate | null {
  const url = safeHttpUrl(CURATED_PROVIDER_URLS[row.slug]);
  if (!url) return null;
  return {
    slug: row.slug,
    displayName: providerDisplayName(row),
    url,
    source: 'curated_manual_official_url',
    confidence: 0.95,
    evidence: 'Curated high-visibility provider official URL',
    fallback: false
  };
}

function urlsFromJson(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function wikipediaTitleFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    if (host !== 'en.wikipedia.org') return null;
    if (!parsed.pathname.startsWith('/wiki/')) return null;
    return decodeURIComponent(parsed.pathname.replace(/^\/wiki\//, ''))
      .replace(/_/g, ' ')
      .trim();
  } catch {
    return null;
  }
}

function fromProviderSources(row: ProviderRow): Candidate | null {
  const displayName = providerDisplayName(row);
  const seen = new Set<string>();
  for (const raw of [...urlsFromJson(row.sources), ...urlsFromJson(row.ai_sources)]) {
    const url = safeHttpUrl(raw, true);
    if (!url) continue;
    const key = candidateKey(url);
    if (seen.has(key)) continue;
    seen.add(key);

    const wikiTitle = wikipediaTitleFromUrl(url);
    if (
      wikiTitle &&
      stripOrgSuffixes(wikiTitle) === stripOrgSuffixes(displayName)
    ) {
      return {
        slug: row.slug,
        displayName,
        url,
        source: 'provider_saved_source_url',
        confidence: 0.72,
        evidence: `Saved provider source Wikipedia title="${wikiTitle}"`,
        fallback: true
      };
    }

    if (!savedSourceLooksFirstParty(url, displayName, row.slug)) continue;
    return {
      slug: row.slug,
      displayName,
      url,
      source: 'provider_saved_source_url',
      confidence: 0.86,
      evidence: 'Saved provider source URL matched provider-name tokens',
      fallback: false
    };
  }
  return null;
}

function fromScholarshipRows(
  row: ProviderRow,
  rows: ScholarshipUrlRow[]
): Candidate | null {
  const displayName = providerDisplayName(row);
  const seen = new Set<string>();
  for (const scholarshipRow of rows) {
    for (const raw of [
      scholarshipRow.provider_url,
      scholarshipRow.apply_url,
      scholarshipRow.url
    ]) {
      const url = safeHttpUrl(raw);
      if (!url) continue;
      const key = candidateKey(url);
      if (seen.has(key)) continue;
      seen.add(key);
      if (!hostLooksFirstParty(url, displayName, row.slug)) continue;
      return {
        slug: row.slug,
        displayName,
        url,
        source: 'scholarship_first_party_url',
        confidence: scholarshipRow.provider_url === raw ? 0.86 : 0.78,
        evidence: `Existing scholarship URL field (${scholarshipRow.provider_url === raw ? 'provider_url' : scholarshipRow.apply_url === raw ? 'apply_url' : 'url'})`,
        fallback: false
      };
    }
  }
  return null;
}

function fetchTimeoutMs(): number {
  const raw = parseArg('fetch-timeout-ms');
  return Math.max(1000, Number.parseInt(raw ?? '6000', 10) || 6000);
}

async function fetchJson<T>(url: string, retries = 1): Promise<T | null> {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs());
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'ScholarshipTopProviderUrlEnrichment/1.0 (https://scholarshiptop.com)'
        }
      });
      if (response.ok) return (await response.json()) as T;
      if (
        ![429, 500, 502, 503, 504].includes(response.status) ||
        attempt === retries
      ) {
        return null;
      }
    } catch {
      if (attempt === retries) return null;
    } finally {
      clearTimeout(timeout);
    }
    await new Promise((r) => setTimeout(r, 750 * (attempt + 1)));
  }
  return null;
}

type WikidataSearchResult = {
  search?: Array<{ id?: string; label?: string; description?: string; aliases?: string[] }>;
};

type WikidataEntityData = {
  entities?: Record<
    string,
    {
      labels?: Record<string, { value?: string }>;
      aliases?: Record<string, Array<{ value?: string }>>;
      claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: string } } }>>;
      sitelinks?: Record<string, { title?: string }>;
    }
  >;
};

function wikidataEntityNameScore(providerName: string, entity: {
  label?: string;
  aliases?: string[];
}): number {
  const providerNorm = normalizeName(providerName);
  const providerStripped = stripOrgSuffixes(providerName);
  const names = [entity.label, ...(entity.aliases ?? [])].filter(
    (v): v is string => Boolean(v?.trim())
  );
  for (const name of names) {
    if (normalizeName(name) === providerNorm) return 0.95;
  }
  for (const name of names) {
    if (stripOrgSuffixes(name) === providerStripped && providerStripped.length >= 5) {
      return 0.9;
    }
  }
  return 0;
}

async function fromWikidata(row: ProviderRow): Promise<Candidate | null> {
  const displayName = providerDisplayName(row);
  const searchUrl =
    'https://www.wikidata.org/w/api.php?action=wbsearchentities&language=en&format=json&limit=5&search=' +
    encodeURIComponent(displayName);
  const search = await fetchJson<WikidataSearchResult>(searchUrl);
  const ids = (search?.search ?? [])
    .map((result) => result.id?.trim())
    .filter((id): id is string => Boolean(id));
  for (const id of ids) {
    const entityUrl = `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(id)}.json`;
    const entityData = await fetchJson<WikidataEntityData>(entityUrl);
    const entity = entityData?.entities?.[id];
    if (!entity) continue;
    const label = entity.labels?.en?.value;
    const aliases = (entity.aliases?.en ?? [])
      .map((alias) => alias.value?.trim())
      .filter((v): v is string => Boolean(v));
    const score = wikidataEntityNameScore(displayName, { label, aliases });
    if (score < 0.9) continue;

    const officialClaims = entity.claims?.P856 ?? [];
    for (const claim of officialClaims) {
      const url = safeHttpUrl(claim.mainsnak?.datavalue?.value);
      if (!url) continue;
      return {
        slug: row.slug,
        displayName,
        url,
        source: 'wikidata_official_website',
        confidence: score,
        evidence: `Wikidata ${id} official website (P856), label="${label ?? ''}"`,
        fallback: false
      };
    }

    const enwiki = entity.sitelinks?.enwiki?.title?.trim();
    if (enwiki) {
      const url = safeHttpUrl(
        `https://en.wikipedia.org/wiki/${encodeURIComponent(enwiki.replace(/ /g, '_'))}`,
        true
      );
      if (url) {
        return {
          slug: row.slug,
          displayName,
          url,
          source: 'wikidata_wikipedia_fallback',
          confidence: 0.72,
          evidence: `Wikidata ${id} enwiki sitelink, label="${label ?? ''}"`,
          fallback: true
        };
      }
    }
  }
  return null;
}

async function fromGoogleSerp(row: ProviderRow): Promise<Candidate | null> {
  const apiKey = process.env.SERPAPI_API_KEY?.trim();
  if (!apiKey) return null;
  const displayName = providerDisplayName(row);
  const params = new URLSearchParams({
    engine: 'google',
    q: `${displayName} official website`,
    api_key: apiKey,
    num: '5'
  });
  type Serp = {
    organic_results?: Array<{ title?: string; link?: string; snippet?: string }>;
  };
  const data = await fetchJson<Serp>(`https://serpapi.com/search.json?${params.toString()}`);
  for (const result of data?.organic_results ?? []) {
    const url = safeHttpUrl(result.link);
    if (!url) continue;
    if (!hostLooksFirstParty(url, displayName, row.slug)) continue;
    const titleScore =
      stripOrgSuffixes(result.title ?? '') === stripOrgSuffixes(displayName) ? 0.88 : 0.82;
    return {
      slug: row.slug,
      displayName,
      url,
      source: 'google_serp_result',
      confidence: titleScore,
      evidence: `Google result title="${result.title ?? ''}"`,
      fallback: false
    };
  }
  return null;
}

async function fromWikipediaSearch(row: ProviderRow): Promise<Candidate | null> {
  const displayName = providerDisplayName(row);
  const url =
    'https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=3&srsearch=' +
    encodeURIComponent(`"${displayName}"`);
  type WikiSearch = {
    query?: { search?: Array<{ title?: string }> };
  };
  const data = await fetchJson<WikiSearch>(url);
  for (const hit of data?.query?.search ?? []) {
    const title = hit.title?.trim();
    if (!title) continue;
    if (stripOrgSuffixes(title) !== stripOrgSuffixes(displayName)) continue;
    const wikiUrl = safeHttpUrl(
      `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
      true
    );
    if (!wikiUrl) continue;
    return {
      slug: row.slug,
      displayName,
      url: wikiUrl,
      source: 'wikipedia_search_fallback',
      confidence: 0.68,
      evidence: `Wikipedia search exact-ish title="${title}"`,
      fallback: true
    };
  }
  return null;
}

function csvEscape(value: string | number | boolean | null | undefined): string {
  const s = String(value ?? '');
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function updateProviderUrl(
  supabase: ReturnType<typeof createClient<Database>>,
  candidate: Candidate
): Promise<boolean> {
  const { error } = await supabase
    .from('providers')
    .update({ official_url: candidate.url })
    .eq('slug', candidate.slug)
    .or('official_url.is.null,official_url.eq.');
  if (error) {
    console.error(`[write:error] ${candidate.slug}: ${error.message}`);
    return false;
  }
  return true;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workerCount = Math.max(1, Math.min(concurrency, items.length || 1));
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      for (;;) {
        const index = next;
        next += 1;
        if (index >= items.length) break;
        results[index] = await mapper(items[index]!, index);
      }
    })
  );
  return results;
}

async function main() {
  loadEnvFiles();
  const write = hasFlag('write');
  const dryRun = hasFlag('dry-run') || !write;
  const quiet = hasFlag('quiet');
  const officialOnly = hasFlag('official-only');
  const noWeb = hasFlag('no-web');
  const minConfidenceRaw = parseArg('min-confidence');
  const minConfidence = minConfidenceRaw
    ? Number.parseFloat(minConfidenceRaw)
    : 0;
  const concurrencyRaw = parseArg('concurrency');
  const concurrency = concurrencyRaw
    ? Math.max(1, Math.min(16, Number.parseInt(concurrencyRaw, 10) || 1))
    : noWeb
      ? 1
      : 6;
  const progressEveryRaw = parseArg('progress-every');
  const progressEvery = progressEveryRaw
    ? Math.max(1, Number.parseInt(progressEveryRaw, 10) || 1)
    : 250;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  }

  const supabase = createClient<Database>(url, key);
  const rows = await fetchMissingProviders(supabase);
  const schoolIndex = loadSchoolWebsiteIndex();
  const scholarshipUrls = await fetchScholarshipUrlsBySlug(
    supabase,
    rows.map((row) => row.slug)
  );

  const candidates: Candidate[] = [];
  const noCandidate: ProviderRow[] = [];
  let written = 0;

  const results = await mapWithConcurrency(
    rows,
    concurrency,
    async (row, i): Promise<{ candidate: Candidate | null; written: boolean }> => {
    const deterministic =
      fromSchoolIndex(row, schoolIndex) ??
      fromCuratedProviderUrl(row) ??
      fromProviderSources(row) ??
      fromScholarshipRows(row, scholarshipUrls.get(row.slug) ?? []);
    let candidate = deterministic;
    if (!candidate && !noWeb) candidate = await fromWikidata(row);
    if (!noWeb && (!candidate || (candidate.fallback && officialOnly))) {
      const google = await fromGoogleSerp(row);
      if (google) candidate = google;
    }
    if (!candidate && !officialOnly && !noWeb) {
      candidate = await fromWikipediaSearch(row);
    }

    if (
      !candidate ||
      (officialOnly && candidate.fallback) ||
      candidate.confidence < minConfidence
    ) {
      if (!quiet || (i + 1) % progressEvery === 0 || i + 1 === rows.length) {
        console.log(
          `[${i + 1}/${rows.length}] no candidate: ${row.slug}${
            candidate && candidate.confidence < minConfidence
              ? ` (below min-confidence ${candidate.confidence} < ${minConfidence})`
              : ''
          }`
        );
      }
      return { candidate: null, written: false };
    }

    if (!quiet || (i + 1) % progressEvery === 0 || i + 1 === rows.length) {
      console.log(
        `[${i + 1}/${rows.length}] ${dryRun ? 'candidate' : 'write'} ${row.slug} -> ${candidate.url} (${candidate.source}, ${candidate.confidence})`
      );
    }
    let didWrite = false;
    if (!dryRun) {
      didWrite = await updateProviderUrl(supabase, candidate);
      await new Promise((r) => setTimeout(r, 120));
    }
    return { candidate, written: didWrite };
    }
  );

  for (let i = 0; i < rows.length; i += 1) {
    const result = results[i]!;
    if (result.candidate) {
      candidates.push(result.candidate);
      if (result.written) written += 1;
    } else {
      noCandidate.push(rows[i]!);
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const csv = [
    [
      'slug',
      'display_name',
      'url',
      'source',
      'confidence',
      'fallback',
      'evidence'
    ].join(','),
    ...candidates.map((c) =>
      [
        c.slug,
        c.displayName,
        c.url,
        c.source,
        c.confidence,
        c.fallback,
        c.evidence
      ]
        .map(csvEscape)
        .join(',')
    )
  ].join('\n');
  fs.writeFileSync(OUT_CSV, `${csv}\n`, 'utf8');
  fs.writeFileSync(
    OUT_SUMMARY,
    JSON.stringify(
      {
        mode: dryRun ? 'dry-run' : 'write',
        officialOnly,
        noWeb,
        minConfidence,
        scanned: rows.length,
        candidates: candidates.length,
        written,
        noCandidate: noCandidate.length,
        bySource: candidates.reduce<Record<string, number>>((acc, candidate) => {
          acc[candidate.source] = (acc[candidate.source] ?? 0) + 1;
          return acc;
        }, {}),
        generatedAt: new Date().toISOString()
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(
    JSON.stringify(
      {
        scanned: rows.length,
        candidates: candidates.length,
        written,
        noCandidate: noCandidate.length,
        csv: path.relative(ROOT, OUT_CSV),
        summary: path.relative(ROOT, OUT_SUMMARY)
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
