import fs from 'fs/promises';
import path from 'path';
import fsSync from 'fs';

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

import {
  compareAiPayloadToJson,
  generateStateCompareWithOpenAi,
  generateUniversityCompareWithOpenAi,
  stateCompareAiPayloadToJson
} from '../lib/seo/comparePageAi';
import {
  buildStateCompareSourceCandidates,
  buildUniversityCompareSourceCandidates
} from '../lib/seo/compareSources';
import { enrichProviderData } from '../lib/providers/enrichProviderDataCore';
import type { Database, Json } from '../types_db';

type AuditPage = {
  url?: string;
  type?: string;
  issueCodes?: string[];
  score?: number;
  status?: 'good' | 'medium' | 'bad';
};

type FixStats = {
  total: number;
  updated: number;
  skipped: number;
  errors: number;
  promptTokens: number;
  completionTokens: number;
  updatedWithAi: number;
  updatedWithoutAi: number;
};

type ResumeState = {
  completedUrls: string[];
  errorUrls: string[];
  updatedAt: string;
};

const TARGET_TYPES = new Set(['provider', 'scholarship', 'compare', 'article', 'essay']);
const TARGET_ISSUES = new Set([
  'meta_description_length_out_of_range',
  'title_length_out_of_range',
  'faq_missing',
  'duplicate_meta_description',
  'eligibility_missing'
]);
const DB_CHUNK_SIZE = 100;
const REPORT_PATH_DEFAULT = 'docs/seo-fix-targeted-report.json';
const STATE_PATH_DEFAULT = 'docs/seo-fix-targeted-state.json';
const VERIFY_REPORT_PATH_DEFAULT = 'docs/seo-fix-targeted-verification-report.json';
const VERIFY_QUEUE_PATH_DEFAULT = 'docs/seo-fix-targeted-verification-queue.json';
const OPENAI_TIMEOUT_MS = 30_000;
const MODE_CHEAP = 'cheap';
const MODE_DEFAULT = 'default';

type PipelineMode = typeof MODE_CHEAP | typeof MODE_DEFAULT;

type VerifyDecision = 'verified_ok' | 'false_positive' | 'needs_fix';
type QueueItem = { url: string; type: string; issueCodes: string[] };
type SkipReason = 'no_write_target' | 'already_ok' | 'unknown_type';

function argString(name: string): string | null {
  const raw = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!raw) return null;
  const value = raw.slice(name.length + 3).trim();
  return value.length > 0 ? value : null;
}

