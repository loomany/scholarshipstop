import { randomBytes } from 'node:crypto';

import OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Json } from '@/types_db';
import {
  essayIndexingUrl,
  pingGoogleIndexingDirect
} from '@/lib/seo/googleIndexingQueue';
import { essayHubArticlePath } from '@/lib/essays/essayHubSection';
import {
  filterReachableHighAuthoritySources,
  type EssaySourceItem
} from '@/lib/essays/externalSourceValidation';
import { ESSAY_HUB_MEGA_PROMPT_SYSTEM } from '@/lib/essays/essayHubMegaPrompt';
import { buildDefaultEssaySlugFromScholarshipTitle } from '@/lib/essays/slugifyEssaySlug';
import {
  ESSAY_HERO_SCENE_VARIANTS,
  heroSceneVariantIndex
} from '@/lib/essays/essayHeroSceneVariants';
import { ingestFalHeroImageToSupabase } from '@/lib/essays/essayHeroIngest';
import {
  falMaxAttempts,
  runFalImageAttemptLoop
} from '@/lib/fal/falAttemptRetry';
import type { FalImageAttemptResult } from '@/lib/fal/falAttemptTypes';
import { postFluxDevImageOnce } from '@/lib/fal/postFluxDevImageOnce';
import { notifyEnvTelegramAdminsPlainText } from '@/lib/telegram/bot';

const FIRST_THREE_ESSAYS_PAGES_WINDOW = 36;
const SHORTAGE_ALERT_COOLDOWN_MINUTES = 180;
let lastReusableHeroShortageAlertAt = 0;

export function buildGrantCategoryHaystack(input: {
  category: string | null;
  category_slug: string | null;
  tags: Json;
  summary_short: string | null;
  title: string | null;
}): string {
  let tagsStr = '';
  const t = input.tags;
  if (Array.isArray(t)) tagsStr = t.map(String).join(' ');
  else if (t && typeof t === 'object') tagsStr = JSON.stringify(t);
  else if (typeof t === 'string') tagsStr = t;

  return [
    input.category,
    input.category_slug,
    tagsStr,
    input.summary_short,
    input.title
  ]
    .filter((x) => x != null && String(x).trim() !== '')
    .join(' ')
    .toLowerCase();
}

function contextMoodFromGrantCategory(grantCategory: string): string {
  let contextMood = 'quiet focus and determination';
  if (grantCategory.includes('art') || grantCategory.includes('design') || grantCategory.includes('creative')) {
    contextMood = 'creative energy—sketches, color notes, or layout pads nearby';
  } else if (
    grantCategory.includes('science') ||
    grantCategory.includes('stem') ||
    grantCategory.includes('engineering') ||
    grantCategory.includes('biology') ||
    grantCategory.includes('chemistry') ||
    grantCategory.includes('physics') ||
    grantCategory.includes('math')
  ) {
    contextMood = 'STEM study session—papers, diagrams, or data on screen believably in frame';
  }
  return contextMood;
}

function grantDetailsFromGrantTitle(grantTitle: string): string {
  const lower = grantTitle.toLowerCase();
  if (grantTitle.includes('Phillips') || /phillip/i.test(grantTitle)) {
    if (lower.includes('art') || lower.includes('memorial art')) {
      return 'The study materials should have subtle hints of artistic tools.';
    }
  }
  return '';
}

/**
 * Full FAL image prompt: one of 100 hashed scene variants + category mood + grant-specific detail.
 * `existingIndex` should be the 0-based index among published essays before this generation (queue worker),
 * or the essay's ordinal in `created_at` order during backfill.
 */
export function buildEssayHubHeroImagePrompt(input: {
  existingIndex: number;
  grantTitle: string;
  grantCategory: string;
}): string {
  const { existingIndex, grantTitle, grantCategory } = input;
  const variantIdx = heroSceneVariantIndex(existingIndex, grantTitle);
  const scenePrompt = ESSAY_HERO_SCENE_VARIANTS[variantIdx]!;
  const contextMood = contextMoodFromGrantCategory(grantCategory);
  const grantDetails = grantDetailsFromGrantTitle(grantTitle.trim());
  const detailSuffix = grantDetails.trim() ? ` ${grantDetails.trim()}` : '';
  return [
    scenePrompt.trim(),
    `Atmosphere: ${contextMood}.`,
    `Setting: modern, clean university or study environment; realistic documentary photography; soft natural light; shallow depth of field; premium EdTech / SaaS polish—not glossy stock glam, not beauty-filter skin.`,
    `Palette lock: keep subtle corporate blues and soft purples in the environment (muted, cohesive); avoid neon rainbow or heavy orange grading.`,
    `Hard bans: NO text, NO letters, NO logos, NO watermark. Avoid repeating the same young-woman stock pose across images; vary framing and subjects authentically.`,
    detailSuffix.trim()
  ]
    .filter(Boolean)
    .join(' ');
}

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

