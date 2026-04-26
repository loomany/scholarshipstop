import { randomBytes } from 'node:crypto';

import OpenAI from 'openai';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  essayIndexingUrl,
  pingGoogleIndexingDirect
} from '@/lib/seo/googleIndexingQueue';
import { essayHubArticlePath } from '@/lib/essays/essayHubSection';
import { runSeoPublishGuardWarnOnly } from '@/lib/seo/publishGuardRunner';
import {
  filterReachableHighAuthoritySources,
  type EssaySourceItem
} from '@/lib/essays/externalSourceValidation';
import { ESSAY_HUB_MEGA_PROMPT_SYSTEM } from '@/lib/essays/essayHubMegaPrompt';
import type { Database, Json } from '@/types_db';

type ManualQueueRow =
  Database['public']['Tables']['manual_essay_generation_queue']['Row'];
type EssayInsertRow = Database['public']['Tables']['essays']['Insert'];

type GeneratedPayload = {
  title: string;
  meta_description: string;
  content_html: string;
  faq: { question: string; answer: string }[];
  candidate_sources: EssaySourceItem[];
};

function normalizeText(v: string): string {
  return v.replace(/\s+/g, ' ').trim();
}

function fitLen(v: string, min: number, max: number, tail: string): string {
  let out = normalizeText(v);
  if (out.length > max) out = `${out.slice(0, max - 1).trimEnd()}…`;
  if (out.length < min) {
    out = normalizeText(`${out} ${tail}`);
    if (out.length > max) out = `${out.slice(0, max - 1).trimEnd()}…`;
  }
  return out;
}

function enforceTitle(raw: string, topic: string): string {
  const base =
    normalizeText(raw) || `How to Write Scholarship Essays for ${topic} USA 2026`;
  return fitLen(base, 30, 65, 'Apply in USA 2026 with a clear essay plan.');
}

function enforceMeta(raw: string, topic: string): string {
  const base =
    normalizeText(raw) ||
    `${topic} scholarship essay guide for USA 2026 with structure, examples, and revision steps. Build a stronger application and apply today.`;
  return fitLen(base, 120, 160, 'Use this framework to draft and revise before deadline.');
}

function enforceFaq(raw: unknown): { question: string; answer: string }[] {
  const input = Array.isArray(raw)
    ? raw
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const rec = item as Record<string, unknown>;
          const question = typeof rec.question === 'string' ? normalizeText(rec.question) : '';
          const answer = typeof rec.answer === 'string' ? normalizeText(rec.answer) : '';
          if (!question || !answer) return null;
          return { question, answer };
        })
        .filter((x): x is { question: string; answer: string } => Boolean(x))
    : [];
  const defaults = [
    {
      question: 'Who is eligible for this scholarship essay topic?',
      answer:
        'Eligibility depends on each scholarship and program rules. Confirm official criteria and required documents before writing.'
    },
    {
      question: 'When should I finish my essay before the deadline?',
      answer:
        'Plan your draft early and leave time for at least two revisions before submission to improve clarity and impact.'
    },
    {
      question: 'How do I complete the scholarship application process?',
      answer:
        'Follow official instructions, align essay content with prompt requirements, and submit all required materials before cutoff.'
    }
  ];
  return [...input, ...defaults].slice(0, 3);
}

