/**
 * SEO audit (read-only): scholarship SEO listings + scholarship detail + resources/content posts.
 *
 * Rules:
 * - Do not modify runtime SEO behavior.
 * - Prefer internal project data/functions.
 * - Use HTTP fallback only when internal extraction is unavailable.
 */
import fs from 'fs/promises';
import path from 'path';

import { getLongTailSitemapSlugs } from '../app/scholarships/scholarshipLongTailPresets';
import type { Scholarship } from '../app/scholarships/scholarshipsData';
import { scholarshipPublicPath } from '../app/scholarships/scholarshipsData';
import { RESOURCES_PAGE_TITLE, RESOURCES_SECTION_PATH } from '../lib/content-hub/resourcesSection';
import { ESSAYS_PAGE_TITLE, ESSAYS_SECTION_PATH } from '../lib/essays/essayHubSection';
import { fetchActiveScholarshipsForScript } from '../lib/scholarships/supabase';
import {
  getAllIndexableSeoManifestPathsForSitemap,
  resolveScholarshipSlugPath
} from '../lib/scholarships/seoScholarshipResolve';
import { createPublicClient } from '../utils/supabase/public';

type PageType =
  | 'scholarship_seo'
  | 'scholarship_detail'
  | 'content_page'
  | 'essay_page'
  | 'compare_page'
  | 'provider_page';
type OutputPageType =
  | 'listing'
  | 'scholarship'
  | 'article'
  | 'essay'
  | 'compare'
  | 'provider';
type Status = 'good' | 'medium' | 'bad';
type FixPriority = 'critical' | 'high' | 'medium' | 'low';
type SourceType = 'internal' | 'http_fallback';

type CheckResult = {
  ok: boolean;
  pointsAwarded: number;
  maxPoints: number;
  reason?: string;
  value?: string | number | boolean | null;
  min?: number;
  max?: number;
  expected?: string;
  unavailable?: boolean;
  partial?: boolean;
};

type PageAudit = {
  pageType: PageType;
  outputType: OutputPageType;
  sourceType: SourceType;
  url: string;
  score: number;
  status: Status;
  issues: string[];
  checks: {
    title: CheckResult;
    metaDescription: CheckResult;
    h1: CheckResult;
    contentBlocks: CheckResult;
    faq: CheckResult;
    scholarshipResults: CheckResult;
    canonicalRobots: CheckResult;
    duplicateSafety: CheckResult;
  };
  title?: string | null;
  metaDescription?: string | null;
  titleLength: number;
  metaDescriptionLength: number;
  scholarshipResultsCount: number | null;
  indexable: boolean | null;
  issueCodes: string[];
  fixPriority: FixPriority;
  fixSuggestion: string;
};

type AuditInputPage = {
  pageType: PageType;
  urlPath: string;
  sourceKey: string;
  canonicalPath?: string;
  contentSlug?: string;
  contentPost?: {
    slug: string;
    title: string | null;
    meta_title: string | null;
    meta_description: string | null;
    body_html: string | null;
    faq: unknown;
  };
  essaySlug?: string;
  essayPost?: {
    slug: string;
    title: string | null;
    meta_description: string | null;
    content_html: string | null;
    faq: unknown;
  };
  compareType?: 'university' | 'state';
  compareSlug?: string;
  comparePage?: {
    slug: string;
    meta_title: string | null;
    meta_description: string | null;
    content_json: unknown;
    ai_verdict: string | null;
  };
  providerSlug?: string;
  providerRow?: {
    slug: string;
    display_name: string | null;
    ai_description: string | null;
    ai_faq: unknown;
    scholarship_count: number | null;
  };
  scholarship?: Scholarship;
};

type LongTailLikeBundle = {
  seo_title?: string;
  seo_description?: string;
  h1?: string;
  intro?: string;
  supporting?: string;
  body_html?: string;
  faq?: Array<{ question?: string; answer?: string }>;
  page_data?: {
    exactCount?: number;
  };
  meta_title?: string;
  title?: string;
  meta_description?: string;
};

type FallbackExtract = {
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  canonical: string | null;
  robots: string | null;
  hasContentBlocks: boolean;
  hasFaq: boolean;
};

const REPORT_JSON_PATH = path.resolve('docs', 'seo-audit-report.json');
const REPORT_CSV_PATH = path.resolve('docs', 'seo-audit-report.csv');
const ACTION_PLAN_JSON_PATH = path.resolve('docs', 'seo-audit-action-plan.json');
const TITLE_POINTS = 15;
const META_POINTS = 20;
const H1_POINTS = 10;
const CONTENT_POINTS = 15;
const FAQ_POINTS = 10;
const RESULTS_POINTS = 15;
const CANONICAL_ROBOTS_POINTS = 10;
const DUP_POINTS = 5;