function argNum(name: string, fallback: number): number {
  const raw = argString(name);
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function argFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function argCsvSet(name: string): Set<string> | null {
  const raw = argString(name);
  if (!raw) return null;
  const items = raw
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  return items.length > 0 ? new Set(items) : null;
}

function normalizePath(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '/';
  let p = trimmed;
  if (!p.startsWith('/')) {
    try {
      p = new URL(p).pathname || '/';
    } catch {
      p = `/${p}`;
    }
  }
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p;
}

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} is required`);
  return v;
}

function requireGpt54(): void {
  const model = process.env.OPENAI_SEO_MODEL?.trim() || '';
  if (model !== 'gpt-5.4') {
    throw new Error(`OPENAI_SEO_MODEL must be gpt-5.4, received "${model || 'unset'}"`);
  }
}

function parseMode(): PipelineMode {
  const raw = (argString('mode') || MODE_DEFAULT).toLowerCase().trim();
  return raw === MODE_CHEAP ? MODE_CHEAP : MODE_DEFAULT;
}

function ensureTitle(raw: string, fallback: string): string {
  let out = (raw || fallback).replace(/\s+/g, ' ').trim();
  if (out.length < 30) out = `${out} USA 2026 Apply`.replace(/\s+/g, ' ').trim();
  if (out.length > 65) out = `${out.slice(0, 64).trimEnd()}…`;
  return out;
}

function ensureMeta(raw: string, fallback: string): string {
  let out = (raw || fallback).replace(/\s+/g, ' ').trim();
  if (out.length < 120) {
    out = `${out} Check eligibility, deadlines, and application steps, then apply using the official scholarship source with confidence.`
      .replace(/\s+/g, ' ')
      .trim();
  }
  if (out.length > 160) out = `${out.slice(0, 159).trimEnd()}…`;
  return out;
}

function inferRouteKind(pageType: string): 'scholarship_listing' | 'scholarship_detail' | 'compare_state' | 'compare_university' {
  if (pageType === 'scholarship') return 'scholarship_detail';
  if (pageType === 'compare') return 'compare_university';
  return 'scholarship_listing';
}

function isTitleInRange(input: string): boolean {
  const n = input.trim().length;
  return n >= 30 && n <= 65;
}

function isMetaInRange(input: string): boolean {
  const n = input.trim().length;
  return n >= 120 && n <= 160;
}

function isTitleGoodEnough(input: string): boolean {
  const t = input.trim();
  if (!t) return false;
  return t.length >= 25 && t.length <= 70;
}

function isMetaGoodEnough(input: string): boolean {
  const t = input.trim();
  if (!t) return false;
  const n = t.length;
  return (n >= 120 && n <= 160) || (n >= 100 && n <= 170);
}

function isVeryBadTitle(input: string): boolean {
  const t = input.trim();
  if (!t) return true;
  if (t.length < 20 || t.length > 90) return true;
  return /^(scholarship|provider|compare|untitled|n\/a)$/i.test(t);
}

function isComplexMetaCase(input: string): boolean {
  const t = input.trim().toLowerCase();
  if (!t) return true;
  if (!isMetaInRange(t)) return true;
  return /\b(tbd|unknown|n\/a|lorem|placeholder)\b/.test(t);
}

function parseFaq(raw: unknown): Array<{ question: string; answer: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const q =
        typeof row.question === 'string' ? row.question : typeof row.q === 'string' ? row.q : '';
      const a =
        typeof row.answer === 'string' ? row.answer : typeof row.a === 'string' ? row.a : '';
      const question = q.replace(/\s+/g, ' ').trim();
      const answer = a.replace(/\s+/g, ' ').trim();
      return question && answer ? { question, answer } : null;
    })
    .filter((x): x is { question: string; answer: string } => Boolean(x));
}

function hasEligibilityTextLike(raw: unknown): boolean {
  const text = String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length >= 24;
}

function ensureFaq(raw: unknown, base: string): Array<{ question: string; answer: string }> {
  const clean = parseFaq(raw);
  if (clean.length >= 3) return clean.slice(0, 5);
  const defaults = [
    {
      question: `Who is eligible for ${base}?`,
      answer:
        'Review official eligibility criteria, required documents, and applicant status before submitting your application.'
    },
    {
      question: `When is the deadline for ${base}?`,
      answer:
        'Use the listed deadline as guidance and confirm the final date on the official scholarship source before submission.'
    },
    {
      question: `How do I complete the application for ${base}?`,
      answer:
        'Prepare required documents early, follow all official instructions, and submit through the verified application channel.'
    }
  ];
  return [...clean, ...defaults].slice(0, 3);
}

function chunked<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function trackProgress(stats: FixStats, progressEvery: number): void {
  const processed = stats.updated + stats.skipped + stats.errors;
  if (processed === 0) return;
  if (processed % progressEvery !== 0 && processed !== stats.total) return;
  console.log(
    `[targeted-fix] progress ${processed}/${stats.total} updated=${stats.updated} skipped=${stats.skipped} errors=${stats.errors}`
  );
}

function siteBaseUrl(): string {
  const explicit = process.env.SEO_FIX_LINK_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site && !/ngrok/i.test(site)) return site.replace(/\/+$/, '');

  const auditBase = process.env.SEO_AUDIT_BASE_URL?.trim();
  if (auditBase && !/ngrok/i.test(auditBase)) return auditBase.replace(/\/+$/, '');

  return 'https://scholarshiptop.com';
}

function toAbsoluteUrl(urlPath: string): string {
  return `${siteBaseUrl()}${normalizePath(urlPath)}`;
}

function loadResumeState(statePath: string): ResumeState {
  if (!fsSync.existsSync(statePath)) {
    return { completedUrls: [], errorUrls: [], updatedAt: new Date(0).toISOString() };
  }
  try {
    const raw = fsSync.readFileSync(statePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<ResumeState>;
    return {
      completedUrls: Array.isArray(parsed.completedUrls)
        ? parsed.completedUrls.map((x) => normalizePath(String(x))).filter(Boolean)
        : [],
      errorUrls: Array.isArray(parsed.errorUrls)
        ? parsed.errorUrls.map((x) => normalizePath(String(x))).filter(Boolean)
        : [],
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date(0).toISOString()
    };
  } catch {
    return { completedUrls: [], errorUrls: [], updatedAt: new Date(0).toISOString() };
  }
}

function saveResumeState(statePath: string, completed: Set<string>, errors: Set<string>): void {
  const payload: ResumeState = {
    completedUrls: Array.from(completed),
    errorUrls: Array.from(errors),
    updatedAt: new Date().toISOString()
  };
  fsSync.mkdirSync(path.dirname(statePath), { recursive: true });
  fsSync.writeFileSync(statePath, JSON.stringify(payload, null, 2), 'utf-8');
}

async function main() {
  const mode = parseMode();
  requireGpt54();
  requireEnv('OPENAI_API_KEY');
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const reportPath = path.resolve(argString('report') || 'docs/seo-audit-report.json');
  const outputPathsPath = path.resolve(argString('out') || 'docs/seo-audit-target-urls.txt');
  const fixReportPath = path.resolve(argString('fix-report') || REPORT_PATH_DEFAULT);
  const verifyReportPath = path.resolve(
    argString('verify-report') || VERIFY_REPORT_PATH_DEFAULT
  );
  const verifyQueuePath = path.resolve(
    argString('verify-queue') || VERIFY_QUEUE_PATH_DEFAULT
  );
  const statePath = path.resolve(argString('state-file') || STATE_PATH_DEFAULT);
  const dryRun = argFlag('dry-run');
  const verifyOnly = argFlag('verify-only');
  const forceAiBad = argFlag('force-ai-bad');
  const useVerificationQueue = argFlag('use-verification-queue');
  const resetState = argFlag('reset-state');
  const maxPages = argNum('max-pages', Number.MAX_SAFE_INTEGER);
  const maxCostUsd = argNum('max-cost-usd', Number.MAX_SAFE_INTEGER);
  const allowedTypes = argCsvSet('types');
  const progressEvery = Math.min(50, Math.max(25, argNum('progress-every', 50)));

  const raw = await fs.readFile(reportPath, 'utf-8');
  const parsed = JSON.parse(raw) as { pages?: AuditPage[] };
  const pages = parsed.pages ?? [];
  const pageByUrl = new Map<string, AuditPage>();
  for (const p of pages) {
    const normalized = normalizePath(p.url || '');
    if (!normalized || normalized === '/') continue;
    pageByUrl.set(normalized, p);
  }

  let targetPages = pages.filter((p) => {
    const type = (p.type || '').trim();
    if (!TARGET_TYPES.has(type)) return false;
    if (allowedTypes && !allowedTypes.has(type)) return false;
    if (forceAiBad && p.status !== 'bad') return false;
    const issues = p.issueCodes ?? [];
    if (forceAiBad) return true;
    return issues.some((code) => TARGET_ISSUES.has(code));
  });

  const targetUrls = Array.from(
    new Set(
      targetPages
        .map((p) => normalizePath(p.url || ''))
        .filter((u) => Boolean(u))
    )
  );
  const resumeState = resetState
    ? { completedUrls: [], errorUrls: [], updatedAt: new Date(0).toISOString() }
    : loadResumeState(statePath);
  const completedFromState = new Set(resumeState.completedUrls.map((x) => normalizePath(x)));
  const errorFromState = new Set(resumeState.errorUrls.map((x) => normalizePath(x)));
  const targetUrlSet = new Set(targetUrls);
  const alreadyCompletedInScope = new Set(
    Array.from(completedFromState).filter((u) => targetUrlSet.has(u))
  );
  const remainingTargetUrls = targetUrls.filter((u) => !alreadyCompletedInScope.has(u));
  const remainingTargetUrlSet = new Set(remainingTargetUrls);

  const db = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  const verificationByUrl = new Map<
    string,
    { decision: VerifyDecision; verifiedIssues: string[]; remainingIssues: string[] }
  >();
  const toCandidateIssueMap = new Map<string, string[]>();
  for (const p of targetPages) {
    const u = normalizePath(p.url || '');
    if (!remainingTargetUrlSet.has(u)) continue;
    const issues = forceAiBad
      ? [
          'title_length_out_of_range',
          'meta_description_length_out_of_range',
          'faq_missing',
          ...(p.type === 'provider' ? ['provider_overview_missing'] : []),
          ...(p.type === 'scholarship' ? ['eligibility_missing'] : [])
        ]
      : (p.issueCodes ?? []).filter((x) => TARGET_ISSUES.has(x));
    if (issues.length > 0) toCandidateIssueMap.set(u, issues);
  }

  let filteredTargetPages: AuditPage[] = [];
  if (forceAiBad && !useVerificationQueue) {
    const queueItems: QueueItem[] = remainingTargetUrls.map((url) => {
      const page = pageByUrl.get(url);
      return {
        url,
        type: (page?.type || '').trim(),
        issueCodes: toCandidateIssueMap.get(url) ?? []
      };
    });
    const verifySummary = {
      candidatesBefore: remainingTargetUrls.length,
      verifiedOk: 0,
      falsePositive: 0,
      needsFix: remainingTargetUrls.length,
      willUpdate: Math.min(remainingTargetUrls.length, maxPages),
      byType: { scholarship: 0, provider: 0, compare: 0, article: 0, essay: 0 } as Record<string, number>,
      byIssue: {} as Record<string, number>
    };
    for (const item of queueItems) {
      verifySummary.byType[item.type] = (verifySummary.byType[item.type] || 0) + 1;
      for (const code of item.issueCodes) {
        verifySummary.byIssue[code] = (verifySummary.byIssue[code] || 0) + 1;
      }
    }
    await fs.mkdir(path.dirname(verifyReportPath), { recursive: true });
    await fs.writeFile(
      verifyReportPath,
      JSON.stringify({ summary: verifySummary, generatedAt: new Date().toISOString() }, null, 2),
      'utf-8'
    );
    await fs.writeFile(
      verifyQueuePath,
      JSON.stringify({ summary: verifySummary, queueItems, generatedAt: new Date().toISOString() }, null, 2),
      'utf-8'
    );
    console.log(
      `[targeted-fix] force-ai-bad before=${verifySummary.candidatesBefore} needs_fix=${verifySummary.needsFix} will_update=${verifySummary.willUpdate}`
    );
    console.log(`[targeted-fix] verification report: ${verifyReportPath}`);
    console.log(`[targeted-fix] verification queue: ${verifyQueuePath}`);
    if (verifyOnly) return;
    filteredTargetPages = targetPages.slice(0, maxPages);
  } else if (!useVerificationQueue) {
  // Scholarship verification pass (DB/internal fields).
  const scholarshipSlugsForVerify = Array.from(
    new Set(
      targetPages
        .filter((p) => p.type === 'scholarship')
        .map((p) => normalizePath(p.url || ''))
        .filter((u) => remainingTargetUrlSet.has(u))
        .filter((u) => u.startsWith('/scholarships/'))
        .map((u) => decodeURIComponent(u.replace('/scholarships/', '')))
        .filter(Boolean)
    )
  );
  if (scholarshipSlugsForVerify.length > 0) {
    for (const slugChunk of chunked(scholarshipSlugsForVerify, DB_CHUNK_SIZE)) {
      const { data: rows } = await db
        .from('scholarships')
        .select(
          'slug, title, seo_excerpt, seo_faq, eligibility_text, requirements_text, summary_short, is_active'
        )
        .in('slug', slugChunk)
        .eq('is_active', true);
      for (const row of rows ?? []) {
        const url = normalizePath(`/scholarships/${row.slug}`);
        const candidateIssues = toCandidateIssueMap.get(url) ?? [];
        const verified = new Set<string>();
        if (candidateIssues.includes('title_length_out_of_range') && isTitleGoodEnough(String(row.title ?? ''))) {
          verified.add('title_length_out_of_range');
        }
        const meta = String(row.seo_excerpt ?? row.summary_short ?? '');
        if (
          (candidateIssues.includes('meta_description_length_out_of_range') ||
            candidateIssues.includes('duplicate_meta_description')) &&
          isMetaGoodEnough(meta)
        ) {
          verified.add('meta_description_length_out_of_range');
          verified.add('duplicate_meta_description');
        }
        if (candidateIssues.includes('faq_missing') && parseFaq(row.seo_faq).length >= 2) {
          verified.add('faq_missing');
        }
        const eligibilityOk =
          hasEligibilityTextLike(row.eligibility_text) || hasEligibilityTextLike(row.requirements_text);
        if (candidateIssues.includes('eligibility_missing') && eligibilityOk) {
          verified.add('eligibility_missing');
        }
        const remaining = candidateIssues.filter((x) => !verified.has(x));
        const decision: VerifyDecision =
          remaining.length === 0
            ? verified.size > 0
              ? 'verified_ok'
              : 'false_positive'
            : 'needs_fix';
        verificationByUrl.set(url, {
          decision,
          verifiedIssues: Array.from(verified),
          remainingIssues: remaining
        });
      }
    }
  }

  // Provider verification pass.
  const providerSlugsForVerify = Array.from(
    new Set(
      targetPages
        .filter((p) => p.type === 'provider')
        .map((p) => normalizePath(p.url || ''))
        .filter((u) => remainingTargetUrlSet.has(u))
        .filter((u) => u.startsWith('/providers/') && u !== '/providers')
        .map((u) => decodeURIComponent(u.replace('/providers/', '')))
        .filter(Boolean)
    )
  );
  if (providerSlugsForVerify.length > 0) {
    for (const slugChunk of chunked(providerSlugsForVerify, DB_CHUNK_SIZE)) {
      const { data: rows } = await db
        .from('providers')
        .select('slug, display_name, ai_description, ai_faq')
        .in('slug', slugChunk);
      for (const row of rows ?? []) {
        const url = normalizePath(`/providers/${row.slug}`);
        const candidateIssues = toCandidateIssueMap.get(url) ?? [];
        const verified = new Set<string>();
        const title = String(row.display_name ?? '');
        if (candidateIssues.includes('title_length_out_of_range') && isTitleGoodEnough(title)) {
          verified.add('title_length_out_of_range');
        }
        if (
          (candidateIssues.includes('meta_description_length_out_of_range') ||
            candidateIssues.includes('duplicate_meta_description')) &&
          isMetaGoodEnough(String(row.ai_description ?? ''))
        ) {
          verified.add('meta_description_length_out_of_range');
          verified.add('duplicate_meta_description');
        }
        if (candidateIssues.includes('faq_missing') && parseFaq(row.ai_faq).length >= 2) {
          verified.add('faq_missing');
        }
        const remaining = candidateIssues.filter((x) => !verified.has(x));
        verificationByUrl.set(url, {
          decision: remaining.length === 0 ? (verified.size > 0 ? 'verified_ok' : 'false_positive') : 'needs_fix',
          verifiedIssues: Array.from(verified),
          remainingIssues: remaining
        });
      }
    }
  }

  // Compare verification pass.
  const compareUSlugsForVerify = Array.from(
    new Set(
      targetPages
        .filter((p) => p.type === 'compare')
        .map((p) => normalizePath(p.url || ''))
        .filter((u) => remainingTargetUrlSet.has(u))
        .filter((u) => u.startsWith('/compare/universities/'))
        .map((u) => decodeURIComponent(u.replace('/compare/universities/', '')))
        .filter(Boolean)
    )
  );
  if (compareUSlugsForVerify.length > 0) {
    for (const slugChunk of chunked(compareUSlugsForVerify, DB_CHUNK_SIZE)) {
      const { data: rows } = await db
        .from('compare_pages')
        .select('slug, meta_title, meta_description, content_json')
        .in('slug', slugChunk);
      for (const row of rows ?? []) {
        const url = normalizePath(`/compare/universities/${row.slug}`);
        const candidateIssues = toCandidateIssueMap.get(url) ?? [];
        const verified = new Set<string>();
        if (candidateIssues.includes('title_length_out_of_range') && isTitleGoodEnough(String(row.meta_title ?? ''))) {
          verified.add('title_length_out_of_range');
        }
        if (
          (candidateIssues.includes('meta_description_length_out_of_range') ||
            candidateIssues.includes('duplicate_meta_description')) &&
          isMetaGoodEnough(String(row.meta_description ?? ''))
        ) {
          verified.add('meta_description_length_out_of_range');
          verified.add('duplicate_meta_description');
        }
        const faqCount = parseFaq((row.content_json as { faq?: unknown } | null)?.faq).length;
        if (candidateIssues.includes('faq_missing') && faqCount >= 2) verified.add('faq_missing');
        const remaining = candidateIssues.filter((x) => !verified.has(x));
        verificationByUrl.set(url, {
          decision: remaining.length === 0 ? (verified.size > 0 ? 'verified_ok' : 'false_positive') : 'needs_fix',
          verifiedIssues: Array.from(verified),
          remainingIssues: remaining
        });
      }
    }
  }
  const compareSSlugsForVerify = Array.from(
    new Set(
      targetPages
        .filter((p) => p.type === 'compare')
        .map((p) => normalizePath(p.url || ''))
        .filter((u) => remainingTargetUrlSet.has(u))
        .filter((u) => u.startsWith('/compare/states/'))
        .map((u) => decodeURIComponent(u.replace('/compare/states/', '')))
        .filter(Boolean)
    )
  );
  if (compareSSlugsForVerify.length > 0) {
    for (const slugChunk of chunked(compareSSlugsForVerify, DB_CHUNK_SIZE)) {
      const { data: rows } = await db
        .from('state_compare_pages')
        .select('slug, meta_title, meta_description, content_json')
        .in('slug', slugChunk);
      for (const row of rows ?? []) {
        const url = normalizePath(`/compare/states/${row.slug}`);
        const candidateIssues = toCandidateIssueMap.get(url) ?? [];
        const verified = new Set<string>();
        if (candidateIssues.includes('title_length_out_of_range') && isTitleGoodEnough(String(row.meta_title ?? ''))) {
          verified.add('title_length_out_of_range');
        }
        if (
          (candidateIssues.includes('meta_description_length_out_of_range') ||
            candidateIssues.includes('duplicate_meta_description')) &&
          isMetaGoodEnough(String(row.meta_description ?? ''))
        ) {
          verified.add('meta_description_length_out_of_range');
          verified.add('duplicate_meta_description');
        }
        const faqCount = parseFaq((row.content_json as { faq?: unknown } | null)?.faq).length;
        if (candidateIssues.includes('faq_missing') && faqCount >= 2) verified.add('faq_missing');
        const remaining = candidateIssues.filter((x) => !verified.has(x));
        verificationByUrl.set(url, {
          decision: remaining.length === 0 ? (verified.size > 0 ? 'verified_ok' : 'false_positive') : 'needs_fix',
          verifiedIssues: Array.from(verified),
          remainingIssues: remaining
        });
      }
    }
  }

  const verifySummary = {
    candidatesBefore: remainingTargetUrls.length,
    verifiedOk: 0,
    falsePositive: 0,
    needsFix: 0,
    willUpdate: 0,
    byType: { scholarship: 0, provider: 0, compare: 0, article: 0, essay: 0 } as Record<string, number>,
    byIssue: {} as Record<string, number>
  };
  const verifiedNeedsFix = new Set<string>();
  const queueItems: QueueItem[] = [];
  for (const url of remainingTargetUrls) {
    const p = pageByUrl.get(url);
    const t = (p?.type || 'scholarship').trim();
    const decision = verificationByUrl.get(url)?.decision ?? 'needs_fix';
    if (decision === 'verified_ok') verifySummary.verifiedOk += 1;
    else if (decision === 'false_positive') verifySummary.falsePositive += 1;
    else {
      verifySummary.needsFix += 1;
      verifySummary.willUpdate += 1;
      verifiedNeedsFix.add(url);
      queueItems.push({
        url,
        type: (pageByUrl.get(url)?.type || '').trim(),
        issueCodes:
          verificationByUrl.get(url)?.remainingIssues ??
          (toCandidateIssueMap.get(url) || [])
      });
      verifySummary.byType[t] = (verifySummary.byType[t] || 0) + 1;
      const issues =
        verificationByUrl.get(url)?.remainingIssues ??
        (toCandidateIssueMap.get(url) || []);
      for (const code of issues) {
        verifySummary.byIssue[code] = (verifySummary.byIssue[code] || 0) + 1;
      }
    }
  }
  await fs.mkdir(path.dirname(verifyReportPath), { recursive: true });
  await fs.writeFile(
    verifyReportPath,
    JSON.stringify(
      {
        summary: verifySummary,
        generatedAt: new Date().toISOString()
      },
      null,
      2
    ),
    'utf-8'
  );
  await fs.writeFile(
    verifyQueuePath,
    JSON.stringify(
      {
        summary: verifySummary,
        queueItems,
        generatedAt: new Date().toISOString()
      },
      null,
      2
    ),
    'utf-8'
  );
  console.log(
    `[targeted-fix] verification before=${verifySummary.candidatesBefore} verified_ok=${verifySummary.verifiedOk} false_positive=${verifySummary.falsePositive} needs_fix=${verifySummary.needsFix} will_update=${verifySummary.willUpdate}`
  );
  console.log(`[targeted-fix] verification report: ${verifyReportPath}`);
  console.log(`[targeted-fix] verification queue: ${verifyQueuePath}`);
  if (verifyOnly) {
    return;
  }

  filteredTargetPages = targetPages.filter((p) => {
    const u = normalizePath(p.url || '');
    return verifiedNeedsFix.has(u);
  });
  if (filteredTargetPages.length > maxPages) {
    filteredTargetPages.length = maxPages;
  }
  } else {
    const queueRaw = await fs.readFile(verifyQueuePath, 'utf-8');
    const queueParsed = JSON.parse(queueRaw) as { queueItems?: QueueItem[] };
    const queueItems = (queueParsed.queueItems ?? []).filter((q) => {
      if (!q.url || !q.type) return false;
      if (allowedTypes && !allowedTypes.has(q.type)) return false;
      return TARGET_TYPES.has(q.type);
    });
    const picked = queueItems.slice(0, maxPages);
    const pickedUrls = new Set(picked.map((x) => normalizePath(x.url)));
    const pickedByUrl = new Map(picked.map((x) => [normalizePath(x.url), x] as const));
    targetPages = pages.filter((p) => pickedUrls.has(normalizePath(p.url || '')));
    pageByUrl.clear();
    for (const p of targetPages) {
      const normalized = normalizePath(p.url || '');
      const pickedItem = pickedByUrl.get(normalized);
      pageByUrl.set(normalized, {
        ...p,
        issueCodes: pickedItem?.issueCodes?.length ? pickedItem.issueCodes : p.issueCodes
      });
    }
    const msg = `[targeted-fix] using verification queue ${verifyQueuePath} picked=${picked.length}`;
    console.log(msg);
    filteredTargetPages = targetPages;
  }
  const filteredTargetUrls = Array.from(new Set(filteredTargetPages.map((p) => normalizePath(p.url || '')).filter(Boolean)));
  const filteredTargetUrlSet = new Set(filteredTargetUrls);

  const scholarshipSlugs = Array.from(
    new Set(
      filteredTargetPages
        .filter((p) => p.type === 'scholarship')
        .map((p) => normalizePath(p.url || ''))
        .filter((u) => filteredTargetUrlSet.has(u))
        .filter((u) => u.startsWith('/scholarships/'))
        .map((u) => decodeURIComponent(u.replace('/scholarships/', '')))
        .filter(Boolean)
    )
  );
  const providerSlugs = Array.from(
    new Set(
      filteredTargetPages
        .filter((p) => p.type === 'provider')
        .map((p) => normalizePath(p.url || ''))
        .filter((u) => filteredTargetUrlSet.has(u))
        .filter((u) => u.startsWith('/providers/') && u !== '/providers')
        .map((u) => decodeURIComponent(u.replace('/providers/', '')))
        .filter(Boolean)
    )
  );
  const compareUniversitySlugs = Array.from(
    new Set(
      filteredTargetPages
        .filter((p) => p.type === 'compare')
        .map((p) => normalizePath(p.url || ''))
        .filter((u) => filteredTargetUrlSet.has(u))
        .filter((u) => u.startsWith('/compare/universities/'))
        .map((u) => decodeURIComponent(u.replace('/compare/universities/', '')))
        .filter(Boolean)
    )
  );
  const compareStateSlugs = Array.from(
    new Set(
      filteredTargetPages
        .filter((p) => p.type === 'compare')
        .map((p) => normalizePath(p.url || ''))
        .filter((u) => filteredTargetUrlSet.has(u))
        .filter((u) => u.startsWith('/compare/states/'))
        .map((u) => decodeURIComponent(u.replace('/compare/states/', '')))
        .filter(Boolean)
    )
  );

  const stats: FixStats = {
    total: filteredTargetUrls.length,
    updated: 0,
    skipped: 0,
    errors: 0,
    promptTokens: 0,
    completionTokens: 0,
    updatedWithAi: 0,
    updatedWithoutAi: 0
  };
  const doneUrlSet = new Set<string>();
  for (const doneUrl of alreadyCompletedInScope) {
    doneUrlSet.add(doneUrl);
    stats.skipped += 1;
    console.log(`[targeted-fix] skipped ${toAbsoluteUrl(doneUrl)} reason=already_ok`);
  }
  const recentUpdatedLinks: string[] = [];
  const recentErrorLinks: string[] = [];
  const completedThisOrPrevious = new Set<string>(alreadyCompletedInScope);
  const errorUrls = new Set<string>(errorFromState);
  let checkpointCounter = 0;
  const checkpoint = () => {
    checkpointCounter += 1;
    if (checkpointCounter % 10 !== 0) return;
    saveResumeState(statePath, completedThisOrPrevious, errorUrls);
  };
  const markUpdated = (url: string, usedAi: boolean) => {
    const normalized = normalizePath(url);
    if (doneUrlSet.has(normalized)) return;
    doneUrlSet.add(normalized);
    completedThisOrPrevious.add(normalized);
    errorUrls.delete(normalized);
    stats.updated += 1;
    if (usedAi) stats.updatedWithAi += 1;
    else stats.updatedWithoutAi += 1;
    const absolute = toAbsoluteUrl(normalized);
    recentUpdatedLinks.push(absolute);
    if (recentUpdatedLinks.length > 5) recentUpdatedLinks.shift();
    console.log(`[targeted-fix] updated ${absolute}`);
    trackProgress(stats, progressEvery);
    checkpoint();
  };
  const markSkipped = (url: string, reason: SkipReason) => {
    const normalized = normalizePath(url);
    if (doneUrlSet.has(normalized)) return;
    doneUrlSet.add(normalized);
    stats.skipped += 1;
    console.log(`[targeted-fix] skipped ${toAbsoluteUrl(normalized)} reason=${reason}`);
    trackProgress(stats, progressEvery);
  };
  const markError = (url: string, reason?: string) => {
    const normalized = normalizePath(url);
    if (doneUrlSet.has(normalized)) return;
    doneUrlSet.add(normalized);
    errorUrls.add(normalized);
    stats.errors += 1;
    const absolute = toAbsoluteUrl(normalized);
    recentErrorLinks.push(absolute);
    if (recentErrorLinks.length > 5) recentErrorLinks.shift();
    console.log(`[targeted-fix] write_failed ${absolute}${reason ? ` reason=${reason}` : ''}`);
    trackProgress(stats, progressEvery);
    checkpoint();
  };

  console.log(
    `[targeted-fix] mode=${mode} urls=${filteredTargetUrls.length} remaining=${filteredTargetUrls.length} resume_skipped=${alreadyCompletedInScope.size} scholarship=${scholarshipSlugs.length} provider=${providerSlugs.length} compareU=${compareUniversitySlugs.length} compareS=${compareStateSlugs.length}`
  );
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!.trim(),
    timeout: OPENAI_TIMEOUT_MS,
    maxRetries: 1
  });
  let stoppedByCost = false;
  const promptCostPer1k = Number(process.env.OPENAI_GPT54_INPUT_COST_PER_1K || '');
  const completionCostPer1k = Number(process.env.OPENAI_GPT54_OUTPUT_COST_PER_1K || '');
  const currentEstimatedCost = (): number => {
    if (
      !Number.isFinite(promptCostPer1k) ||
      !Number.isFinite(completionCostPer1k) ||
      promptCostPer1k < 0 ||
      completionCostPer1k < 0
    ) {
      return 0;
    }
    return (stats.promptTokens / 1000) * promptCostPer1k + (stats.completionTokens / 1000) * completionCostPer1k;
  };
  const guardCost = (): boolean => {
    if (!Number.isFinite(maxCostUsd) || maxCostUsd <= 0 || maxCostUsd === Number.MAX_SAFE_INTEGER) return true;
    if (currentEstimatedCost() < maxCostUsd) return true;
    if (!stoppedByCost) {
      console.log(`[targeted-fix] stop: estimated cost reached max ($${maxCostUsd})`);
      stoppedByCost = true;
    }
    return false;
  };
  const writeGenericSeoStore = async (urlPath: string, title: string, metaDescription: string, pageType: string) => {
    const normalized = normalizePath(urlPath);
    const routeKind =
      normalized.startsWith('/compare/states/')
        ? 'compare_state'
        : normalized.startsWith('/compare/')
          ? 'compare_university'
          : inferRouteKind(pageType);
    const promptHash = `force-ai-bad:${routeKind}:${normalized}:${title.length}:${metaDescription.length}`;
    if (!dryRun) {
      const { error: cacheErr } = await db.from('seo_meta_cache').upsert(
        {
          canonical_path: normalized,
          route_kind: routeKind,
          prompt_hash: promptHash,
          meta_description: metaDescription,
          status: 'ready',
          model: 'gpt-5.4',
          source: 'fallback',
          error_message: null,
          generated_at: new Date().toISOString()
        },
        { onConflict: 'canonical_path' }
      );
      if (cacheErr) throw new Error(`seo_meta_cache: ${cacheErr.message}`);
      const { error: queueErr } = await db.from('seo_meta_generation_queue').upsert(
        {
          canonical_path: normalized,
          route_kind: routeKind,
          prompt_hash: promptHash,
          fallback_description: metaDescription,
          context_json: { title, force_ai_bad: true, page_type: pageType },
          priority: 100,
          status: 'completed',
          attempts: 1,
          max_attempts: 1,
          last_error: null
        },
        { onConflict: 'canonical_path' }
      );
      if (queueErr) throw new Error(`seo_meta_generation_queue: ${queueErr.message}`);
    }
  };

  if (scholarshipSlugs.length > 0) {
    for (const slugChunk of chunked(scholarshipSlugs, DB_CHUNK_SIZE)) {
      const { data: rows, error } = await db
        .from('scholarships')
        .select(
          'id, slug, title, summary_short, seo_excerpt, seo_faq, eligibility_text, deadline_text, requirements_text, is_active, updated_at'
        )
        .in('slug', slugChunk)
        .eq('is_active', true);
      if (error) {
        for (const slug of slugChunk) markError(`/scholarships/${slug}`);
        continue;
      }
      for (const row of rows ?? []) {
        if (stoppedByCost) break;
        const url = `/scholarships/${row.slug ?? row.id}`;
        try {
          const pageInfo = pageByUrl.get(normalizePath(url));
          const score = Number(pageInfo?.score ?? 100);
          const issues = new Set(pageInfo?.issueCodes ?? []);

          const fallbackTitle = row.title ?? 'Scholarship';
          const templateTitle = ensureTitle(row.title ?? '', fallbackTitle);
          const fallbackMetaSource = row.seo_excerpt ?? row.summary_short ?? `${templateTitle} in USA 2026`;
          const templateMeta = ensureMeta(row.seo_excerpt ?? '', fallbackMetaSource);
          const templateFaq = ensureFaq(row.seo_faq, templateTitle);

          const titleNeedsGpt =
            forceAiBad ||
            (issues.has('title_length_out_of_range') && score < 70 && isVeryBadTitle(row.title ?? ''));
          const metaNeedsGpt =
            forceAiBad ||
            (issues.has('meta_description_length_out_of_range') &&
              (!isMetaInRange(templateMeta) || isComplexMetaCase(row.seo_excerpt ?? '')));
          const useGpt = titleNeedsGpt || (mode !== MODE_CHEAP && metaNeedsGpt);

          let finalTitle = templateTitle;
          let finalMeta = templateMeta;
          if (useGpt) {
            if (!guardCost()) break;
            const prompt = [
              'Return strict JSON only: {"title":"","metaDescription":""}',
              'title 30-65, metaDescription 120-160, concise and factual.',
              `Title: ${row.title ?? ''}`,
              `Summary: ${row.summary_short ?? ''}`,
              `Eligibility: ${row.eligibility_text ?? ''}`,
              `Deadline: ${row.deadline_text ?? ''}`,
              `Requirements: ${row.requirements_text ?? ''}`
            ].join('\n');
            const completion = await openai.chat.completions.create({
              model: 'gpt-5.4',
              temperature: 0.15,
              response_format: { type: 'json_object' },
              messages: [
                { role: 'system', content: 'Return valid JSON only.' },
                { role: 'user', content: prompt }
              ]
            }, { timeout: OPENAI_TIMEOUT_MS });
            stats.promptTokens += completion.usage?.prompt_tokens ?? 0;
            stats.completionTokens += completion.usage?.completion_tokens ?? 0;
            const payload = JSON.parse(completion.choices[0]?.message?.content?.trim() || '{}') as {
              title?: string;
              metaDescription?: string;
            };
            finalTitle = ensureTitle(payload.title ?? templateTitle, templateTitle);
            finalMeta = ensureMeta(payload.metaDescription ?? templateMeta, templateMeta);
          }
          if (!dryRun) {
            const payload: Record<string, unknown> = {};
            if (forceAiBad || issues.has('title_length_out_of_range')) payload.title = finalTitle;
            if (
              forceAiBad ||
              issues.has('meta_description_length_out_of_range') ||
              issues.has('duplicate_meta_description')
            ) {
              payload.seo_excerpt = finalMeta;
            }
            if (forceAiBad || issues.has('faq_missing')) payload.seo_faq = templateFaq as unknown as Json;
            if ((forceAiBad || issues.has('eligibility_missing')) && !hasEligibilityTextLike(row.eligibility_text)) {
              payload.eligibility_text =
                'Review official eligibility criteria and requirements from the scholarship source before applying.';
            }
            if (Object.keys(payload).length === 0) {
              markSkipped(url, 'already_ok');
              continue;
            }
            const { error: upErr } = await db.from('scholarships').update(payload).eq('id', row.id);
            if (upErr) {
              markError(url);
              continue;
            }
          }
          markUpdated(url, useGpt);
        } catch {
          markError(url);
        }
      }
      if (stoppedByCost) break;
    }
  }

  if (providerSlugs.length > 0) {
    for (const slugChunk of chunked(providerSlugs, DB_CHUNK_SIZE)) {
      const { data: providerRows, error: pErr } = await db
        .from('providers')
        .select('id, slug, display_name, official_url, ai_description, ai_faq')
        .in('slug', slugChunk);
      if (pErr) {
        for (const slug of slugChunk) markError(`/providers/${slug}`);
        continue;
      }
      for (const row of providerRows ?? []) {
        if (stoppedByCost) break;
        const slug = row.slug?.trim();
        const url = `/providers/${slug || row.id}`;
        if (!slug) {
          markSkipped(url, 'no_write_target');
          continue;
        }
        try {
          const name = (row.display_name || slug.replace(/-/g, ' ')).trim();
          const pageInfo = pageByUrl.get(normalizePath(url));
          const issues = new Set(pageInfo?.issueCodes ?? []);
          const templateDescription = ensureMeta(
            row.ai_description ?? '',
            `Scholarships and profile for ${name}. Review eligibility and application steps, then apply through official provider routes.`
          );
          const templateFaq = ensureFaq(row.ai_faq, name);
          const providerNeedsGpt =
            forceAiBad ||
            (mode !== MODE_CHEAP &&
              (issues.has('meta_description_length_out_of_range') && !isMetaInRange(templateDescription)));

          let nextDescription = templateDescription;
          let nextFaq = templateFaq;
          if (providerNeedsGpt) {
            if (!guardCost()) break;
            const official = row.official_url ?? null;
            const enriched = await enrichProviderData(name, {
              officialWebsiteUrl: official,
              providerSlug: slug,
              sourceUrls: [...(official ? [official] : [])]
            });
            nextDescription = ensureMeta(enriched.description ?? '', templateDescription);
            nextFaq = ensureFaq(enriched.faq, name);
          }
          if (!dryRun) {
            const payload: Record<string, unknown> = {};
            if (
              forceAiBad ||
              issues.has('meta_description_length_out_of_range') ||
              issues.has('duplicate_meta_description') ||
              issues.has('provider_overview_missing')
            ) {
              payload.ai_description = nextDescription;
              payload.description = nextDescription;
            }
            if (forceAiBad || issues.has('faq_missing')) payload.ai_faq = nextFaq as unknown as Json;
            if (Object.keys(payload).length === 0) {
              markSkipped(url, 'already_ok');
              continue;
            }
            const { error: upErr } = await db.from('providers').update(payload).eq('id', row.id);
            if (upErr) {
              markError(url);
              continue;
            }
          }
          markUpdated(url, providerNeedsGpt);
        } catch {
          markError(url);
        }
      }
      if (stoppedByCost) break;
    }
  }

  if (compareUniversitySlugs.length > 0) {
    for (const slugChunk of chunked(compareUniversitySlugs, DB_CHUNK_SIZE)) {
      const { data: rows, error } = await db
        .from('compare_pages')
        .select('id, slug, inst_a_id, inst_b_id')
        .in('slug', slugChunk)
        .eq('status', 'published');
      if (error) {
        for (const slug of slugChunk) markError(`/compare/universities/${slug}`);
        continue;
      }
      for (const row of rows ?? []) {
        if (stoppedByCost) break;
        const url = `/compare/universities/${row.slug}`;
        try {
          const { data: insts, error: instErr } = await db
            .from('institutions')
            .select('id, name, website_url')
            .in('id', [row.inst_a_id, row.inst_b_id]);
          if (instErr || !insts || insts.length < 2) {
            markSkipped(url, 'no_write_target');
            continue;
          }
          const byId = new Map(insts.map((x) => [x.id, x] as const));
          const a = byId.get(row.inst_a_id);
          const b = byId.get(row.inst_b_id);
          if (!a || !b) {
            markSkipped(url, 'no_write_target');
            continue;
          }
          const sourceCandidates = buildUniversityCompareSourceCandidates({
            instAName: a.name,
            instAWebsiteUrl: a.website_url,
            instBName: b.name,
            instBWebsiteUrl: b.website_url
          });
          const { data: facts, error: rpcErr } = await db.rpc('get_comparison_data', {
            p_inst_a: row.inst_a_id,
            p_inst_b: row.inst_b_id
          });
          if (rpcErr || !facts) {
            markSkipped(url, 'no_write_target');
            continue;
          }
          const pageInfo = pageByUrl.get(normalizePath(url));
          const score = Number(pageInfo?.score ?? 100);
          const issues = new Set(pageInfo?.issueCodes ?? []);
          const shouldUseAiCompare =
            forceAiBad ||
            (mode !== MODE_CHEAP &&
              (issues.has('meta_description_length_out_of_range') ||
                (issues.has('title_length_out_of_range') && score < 70)));

          const comparePayload = shouldUseAiCompare
            ? await (async () => {
                const generated = await generateUniversityCompareWithOpenAi({
                  factsJson: JSON.stringify(facts),
                  year: new Date().getFullYear(),
                  sourceCandidates
                });
                return (
                  generated ??
                  (await (async () => {
                    if (!guardCost()) {
                      throw new Error('max-cost-usd reached');
                    }
                    const completion = await openai.chat.completions.create(
                      {
                        model: 'gpt-5.4',
                        temperature: 0.15,
                        response_format: { type: 'json_object' },
                        messages: [
                          {
                            role: 'system',
                            content:
                              'Return strict JSON only: {"ai_verdict":"","meta_title":"","meta_description":"","content_json":{"faq":[{"q":"","a":""}]}}'
                          },
                          {
                            role: 'user',
                            content: [
                              `University A: ${a.name}`,
                              `University B: ${b.name}`,
                              'Generate concise comparison metadata and 3 FAQ items.',
                              'Title 30-65 chars, Meta 120-160 chars.'
                            ].join('\n')
                          }
                        ]
                      },
                      { timeout: OPENAI_TIMEOUT_MS }
                    );
                    stats.promptTokens += completion.usage?.prompt_tokens ?? 0;
                    stats.completionTokens += completion.usage?.completion_tokens ?? 0;
                    const raw = completion.choices[0]?.message?.content?.trim() || '{}';
                    const fallback = JSON.parse(raw) as {
                      ai_verdict?: string;
                      meta_title?: string;
                      meta_description?: string;
                      content_json?: { faq?: Array<{ q?: string; a?: string }> };
                    };
                    return {
                      ai_verdict:
                        (fallback.ai_verdict || `${a.name} vs ${b.name} scholarship comparison`).trim(),
                      meta_title: ensureTitle(
                        fallback.meta_title || '',
                        `${a.name} vs ${b.name} Scholarship Comparison`
                      ),
                      meta_description: ensureMeta(
                        fallback.meta_description || '',
                        `${a.name} vs ${b.name} scholarship comparison for USA 2026 with funding signals and application guidance.`
                      ),
                      content_json: {
                        faq: (fallback.content_json?.faq ?? []).map((x) => ({
                          q: String(x.q || '').trim(),
                          a: String(x.a || '').trim()
                        }))
                      }
                    };
                  })())
                );
              })()
            : {
                ai_verdict: `${a.name} vs ${b.name} scholarship comparison`,
                meta_title: `${a.name} vs ${b.name} Scholarship Comparison`,
                meta_description: `${a.name} vs ${b.name} scholarship comparison for USA 2026 with funding signals and application guidance. Compare and choose the best fit.`,
                content_json: { faq: [] as Array<{ q: string; a: string }> }
              };
          const metaTitle = ensureTitle(
            comparePayload.meta_title,
            `${a.name} vs ${b.name} Scholarship Comparison`
          );
          const metaDescription = ensureMeta(
            comparePayload.meta_description,
            `${a.name} vs ${b.name} scholarship comparison for USA 2026 with funding signals and application guidance. Compare and choose the best fit.`
          );
          const contentJson = compareAiPayloadToJson({
            ...comparePayload,
            content_json: {
              ...comparePayload.content_json,
              faq: ensureFaq(comparePayload.content_json.faq ?? [], `${a.name} vs ${b.name}`).map((x) => ({
                q: x.question,
                a: x.answer
              }))
            }
          });
          if (!dryRun) {
            const { error: upErr } = await db
              .from('compare_pages')
              .update({
                meta_title: metaTitle,
                meta_description: metaDescription,
                content_json: contentJson,
                ai_verdict: comparePayload.ai_verdict
              })
              .eq('id', row.id);
            if (upErr) {
              markError(url);
              continue;
            }
          }
          markUpdated(url, shouldUseAiCompare);
        } catch {
          markError(url);
        }
      }
      if (stoppedByCost) break;
    }
  }

  if (compareStateSlugs.length > 0) {
    for (const slugChunk of chunked(compareStateSlugs, DB_CHUNK_SIZE)) {
      const { data: rows, error } = await db
        .from('state_compare_pages')
        .select('id, slug, state_a_code, state_b_code')
        .in('slug', slugChunk)
        .eq('status', 'published');
      if (error) {
        for (const slug of slugChunk) markError(`/compare/states/${slug}`);
        continue;
      }
      for (const row of rows ?? []) {
        if (stoppedByCost) break;
        const url = `/compare/states/${row.slug}`;
        try {
          const { data: states, error: stErr } = await db
            .from('states')
            .select('code, name')
            .in('code', [row.state_a_code, row.state_b_code]);
          if (stErr || !states || states.length < 2) {
            markSkipped(url, 'no_write_target');
            continue;
          }
          const byCode = new Map(states.map((x) => [x.code, x] as const));
          const a = byCode.get(row.state_a_code);
          const b = byCode.get(row.state_b_code);
          if (!a || !b) {
            markSkipped(url, 'no_write_target');
            continue;
          }
          const sourceCandidates = buildStateCompareSourceCandidates({
            stateAName: a.name,
            stateBName: b.name
          });
          const { data: facts, error: rpcErr } = await db.rpc('get_state_comparison_data', {
            p_state_a_code: row.state_a_code,
            p_state_b_code: row.state_b_code
          });
          if (rpcErr || !facts) {
            markSkipped(url, 'no_write_target');
            continue;
          }
          const pageInfo = pageByUrl.get(normalizePath(url));
          const score = Number(pageInfo?.score ?? 100);
          const issues = new Set(pageInfo?.issueCodes ?? []);
          const shouldUseAiCompare =
            forceAiBad ||
            (mode !== MODE_CHEAP &&
              (issues.has('meta_description_length_out_of_range') ||
                (issues.has('title_length_out_of_range') && score < 70)));

          const statePayload = shouldUseAiCompare
            ? await (async () => {
                const generated = await generateStateCompareWithOpenAi({
                  factsJson: JSON.stringify(facts),
                  year: new Date().getFullYear(),
                  sourceCandidates
                });
                return (
                  generated ??
                  (await (async () => {
                    if (!guardCost()) {
                      throw new Error('max-cost-usd reached');
                    }
                    const completion = await openai.chat.completions.create(
                      {
                        model: 'gpt-5.4',
                        temperature: 0.15,
                        response_format: { type: 'json_object' },
                        messages: [
                          {
                            role: 'system',
                            content:
                              'Return strict JSON only: {"ai_verdict":"","meta_title":"","meta_description":"","content_json":{"faq":[{"q":"","a":""}]}}'
                          },
                          {
                            role: 'user',
                            content: [
                              `State A: ${a.name}`,
                              `State B: ${b.name}`,
                              'Generate concise comparison metadata and 3 FAQ items.',
                              'Title 30-65 chars, Meta 120-160 chars.'
                            ].join('\n')
                          }
                        ]
                      },
                      { timeout: OPENAI_TIMEOUT_MS }
                    );
                    stats.promptTokens += completion.usage?.prompt_tokens ?? 0;
                    stats.completionTokens += completion.usage?.completion_tokens ?? 0;
                    const raw = completion.choices[0]?.message?.content?.trim() || '{}';
                    const fallback = JSON.parse(raw) as {
                      ai_verdict?: string;
                      meta_title?: string;
                      meta_description?: string;
                      content_json?: { faq?: Array<{ q?: string; a?: string }> };
                    };
                    return {
                      ai_verdict:
                        (fallback.ai_verdict || `${a.name} vs ${b.name} scholarship climate comparison`).trim(),
                      meta_title: ensureTitle(
                        fallback.meta_title || '',
                        `${a.name} vs ${b.name} Scholarship Comparison`
                      ),
                      meta_description: ensureMeta(
                        fallback.meta_description || '',
                        `${a.name} vs ${b.name} scholarship comparison for USA 2026 with climate insights and application direction.`
                      ),
                      content_json: {
                        faq: (fallback.content_json?.faq ?? []).map((x) => ({
                          q: String(x.q || '').trim(),
                          a: String(x.a || '').trim()
                        }))
                      }
                    };
                  })())
                );
              })()
            : {
                ai_verdict: `${a.name} vs ${b.name} scholarship climate comparison`,
                meta_title: `${a.name} vs ${b.name} Scholarship Comparison`,
                meta_description: `${a.name} vs ${b.name} scholarship comparison for USA 2026 with climate insights and practical application direction.`,
                content_json: { faq: [] as Array<{ q: string; a: string }> }
              };
          const metaTitle = ensureTitle(
            statePayload.meta_title,
            `${a.name} vs ${b.name} Scholarship Comparison`
          );
          const metaDescription = ensureMeta(
            statePayload.meta_description,
            `${a.name} vs ${b.name} scholarship comparison for USA 2026 with climate insights and practical application direction.`
          );
          const contentJson = stateCompareAiPayloadToJson({
            ...statePayload,
            content_json: {
              ...statePayload.content_json,
              faq: ensureFaq(statePayload.content_json.faq ?? [], `${a.name} vs ${b.name}`).map((x) => ({
                q: x.question,
                a: x.answer
              }))
            }
          });
          if (!dryRun) {
            const { error: upErr } = await db
              .from('state_compare_pages')
              .update({
                meta_title: metaTitle,
                meta_description: metaDescription,
                content_json: contentJson,
                ai_verdict: statePayload.ai_verdict
              })
              .eq('id', row.id);
            if (upErr) {
              markError(url);
              continue;
            }
          }
          markUpdated(url, shouldUseAiCompare);
        } catch {
          markError(url);
        }
      }
      if (stoppedByCost) break;
    }
  }

  const articleSlugs = Array.from(
    new Set(
      filteredTargetPages
        .filter((p) => p.type === 'article')
        .map((p) => normalizePath(p.url || ''))
        .filter((u) => u.startsWith('/resources/'))
        .map((u) => decodeURIComponent(u.replace('/resources/', '')))
        .filter(Boolean)
    )
  );
  if (articleSlugs.length > 0) {
    for (const slugChunk of chunked(articleSlugs, DB_CHUNK_SIZE)) {
      const { data: rows, error } = await db
        .from('content_posts')
        .select('id, slug, title, meta_title, meta_description, faq')
        .in('slug', slugChunk);
      if (error) {
        for (const slug of slugChunk) markError(`/resources/${slug}`);
        continue;
      }
      for (const row of rows ?? []) {
        const url = `/resources/${row.slug}`;
        const pageInfo = pageByUrl.get(normalizePath(url));
        const issues = new Set(pageInfo?.issueCodes ?? []);
        const title = ensureTitle(String(row.meta_title ?? row.title ?? ''), String(row.title ?? 'Article'));
        const meta = ensureMeta(
          String(row.meta_description ?? ''),
          `${String(row.title ?? 'Article')} scholarship guide for USA 2026 with practical application steps and key eligibility notes.`
        );
        const faq = ensureFaq(row.faq, String(row.title ?? 'Article'));
        if (!dryRun) {
          const payload: Record<string, unknown> = {};
          if (forceAiBad || issues.has('title_length_out_of_range')) payload.meta_title = title;
          if (forceAiBad || issues.has('meta_description_length_out_of_range') || issues.has('duplicate_meta_description')) {
            payload.meta_description = meta;
          }
          if (forceAiBad || issues.has('faq_missing')) payload.faq = faq as unknown as Json;
          if (Object.keys(payload).length === 0) {
            markSkipped(url, 'already_ok');
            continue;
          }
          const { error: upErr } = await db.from('content_posts').update(payload).eq('id', row.id);
          if (upErr) {
            markError(url);
            continue;
          }
        }
        markUpdated(url, false);
      }
    }
  }

  const essaySlugs = Array.from(
    new Set(
      filteredTargetPages
        .filter((p) => p.type === 'essay')
        .map((p) => normalizePath(p.url || ''))
        .filter((u) => u.startsWith('/essays/'))
        .map((u) => decodeURIComponent(u.replace('/essays/', '')))
        .filter(Boolean)
    )
  );
  if (essaySlugs.length > 0) {
    for (const slugChunk of chunked(essaySlugs, DB_CHUNK_SIZE)) {
      const { data: rows, error } = await db
        .from('essays')
        .select('id, slug, title, meta_description, faq')
        .in('slug', slugChunk);
      if (error) {
        for (const slug of slugChunk) markError(`/essays/${slug}`);
        continue;
      }
      for (const row of rows ?? []) {
        const url = `/essays/${row.slug}`;
        const pageInfo = pageByUrl.get(normalizePath(url));
        const issues = new Set(pageInfo?.issueCodes ?? []);
        const title = ensureTitle(String(row.title ?? ''), 'Essay Guide USA 2026');
        const meta = ensureMeta(
          String(row.meta_description ?? ''),
          `${String(row.title ?? 'Essay')} guide for USA 2026 with clear steps, eligibility context, and practical application guidance.`
        );
        const faq = ensureFaq(row.faq, String(row.title ?? 'Essay Guide'));
        if (!dryRun) {
          const payload: Record<string, unknown> = {};
          if (forceAiBad || issues.has('title_length_out_of_range')) payload.title = title;
          if (forceAiBad || issues.has('meta_description_length_out_of_range') || issues.has('duplicate_meta_description')) {
            payload.meta_description = meta;
          }
          if (forceAiBad || issues.has('faq_missing')) payload.faq = faq as unknown as Json;
          if (Object.keys(payload).length === 0) {
            markSkipped(url, 'already_ok');
            continue;
          }
          const { error: upErr } = await db.from('essays').update(payload).eq('id', row.id);
          if (upErr) {
            markError(url);
            continue;
          }
        }
        markUpdated(url, false);
      }
    }
  }

  for (const url of filteredTargetUrls) {
    if (doneUrlSet.has(url)) continue;
    const pageType = (pageByUrl.get(url)?.type || '').trim();
    try {
      const res = await fetch(toAbsoluteUrl(url), { method: 'GET' });
      const html = res.ok ? await res.text() : '';
      const hasTitle = /<title>[^<]{10,}/i.test(html);
      const hasMeta = /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{50,}/i.test(html);
      const titleFromHtml = (html.match(/<title>([^<]+)<\/title>/i)?.[1] || '').replace(/\s+/g, ' ').trim();
      const metaFromHtml = (
        html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || ''
      )
        .replace(/\s+/g, ' ')
        .trim();
      const fallbackBase = normalizePath(url)
        .replace(/^\/+/, '')
        .replace(/[/-]+/g, ' ')
        .trim();
      const guessedTitle = ensureTitle(
        titleFromHtml,
        `${fallbackBase || 'Scholarship'} Guide USA 2026`
      );
      let guessedMeta = ensureMeta(
        metaFromHtml,
        `${fallbackBase || 'Scholarship'} scholarships in USA 2026. Review eligibility, compare deadlines, and apply using official sources.`
      );
      if (forceAiBad && guardCost()) {
        const prompt = [
          'Return strict JSON only: {"title":"","metaDescription":""}',
          'Max brevity. title 30-65, metaDescription 120-160.',
          `URL: ${normalizePath(url)}`,
          `Type: ${pageType || 'unknown'}`,
          `HTML title: ${titleFromHtml}`,
          `HTML meta: ${metaFromHtml}`
        ].join('\n');
        const completion = await openai.chat.completions.create(
          {
            model: 'gpt-5.4',
            temperature: 0.1,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: 'Return valid JSON only.' },
              { role: 'user', content: prompt }
            ]
          },
          { timeout: OPENAI_TIMEOUT_MS }
        );
        stats.promptTokens += completion.usage?.prompt_tokens ?? 0;
        stats.completionTokens += completion.usage?.completion_tokens ?? 0;
        const payload = JSON.parse(completion.choices[0]?.message?.content?.trim() || '{}') as {
          title?: string;
          metaDescription?: string;
        };
        const nextTitle = ensureTitle(payload.title ?? guessedTitle, guessedTitle);
        guessedMeta = ensureMeta(payload.metaDescription ?? guessedMeta, guessedMeta);
        await writeGenericSeoStore(url, nextTitle, guessedMeta, pageType || 'listing');
        markUpdated(url, true);
        continue;
      }
      await writeGenericSeoStore(url, guessedTitle, guessedMeta, pageType || 'listing');
      markUpdated(url, false);
      console.log(
        `[targeted-fix] fallback-html inspected ${toAbsoluteUrl(url)} type=${pageType || 'unknown'} title=${hasTitle} meta=${hasMeta}`
      );
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      console.log(`[targeted-fix] fallback-html failed ${toAbsoluteUrl(url)} type=${pageType || 'unknown'} reason=${reason}`);
      markError(url, reason);
      continue;
    }
    if (!TARGET_TYPES.has(pageType)) {
      markSkipped(url, 'unknown_type');
    } else {
      markSkipped(url, 'no_write_target');
    }
  }
  saveResumeState(statePath, completedThisOrPrevious, errorUrls);

  await fs.mkdir(path.dirname(outputPathsPath), { recursive: true });
  await fs.writeFile(outputPathsPath, `${filteredTargetUrls.join('\n')}\n`, 'utf-8');

  const costEstimateUsd =
    Number.isFinite(promptCostPer1k) &&
    Number.isFinite(completionCostPer1k) &&
    promptCostPer1k >= 0 &&
    completionCostPer1k >= 0
      ? Number(
          (
            (stats.promptTokens / 1000) * promptCostPer1k +
            (stats.completionTokens / 1000) * completionCostPer1k
          ).toFixed(4)
        )
      : null;

  await fs.mkdir(path.dirname(fixReportPath), { recursive: true });
  await fs.writeFile(
    fixReportPath,
    JSON.stringify(
      {
        summary: {
          mode,
          forceAiBad,
          dryRun,
          total: stats.total,
          updated: stats.updated,
          skipped: stats.skipped,
          errors: stats.errors,
          updatedWithAi: stats.updatedWithAi,
          updatedWithoutAi: stats.updatedWithoutAi,
          promptTokens: stats.promptTokens,
          completionTokens: stats.completionTokens,
          costEstimateUsd,
          maxCostUsd: Number.isFinite(maxCostUsd) ? maxCostUsd : null,
          stoppedByCost
        },
        stateFile: statePath,
        scopeFile: outputPathsPath,
        reportGeneratedAt: new Date().toISOString()
      },
      null,
      2
    ),
    'utf-8'
  );

  console.log(`[targeted-fix] progress ${stats.total}/${stats.total} updated=${stats.updated} skipped=${stats.skipped} errors=${stats.errors}`);
  if (recentUpdatedLinks.length > 0) {
    console.log('[targeted-fix] recent updated links:');
    for (const link of recentUpdatedLinks) console.log(`- ${link}`);
  }
  if (recentErrorLinks.length > 0) {
    console.log('[targeted-fix] recent error links:');
    for (const link of recentErrorLinks) console.log(`- ${link}`);
  }
  console.log('[targeted-fix] done');
  console.log(`- total: ${stats.total}`);
  console.log(`- updated: ${stats.updated}`);
  console.log(`- skipped: ${stats.skipped}`);
  console.log(`- errors: ${stats.errors}`);
  console.log(`- updated without AI: ${stats.updatedWithoutAi}`);
  console.log(`- updated with GPT: ${stats.updatedWithAi}`);
  console.log(
    `- cost estimate: ${costEstimateUsd == null ? 'n/a (set OPENAI_GPT54_INPUT_COST_PER_1K and OPENAI_GPT54_OUTPUT_COST_PER_1K)' : `$${costEstimateUsd}`}`
  );
  console.log(`- report path: ${fixReportPath}`);
}

main().catch((e) => {
  console.error('[targeted-fix] fatal', e instanceof Error ? e.message : String(e));
  process.exit(1);
});