function enforceEssayTitle(
  rawTitle: string,
  scholarshipTitle: string
): string {
  const base =
    normalizeText(rawTitle) ||
    `How to Write a Winning Essay for ${scholarshipTitle} USA 2026`;
  return fitLen(
    base,
    30,
    65,
    'Apply in USA 2026 with a focused plan.'
  );
}

function enforceEssayMeta(
  rawMeta: string,
  scholarshipTitle: string
): string {
  const base =
    normalizeText(rawMeta) ||
    `${scholarshipTitle} essay guide for USA 2026 with structure tips, strong examples, and a clear checklist. Start your application draft today.`;
  return fitLen(base, 120, 160, 'Use this guide to draft, revise, and apply with confidence.');
}

function enforceEssayFaq(
  rawFaq: unknown
): { question: string; answer: string }[] {
  const base = Array.isArray(rawFaq)
    ? rawFaq
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
      question: 'Who is eligible to apply for this scholarship essay?',
      answer:
        'Eligibility is defined by the scholarship requirements. Review academic, residency, and document criteria before drafting your essay.'
    },
    {
      question: 'When should I start before the scholarship deadline?',
      answer:
        'Start early and plan at least two revision rounds before the deadline. This gives time to improve structure, clarity, and personal impact.'
    },
    {
      question: 'What is the best application process for essay submission?',
      answer:
        'Match your essay to prompt requirements, follow formatting rules, and submit through official channels with all required materials.'
    }
  ];
  return [...base, ...defaults].slice(0, 3);
}

function requireGpt54EssayModel(model: string): void {
  if (model !== 'gpt-5.4') {
    throw new Error(
      `ESSAY_HUB_OPENAI_MODEL must be gpt-5.4, received "${model || 'unset'}"`
    );
  }
}

type FalHeroAttemptResult = FalImageAttemptResult;

/**
 * Essay Hub hero: **always** FLUX.1 [dev] (`postFluxDevImageOnce` → `fal-ai/flux/dev`, 16:9 JPEG).
 * No alternate backend — env `ESSAY_HUB_HERO_FAL_BACKEND` is ignored.
 */
async function falGenerateHeroImageOnce(
  fullImagePrompt: string
): Promise<FalHeroAttemptResult> {
  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return { url: null, httpStatus: 0, detail: 'FAL_KEY missing' };
  }
  return postFluxDevImageOnce(fullImagePrompt);
}

async function falGenerateHeroImageWithRetries(
  fullImagePrompt: string
): Promise<FalHeroAttemptResult> {
  return runFalImageAttemptLoop(
    () => falGenerateHeroImageOnce(fullImagePrompt),
    '[essay-hero]'
  );
}

export type FalHeroResolveMeta = {
  url: string | null;
  detail: string;
  httpStatus: number;
};