function envInt(name: string): number | null {
  const raw = process.env[name]?.trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

function normalizeWhitespace(input: string | null | undefined): string {
  return (input ?? '').replace(/\s+/g, ' ').trim();
}

function buildScholarshipDetailSeoTitle(baseTitle: string): string {
  const normalizedBase = normalizeWhitespace(baseTitle) || 'Scholarship';
  let title = `${normalizedBase} in USA 2026 - Apply Guide`;
  if (title.length < 30) {
    title = `${normalizedBase} Scholarship USA 2026 Apply`;
  }
  if (title.length > 65) {
    const suffix = ' USA 2026 Apply';
    const keep = Math.max(10, 65 - suffix.length);
    title = `${normalizedBase.slice(0, keep).trimEnd()}${suffix}`;
  }
  return title;
}

function normalizeDuplicateKey(input: string | null | undefined): string {
  return normalizeWhitespace(input).toLowerCase();
}

function toOutputType(pageType: PageType): OutputPageType {
  if (pageType === 'scholarship_seo') return 'listing';
  if (pageType === 'scholarship_detail') return 'scholarship';
  if (pageType === 'content_page') return 'article';
  if (pageType === 'essay_page') return 'essay';
  if (pageType === 'compare_page') return 'compare';
  return 'provider';
}

function normalizeIssueCode(issue: string): string {
  return issue.split(':')[0]!.trim();
}

function pickFixSuggestion(issueCodes: string[], status: Status): string {
  if (issueCodes.includes('canonical_missing')) {
    return 'Set canonical URL explicitly and ensure it points to the intended indexable route.';
  }
  if (issueCodes.includes('meta_description_missing')) {
    return 'Add a unique meta description between 120 and 160 characters.';
  }
  if (issueCodes.includes('title_missing')) {
    return 'Add a unique title between 30 and 65 characters.';
  }
  if (issueCodes.includes('h1_missing')) {
    return 'Add one clear H1 aligned with the page intent.';
  }
  if (issueCodes.includes('content_blocks_missing')) {
    return 'Add meaningful content sections for this page intent.';
  }
  if (issueCodes.includes('faq_missing')) {
    return 'Add FAQ block with at least one helpful Q/A.';
  }
  if (issueCodes.includes('duplicate_title')) {
    return 'Make the title unique to prevent keyword cannibalization.';
  }
  if (issueCodes.includes('duplicate_meta_description')) {
    return 'Make meta description unique and specific for this URL.';
  }
  if (issueCodes.includes('result_count_unavailable_internal_context')) {
    return 'Provide Supabase env for full internal audit context or treat this check as partial.';
  }
  if (status === 'bad') return 'Fix critical metadata gaps first: title, meta, canonical, H1.';
  if (status === 'medium') return 'Improve metadata quality and missing support blocks.';
  return 'No immediate action required.';
}

function deriveFixPriority(issueCodes: string[], score: number, status: Status): FixPriority {
  const criticalCodes = new Set([
    'title_missing',
    'meta_description_missing',
    'canonical_missing',
    'robots_noindex_or_invalid'
  ]);
  const highCodes = new Set([
    'h1_missing',
    'content_blocks_missing',
    'duplicate_title',
    'duplicate_meta_description'
  ]);
  if (issueCodes.some((c) => criticalCodes.has(c)) || score < 40) return 'critical';
  if (status === 'bad' || issueCodes.some((c) => highCodes.has(c))) return 'high';
  if (status === 'medium' || issueCodes.length > 0) return 'medium';
  return 'low';
}

function hasSupabaseScriptEnv(): boolean {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
  const hasKey = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
  return hasUrl && hasKey;
}

function contentFilePath(canonicalPath: string): string {
  const safe = canonicalPath.replace(/\//g, '__');
  return path.resolve('data', 'seo-scholarship-content', `${safe}.json`);
}

function longTailFilePath(slug: string): string {
  return path.resolve('data', 'long-tail-seo', `${slug}.json`);
}

async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function detailMetaFallbackDescription(s: Scholarship): string {
  const seo = normalizeWhitespace(s.seoExcerpt);
  if (seo.length >= 40) return seo.length > 160 ? `${seo.slice(0, 157)}…` : seo;
  const short = normalizeWhitespace(s.summaryShort);
  if (short.length >= 40) return short.length > 160 ? `${short.slice(0, 157)}…` : short;
  const title = normalizeWhitespace(s.title) || 'This scholarship';
  return `Learn the key details of ${title}, including eligibility, deadline, award amount, required documents, and how to apply.`.slice(
    0,
    160
  );
}

function stripTitle(raw: unknown): string | null {
  if (typeof raw === 'string') return normalizeWhitespace(raw) || null;
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const fromAbsolute = typeof o.absolute === 'string' ? o.absolute : null;
    const fromDefault = typeof o.default === 'string' ? o.default : null;
    const fromTemplate = typeof o.template === 'string' ? o.template : null;
    return normalizeWhitespace(fromAbsolute || fromDefault || fromTemplate || '') || null;
  }
  return null;
}

function stripDescription(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = normalizeWhitespace(raw);
  return s || null;
}

function extractCanonical(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === 'string') return normalizeWhitespace(raw) || null;
  if (typeof raw === 'object') {
    const value = (raw as Record<string, unknown>).canonical;
    return typeof value === 'string' ? normalizeWhitespace(value) || null : null;
  }
  return null;
}

function extractRobotsIndex(raw: unknown): boolean | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    const v = raw.toLowerCase();
    if (v.includes('noindex')) return false;
    if (v.includes('index')) return true;
    return null;
  }
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.index === 'boolean') return obj.index;
  }
  return null;
}

function checkRange(
  value: number,
  min: number,
  max: number,
  maxPoints: number,
  name: string
): CheckResult {
  const ok = value >= min && value <= max;
  return {
    ok,
    pointsAwarded: ok ? maxPoints : 0,
    maxPoints,
    value,
    min,
    max,
    reason: ok ? undefined : `${name}_out_of_range`
  };
}

function checkExists(value: unknown, maxPoints: number, missingReason: string): CheckResult {
  const ok = Boolean(value);
  return {
    ok,
    pointsAwarded: ok ? maxPoints : 0,
    maxPoints,
    reason: ok ? undefined : missingReason
  };
}

function checkBoolean(
  ok: boolean,
  maxPoints: number,
  reasonWhenFail: string,
  value?: boolean
): CheckResult {
  return {
    ok,
    pointsAwarded: ok ? maxPoints : 0,
    maxPoints,
    reason: ok ? undefined : reasonWhenFail,
    value
  };
}

function checkUnavailable(reason: string, maxPoints: number): CheckResult {
  return {
    ok: false,
    pointsAwarded: 0,
    maxPoints,
    reason,
    unavailable: true,
    partial: true
  };
}

function parseTagContent(html: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = html.match(re);
  if (!m) return null;
  return normalizeWhitespace(m[1]?.replace(/<[^>]+>/g, '') ?? '') || null;
}

function parseMetaContent(html: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re =
    new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i');
  const m = html.match(re);
  return normalizeWhitespace(m?.[1] ?? '') || null;
}

function parseLinkHref(html: string, rel: string): string | null {
  const escaped = rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re =
    new RegExp(`<link[^>]+rel=["']${escaped}["'][^>]*href=["']([^"']+)["'][^>]*>`, 'i');
  const m = html.match(re);
  return normalizeWhitespace(m?.[1] ?? '') || null;
}

