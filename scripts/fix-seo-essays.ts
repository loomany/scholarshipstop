import fs from 'fs/promises';
import path from 'path';
import fsSync from 'fs';

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types_db';
import { postSeoRevalidate } from '../lib/seo/revalidateSeoPath';

type AuditPage = {
  url?: string;
  type?: string;
  status?: 'good' | 'medium' | 'bad';
  issueCodes?: string[];
};

type EssayRow = {
  id: string;
  slug: string;
  title: string | null;
  meta_description: string | null;
  faq: unknown;
};

type ResumeState = {
  completedUrls: string[];
  errorUrls: string[];
  updatedAt: string;
};

const TARGET_ISSUES = new Set([
  'meta_description_length_out_of_range',
  'title_length_out_of_range',
  'duplicate_meta_description'
]);

const STATE_PATH = path.resolve('docs', 'seo-fix-essay-state.json');
const REPORT_PATH = path.resolve('docs', 'seo-fix-essay-report.json');
const VERIFY_REPORT_PATH = path.resolve('docs', 'seo-fix-essay-verification-report.json');
const ERRORS_PATH = path.resolve('docs', 'seo-fix-essay-errors.json');
const DB_CHUNK_SIZE = 20;

function argString(name: string): string | null {
  const raw = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!raw) return null;
  const v = raw.slice(name.length + 3).trim();
  return v || null;
}