function isTruthyEnvFlag(raw: string | undefined): boolean {
  const v = raw?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function isEssayHeroReuseOnly(): boolean {
  return isTruthyEnvFlag(process.env.ESSAY_HUB_HERO_REUSE_ONLY);
}

function shortageAlertCooldownMs(): number {
  const raw = process.env.ESSAY_HUB_HERO_SHORTAGE_ALERT_COOLDOWN_MINUTES?.trim();
  const mins = Math.max(1, Number(raw || String(SHORTAGE_ALERT_COOLDOWN_MINUTES)) || SHORTAGE_ALERT_COOLDOWN_MINUTES);
  return mins * 60_000;
}

function normalizedHeroUrl(value: string | null | undefined): string | null {
  const x = value?.trim();
  return x ? x : null;
}

async function fetchPublishedHeroReusePool(
  supabase: SupabaseClient<Database>,
  limit = 800
): Promise<string[]> {
  const size = Math.max(1, Math.min(2000, Math.floor(limit)));
  const { data, error } = await supabase
    .from('essays')
    .select('hero_image_url')
    .eq('is_published', true)
    .not('hero_image_url', 'is', null)
    .neq('hero_image_url', '')
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(size);
  if (error) throw new Error(error.message);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const row of data ?? []) {
    const url = normalizedHeroUrl(row.hero_image_url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

async function fetchRecentPublishedHeroUsage(
  supabase: SupabaseClient<Database>,
  limit: number
): Promise<Set<string>> {
  const size = Math.max(0, Math.floor(limit));
  if (size <= 0) return new Set();
  const { data, error } = await supabase
    .from('essays')
    .select('hero_image_url')
    .eq('is_published', true)
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(size);
  if (error) throw new Error(error.message);
  const used = new Set<string>();
  for (const row of data ?? []) {
    const url = normalizedHeroUrl(row.hero_image_url);
    if (url) used.add(url);
  }
  return used;
}

async function maybeNotifyReusableHeroShortage(params: {
  poolUniqueCount: number;
  recentUniqueCount: number;
  queueId: string;
  scholarshipId: string;
}): Promise<void> {
  const now = Date.now();
  if (now - lastReusableHeroShortageAlertAt < shortageAlertCooldownMs()) return;
  lastReusableHeroShortageAlertAt = now;
  const text = [
    '⚠️ Essay Hub hero pool shortage',
    'Статус: Требует внимания',
    '',
    `Режим: ESSAY_HUB_HERO_REUSE_ONLY=1 (FAL отключен)`,
    `Окно без дублей: ${FIRST_THREE_ESSAYS_PAGES_WINDOW} карточек (/essays первые 3 страницы)`,
    `Уникальных hero в пуле: ${params.poolUniqueCount}`,
    `Уникальных hero в недавних публикациях: ${params.recentUniqueCount}`,
    `queue_id: ${params.queueId}`,
    `scholarship_id: ${params.scholarshipId}`,
    '',
    'Уникальные картинки заканчиваются — подключите FAL, чтобы продолжить без дублей.'
  ].join('\n');
  await notifyEnvTelegramAdminsPlainText(text, 'seo');
}

async function pickReusableHeroUrlForNextEssay(
  supabase: SupabaseClient<Database>,
  input: { queueId: string; scholarshipId: string }
): Promise<string | null> {
  const pool = await fetchPublishedHeroReusePool(
    supabase,
    FIRST_THREE_ESSAYS_PAGES_WINDOW * 8
  );
  const recentUsed = await fetchRecentPublishedHeroUsage(
    supabase,
    FIRST_THREE_ESSAYS_PAGES_WINDOW - 1
  );
  for (const heroUrl of pool) {
    if (!recentUsed.has(heroUrl)) return heroUrl;
  }
  await maybeNotifyReusableHeroShortage({
    poolUniqueCount: pool.length,
    recentUniqueCount: recentUsed.size,
    queueId: input.queueId,
    scholarshipId: input.scholarshipId
  });
  return null;
}

/**
 * POST to fal.run with bounded retries. Returns `url: null` if `FAL_KEY` is missing or FAL returns no URL.
 */
export async function tryResolveHeroImageUrlWithMeta(
  fullImagePrompt: string
): Promise<FalHeroResolveMeta> {
  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return { url: null, detail: 'FAL_KEY missing', httpStatus: 0 };
  }

  const r = await falGenerateHeroImageWithRetries(fullImagePrompt);
  return {
    url: r.url?.startsWith('http') ? r.url : null,
    detail: r.detail,
    httpStatus: r.httpStatus
  };
}

/**
 * Same as {@link tryResolveHeroImageUrlWithMeta} but URL only (for scripts/backfill that only need the link).
 */
export async function tryResolveHeroImageUrl(fullImagePrompt: string): Promise<string | null> {
  const { url } = await tryResolveHeroImageUrlWithMeta(fullImagePrompt);
  return url;
}

/**
 * Strict FAL-only URL (throws on missing key or failed generation). Prefer
 * `tryResolveHeroImageUrl` + `ingestEssayHeroFromFalOrFallback` for production pipelines.
 */
export async function resolveHeroImageUrl(fullImagePrompt: string): Promise<string> {
  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    throw new Error(
      'FAL_KEY is not set — cannot generate essay hero image. Add FAL_KEY to the server environment (see .env.example).'
    );
  }

  const r = await falGenerateHeroImageWithRetries(fullImagePrompt);
  if (r.url?.startsWith('http')) {
    return r.url;
  }

  throw new Error(`Hero image generation failed after ${falMaxAttempts()} attempt(s). ${r.detail}`);
}

/**
 * DB unique index is `lower(btrim(slug))` — `.eq('slug', x)` misses case variants and
 * concurrent inserts can both pass a naive check. Use case-insensitive probe + normalized slug.
 */
async function isEssaySlugTakenCi(
  supabase: SupabaseClient<Database>,
  trySlug: string
): Promise<boolean> {
  const trimmed = trySlug.trim();
  if (!trimmed) return true;
  /** Slugs we generate are [a-z0-9-]; ILIKE treats `_`/`%` as wildcards — safe for our charset. */
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
  const normalizedRoot = baseSlug.trim().toLowerCase().slice(0, 200);
  for (let n = 0; n < 60; n += 1) {
    const trySlug =
      n === 0
        ? normalizedRoot
        : n < 45
          ? `${normalizedRoot}-${n + 1}`.slice(0, 200)
          : `${normalizedRoot}-${n + 1}-${randomBytes(3).toString('hex')}`.slice(0, 200);
    const taken = await isEssaySlugTakenCi(supabase, trySlug);
    if (!taken) return trySlug;
  }
  throw new Error('Could not allocate unique essay slug');
}

function isUniqueSlugConstraintError(err: {
  code?: string;
  message?: string;
} | null): boolean {
  if (!err) return false;
  if (err.code === '23505') return true;
  const m = err.message ?? '';
  return (
    m.includes('essays_slug_unique_lower') ||
    m.includes('duplicate key value') ||
    m.includes('unique constraint')
  );
}

type EssayInsertRow = Database['public']['Tables']['essays']['Insert'];

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
    if (error && !isUniqueSlugConstraintError(error)) {
      throw new Error(error.message);
    }
    if (data?.id) {
      return { id: data.id, slug };
    }
    slug = await ensureUniqueEssaySlug(
      supabase,
      `${baseSlug}-${randomBytes(4).toString('hex')}`
    );
  }
  throw new Error('Could not insert essay after unique slug retries');
}