function requiredEnv(name: string): string {
  const primary = process.env[name]?.trim();
  const value =
    primary ||
    (name === 'NEXT_PUBLIC_SUPABASE_URL'
      ? process.env.SUPABASE_URL?.trim()
      : undefined);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function optionalIntArg(name: string, fallback: number): number {
  const arg = process.argv.find((value) => value.startsWith(`--${name}=`));
  const value = Number(arg?.slice(name.length + 3) ?? '');
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function slugifyTopic(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 180);
}

async function isEssaySlugTakenCi(
  supabase: SupabaseClient<Database>,
  trySlug: string
): Promise<boolean> {
  const trimmed = trySlug.trim();
  if (!trimmed) return true;
  const { data, error } = await supabase
    .from('essays')
    .select('id')
    .ilike('slug', trimmed)
    .limit(1);
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

async function ensureUniqueEssaySlug(
  supabase: SupabaseClient<Database>,
  baseSlug: string
): Promise<string> {
  const root = slugifyTopic(baseSlug || 'international-student-essay-guide');
  for (let n = 0; n < 60; n += 1) {
    const candidate =
      n === 0
        ? root
        : n < 45
          ? `${root}-${n + 1}`.slice(0, 200)
          : `${root}-${n + 1}-${randomBytes(3).toString('hex')}`.slice(0, 200);
    if (!(await isEssaySlugTakenCi(supabase, candidate))) return candidate;
  }
  throw new Error('Could not allocate unique essay slug');
}

function isUniqueSlugConstraintError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return (
    err.code === '23505' ||
    /essays_slug_unique_lower|duplicate key value|unique constraint/i.test(
      err.message ?? ''
    )
  );
}

async function insertEssayRowWithSlugRetry(
  supabase: SupabaseClient<Database>,
  baseSlug: string,
  buildRow: (slug: string) => EssayInsertRow
): Promise<{ id: string; slug: string }> {
  let slug = await ensureUniqueEssaySlug(supabase, baseSlug);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { data, error } = await supabase
      .from('essays')
      .insert(buildRow(slug))
      .select('id')
      .maybeSingle();
    if (error && !isUniqueSlugConstraintError(error)) throw new Error(error.message);
    if (data?.id) return { id: data.id, slug };
    slug = await ensureUniqueEssaySlug(
      supabase,
      `${baseSlug}-${randomBytes(4).toString('hex')}`
    );
  }
  throw new Error('Could not insert essay after unique slug retries');
}