function argNum(name: string, fallback: number): number {
  const raw = argString(name);
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

function argFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function normalizePath(input: string): string {
  let p = (input || '').trim();
  if (!p) return '/';
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p;
}

function normalizeWhitespace(input: string | null | undefined): string {
  return (input ?? '').replace(/\s+/g, ' ').trim();
}

function isTitleGoodEnough(input: string): boolean {
  const n = normalizeWhitespace(input).length;
  return n >= 25 && n <= 70;
}

function isMetaGoodEnough(input: string): boolean {
  const n = normalizeWhitespace(input).length;
  return n >= 120 && n <= 160 || (n >= 100 && n <= 170);
}

function isMetaTarget(input: string): boolean {
  const n = normalizeWhitespace(input).length;
  return n >= 120 && n <= 160;
}

function extractTopic(title: string, slug: string): string {
  const base = normalizeWhitespace(title) || slug.replace(/-/g, ' ');
  let out = base
    .replace(/how to write a strong/gi, '')
    .replace(/as an international student/gi, 'international student')
    .replace(/scholarship essay/gi, '')
    .replace(/essay/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!out) out = 'scholarship';
  return out;
}

function toTitleCase(input: string): string {
  return input
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function compactTopicFromSlug(slug: string): string {
  const stop = new Set([
    'how', 'to', 'write', 'a', 'an', 'the', 'and', 'for', 'of', 'in', 'on', 'at', 'with',
    'scholarship', 'essay', 'guide', 'usa', '2026', 'apply', 'scholarships', 'com'
  ]);
  const parts = slug
    .toLowerCase()
    .split('-')
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => !stop.has(x))
    .filter((x) => !/^\d+$/.test(x));
  const core = parts.slice(0, 6).join(' ').trim();
  return core ? toTitleCase(core) : 'Scholarship';
}

function isReadableMeta(input: string): boolean {
  const text = normalizeWhitespace(input);
  if (!text) return false;
  const words = text.split(' ').filter(Boolean);
  return words.length >= 10 && /scholarship essay/i.test(text);
}

function trimByWords(input: string, maxLen: number): string {
  const words = normalizeWhitespace(input).split(' ').filter(Boolean);
  if (words.join(' ').length <= maxLen) return words.join(' ');
  const out: string[] = [];
  for (const w of words) {
    const candidate = [...out, w].join(' ');
    if (candidate.length > maxLen) break;
    out.push(w);
  }
  return out.join(' ').trim();
}

function chunked<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function withRetries<T>(fn: () => Promise<T>, attempts = 3, waitMs = 400): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i + 1 >= attempts) break;
      await new Promise((r) => setTimeout(r, waitMs * (i + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function normalizeEssayTitle(title: string, slug: string): string {
  const cleanedBase = normalizeWhitespace(title)
    .replace(/as an international student/gi, '')
    .replace(/step-by-step guide/gi, '')
    .replace(/complete guide/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  let topic = extractTopic(cleanedBase || title, slug);
  let out = `${topic} Scholarship Essay Guide`.replace(/\s+/g, ' ').trim();
  if (out.length < 25) out = `How to Write a ${topic} Scholarship Essay Guide`.replace(/\s+/g, ' ').trim();
  if (out.length > 65) {
    topic = compactTopicFromSlug(slug);
    out = `${topic} Scholarship Essay Guide`.replace(/\s+/g, ' ').trim();
  }
  if (out.length > 65) out = trimByWords(out, 65);
  if (out.length > 65) out = `${out.slice(0, 62).trimEnd()}...`;
  if (out.length < 30) out = `${topic} Essay Guide`.replace(/\s+/g, ' ').trim();
  return out;
}

function buildMetaTemplate(topic: string, slug: string): string {
  const t = topic.toLowerCase();
  const uniqueTail = slug.replace(/-/g, ' ').slice(0, 30).trim();
  let meta = '';
  if (/\binternational student\b/i.test(t)) {
    meta = `Learn how to write a strong ${topic} scholarship essay as an international student with clear tips, structure, and examples.`;
  } else if (topic && topic !== 'scholarship') {
    meta = `Learn how to write a strong ${topic} scholarship essay with clear structure, practical tips, and examples to improve your application.`;
  } else {
    meta =
      'Get practical scholarship essay guidance with structure, writing tips, and examples to help improve your application.';
  }
  if (meta.length < 120) {
    meta = `${meta} Topic focus: ${uniqueTail}.`.replace(/\s+/g, ' ').trim();
  }
  if (meta.length > 160) meta = trimByWords(meta, 160);
  return meta;
}

function loadState(): ResumeState {
  if (!fsSync.existsSync(STATE_PATH)) {
    return { completedUrls: [], errorUrls: [], updatedAt: new Date(0).toISOString() };
  }
  try {
    const raw = fsSync.readFileSync(STATE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<ResumeState>;
    return {
      completedUrls: Array.isArray(parsed.completedUrls) ? parsed.completedUrls.map(normalizePath) : [],
      errorUrls: Array.isArray(parsed.errorUrls) ? parsed.errorUrls.map(normalizePath) : [],
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date(0).toISOString()
    };
  } catch {
    return { completedUrls: [], errorUrls: [], updatedAt: new Date(0).toISOString() };
  }
}

function saveState(completed: Set<string>, errors: Set<string>): void {
  fsSync.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fsSync.writeFileSync(
    STATE_PATH,
    JSON.stringify(
      {
        completedUrls: Array.from(completed),
        errorUrls: Array.from(errors),
        updatedAt: new Date().toISOString()
      },
      null,
      2
    ),
    'utf-8'
  );
}

async function main() {
  const dryRun = argFlag('dry-run');
  const allowAi = argFlag('allow-ai');
  const maxPages = argNum('max-pages', 200);
  const offset = argNum('offset', 0);
  const maxCostUsd = argNum('max-cost-usd', 5);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !supabaseKey) throw new Error('Supabase env is required');

  const reportRaw = await fs.readFile(path.resolve('docs', 'seo-audit-report.json'), 'utf-8');
  const report = JSON.parse(reportRaw) as { pages?: AuditPage[] };
  const targetEssays = (report.pages ?? []).filter(
    (p) => p.type === 'essay' && (p.issueCodes ?? []).some((x) => TARGET_ISSUES.has(x))
  );

  const db = createClient<Database>(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const targetSlugs = targetEssays
    .map((p) => normalizePath(p.url || '').replace('/essays/', ''))
    .filter(Boolean);
  const rows: EssayRow[] = [];
  for (const slugChunk of chunked(targetSlugs, DB_CHUNK_SIZE)) {
    const { data: essayRows, error } = await withRetries(() =>
      db
        .from('essays')
        .select('id, slug, title, meta_description, faq')
        .in('slug', slugChunk)
    );
    if (error) throw new Error(error.message);
    rows.push(...((essayRows ?? []) as EssayRow[]));
  }
  const byMeta = new Map<string, number>();
  for (const r of rows) {
    const key = normalizeWhitespace(r.meta_description).toLowerCase();
    if (!key) continue;
    byMeta.set(key, (byMeta.get(key) ?? 0) + 1);
  }

  const state = loadState();
  const completed = new Set(state.completedUrls);
  const errors = new Set(state.errorUrls);
  const candidates = rows
    .map((row) => ({ row, url: normalizePath(`/essays/${row.slug}`) }))
    .filter((x) => !completed.has(x.url))
    .slice(offset, offset + maxPages);

  const verify = {
    candidatesBefore: candidates.length,
    verifiedOk: 0,
    needsFix: 0,
    willUpdate: 0,
    byIssue: {
      meta_description_length_out_of_range: 0,
      title_length_out_of_range: 0,
      duplicate_meta_description: 0
    }
  };

  const toFix: Array<{ row: EssayRow; url: string; nextTitle: string; nextMeta: string; reasons: string[] }> = [];
  for (const c of candidates) {
    const currentTitle = normalizeWhitespace(c.row.title);
    const currentMeta = normalizeWhitespace(c.row.meta_description);
    const topic = extractTopic(currentTitle, c.row.slug);
    const nextTitle = normalizeEssayTitle(currentTitle, c.row.slug);
    const nextMeta = buildMetaTemplate(topic, c.row.slug);
    const currentMetaDup = (byMeta.get(currentMeta.toLowerCase()) ?? 0) > 1;
    const postMetaDup = (byMeta.get(nextMeta.toLowerCase()) ?? 0) ?? 0;
    const reasons: string[] = [];
    if (!isTitleGoodEnough(currentTitle)) reasons.push('title_length_out_of_range');
    if (!isMetaGoodEnough(currentMeta) || !isReadableMeta(currentMeta)) reasons.push('meta_description_length_out_of_range');
    if (currentMetaDup && postMetaDup > 1) reasons.push('duplicate_meta_description');
    if (reasons.length === 0) {
      verify.verifiedOk += 1;
      continue;
    }
    verify.needsFix += 1;
    verify.willUpdate += 1;
    for (const code of reasons) {
      verify.byIssue[code as keyof typeof verify.byIssue] += 1;
    }
    toFix.push({ row: c.row, url: c.url, nextTitle, nextMeta, reasons });
  }

  await fs.mkdir(path.dirname(VERIFY_REPORT_PATH), { recursive: true });
  await fs.writeFile(
    VERIFY_REPORT_PATH,
    JSON.stringify({ summary: verify, generatedAt: new Date().toISOString() }, null, 2),
    'utf-8'
  );

  const stats = {
    processed: 0,
    verified_ok: verify.verifiedOk,
    updated_without_ai: 0,
    updated_with_ai: 0,
    skipped: 0,
    errors: 0,
    revalidated_true: 0,
    revalidated_false: 0,
    estimated_cost: 0,
    remaining: 0
  };
  const errorList: Array<{ url: string; reason: string }> = [];
  let promptTokens = 0;
  let completionTokens = 0;
  const inCost = Number(process.env.OPENAI_GPT54_INPUT_COST_PER_1K || 0);
  const outCost = Number(process.env.OPENAI_GPT54_OUTPUT_COST_PER_1K || 0);
  const openai = allowAi
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY?.trim(), timeout: 30_000, maxRetries: 1 })
    : null;

  for (const item of toFix) {
    stats.processed += 1;
    let title = item.nextTitle;
    let meta = item.nextMeta;
    const needAi =
      (!isTitleGoodEnough(title) || !isMetaGoodEnough(meta)) &&
      allowAi;

    if (needAi && openai) {
      if (process.env.OPENAI_SEO_MODEL?.trim() !== 'gpt-5.4') {
        throw new Error('OPENAI_SEO_MODEL must be gpt-5.4');
      }
      const est = (promptTokens / 1000) * inCost + (completionTokens / 1000) * outCost;
      if (est >= maxCostUsd) break;
      const prompt = [
        'Return strict JSON only: {"title":"","metaDescription":""}',
        'Title 25-70. Meta 120-160. Keep factual, concise.',
        `Slug: ${item.row.slug}`,
        `Current title: ${normalizeWhitespace(item.row.title)}`,
        `Current meta: ${normalizeWhitespace(item.row.meta_description)}`
      ].join('\n');
      const res = await openai.chat.completions.create({
        model: 'gpt-5.4',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Return valid JSON only.' },
          { role: 'user', content: prompt }
        ]
      });
      promptTokens += res.usage?.prompt_tokens ?? 0;
      completionTokens += res.usage?.completion_tokens ?? 0;
      const payload = JSON.parse(res.choices[0]?.message?.content?.trim() || '{}') as {
        title?: string;
        metaDescription?: string;
      };
      title = normalizeEssayTitle(payload.title || title, item.row.slug);
      meta = buildMetaTemplate(extractTopic(payload.title || title, item.row.slug), item.row.slug);
      if (payload.metaDescription) meta = normalizeWhitespace(payload.metaDescription);
      stats.updated_with_ai += 1;
    } else {
      stats.updated_without_ai += 1;
    }

    if (dryRun) continue;
    try {
      const payload: Record<string, unknown> = {};
      const currentTitle = normalizeWhitespace(item.row.title);
      const currentMeta = normalizeWhitespace(item.row.meta_description);
      if (!isTitleGoodEnough(currentTitle)) {
        const oldDelta = Math.abs(currentTitle.length - 50);
        const newDelta = Math.abs(title.length - 50);
        if (title.length >= 30 && title.length <= 65 && newDelta <= oldDelta) {
          payload.title = title;
        }
      }
      if (!isMetaTarget(currentMeta) || !isReadableMeta(currentMeta)) {
        const oldDelta = Math.abs(currentMeta.length - 140);
        const newDelta = Math.abs(meta.length - 140);
        if (meta.length >= 100 && meta.length <= 170 && isReadableMeta(meta) && newDelta <= oldDelta) {
          payload.meta_description = meta;
        }
      }
      if (Object.keys(payload).length === 0) {
        stats.skipped += 1;
        continue;
      }
      const { error: upErr } = await withRetries(() =>
        db.from('essays').update(payload).eq('id', item.row.id)
      );
      if (upErr) throw upErr;
      const revalidated = await postSeoRevalidate({ path: item.url });
      if (revalidated) stats.revalidated_true += 1;
      else stats.revalidated_false += 1;
      console.log(`[essay-fix] revalidated=${revalidated} path=${item.url}`);
      completed.add(item.url);
    } catch (e) {
      stats.errors += 1;
      errors.add(item.url);
      errorList.push({ url: item.url, reason: e instanceof Error ? e.message : String(e) });
    }
  }

  stats.estimated_cost = Number((((promptTokens / 1000) * inCost + (completionTokens / 1000) * outCost)).toFixed(4));
  stats.remaining = Math.max(0, toFix.length - stats.processed);
  saveState(completed, errors);

  await fs.writeFile(
    REPORT_PATH,
    JSON.stringify({ summary: stats, generatedAt: new Date().toISOString(), dryRun, allowAi }, null, 2),
    'utf-8'
  );
  await fs.writeFile(ERRORS_PATH, JSON.stringify({ errors: errorList, generatedAt: new Date().toISOString() }, null, 2), 'utf-8');

  console.log('[essay-fix] done');
  console.log(`- processed: ${stats.processed}`);
  console.log(`- verified_ok: ${stats.verified_ok}`);
  console.log(`- updated_without_ai: ${stats.updated_without_ai}`);
  console.log(`- updated_with_ai: ${stats.updated_with_ai}`);
  console.log(`- skipped: ${stats.skipped}`);
  console.log(`- errors: ${stats.errors}`);
  console.log(`- revalidated_true: ${stats.revalidated_true}`);
  console.log(`- revalidated_false: ${stats.revalidated_false}`);
  console.log(`- estimated_cost: $${stats.estimated_cost}`);
  console.log(`- remaining: ${stats.remaining}`);
  console.log(`- report: ${REPORT_PATH}`);
}

main().catch((e) => {
  if (e instanceof Error) {
    console.error('[essay-fix] fatal', e.message);
    if (e.stack) console.error(e.stack);
  } else {
    console.error('[essay-fix] fatal', String(e));
  }
  process.exit(1);
});