export async function claimNextPendingEssayQueueRow(
  supabase: SupabaseClient<Database>
): Promise<{ queueId: string; scholarshipId: string } | null> {
  const { data: pending, error: e1 } = await supabase
    .from('essay_generation_queue')
    .select('id, scholarship_id')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (e1) throw new Error(e1.message);
  if (!pending?.id || !pending.scholarship_id) return null;

  const { data: claimed, error: e2 } = await supabase
    .from('essay_generation_queue')
    .update({
      status: 'processing',
      updated_at: new Date().toISOString(),
      error_message: null
    })
    .eq('id', pending.id)
    .eq('status', 'pending')
    .select('id, scholarship_id')
    .maybeSingle();

  if (e2) throw new Error(e2.message);
  if (!claimed?.scholarship_id) return null;

  return { queueId: claimed.id, scholarshipId: claimed.scholarship_id };
}

/**
 * Oldest `awaiting_hero` row → `processing` (hero retry before new `pending` jobs).
 */
export async function claimAwaitingHeroQueueRow(
  supabase: SupabaseClient<Database>
): Promise<{
  queueId: string;
  scholarshipId: string;
  createdEssayId: string;
} | null> {
  const { data: next, error: e1 } = await supabase
    .from('essay_generation_queue')
    .select('id, scholarship_id, created_essay_id')
    .eq('status', 'awaiting_hero')
    .not('created_essay_id', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (e1) throw new Error(e1.message);
  if (!next?.id || !next.scholarship_id || !next.created_essay_id) return null;

  const { data: claimed, error: e2 } = await supabase
    .from('essay_generation_queue')
    .update({
      status: 'processing',
      updated_at: new Date().toISOString(),
      error_message: null
    })
    .eq('id', next.id)
    .eq('status', 'awaiting_hero')
    .select('id, scholarship_id, created_essay_id')
    .maybeSingle();

  if (e2) throw new Error(e2.message);
  if (!claimed?.scholarship_id || !claimed.created_essay_id) return null;

  return {
    queueId: claimed.id,
    scholarshipId: claimed.scholarship_id,
    createdEssayId: claimed.created_essay_id
  };
}

/**
 * Workers that crash mid-job leave rows in `processing` forever — nothing is `pending`, so the
 * queue looks empty. Move stale `processing` rows back to `pending` for retry.
 *
 * `ESSAY_QUEUE_STALE_PROCESSING_RESET_MINUTES` — min age of `updated_at` to reset (default 90).
 * Set to `0` to disable.
 */
export async function resetStaleProcessingEssayQueueRows(
  supabase: SupabaseClient<Database>
): Promise<number> {
  const raw = process.env.ESSAY_QUEUE_STALE_PROCESSING_RESET_MINUTES?.trim();
  if (raw === '0') return 0;

  const minutes = Math.max(5, Number(raw || '90') || 90);
  const cutoff = new Date(Date.now() - minutes * 60_000).toISOString();

  const { data: heroPending, error: e1 } = await supabase
    .from('essay_generation_queue')
    .update({
      status: 'awaiting_hero',
      error_message:
        'requeued: stale processing while awaiting FAL hero (worker reset — will retry image)',
      updated_at: new Date().toISOString()
    })
    .eq('status', 'processing')
    .not('created_essay_id', 'is', null)
    .lt('updated_at', cutoff)
    .select('id');

  if (e1) throw new Error(e1.message);

  const { data: freshPending, error: e2 } = await supabase
    .from('essay_generation_queue')
    .update({
      status: 'pending',
      error_message:
        'requeued: stale processing (worker reset — safe to retry)',
      updated_at: new Date().toISOString()
    })
    .eq('status', 'processing')
    .is('created_essay_id', null)
    .lt('updated_at', cutoff)
    .select('id');

  if (e2) throw new Error(e2.message);
  return (heroPending?.length ?? 0) + (freshPending?.length ?? 0);
}

/**
 * When there are no `pending` jobs, promotes the oldest `failed` row to `pending` so the worker
 * can run the full pipeline again (including a fresh FAL hero attempt). Respects a cooldown from
 * `updated_at` so a tight fail loop does not spin.
 */
export async function promoteOldestCooldownFailedQueueRowToPending(
  supabase: SupabaseClient<Database>
): Promise<boolean> {
  const raw = process.env.ESSAY_QUEUE_FAILED_RETRY_AFTER_MINUTES?.trim();
  const retryAfterMin =
    raw === '0' ? 0 : Math.max(1, Number(raw || '15') || 15);

  let sel = supabase
    .from('essay_generation_queue')
    .select('id')
    .eq('status', 'failed')
    .order('created_at', { ascending: true })
    .limit(1);

  if (retryAfterMin > 0) {
    const cutoffIso = new Date(Date.now() - retryAfterMin * 60_000).toISOString();
    sel = sel.lt('updated_at', cutoffIso);
  }

  const { data: row, error: selErr } = await sel.maybeSingle();

  if (selErr) throw new Error(selErr.message);
  if (!row?.id) return false;

  const { data: updated, error: upErr } = await supabase
    .from('essay_generation_queue')
    .update({
      status: 'pending',
      error_message: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', row.id)
    .eq('status', 'failed')
    .select('id')
    .maybeSingle();

  if (upErr) throw new Error(upErr.message);
  return Boolean(updated?.id);
}

async function processResumeAwaitingHeroJob(
  supabase: SupabaseClient<Database>,
  job: { queueId: string; scholarshipId: string; createdEssayId: string }
): Promise<
  | { outcome: 'published'; essaySlug: string; queueId: string }
  | { outcome: 'deferred'; queueId: string }
  | { outcome: 'failed'; error: string }
> {
  const { queueId, scholarshipId, createdEssayId } = job;
  const reuseOnly = isEssayHeroReuseOnly();

  const { data: essay, error: ge } = await supabase
    .from('essays')
    .select('id, slug, hero_variant_index, is_published')
    .eq('id', createdEssayId)
    .maybeSingle();

  if (ge) return { outcome: 'failed', error: ge.message };
  if (!essay?.slug) {
    await supabase
      .from('essay_generation_queue')
      .update({
        status: 'failed',
        error_message: 'Draft essay row missing for awaiting_hero resume',
        updated_at: new Date().toISOString()
      })
      .eq('id', queueId);
    return { outcome: 'failed', error: 'Draft essay missing' };
  }

  if (essay.is_published) {
    await supabase
      .from('essay_generation_queue')
      .update({
        status: 'completed',
        created_essay_id: essay.id,
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', queueId);
    return { outcome: 'published', essaySlug: essay.slug, queueId };
  }

  const { data: scholarship, error: se } = await supabase
    .from('scholarships')
    .select('id, title, category, category_slug, tags, summary_short')
    .eq('id', scholarshipId)
    .maybeSingle();

  if (se || !scholarship?.id) {
    await supabase
      .from('essay_generation_queue')
      .update({
        status: 'failed',
        error_message: 'Scholarship missing for hero resume',
        updated_at: new Date().toISOString()
      })
      .eq('id', queueId);
    return { outcome: 'failed', error: 'Scholarship not found for hero resume' };
  }

  const scholarshipTitle = scholarship.title?.trim() || 'Scholarship program';
  const { count: publishedCount, error: cntErr } = await supabase
    .from('essays')
    .select('*', { count: 'exact', head: true })
    .eq('is_published', true);
  if (cntErr) return { outcome: 'failed', error: cntErr.message };

  const existingIndex =
    typeof essay.hero_variant_index === 'number' && essay.hero_variant_index >= 0
      ? essay.hero_variant_index
      : publishedCount ?? 0;

  const grantCategory = buildGrantCategoryHaystack({
    category: scholarship.category ?? null,
    category_slug: scholarship.category_slug ?? null,
    tags: scholarship.tags ?? null,
    summary_short: scholarship.summary_short ?? null,
    title: scholarshipTitle
  });

  if (reuseOnly) {
    const reuseHeroUrl = await pickReusableHeroUrlForNextEssay(supabase, {
      queueId,
      scholarshipId
    });
    if (!reuseHeroUrl) {
      await supabase
        .from('essay_generation_queue')
        .update({
          status: 'awaiting_hero',
          error_message:
            'Reuse-only hero pool exhausted: no unique image available for first 3 /essays pages.',
          updated_at: new Date().toISOString()
        })
        .eq('id', queueId);
      return { outcome: 'deferred', queueId };
    }
    const { error: upEssayErr } = await supabase
      .from('essays')
      .update({
        hero_image_url: reuseHeroUrl,
        hero_is_real: true,
        is_published: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', essay.id);
    if (upEssayErr) {
      return { outcome: 'failed', error: upEssayErr.message };
    }
    await supabase
      .from('essay_generation_queue')
      .update({
        status: 'completed',
        created_essay_id: essay.id,
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', queueId);
    void pingGoogleIndexingDirect(essayIndexingUrl(essay.slug)).catch(() => {
      /* pingGoogleIndexingDirect logs errors; swallow rejection defensively */
    });
    return { outcome: 'published', essaySlug: essay.slug, queueId };
  }

  const heroPrompt = buildEssayHubHeroImagePrompt({
    existingIndex,
    grantTitle: scholarshipTitle,
    grantCategory
  });

  const falMeta = await tryResolveHeroImageUrlWithMeta(heroPrompt);
  if (!falMeta.url) {
    await supabase
      .from('essay_generation_queue')
      .update({
        status: 'awaiting_hero',
        error_message: `FAL deferred (retry next run): ${falMeta.detail}`.slice(0, 2000),
        updated_at: new Date().toISOString()
      })
      .eq('id', queueId);
    return { outcome: 'deferred', queueId };
  }

  try {
    const heroUrl = await ingestFalHeroImageToSupabase(supabase, {
      falImageUrl: falMeta.url,
      slug: essay.slug
    });

    const { error: upEssayErr } = await supabase
      .from('essays')
      .update({
        hero_image_url: heroUrl,
        hero_is_real: true,
        is_published: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', essay.id);

    if (upEssayErr) throw new Error(upEssayErr.message);

    await supabase
      .from('essay_generation_queue')
      .update({
        status: 'completed',
        created_essay_id: essay.id,
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', queueId);

    void pingGoogleIndexingDirect(essayIndexingUrl(essay.slug)).catch(() => {
      /* pingGoogleIndexingDirect logs errors; swallow rejection defensively */
    });

    return { outcome: 'published', essaySlug: essay.slug, queueId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase
      .from('essay_generation_queue')
      .update({
        status: 'awaiting_hero',
        error_message: `Ingest deferred (retry next run): ${msg}`.slice(0, 2000),
        updated_at: new Date().toISOString()
      })
      .eq('id', queueId);
    return { outcome: 'deferred', queueId };
  }
}

function isEssayGenerationPaused(): boolean {
  const v = process.env.ESSAY_GENERATION_DISABLED?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export async function processOneEssayQueueItem(
  supabase: SupabaseClient<Database>
): Promise<
  | {
      ok: true;
      skipped: 'queue_empty' | 'generation_paused' | 'hero_retry_deferred';
      queueId?: string;
    }
  | {
      ok: true;
      essaySlug: string;
      queueId: string;
      phase?: 'published' | 'resume_published' | 'draft_saved_awaiting_hero';
    }
  | { ok: false; error: string }
> {
  const reuseOnly = isEssayHeroReuseOnly();
  if (isEssayGenerationPaused()) {
    return { ok: true, skipped: 'generation_paused' };
  }

  let queueId: string | null = null;
  try {
    await resetStaleProcessingEssayQueueRows(supabase);

    const heroJob = await claimAwaitingHeroQueueRow(supabase);
    if (heroJob) {
      const resumed = await processResumeAwaitingHeroJob(supabase, heroJob);
      if (resumed.outcome === 'failed') {
        return { ok: false, error: resumed.error };
      }
      if (resumed.outcome === 'deferred') {
        return { ok: true, skipped: 'hero_retry_deferred', queueId: resumed.queueId };
      }
      return {
        ok: true,
        essaySlug: resumed.essaySlug,
        queueId: resumed.queueId,
        phase: 'resume_published'
      };
    }

    let claimed = await claimNextPendingEssayQueueRow(supabase);
    if (!claimed) {
      await promoteOldestCooldownFailedQueueRowToPending(supabase);
      claimed = await claimNextPendingEssayQueueRow(supabase);
    }
    if (!claimed) {
      return { ok: true, skipped: 'queue_empty' };
    }
    queueId = claimed.queueId;

    const { data: scholarship, error: se } = await supabase
      .from('scholarships')
      .select(
        'id, title, slug, summary_short, description, apply_url, category, category_slug, tags'
      )
      .eq('id', claimed.scholarshipId)
      .maybeSingle();

    if (se) throw new Error(se.message);
    if (!scholarship?.id) {
      throw new Error('Scholarship not found for queue item');
    }

    const scholarshipTitle =
      scholarship.title?.trim() || 'Scholarship program';
    const baseSlug = buildDefaultEssaySlugFromScholarshipTitle(scholarshipTitle);

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const openai = new OpenAI({ apiKey });

    const user = `## Target scholarship (context only—do not invent details not inferable from this)
- Name: ${scholarshipTitle}
- Short summary (from catalog): ${scholarship.summary_short?.trim() || 'N/A'}
- Catalog slug: ${scholarship.slug || 'N/A'}

## Your task
Write one comprehensive **how-to guide** that teaches applicants to plan, draft, and revise the **scholarship essay** for this program, using the same strategic DNA as ScholarshipTop’s interactive Essay Builder (see system message): hooking the committee, four material buckets (background / achievements / gap / personality), STAR and Hero’s Journey as *unspoken* structure for the reader’s thinking, Grinder-style paragraph discipline, and hard bans on clichés and invented facts.

## Required JSON output (single object, no markdown fences)
Return **only** a JSON object with exactly these keys:
- "title": string — ≤70 characters, title case; make it clearly a **how-to** for this scholarship’s essay (not a fake applicant essay title).
- "meta_description": string — ≤160 characters; SEO-safe; no clickbait guarantees.
- "content_html": string — **RAW HTML only, never Markdown.** Use h2, h3, p, ul, ol, li, strong, em, a as needed. No h1. Include **4–7 h2 sections** (e.g. deconstructing the prompt, brainstorming across the four buckets, outline, drafting voice, revision & “So what?”, pitfalls). The guide must instruct readers to produce **their own** unique essay; do not write a sample essay as if you were the applicant.
- "faq": array of 3–5 objects { "question": string, "answer": string } — answers 2–5 sentences each.
- "candidate_sources": array of 1–4 objects { "title": string, "url": string } — **only** https URLs you are confident are real, on ***.edu** hosts or **Wikipedia** (*.wikipedia.org). Do **not** invent URLs. Omit entries you cannot verify. Prefer .edu writing centers, admissions, or financial aid pages, or relevant Wikipedia articles.

Do not promise admission, awards, or outcomes. No placeholder brackets like [insert name].`;

    const essayModel = process.env.ESSAY_HUB_OPENAI_MODEL?.trim() || '';
    requireGpt54EssayModel(essayModel);
    const completion = await openai.chat.completions.create({
      model: essayModel,
      temperature: 0.45,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: ESSAY_HUB_MEGA_PROMPT_SYSTEM },
        { role: 'user', content: user }
      ]
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) throw new Error('Empty OpenAI response');

    let parsed: GeneratedPayload;
    try {
      parsed = JSON.parse(raw) as GeneratedPayload;
    } catch {
      throw new Error('OpenAI returned non-JSON');
    }

    if (!parsed.content_html?.trim() || !parsed.title?.trim()) {
      throw new Error('Invalid generation payload');
    }

    const verifiedSources = await filterReachableHighAuthoritySources(
      Array.isArray(parsed.candidate_sources) ? parsed.candidate_sources : [],
      { max: 6 }
    );
    /** If none pass HEAD/GET checks, publish with `sources: []` — do not block the essay. */

    const normalizedTitle = enforceEssayTitle(parsed.title ?? '', scholarshipTitle);
    const normalizedMeta = enforceEssayMeta(parsed.meta_description ?? '', scholarshipTitle);
    const faqJson = enforceEssayFaq(parsed.faq);

    const { count: publishedBefore, error: cntErr } = await supabase
      .from('essays')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true);
    if (cntErr) throw new Error(cntErr.message);
    const existingIndex = publishedBefore ?? 0;

    const grantCategory = buildGrantCategoryHaystack({
      category: scholarship.category ?? null,
      category_slug: scholarship.category_slug ?? null,
      tags: scholarship.tags ?? null,
      summary_short: scholarship.summary_short ?? null,
      title: scholarshipTitle
    });

    const heroPrompt = buildEssayHubHeroImagePrompt({
      existingIndex,
      grantTitle: scholarshipTitle,
      grantCategory
    });
    const falMeta: FalHeroResolveMeta = reuseOnly
      ? { url: null, detail: 'FAL disabled by ESSAY_HUB_HERO_REUSE_ONLY', httpStatus: 0 }
      : await tryResolveHeroImageUrlWithMeta(heroPrompt);

    const insertDraftLinkAndAwaitHero = async (
      reason: string
    ): Promise<{ slug: string }> => {
      const { id: essayId, slug: insertedSlug } = await insertEssayRowWithSlugRetry(
        supabase,
        baseSlug,
        (s) => ({
          slug: s,
          title: normalizedTitle,
          meta_description: normalizedMeta,
          content_html: parsed.content_html.trim(),
          hero_image_url: null,
          hero_is_real: false,
          hero_variant_index: existingIndex,
          sources: verifiedSources as unknown as Json,
          faq: faqJson as unknown as Json,
          is_published: false
        })
      );

      const { error: jErr } = await supabase.from('scholarship_essays').insert({
        scholarship_id: scholarship.id,
        essay_id: essayId
      });
      if (jErr) throw new Error(jErr.message);

      const { error: quErr } = await supabase
        .from('essay_generation_queue')
        .update({
          status: 'awaiting_hero',
          created_essay_id: essayId,
          error_message: reason.slice(0, 2000),
          updated_at: new Date().toISOString()
        })
        .eq('id', queueId!);
      if (quErr) throw new Error(quErr.message);
      return { slug: insertedSlug };
    };

    if (reuseOnly) {
      const reuseHeroUrl = await pickReusableHeroUrlForNextEssay(supabase, {
        queueId: queueId!,
        scholarshipId: scholarship.id
      });
      if (!reuseHeroUrl) {
        const { slug: draftSlug } = await insertDraftLinkAndAwaitHero(
          'Reuse-only hero pool exhausted: no unique image available for first 3 /essays pages.'
        );
        return {
          ok: true,
          essaySlug: draftSlug,
          queueId,
          phase: 'draft_saved_awaiting_hero'
        };
      }
      const { id: essayId, slug } = await insertEssayRowWithSlugRetry(
        supabase,
        baseSlug,
        (s) => ({
          slug: s,
          title: normalizedTitle,
          meta_description: normalizedMeta,
          content_html: parsed.content_html.trim(),
          hero_image_url: reuseHeroUrl,
          hero_is_real: true,
          hero_variant_index: existingIndex,
          sources: verifiedSources as unknown as Json,
          faq: faqJson as unknown as Json,
          is_published: true
        })
      );
      const { error: jErr } = await supabase.from('scholarship_essays').insert({
        scholarship_id: scholarship.id,
        essay_id: essayId
      });
      if (jErr) throw new Error(jErr.message);
      const { error: quErr } = await supabase
        .from('essay_generation_queue')
        .update({
          status: 'completed',
          created_essay_id: essayId,
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', queueId);
      if (quErr) throw new Error(quErr.message);
      void pingGoogleIndexingDirect(essayIndexingUrl(slug)).catch(() => {
        /* pingGoogleIndexingDirect logs errors; swallow rejection defensively */
      });
      return { ok: true, essaySlug: slug, queueId, phase: 'published' };
    }

    if (!falMeta.url) {
      const { slug: draftSlug } = await insertDraftLinkAndAwaitHero(
        `Awaiting FAL hero: ${falMeta.detail}`
      );
      return {
        ok: true,
        essaySlug: draftSlug,
        queueId,
        phase: 'draft_saved_awaiting_hero'
      };
    }

    /** Same slug for Storage path + DB row; retry on unique race after ingest. */
    let essayId: string | undefined;
    let slug: string | undefined;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const candidateSlug = await ensureUniqueEssaySlug(
        supabase,
        attempt === 0 ? baseSlug : `${baseSlug}-${randomBytes(4).toString('hex')}`
      );
      let publicHeroUrl: string;
      try {
        publicHeroUrl = await ingestFalHeroImageToSupabase(supabase, {
          falImageUrl: falMeta.url,
          slug: candidateSlug
        });
      } catch (ingestErr) {
        const msg = ingestErr instanceof Error ? ingestErr.message : String(ingestErr);
        const { slug: draftSlug } = await insertDraftLinkAndAwaitHero(
          `Awaiting FAL ingest: ${msg}`
        );
        return {
          ok: true,
          essaySlug: draftSlug,
          queueId,
          phase: 'draft_saved_awaiting_hero'
        };
      }
      const { data: row, error: insErr } = await supabase
        .from('essays')
        .insert({
          slug: candidateSlug,
          title: normalizedTitle,
          meta_description: normalizedMeta,
          content_html: parsed.content_html.trim(),
          hero_image_url: publicHeroUrl,
          hero_is_real: true,
          hero_variant_index: existingIndex,
          sources: verifiedSources as unknown as Json,
          faq: faqJson as unknown as Json,
          is_published: true
        })
        .select('id')
        .maybeSingle();
      if (!insErr && row?.id) {
        essayId = row.id;
        slug = candidateSlug;
        break;
      }
      if (insErr && !isUniqueSlugConstraintError(insErr)) {
        throw new Error(insErr.message);
      }
    }
    if (!essayId || !slug) {
      throw new Error('Could not insert published essay after slug retries');
    }

    const { error: jErr } = await supabase.from('scholarship_essays').insert({
      scholarship_id: scholarship.id,
      essay_id: essayId
    });
    if (jErr) throw new Error(jErr.message);

    const { error: quErr } = await supabase
      .from('essay_generation_queue')
      .update({
        status: 'completed',
        created_essay_id: essayId,
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', queueId);
    if (quErr) throw new Error(quErr.message);

    void pingGoogleIndexingDirect(essayIndexingUrl(slug)).catch(() => {
      /* pingGoogleIndexingDirect logs errors; swallow rejection defensively */
    });

    return { ok: true, essaySlug: slug, queueId, phase: 'published' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (queueId) {
      await supabase
        .from('essay_generation_queue')
        .update({
          status: 'failed',
          error_message: msg.slice(0, 2000),
          updated_at: new Date().toISOString()
        })
        .eq('id', queueId);
    }
    return { ok: false, error: msg };
  }
}