async function claimNextManualTopic(
  supabase: SupabaseClient<Database>
): Promise<ManualQueueRow | null> {
  const { data: pending, error: e1 } = await supabase
    .from('manual_essay_generation_queue')
    .select('*')
    .eq('status', 'pending')
    .order('hub_distribution_rank', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (e1) throw new Error(e1.message);
  if (!pending?.id) return null;

  const { data: claimed, error: e2 } = await supabase
    .from('manual_essay_generation_queue')
    .update({
      status: 'processing',
      error_message: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', pending.id)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle();
  if (e2) throw new Error(e2.message);
  return (claimed ?? null) as ManualQueueRow | null;
}

async function pickReusableHeroUrl(
  supabase: SupabaseClient<Database>,
  rank: number
): Promise<string | null> {
  const { data, error } = await supabase
    .from('essays')
    .select('hero_image_url')
    .eq('is_published', true)
    .eq('hero_is_real', true)
    .not('hero_image_url', 'is', null)
    .neq('hero_image_url', '')
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(500);
  if (error) throw new Error(error.message);
  const seen = new Set<string>();
  const pool: string[] = [];
  for (const row of data ?? []) {
    const url = row.hero_image_url?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    pool.push(url);
  }
  if (pool.length === 0) return null;
  return pool[Math.abs(rank) % pool.length] ?? pool[0] ?? null;
}

function buildManualGuidePrompt(topic: string): string {
  return `Write a ScholarshipTop Essay Hub guide for this manual topic:

Topic: ${topic}

Audience:
- International students applying for scholarships in the USA.
- The guide should still be useful to any scholarship applicant when the advice is broadly applicable.

Return exactly one JSON object with:
{
  "title": "SEO title, 45-75 characters",
  "meta_description": "SEO meta description, 120-160 characters",
  "content_html": "RAW semantic HTML only, no h1, no markdown",
  "faq": [{"question":"...", "answer":"..."}],
  "candidate_sources": [{"title":"...", "url":"https://..."}]
}

Content requirements:
- Write a practical how-to guide, not a sample applicant essay.
- Include 6-9 useful h2 sections.
- End with a concrete revision checklist.
- Keep content_html between about 1,100 and 1,700 words.
- Candidate sources must be real, high-authority https .edu or Wikipedia URLs only; omit sources if uncertain.
- FAQ should contain 3 concise questions and answers.`;
}

async function generateManualGuide(topic: string): Promise<GeneratedPayload> {
  const apiKey = requiredEnv('OPENAI_API_KEY');
  const model = process.env.OPENAI_SEO_MODEL?.trim() || '';
  if (model !== 'gpt-5.4') {
    throw new Error(`OPENAI_SEO_MODEL must be gpt-5.4, received "${model || 'unset'}"`);
  }
  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create(
    {
      model,
      temperature: 0.45,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: ESSAY_HUB_MEGA_PROMPT_SYSTEM },
        { role: 'user', content: buildManualGuidePrompt(topic) }
      ]
    },
    {
      timeout: Number(process.env.OPENAI_REQUEST_TIMEOUT_MS || 180_000)
    }
  );
  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error('Empty OpenAI response');
  const parsed = JSON.parse(raw) as GeneratedPayload;
  if (!parsed.title?.trim()) throw new Error('OpenAI response missing title');
  if (!parsed.content_html?.trim()) throw new Error('OpenAI response missing content_html');
  return parsed;
}

async function processOne(supabase: SupabaseClient<Database>): Promise<'published' | 'empty'> {
  const row = await claimNextManualTopic(supabase);
  if (!row) return 'empty';

  try {
    const parsed = await generateManualGuide(row.topic);
    const verifiedSources = await filterReachableHighAuthoritySources(
      Array.isArray(parsed.candidate_sources) ? parsed.candidate_sources : [],
      { max: 6 }
    );
    const heroUrl = await pickReusableHeroUrl(supabase, row.hub_distribution_rank);
    let normalizedTitle = enforceTitle(parsed.title ?? '', row.topic);
    let normalizedMeta = enforceMeta(parsed.meta_description ?? '', row.topic);
    const normalizedFaq = enforceFaq(parsed.faq);
    const baseSlug = row.slug?.trim() || parsed.title || row.topic;
    const manualGuard = await runSeoPublishGuardWarnOnly({
      source: 'run-manual-essay-guides',
      payload: {
        type: 'essay',
        url: essayHubArticlePath(String(baseSlug)),
        title: normalizedTitle,
        metaDescription: normalizedMeta
      }
    });
    normalizedTitle = manualGuard.normalized.title;
    normalizedMeta = manualGuard.normalized.metaDescription;
    const { id: essayId, slug } = await insertEssayRowWithSlugRetry(
      supabase,
      baseSlug,
      (candidateSlug) => ({
        slug: candidateSlug,
        title: normalizedTitle,
        meta_description: normalizedMeta,
        content_html: parsed.content_html.trim(),
        hero_image_url: heroUrl,
        hero_is_real: Boolean(heroUrl),
        hero_variant_index: row.hub_distribution_rank,
        sources: verifiedSources as unknown as Json,
        faq: normalizedFaq as unknown as Json,
        is_published: true,
        hub_category_slug: row.hub_category_slug,
        hub_category_label: row.hub_category_label,
        hub_distribution_group: row.hub_distribution_group,
        hub_distribution_rank: row.hub_distribution_rank,
        manual_topic: row.topic
      })
    );

    const { error } = await supabase
      .from('manual_essay_generation_queue')
      .update({
        status: 'completed',
        created_essay_id: essayId,
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', row.id);
    if (error) throw new Error(error.message);

    void pingGoogleIndexingDirect(essayIndexingUrl(slug)).catch(() => {
      /* Google Indexing logs errors internally; keep worker moving. */
    });
    console.log(`published manual essay: ${slug}`);
    return 'published';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await supabase
      .from('manual_essay_generation_queue')
      .update({
        status: 'failed',
        error_message: message.slice(0, 2000),
        updated_at: new Date().toISOString()
      })
      .eq('id', row.id);
    console.error(`manual essay failed: ${row.topic}`, message);
    return 'published';
  }
}

async function main() {
  const supabase = createClient<Database>(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  );
  /** Process the whole pending queue in one run (e.g. Railway cron). */
  const untilEmpty = hasFlag('until-empty');
  let published = 0;
  if (untilEmpty) {
    for (;;) {
      const result = await processOne(supabase);
      if (result === 'empty') break;
      published += 1;
    }
  } else {
    const limit = optionalIntArg('limit', 1);
    for (let i = 0; i < limit; i += 1) {
      const result = await processOne(supabase);
      if (result === 'empty') break;
      published += 1;
    }
  }
  console.log(JSON.stringify({ processed: published }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