async function fetchHtmlFallback(baseUrl: string, urlPath: string): Promise<FallbackExtract | null> {
  const url = `${baseUrl.replace(/\/$/, '')}${urlPath.startsWith('/') ? urlPath : `/${urlPath}`}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    throw new Error(`fetch_failed_${res.status}`);
  }
  const html = await res.text();
  return {
    title: parseTagContent(html, 'title'),
    metaDescription:
      parseMetaContent(html, 'description') || parseMetaContent(html, 'og:description'),
    h1: parseTagContent(html, 'h1'),
    canonical: parseLinkHref(html, 'canonical'),
    robots: parseMetaContent(html, 'robots'),
    hasContentBlocks: /<h2|<article|<section/i.test(html),
    hasFaq: /faq|accordion|site-faq|ld\+json/i.test(html)
  };
}

function statusFromScore(score: number): Status {
  if (score >= 85) return 'good';
  if (score >= 60) return 'medium';
  return 'bad';
}

type InternalExtract = {
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  hasContentBlocks: boolean;
  hasFaq: boolean;
  scholarshipResultsCount: number | null;
  canonical: string | null;
  indexable: boolean | null;
  issues: string[];
};

async function extractScholarshipListingInternal(page: AuditInputPage): Promise<InternalExtract> {
  const issues: string[] = [];
  const canonicalPath = page.canonicalPath ?? page.sourceKey;
  const segments = canonicalPath.split('/').filter(Boolean);
  const seo = await readJsonIfExists<LongTailLikeBundle>(contentFilePath(canonicalPath));
  const longTail = await readJsonIfExists<LongTailLikeBundle>(longTailFilePath(canonicalPath));
  const resolved = resolveScholarshipSlugPath(segments);
  const title = normalizeWhitespace(
    seo?.seo_title ??
      longTail?.seo_title ??
      (resolved.kind === 'manifest_seo' ? resolved.entry.h1Fallback : '')
  ) || null;
  const metaDescription = normalizeWhitespace(
    seo?.seo_description ??
      longTail?.seo_description ??
      (resolved.kind === 'manifest_seo' ? resolved.entry.metaDescriptionFallback : '')
  ) || null;
  const h1 =
    normalizeWhitespace(seo?.h1 ?? seo?.seo_title ?? longTail?.h1 ?? longTail?.seo_title ?? '') ||
    title;
  const hasContentBlocks = Boolean(
    normalizeWhitespace(seo?.intro) ||
      normalizeWhitespace(seo?.supporting) ||
      normalizeWhitespace(longTail?.intro) ||
      normalizeWhitespace(longTail?.body_html)
  );
  const hasFaq =
    (seo?.faq?.filter((f) => normalizeWhitespace(f.question) && normalizeWhitespace(f.answer))
      .length ?? 0) > 0 ||
    (longTail?.faq?.filter((f) => normalizeWhitespace(f.question) && normalizeWhitespace(f.answer))
      .length ?? 0) > 0;

  let scholarshipResultsCount: number | null = null;
  scholarshipResultsCount =
    resolved.kind === 'manifest_seo'
      ? (resolved.entry.scholarshipsCount ?? resolved.entry.minCountSnapshot ?? null)
      : (seo?.page_data?.exactCount ?? longTail?.page_data?.exactCount ?? null);
  if (scholarshipResultsCount == null) {
    issues.push('result_count_unavailable_internal_context');
  }

  return {
    title,
    metaDescription,
    h1,
    hasContentBlocks,
    hasFaq,
    scholarshipResultsCount,
    canonical: `/scholarships/${canonicalPath}`,
    indexable: true,
    issues
  };
}

async function extractScholarshipDetailInternal(page: AuditInputPage): Promise<InternalExtract> {
  const issues: string[] = [];
  const s = page.scholarship;
  if (!s) {
    return {
      title: null,
      metaDescription: null,
      h1: null,
      hasContentBlocks: false,
      hasFaq: false,
      scholarshipResultsCount: null,
      canonical: null,
      indexable: null,
      issues: ['scholarship_record_missing']
    };
  }
  const hasContentBlocks = Boolean(
    normalizeWhitespace(s.description) ||
      normalizeWhitespace(s.seoOverview) ||
      normalizeWhitespace(s.seoEligibility) ||
      normalizeWhitespace(s.seoApplication) ||
      normalizeWhitespace(s.fullContentHtml)
  );
  const hasFaq = (s.seoFaq?.length ?? 0) > 0;
  return {
    title: buildScholarshipDetailSeoTitle(normalizeWhitespace(s.title) || 'Scholarship'),
    metaDescription: detailMetaFallbackDescription(s),
    h1: normalizeWhitespace(s.title) || 'Scholarship',
    hasContentBlocks,
    hasFaq,
    scholarshipResultsCount: 1,
    canonical: scholarshipPublicPath(s),
    indexable: s.isIndexable !== false,
    issues
  };
}

async function extractContentInternal(page: AuditInputPage): Promise<InternalExtract> {
  const issues: string[] = [];
  if (page.urlPath === '/resources') {
    return {
      title: `${RESOURCES_PAGE_TITLE} — Guides & Tips`,
      metaDescription:
        'Guides and expert tips to help you find scholarships, write stronger applications, and stay organized.',
      h1: 'Resources',
      hasContentBlocks: true,
      hasFaq: false,
      scholarshipResultsCount: null,
      canonical: RESOURCES_SECTION_PATH,
      indexable: true,
      issues: ['result_count_unavailable_internal_context']
    };
  }

  const slug = page.contentSlug?.trim();
  if (!slug) {
    return {
      title: null,
      metaDescription: null,
      h1: null,
      hasContentBlocks: false,
      hasFaq: false,
      scholarshipResultsCount: null,
      canonical: null,
      indexable: null,
      issues: ['content_slug_missing', 'result_count_unavailable_internal_context']
    };
  }
  const post = page.contentPost;
  if (!post) {
    return {
      title: null,
      metaDescription: null,
      h1: null,
      hasContentBlocks: false,
      hasFaq: false,
      scholarshipResultsCount: null,
      canonical: `/resources/${encodeURIComponent(slug)}`,
      indexable: true,
      issues: ['content_posts_unavailable', 'result_count_unavailable_internal_context']
    };
  }
  const faqCount =
    Array.isArray((post as Record<string, unknown> | null)?.faq)
      ? ((post as Record<string, unknown>).faq as unknown[]).filter((item) => {
          if (!item || typeof item !== 'object') return false;
          const o = item as Record<string, unknown>;
          return Boolean(normalizeWhitespace(String(o.question ?? o.q ?? ''))) &&
            Boolean(normalizeWhitespace(String(o.answer ?? o.a ?? '')));
        }).length
      : 0;
  const h1 = normalizeWhitespace(post?.title ?? '');
  const hasContentBlocks = Boolean(normalizeWhitespace(post?.body_html ?? ''));
  return {
    title: normalizeWhitespace(post?.meta_title ?? post?.title ?? '') || null,
    metaDescription: normalizeWhitespace(post?.meta_description ?? '') || null,
    h1: h1 || null,
    hasContentBlocks,
    hasFaq: faqCount > 0,
    scholarshipResultsCount: null,
    canonical: `/resources/${encodeURIComponent(slug)}`,
    indexable: true,
    issues: ['result_count_unavailable_internal_context']
  };
}

function parseFaqLikeArray(value: unknown): Array<{ question: string; answer: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const question = normalizeWhitespace(String(o.question ?? o.q ?? ''));
      const answer = normalizeWhitespace(String(o.answer ?? o.a ?? ''));
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter((x): x is { question: string; answer: string } => Boolean(x));
}

function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

async function extractEssayInternal(page: AuditInputPage): Promise<InternalExtract> {
  const issues: string[] = [];
  if (page.urlPath === '/essays') {
    return {
      title: ESSAYS_PAGE_TITLE,
      metaDescription:
        'Long-tail guides that teach you how to plan, draft, and revise scholarship essays.',
      h1: ESSAYS_PAGE_TITLE,
      hasContentBlocks: true,
      hasFaq: false,
      scholarshipResultsCount: null,
      canonical: ESSAYS_SECTION_PATH,
      indexable: true,
      issues: ['result_count_unavailable_internal_context']
    };
  }

  const slug = page.essaySlug?.trim();
  if (!slug) {
    return {
      title: null,
      metaDescription: null,
      h1: null,
      hasContentBlocks: false,
      hasFaq: false,
      scholarshipResultsCount: null,
      canonical: null,
      indexable: null,
      issues: ['essay_slug_missing', 'result_count_unavailable_internal_context']
    };
  }

  const essay = page.essayPost;
  if (!essay) {
    return {
      title: null,
      metaDescription: null,
      h1: null,
      hasContentBlocks: false,
      hasFaq: false,
      scholarshipResultsCount: null,
      canonical: `/essays/${encodeURIComponent(slug)}`,
      indexable: true,
      issues: ['essays_unavailable', 'result_count_unavailable_internal_context']
    };
  }

  const faq = parseFaqLikeArray(essay.faq);
  return {
    title: normalizeWhitespace(essay.title) || null,
    metaDescription: normalizeWhitespace(essay.meta_description) || null,
    h1: normalizeWhitespace(essay.title) || null,
    hasContentBlocks: Boolean(normalizeWhitespace(essay.content_html)),
    hasFaq: faq.length > 0,
    scholarshipResultsCount: null,
    canonical: `/essays/${encodeURIComponent(slug)}`,
    indexable: true,
    issues: ['result_count_unavailable_internal_context']
  };
}

async function extractCompareInternal(page: AuditInputPage): Promise<InternalExtract> {
  const issues: string[] = [];
  if (page.urlPath === '/compare') {
    return {
      title: 'Compare Scholarships Across Universities and States',
      metaDescription:
        'Compare scholarship depth, funding signals, and grant climate across universities and states to decide where your profile fits best.',
      h1: 'Compare Scholarship Opportunities',
      hasContentBlocks: true,
      hasFaq: false,
      scholarshipResultsCount: null,
      canonical: '/compare',
      indexable: true,
      issues: ['result_count_unavailable_internal_context']
    };
  }
  if (page.urlPath === '/compare/universities') {
    return {
      title: 'University Scholarship Comparison',
      metaDescription:
        'Browse published university-vs-university scholarship comparisons, evaluate funding patterns, and open the matchup that fits your search intent.',
      h1: 'University vs University Scholarship Comparisons',
      hasContentBlocks: true,
      hasFaq: false,
      scholarshipResultsCount: null,
      canonical: '/compare/universities',
      indexable: true,
      issues: ['result_count_unavailable_internal_context']
    };
  }
  if (page.urlPath === '/compare/states') {
    return {
      title: 'State Scholarship Comparison',
      metaDescription:
        'Browse published state-vs-state scholarship comparisons to evaluate grant climate, funding depth, and where to focus your applications.',
      h1: 'State vs State Scholarship Comparisons',
      hasContentBlocks: true,
      hasFaq: false,
      scholarshipResultsCount: null,
      canonical: '/compare/states',
      indexable: true,
      issues: ['result_count_unavailable_internal_context']
    };
  }

  const slug = page.compareSlug?.trim();
  if (!slug) {
    return {
      title: null,
      metaDescription: null,
      h1: null,
      hasContentBlocks: false,
      hasFaq: false,
      scholarshipResultsCount: null,
      canonical: null,
      indexable: null,
      issues: ['compare_slug_missing', 'result_count_unavailable_internal_context']
    };
  }
  const row = page.comparePage;
  if (!row) {
    return {
      title: null,
      metaDescription: null,
      h1: null,
      hasContentBlocks: false,
      hasFaq: false,
      scholarshipResultsCount: null,
      canonical:
        page.compareType === 'state'
          ? `/compare/states/${encodeURIComponent(slug)}`
          : `/compare/universities/${encodeURIComponent(slug)}`,
      indexable: true,
      issues: ['compare_pages_unavailable', 'result_count_unavailable_internal_context']
    };
  }
  const content = parseJsonRecord(row.content_json);
  const bodyHtml = normalizeWhitespace(String(content.body_html ?? ''));
  const faq = parseFaqLikeArray(content.faq);
  const fallbackTitle =
    page.compareType === 'state'
      ? `State vs State Scholarship Climate 2026`
      : `University vs University Scholarship Comparison 2026`;
  const title = normalizeWhitespace(row.meta_title) || fallbackTitle;
  return {
    title,
    metaDescription: normalizeWhitespace(row.meta_description) || null,
    h1: title,
    hasContentBlocks: Boolean(bodyHtml || normalizeWhitespace(row.ai_verdict)),
    hasFaq: faq.length > 0,
    scholarshipResultsCount: null,
    canonical:
      page.compareType === 'state'
        ? `/compare/states/${encodeURIComponent(slug)}`
        : `/compare/universities/${encodeURIComponent(slug)}`,
    indexable: true,
    issues: ['result_count_unavailable_internal_context']
  };
}

async function extractProviderInternal(page: AuditInputPage): Promise<InternalExtract> {
  if (page.urlPath === '/providers') {
    return {
      title: 'Scholarship Providers',
      metaDescription:
        'Explore organizations and foundations offering financial aid across the United States.',
      h1: 'Scholarship Providers',
      hasContentBlocks: true,
      hasFaq: false,
      scholarshipResultsCount: null,
      canonical: '/providers',
      indexable: true,
      issues: ['result_count_unavailable_internal_context']
    };
  }

  const slug = page.providerSlug?.trim();
  if (!slug) {
    return {
      title: null,
      metaDescription: null,
      h1: null,
      hasContentBlocks: false,
      hasFaq: false,
      scholarshipResultsCount: null,
      canonical: null,
      indexable: null,
      issues: ['provider_slug_missing', 'result_count_unavailable_internal_context']
    };
  }
  const row = page.providerRow;
  if (!row) {
    return {
      title: null,
      metaDescription: null,
      h1: null,
      hasContentBlocks: false,
      hasFaq: false,
      scholarshipResultsCount: null,
      canonical: `/providers/${encodeURIComponent(slug)}`,
      indexable: true,
      issues: ['providers_unavailable', 'result_count_unavailable_internal_context']
    };
  }
  const displayName = normalizeWhitespace(row.display_name) || slug.replace(/-/g, ' ');
  const metaDescription =
    normalizeWhitespace(row.ai_description) ||
    `Scholarships and profile for ${displayName} on ScholarshipTop.`;
  const providerFaq = parseFaqLikeArray(row.ai_faq);
  return {
    title: `${displayName} | Scholarship Provider`,
    metaDescription,
    h1: displayName,
    hasContentBlocks: Boolean(normalizeWhitespace(row.ai_description)),
    hasFaq: providerFaq.length > 0,
    scholarshipResultsCount:
      typeof row.scholarship_count === 'number' ? row.scholarship_count : null,
    canonical: `/providers/${encodeURIComponent(slug)}`,
    indexable: true,
    issues:
      typeof row.scholarship_count === 'number'
        ? []
        : ['result_count_unavailable_internal_context']
  };
}

async function extractInternal(page: AuditInputPage): Promise<InternalExtract> {
  if (page.pageType === 'scholarship_seo') return extractScholarshipListingInternal(page);
  if (page.pageType === 'scholarship_detail') return extractScholarshipDetailInternal(page);
  if (page.pageType === 'content_page') return extractContentInternal(page);
  if (page.pageType === 'essay_page') return extractEssayInternal(page);
  if (page.pageType === 'compare_page') return extractCompareInternal(page);
  return extractProviderInternal(page);
}

function dedupePages(pages: AuditInputPage[]): AuditInputPage[] {
  const seen = new Set<string>();
  const out: AuditInputPage[] = [];
  for (const p of pages) {
    const key = `${p.pageType}:${p.urlPath}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

async function listAuditPages(): Promise<{
  pages: AuditInputPage[];
  reportWarnings: string[];
}> {
  const reportWarnings: string[] = [];
  const listingManifestPaths = getAllIndexableSeoManifestPathsForSitemap(3);
  const listingLongTail = getLongTailSitemapSlugs().map((s) => String(s));
  const listingPages: AuditInputPage[] = [...listingManifestPaths, ...listingLongTail].map((p) => ({
    pageType: 'scholarship_seo',
    urlPath: `/scholarships/${p}`,
    sourceKey: p,
    canonicalPath: p
  }));

  let scholarships: Scholarship[] = [];
  if (!hasSupabaseScriptEnv()) {
    reportWarnings.push('detail_pages_skipped_missing_supabase_env');
  } else {
    try {
      scholarships = await fetchActiveScholarshipsForScript();
    } catch (e) {
      reportWarnings.push('detail_pages_skipped_missing_supabase_env');
      console.warn(
        '[seo:audit] detail pages source unavailable:',
        e instanceof Error ? e.message : String(e)
      );
    }
  }
  const detailPages: AuditInputPage[] = scholarships.map((s) => ({
    pageType: 'scholarship_detail',
    urlPath: scholarshipPublicPath(s),
    sourceKey: s.slug?.trim() || s.id,
    scholarship: s
  }));

  let contentRows: Array<{
    slug: string;
    published_at: string | null;
    title: string | null;
    meta_title: string | null;
    meta_description: string | null;
    body_html: string | null;
    faq: unknown;
  }> = [];
  let essayRows: Array<{
    slug: string;
    title: string | null;
    meta_description: string | null;
    content_html: string | null;
    faq: unknown;
  }> = [];
  let compareUniversityRows: Array<{
    slug: string;
    meta_title: string | null;
    meta_description: string | null;
    content_json: unknown;
    ai_verdict: string | null;
  }> = [];
  let compareStateRows: Array<{
    slug: string;
    meta_title: string | null;
    meta_description: string | null;
    content_json: unknown;
    ai_verdict: string | null;
  }> = [];
  let providerRows: Array<{
    slug: string;
    display_name: string | null;
    ai_description: string | null;
    ai_faq: unknown;
    scholarship_count: number | null;
  }> = [];
  try {
    const supabase = createPublicClient();
    if (supabase) {
      const { data } = await supabase
        .from('content_posts')
        .select('slug, published_at, title, meta_title, meta_description, body_html, faq')
        .eq('status', 'published')
        .not('slug', 'is', null)
        .neq('slug', '')
        .order('published_at', { ascending: false, nullsFirst: false });
      contentRows = ((data ?? []) as Array<{
        slug: string;
        published_at: string | null;
        title: string | null;
        meta_title: string | null;
        meta_description: string | null;
        body_html: string | null;
        faq: unknown;
      }>);

      const { data: essaysData } = await supabase
        .from('essays')
        .select('slug, title, meta_description, content_html, faq')
        .eq('is_published', true)
        .not('slug', 'is', null)
        .neq('slug', '')
        .order('updated_at', { ascending: false, nullsFirst: false });
      essayRows = ((essaysData ?? []) as Array<{
        slug: string;
        title: string | null;
        meta_description: string | null;
        content_html: string | null;
        faq: unknown;
      }>);

      const { data: compareData } = await supabase
        .from('compare_pages')
        .select('slug, meta_title, meta_description, content_json, ai_verdict')
        .eq('status', 'published')
        .not('slug', 'is', null)
        .neq('slug', '')
        .order('updated_at', { ascending: false, nullsFirst: false });
      compareUniversityRows = ((compareData ?? []) as Array<{
        slug: string;
        meta_title: string | null;
        meta_description: string | null;
        content_json: unknown;
        ai_verdict: string | null;
      }>);

      const { data: compareStatesData } = await supabase
        .from('state_compare_pages')
        .select('slug, meta_title, meta_description, content_json, ai_verdict')
        .eq('status', 'published')
        .not('slug', 'is', null)
        .neq('slug', '')
        .order('updated_at', { ascending: false, nullsFirst: false });
      compareStateRows = ((compareStatesData ?? []) as Array<{
        slug: string;
        meta_title: string | null;
        meta_description: string | null;
        content_json: unknown;
        ai_verdict: string | null;
      }>);

      const { data: providersData } = await supabase
        .from('provider_hub_listing')
        .select('slug, display_name, scholarship_count, ai_description')
        .not('slug', 'is', null)
        .neq('slug', '')
        .order('scholarship_count', { ascending: false, nullsFirst: false });
      const providerHubRows = ((providersData ?? []) as Array<{
        slug: string;
        display_name: string | null;
        ai_description: string | null;
        scholarship_count: number | null;
      }>);
      const providerSlugs = providerHubRows
        .map((row) => row.slug?.trim())
        .filter((v): v is string => Boolean(v));
      let providerFaqBySlug = new Map<string, unknown>();
      if (providerSlugs.length > 0) {
        const { data: providersFaqData } = await supabase
          .from('providers')
          .select('slug, ai_faq')
          .in('slug', providerSlugs);
        providerFaqBySlug = new Map(
          ((providersFaqData ?? []) as Array<{ slug: string; ai_faq: unknown }>).map((row) => [
            row.slug,
            row.ai_faq
          ])
        );
      }
      providerRows = providerHubRows.map((row) => ({
        slug: row.slug,
        display_name: row.display_name,
        ai_description: row.ai_description,
        ai_faq: providerFaqBySlug.get(row.slug) ?? null,
        scholarship_count: row.scholarship_count
      }));
    }
  } catch (e) {
    console.warn(
      '[seo:audit] content_posts source unavailable:',
      e instanceof Error ? e.message : String(e)
    );
    reportWarnings.push('content_pages_skipped_missing_supabase_env');
  }
  const contentPages: AuditInputPage[] = [
    { pageType: 'content_page', urlPath: '/resources', sourceKey: '/resources' },
    ...contentRows.map((r) => ({
      pageType: 'content_page' as const,
      urlPath: `/resources/${encodeURIComponent(r.slug.trim())}`,
      sourceKey: r.slug.trim(),
      contentSlug: r.slug.trim(),
      contentPost: {
        slug: r.slug.trim(),
        title: r.title,
        meta_title: r.meta_title,
        meta_description: r.meta_description,
        body_html: r.body_html,
        faq: r.faq
      }
    }))
  ];

  const essayPages: AuditInputPage[] = [
    { pageType: 'essay_page', urlPath: '/essays', sourceKey: '/essays' },
    ...essayRows.map((row) => ({
      pageType: 'essay_page' as const,
      urlPath: `/essays/${encodeURIComponent(row.slug.trim())}`,
      sourceKey: row.slug.trim(),
      essaySlug: row.slug.trim(),
      essayPost: {
        slug: row.slug.trim(),
        title: row.title,
        meta_description: row.meta_description,
        content_html: row.content_html,
        faq: row.faq
      }
    }))
  ];

  const comparePages: AuditInputPage[] = [
    { pageType: 'compare_page', urlPath: '/compare', sourceKey: '/compare' },
    {
      pageType: 'compare_page',
      urlPath: '/compare/universities',
      sourceKey: '/compare/universities'
    },
    { pageType: 'compare_page', urlPath: '/compare/states', sourceKey: '/compare/states' },
    ...compareUniversityRows.map((row) => ({
      pageType: 'compare_page' as const,
      compareType: 'university' as const,
      compareSlug: row.slug.trim(),
      urlPath: `/compare/universities/${encodeURIComponent(row.slug.trim())}`,
      sourceKey: `u:${row.slug.trim()}`,
      comparePage: {
        slug: row.slug.trim(),
        meta_title: row.meta_title,
        meta_description: row.meta_description,
        content_json: row.content_json,
        ai_verdict: row.ai_verdict
      }
    })),
    ...compareStateRows.map((row) => ({
      pageType: 'compare_page' as const,
      compareType: 'state' as const,
      compareSlug: row.slug.trim(),
      urlPath: `/compare/states/${encodeURIComponent(row.slug.trim())}`,
      sourceKey: `s:${row.slug.trim()}`,
      comparePage: {
        slug: row.slug.trim(),
        meta_title: row.meta_title,
        meta_description: row.meta_description,
        content_json: row.content_json,
        ai_verdict: row.ai_verdict
      }
    }))
  ];
  const providerPages: AuditInputPage[] = [
    { pageType: 'provider_page', urlPath: '/providers', sourceKey: '/providers' },
    ...providerRows.map((row) => ({
      pageType: 'provider_page' as const,
      providerSlug: row.slug.trim(),
      urlPath: `/providers/${encodeURIComponent(row.slug.trim())}`,
      sourceKey: row.slug.trim(),
      providerRow: {
        slug: row.slug.trim(),
        display_name: row.display_name,
        ai_description: row.ai_description,
        ai_faq: row.ai_faq,
        scholarship_count: row.scholarship_count
      }
    }))
  ];

  // Keep deterministic priority order by page type for bounded runs:
  // listings -> detail -> articles -> essays -> compare.
  const pages = dedupePages([
    ...listingPages,
    ...detailPages,
    ...contentPages,
    ...essayPages,
    ...comparePages,
    ...providerPages
  ]);
  return { pages, reportWarnings: Array.from(new Set(reportWarnings)) };
}

function toCsvValue(input: string | number | boolean | null | undefined): string {
  const s = input == null ? '' : String(input);
  if (!/[",\n]/.test(s)) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

function selectPagesForAudit(
  pages: AuditInputPage[],
  totalLimit: number | null
): AuditInputPage[] {
  const listingLimit = envInt('SEO_AUDIT_LIMIT_LISTING');
  const scholarshipLimit = envInt('SEO_AUDIT_LIMIT_SCHOLARSHIP');
  const articleLimit = envInt('SEO_AUDIT_LIMIT_ARTICLE');
  const essayLimit = envInt('SEO_AUDIT_LIMIT_ESSAY');
  const compareLimit = envInt('SEO_AUDIT_LIMIT_COMPARE');
  const providerLimit = envInt('SEO_AUDIT_LIMIT_PROVIDER');

  const hasPerTypeLimits = [
    listingLimit,
    scholarshipLimit,
    articleLimit,
    essayLimit,
    compareLimit,
    providerLimit
  ].some((v) => v != null);

  if (!hasPerTypeLimits) {
    return totalLimit ? pages.slice(0, totalLimit) : pages;
  }

  const quotas: Record<OutputPageType, number> = {
    listing: listingLimit ?? Number.MAX_SAFE_INTEGER,
    scholarship: scholarshipLimit ?? Number.MAX_SAFE_INTEGER,
    article: articleLimit ?? Number.MAX_SAFE_INTEGER,
    essay: essayLimit ?? Number.MAX_SAFE_INTEGER,
    compare: compareLimit ?? Number.MAX_SAFE_INTEGER,
    provider: providerLimit ?? Number.MAX_SAFE_INTEGER
  };
  const used: Record<OutputPageType, number> = {
    listing: 0,
    scholarship: 0,
    article: 0,
    essay: 0,
    compare: 0,
    provider: 0
  };

  const picked: AuditInputPage[] = [];
  for (const page of pages) {
    const type = toOutputType(page.pageType);
    if (used[type] >= quotas[type]) continue;
    picked.push(page);
    used[type] += 1;
  }

  return totalLimit ? picked.slice(0, totalLimit) : picked;
}

async function main() {
  const limit = envInt('SEO_AUDIT_LIMIT');
  const baseUrl =
    process.env.SEO_AUDIT_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    'http://localhost:3000';

  const { pages, reportWarnings } = await listAuditPages();
  const targetPages = selectPagesForAudit(pages, limit);

  const provisional: PageAudit[] = [];
  const titleKeyToIdx = new Map<string, number[]>();
  const metaKeyToIdx = new Map<string, number[]>();

  for (const page of targetPages) {
    const issues: string[] = [];
    let extracted: InternalExtract | null = null;
    let fallback: FallbackExtract | null = null;
    let sourceType: SourceType = 'internal';
    try {
      extracted = await extractInternal(page);
      issues.push(...extracted.issues);
    } catch (e) {
      issues.push(`internal_extract_failed:${e instanceof Error ? e.message : String(e)}`);
    }

    if (!extracted || !extracted.title || !extracted.metaDescription || !extracted.h1) {
      try {
        fallback = await fetchHtmlFallback(baseUrl, page.urlPath);
        sourceType = 'http_fallback';
      } catch (e) {
        issues.push(`fetch_unavailable:${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const title = extracted?.title ?? fallback?.title ?? null;
    const metaDescription =
      extracted?.metaDescription ?? fallback?.metaDescription ?? null;
    const h1 = extracted?.h1 ?? fallback?.h1 ?? null;
    const hasContentBlocks =
      extracted?.hasContentBlocks ?? fallback?.hasContentBlocks ?? false;
    const hasFaq = extracted?.hasFaq ?? fallback?.hasFaq ?? false;
    const scholarshipResultsCount = extracted?.scholarshipResultsCount ?? null;
    const canonical = extracted?.canonical ?? fallback?.canonical ?? null;
    const indexable =
      extracted?.indexable ??
      (typeof fallback?.robots === 'string'
        ? !fallback.robots.toLowerCase().includes('noindex')
        : null);

    const titleLength = normalizeWhitespace(title).length;
    const metaLength = normalizeWhitespace(metaDescription).length;
    const titleCheck = title
      ? checkRange(titleLength, 30, 65, TITLE_POINTS, 'title_length')
      : checkExists(title, TITLE_POINTS, 'title_missing');
    const metaCheck = metaDescription
      ? checkRange(metaLength, 120, 160, META_POINTS, 'meta_description_length')
      : checkExists(metaDescription, META_POINTS, 'meta_description_missing');
    const h1Check = checkExists(h1, H1_POINTS, 'h1_missing');
    const contentCheck = checkBoolean(
      hasContentBlocks,
      CONTENT_POINTS,
      'content_blocks_missing',
      hasContentBlocks
    );
    const faqCheck = checkBoolean(hasFaq, FAQ_POINTS, 'faq_missing', hasFaq);

    let resultsCheck: CheckResult;
    if (scholarshipResultsCount == null) {
      resultsCheck = checkUnavailable(
        'result_count_unavailable_internal_context',
        RESULTS_POINTS
      );
    } else {
      resultsCheck = checkBoolean(
        scholarshipResultsCount > 0,
        RESULTS_POINTS,
        'scholarship_results_zero',
        scholarshipResultsCount > 0
      );
      resultsCheck.value = scholarshipResultsCount;
    }

    const canonicalRobotsCheck = checkBoolean(
      Boolean(canonical) && indexable !== false,
      CANONICAL_ROBOTS_POINTS,
      !canonical ? 'canonical_missing' : 'robots_noindex_or_invalid',
      indexable === true
    );

    const duplicateCheck = {
      ok: true,
      pointsAwarded: DUP_POINTS,
      maxPoints: DUP_POINTS
    } as CheckResult;

    if (!titleCheck.ok && titleCheck.reason) issues.push(titleCheck.reason);
    if (!metaCheck.ok && metaCheck.reason) issues.push(metaCheck.reason);
    if (!h1Check.ok && h1Check.reason) issues.push(h1Check.reason);
    if (!contentCheck.ok && contentCheck.reason) issues.push(contentCheck.reason);
    if (!faqCheck.ok && faqCheck.reason) issues.push(faqCheck.reason);
    if (!resultsCheck.ok && resultsCheck.reason) issues.push(resultsCheck.reason);
    if (!canonicalRobotsCheck.ok && canonicalRobotsCheck.reason) {
      issues.push(canonicalRobotsCheck.reason);
    }

    const score =
      titleCheck.pointsAwarded +
      metaCheck.pointsAwarded +
      h1Check.pointsAwarded +
      contentCheck.pointsAwarded +
      faqCheck.pointsAwarded +
      resultsCheck.pointsAwarded +
      canonicalRobotsCheck.pointsAwarded +
      duplicateCheck.pointsAwarded;

    const pageAudit: PageAudit = {
      pageType: page.pageType,
      outputType: toOutputType(page.pageType),
      sourceType,
      url: page.urlPath,
      score,
      status: statusFromScore(score),
      issues: Array.from(new Set(issues)),
      checks: {
        title: titleCheck,
        metaDescription: metaCheck,
        h1: h1Check,
        contentBlocks: contentCheck,
        faq: faqCheck,
        scholarshipResults: resultsCheck,
        canonicalRobots: canonicalRobotsCheck,
        duplicateSafety: duplicateCheck
      },
      title,
      metaDescription,
      titleLength,
      metaDescriptionLength: metaLength,
      scholarshipResultsCount,
      indexable,
      issueCodes: [],
      fixPriority: 'low',
      fixSuggestion: ''
    };
    pageAudit.issueCodes = Array.from(
      new Set(pageAudit.issues.map((issue) => normalizeIssueCode(issue)))
    );
    pageAudit.fixPriority = deriveFixPriority(
      pageAudit.issueCodes,
      pageAudit.score,
      pageAudit.status
    );
    pageAudit.fixSuggestion = pickFixSuggestion(pageAudit.issueCodes, pageAudit.status);

    const tKey = normalizeDuplicateKey(title);
    if (tKey) {
      const list = titleKeyToIdx.get(tKey) ?? [];
      list.push(provisional.length);
      titleKeyToIdx.set(tKey, list);
    }
    const dKey = normalizeDuplicateKey(metaDescription);
    if (dKey) {
      const list = metaKeyToIdx.get(dKey) ?? [];
      list.push(provisional.length);
      metaKeyToIdx.set(dKey, list);
    }
    provisional.push(pageAudit);
  }

  let duplicateTitles = 0;
  let duplicateMetaDescriptions = 0;
  for (const [, idxs] of titleKeyToIdx) {
    if (idxs.length < 2) continue;
    duplicateTitles += 1;
    for (const idx of idxs) {
      const p = provisional[idx]!;
      if (p.checks.duplicateSafety.ok) {
        p.checks.duplicateSafety.ok = false;
        p.checks.duplicateSafety.pointsAwarded = 0;
        p.checks.duplicateSafety.reason = 'duplicate_title';
        p.issues.push('duplicate_title');
        p.score -= DUP_POINTS;
        p.status = statusFromScore(p.score);
      }
    }
  }

  for (const [, idxs] of metaKeyToIdx) {
    if (idxs.length < 2) continue;
    duplicateMetaDescriptions += 1;
    for (const idx of idxs) {
      const p = provisional[idx]!;
      if (p.checks.duplicateSafety.ok) {
        p.checks.duplicateSafety.ok = false;
        p.checks.duplicateSafety.pointsAwarded = 0;
        p.checks.duplicateSafety.reason = 'duplicate_meta_description';
        p.issues.push('duplicate_meta_description');
        p.score -= DUP_POINTS;
        p.status = statusFromScore(p.score);
      }
    }
  }

  const pagesChecked = provisional.length;
  const sum = provisional.reduce((acc, p) => acc + p.score, 0);
  const averageScore = pagesChecked > 0 ? Number((sum / pagesChecked).toFixed(2)) : 0;
  const good = provisional.filter((p) => p.status === 'good').length;
  const medium = provisional.filter((p) => p.status === 'medium').length;
  const bad = provisional.filter((p) => p.status === 'bad').length;
  const zeroResultPages = provisional.filter((p) => p.scholarshipResultsCount === 0).length;
  const missingMetaDescriptions = provisional.filter(
    (p) => !normalizeWhitespace(p.metaDescription).length
  ).length;

  const weakMetaDescriptions = provisional.filter(
    (p) =>
      normalizeWhitespace(p.metaDescription).length > 0 &&
      (p.metaDescriptionLength < 120 || p.metaDescriptionLength > 160)
  ).length;
  const missingFaqBlocks = provisional.filter((p) => !p.checks.faq.ok).length;
  const listingCount = provisional.filter((p) => p.outputType === 'listing').length;
  const scholarshipCount = provisional.filter((p) => p.outputType === 'scholarship').length;
  const articleCount = provisional.filter((p) => p.outputType === 'article').length;
  const essayCount = provisional.filter((p) => p.outputType === 'essay').length;
  const compareCount = provisional.filter((p) => p.outputType === 'compare').length;
  const providerCount = provisional.filter((p) => p.outputType === 'provider').length;
  const topWorst = [...provisional].sort((a, b) => a.score - b.score).slice(0, 20);

  const issueTypeCounts = new Map<string, number>();
  for (const p of provisional) {
    for (const code of p.issueCodes) {
      issueTypeCounts.set(code, (issueTypeCounts.get(code) ?? 0) + 1);
    }
  }
  const topIssueTypes = [...issueTypeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([issueCode, count]) => ({ issueCode, count }));

  const payload = {
    summary: {
      pagesChecked,
      averageScore,
      good,
      medium,
      bad,
      duplicateTitles,
      duplicateMetaDescriptions,
      zeroResultPages,
      missingMetaDescriptions,
      pageTypes: {
        listing: listingCount,
        scholarship: scholarshipCount,
        article: articleCount,
        essay: essayCount,
        compare: compareCount,
        provider: providerCount
      },
      reportWarnings,
      generatedAt: new Date().toISOString()
    },
    pages: provisional.map((p) => ({
      type: p.outputType,
      sourceType: p.sourceType,
      url: p.url,
      score: p.score,
      status: p.status,
      issueCodes: p.issueCodes,
      fixPriority: p.fixPriority,
      fixSuggestion: p.fixSuggestion,
      issues: Array.from(new Set(p.issues)),
      checks: p.checks
    }))
  };

  await fs.mkdir(path.dirname(REPORT_JSON_PATH), { recursive: true });
  await fs.writeFile(REPORT_JSON_PATH, JSON.stringify(payload, null, 2), 'utf-8');

  const csvHeader = [
    'url',
    'type',
    'sourceType',
    'score',
    'status',
    'titleLength',
    'metaDescriptionLength',
    'scholarshipResultsCount',
    'indexable',
    'issues'
  ];
  const csvRows = provisional.map((p) =>
    [
      toCsvValue(p.url),
      toCsvValue(p.outputType),
      toCsvValue(p.sourceType),
      toCsvValue(p.score),
      toCsvValue(p.status),
      toCsvValue(p.titleLength),
      toCsvValue(p.metaDescriptionLength),
      toCsvValue(p.scholarshipResultsCount),
      toCsvValue(p.indexable),
      toCsvValue(Array.from(new Set(p.issues)).join('|'))
    ].join(',')
  );
  await fs.writeFile(REPORT_CSV_PATH, `${csvHeader.join(',')}\n${csvRows.join('\n')}\n`, 'utf-8');

  const weakMetaPages = provisional.filter(
    (p) =>
      normalizeWhitespace(p.metaDescription).length > 0 &&
      (p.metaDescriptionLength < 120 || p.metaDescriptionLength > 160)
  );
  const missingFaqPages = provisional.filter((p) => p.issueCodes.includes('faq_missing'));
  const badScholarshipPages = provisional.filter(
    (p) => p.outputType === 'scholarship' && p.status === 'bad'
  );
  const badArticlePages = provisional.filter(
    (p) => p.outputType === 'article' && p.status === 'bad'
  );
  const priorityCounts = provisional.reduce(
    (acc, p) => {
      acc[p.fixPriority] += 1;
      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0 } as Record<FixPriority, number>
  );
  const actionPlanPayload = {
    summary: {
      totalIssues: provisional.reduce((acc, p) => acc + p.issueCodes.length, 0),
      critical: priorityCounts.critical,
      high: priorityCounts.high,
      medium: priorityCounts.medium,
      low: priorityCounts.low
    },
    topFixes: topWorst.map((p) => ({
      url: p.url,
      type: p.outputType,
      score: p.score,
      issueCodes: p.issueCodes,
      fixPriority: p.fixPriority,
      fixSuggestion: p.fixSuggestion
    })),
    buckets: {
      topWorstPages: topWorst.map((p) => ({
        url: p.url,
        type: p.outputType,
        score: p.score,
        issueCodes: p.issueCodes
      })),
      weakMetaDescriptions: weakMetaPages.map((p) => ({
        url: p.url,
        type: p.outputType,
        score: p.score,
        metaDescriptionLength: p.metaDescriptionLength
      })),
      missingFaqPages: missingFaqPages.map((p) => ({
        url: p.url,
        type: p.outputType,
        score: p.score
      })),
      badScholarshipDetailPages: badScholarshipPages.map((p) => ({
        url: p.url,
        score: p.score,
        issueCodes: p.issueCodes
      })),
      badArticlePages: badArticlePages.map((p) => ({
        url: p.url,
        score: p.score,
        issueCodes: p.issueCodes
      })),
      topIssueTypes
    }
  };
  await fs.writeFile(
    ACTION_PLAN_JSON_PATH,
    JSON.stringify(actionPlanPayload, null, 2),
    'utf-8'
  );

  console.log(`SEO AUDIT SCORE: ${Math.round(averageScore)}/100`);
  console.log(`Pages checked: ${pagesChecked}`);
  console.log(`Good: ${good}`);
  console.log(`Medium: ${medium}`);
  console.log(`Bad: ${bad}`);
  console.log('');
  console.log(`Listings: ${listingCount}`);
  console.log(`Scholarship detail pages: ${scholarshipCount}`);
  console.log(`Articles: ${articleCount}`);
  console.log(`Essays: ${essayCount}`);
  console.log(`Compare: ${compareCount}`);
  console.log(`Providers: ${providerCount}`);
  console.log(`Warnings: ${reportWarnings.length > 0 ? reportWarnings.join(', ') : 'none'}`);
  console.log('');
  console.log('Main problems:');
  console.log(`- ${weakMetaDescriptions} weak meta descriptions`);
  console.log(`- ${duplicateTitles} duplicate titles`);
  console.log(`- ${zeroResultPages} pages with 0 scholarships`);
  console.log(`- ${missingFaqBlocks} missing FAQ blocks`);
  console.log('');
  console.log('Top 20 worst URLs:');
  for (const p of topWorst) {
    console.log(`- [${p.score}] ${p.url}`);
  }
  console.log('');
  console.log('Top issue types:');
  for (const row of topIssueTypes.slice(0, 10)) {
    console.log(`- ${row.issueCode}: ${row.count}`);
  }
  console.log('');
  console.log(`JSON report: ${REPORT_JSON_PATH}`);
  console.log(`CSV report: ${REPORT_CSV_PATH}`);
  console.log(`Action plan: ${ACTION_PLAN_JSON_PATH}`);
}

main().catch((e) => {
  console.error('[seo:audit] fatal', e instanceof Error ? e.message : String(e));
  process.exit(1);
});
