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
import { openAiSeoHubModel } from '../lib/seo/seoHubContentAi';
import type { Database, Json } from '../types_db';

type AuditPage = {
  url?: string;
  type?: string;
  issueCodes?: string[];
};

type FixStats = {
  total: number;
  updated: number;
  skipped: number;
  errors: number;
  promptTokens: number;
  completionTokens: number;
};

type ResumeState = {
  completedUrls: string[];
  errorUrls: string[];
  updatedAt: string;
};

const TARGET_TYPES = new Set(['provider', 'scholarship', 'compare']);
const TARGET_ISSUES = new Set([
  'meta_description_length_out_of_range',
  'title_length_out_of_range',
  'faq_missing'
]);
const DB_CHUNK_SIZE = 100;
const REPORT_PATH_DEFAULT = 'docs/seo-fix-targeted-report.json';
const STATE_PATH_DEFAULT = 'docs/seo-fix-targeted-state.json';
const OPENAI_TIMEOUT_MS = 30_000;

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
  requireGpt54();
  requireEnv('OPENAI_API_KEY');
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const reportPath = path.resolve(argString('report') || 'docs/seo-audit-report.json');
  const outputPathsPath = path.resolve(argString('out') || 'docs/seo-audit-target-urls.txt');
  const fixReportPath = path.resolve(argString('fix-report') || REPORT_PATH_DEFAULT);
  const statePath = path.resolve(argString('state-file') || STATE_PATH_DEFAULT);
  const resetState = argFlag('reset-state');
  const progressEvery = Math.min(50, Math.max(25, argNum('progress-every', 50)));

  const raw = await fs.readFile(reportPath, 'utf-8');
  const parsed = JSON.parse(raw) as { pages?: AuditPage[] };
  const pages = parsed.pages ?? [];

  const targetPages = pages.filter((p) => {
    const type = (p.type || '').trim();
    if (!TARGET_TYPES.has(type)) return false;
    const issues = p.issueCodes ?? [];
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

  const scholarshipSlugs = Array.from(
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
  const providerSlugs = Array.from(
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
  const compareUniversitySlugs = Array.from(
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
  const compareStateSlugs = Array.from(
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

  const stats: FixStats = {
    total: targetUrls.length,
    updated: 0,
    skipped: alreadyCompletedInScope.size,
    errors: 0,
    promptTokens: 0,
    completionTokens: 0
  };
  const doneUrlSet = new Set<string>();
  for (const doneUrl of alreadyCompletedInScope) doneUrlSet.add(doneUrl);
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
  const markUpdated = (url: string) => {
    const normalized = normalizePath(url);
    if (doneUrlSet.has(normalized)) return;
    doneUrlSet.add(normalized);
    completedThisOrPrevious.add(normalized);
    errorUrls.delete(normalized);
    stats.updated += 1;
    const absolute = toAbsoluteUrl(normalized);
    recentUpdatedLinks.push(absolute);
    if (recentUpdatedLinks.length > 5) recentUpdatedLinks.shift();
    console.log(`[targeted-fix] updated ${absolute}`);
    trackProgress(stats, progressEvery);
    checkpoint();
  };
  const markSkipped = (url: string) => {
    const normalized = normalizePath(url);
    if (doneUrlSet.has(normalized)) return;
    doneUrlSet.add(normalized);
    stats.skipped += 1;
    trackProgress(stats, progressEvery);
  };
  const markError = (url: string) => {
    const normalized = normalizePath(url);
    if (doneUrlSet.has(normalized)) return;
    doneUrlSet.add(normalized);
    errorUrls.add(normalized);
    stats.errors += 1;
    const absolute = toAbsoluteUrl(normalized);
    recentErrorLinks.push(absolute);
    if (recentErrorLinks.length > 5) recentErrorLinks.shift();
    console.log(`[targeted-fix] error ${absolute}`);
    trackProgress(stats, progressEvery);
    checkpoint();
  };

  console.log(
    `[targeted-fix] urls=${targetUrls.length} remaining=${remainingTargetUrls.length} resume_skipped=${alreadyCompletedInScope.size} scholarship=${scholarshipSlugs.length} provider=${providerSlugs.length} compareU=${compareUniversitySlugs.length} compareS=${compareStateSlugs.length}`
  );

  const db = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!.trim(),
    timeout: OPENAI_TIMEOUT_MS,
    maxRetries: 1
  });

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
        const url = `/scholarships/${row.slug ?? row.id}`;
        try {
          const prompt = [
            'Return strict JSON only: {"title":"","metaDescription":"","faq":[{"question":"","answer":""}]}',
            'title 30-65, metaDescription 120-160, faq 3-5 and include eligibility/deadline/application process.',
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
            faq?: unknown;
          };
          const title = ensureTitle(payload.title ?? '', row.title ?? 'Scholarship');
          const meta = ensureMeta(payload.metaDescription ?? '', row.seo_excerpt ?? `${title} in USA 2026`);
          const faq = ensureFaq(payload.faq, title);
          const { error: upErr } = await db
            .from('scholarships')
            .update({
              title,
              seo_excerpt: meta,
              seo_faq: faq as unknown as Json
            })
            .eq('id', row.id);
          if (upErr) {
            markError(url);
            continue;
          }
          markUpdated(url);
        } catch {
          markError(url);
        }
      }
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
        const slug = row.slug?.trim();
        const url = `/providers/${slug || row.id}`;
        if (!slug) {
          markSkipped(url);
          continue;
        }
        try {
          const name = (row.display_name || slug.replace(/-/g, ' ')).trim();
          const official = row.official_url ?? null;
          const enriched = await enrichProviderData(name, {
            sourceUrls: [...(official ? [official] : [])]
          });
          const nextDescription = ensureMeta(
            enriched.description ?? '',
            `Scholarships and profile for ${name}. Review eligibility and application steps, then apply through official provider routes.`
          );
          const nextFaq = ensureFaq(enriched.faq, name);
          const { error: upErr } = await db
            .from('providers')
            .update({
              ai_description: nextDescription,
              ai_faq: nextFaq as unknown as Json
            })
            .eq('id', row.id);
          if (upErr) {
            markError(url);
            continue;
          }
          markUpdated(url);
        } catch {
          markError(url);
        }
      }
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
        const url = `/compare/universities/${row.slug}`;
        try {
          const { data: insts, error: instErr } = await db
            .from('institutions')
            .select('id, name, website_url')
            .in('id', [row.inst_a_id, row.inst_b_id]);
          if (instErr || !insts || insts.length < 2) {
            markSkipped(url);
            continue;
          }
          const byId = new Map(insts.map((x) => [x.id, x] as const));
          const a = byId.get(row.inst_a_id);
          const b = byId.get(row.inst_b_id);
          if (!a || !b) {
            markSkipped(url);
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
            markSkipped(url);
            continue;
          }
          const generated = await generateUniversityCompareWithOpenAi({
            factsJson: JSON.stringify(facts),
            year: new Date().getFullYear(),
            sourceCandidates
          });
          const comparePayload = generated
            ? generated
            : await (async () => {
                const completion = await openai.chat.completions.create(
                  {
                    model: openAiSeoHubModel(),
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
                  ai_verdict: (fallback.ai_verdict || `${a.name} vs ${b.name} scholarship comparison`).trim(),
                  meta_title: ensureTitle(fallback.meta_title || '', `${a.name} vs ${b.name} Scholarship Comparison`),
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
              })();
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
          markUpdated(url);
        } catch {
          markError(url);
        }
      }
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
        const url = `/compare/states/${row.slug}`;
        try {
          const { data: states, error: stErr } = await db
            .from('states')
            .select('code, name')
            .in('code', [row.state_a_code, row.state_b_code]);
          if (stErr || !states || states.length < 2) {
            markSkipped(url);
            continue;
          }
          const byCode = new Map(states.map((x) => [x.code, x] as const));
          const a = byCode.get(row.state_a_code);
          const b = byCode.get(row.state_b_code);
          if (!a || !b) {
            markSkipped(url);
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
            markSkipped(url);
            continue;
          }
          const generated = await generateStateCompareWithOpenAi({
            factsJson: JSON.stringify(facts),
            year: new Date().getFullYear(),
            sourceCandidates
          });
          const statePayload = generated
            ? generated
            : await (async () => {
                const completion = await openai.chat.completions.create(
                  {
                    model: openAiSeoHubModel(),
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
                  ai_verdict: (fallback.ai_verdict || `${a.name} vs ${b.name} scholarship climate comparison`).trim(),
                  meta_title: ensureTitle(fallback.meta_title || '', `${a.name} vs ${b.name} Scholarship Comparison`),
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
              })();
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
          markUpdated(url);
        } catch {
          markError(url);
        }
      }
    }
  }

  for (const url of targetUrls) {
    if (!doneUrlSet.has(url)) markSkipped(url);
  }
  saveResumeState(statePath, completedThisOrPrevious, errorUrls);

  await fs.mkdir(path.dirname(outputPathsPath), { recursive: true });
  await fs.writeFile(outputPathsPath, `${targetUrls.join('\n')}\n`, 'utf-8');

  const promptCostPer1k = Number(process.env.OPENAI_GPT54_INPUT_COST_PER_1K || '');
  const completionCostPer1k = Number(process.env.OPENAI_GPT54_OUTPUT_COST_PER_1K || '');
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
          total: stats.total,
          updated: stats.updated,
          skipped: stats.skipped,
          errors: stats.errors,
          promptTokens: stats.promptTokens,
          completionTokens: stats.completionTokens,
          costEstimateUsd
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
  console.log(
    `- cost estimate: ${costEstimateUsd == null ? 'n/a (set OPENAI_GPT54_INPUT_COST_PER_1K and OPENAI_GPT54_OUTPUT_COST_PER_1K)' : `$${costEstimateUsd}`}`
  );
  console.log(`- report path: ${fixReportPath}`);
}

main().catch((e) => {
  console.error('[targeted-fix] fatal', e instanceof Error ? e.message : String(e));
  process.exit(1);
});

