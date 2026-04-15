import OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Json } from '@/types_db';
import { enqueueGoogleIndexingUrls } from '@/lib/seo/googleIndexingQueue';
import { essayHubArticlePath } from '@/lib/essays/essayHubSection';
import { getURL } from '@/utils/helpers';
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
import { ingestEssayHeroFromFalOrFallback } from '@/lib/essays/essayHeroIngest';

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

/** Always returns at most one URL (first asset only) — one hero per essay. */
function extractImageUrlFromFalJson(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;

  if (typeof d.url === 'string' && d.url.startsWith('http')) return d.url;

  const images = d.images ?? d.image ?? d.output;
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0];
    if (typeof first === 'string' && first.startsWith('http')) return first;
    if (first && typeof first === 'object') {
      const img = first as Record<string, unknown>;
      const u = img.url ?? img.image_url ?? img.file_url;
      if (typeof u === 'string' && u.startsWith('http')) return u;
    }
  }

  const inner = d.data;
  if (inner && typeof inner === 'object') {
    return extractImageUrlFromFalJson(inner);
  }
  return null;
}

type FalHeroAttemptResult = {
  url: string | null;
  httpStatus: number;
  /** Short snippet for logs (no secrets). */
  detail: string;
};

/**
 * Essay Hub hero image backend on fal.run.
 * Default: **FLUX.1 [dev]** (16:9 JPEG, matches article `aspect-[16/9]`).
 * Set `ESSAY_HUB_HERO_FAL_BACKEND=nano` for Nano Banana 2 (9:16, 1K).
 */
function essayHubHeroFalBackend(): 'flux' | 'nano' {
  const v = process.env.ESSAY_HUB_HERO_FAL_BACKEND?.trim().toLowerCase();
  if (v === 'nano' || v === 'nano-banana' || v === 'nano-banana-2') {
    return 'nano';
  }
  return 'flux';
}

const ESSAY_HUB_FAL_NANO_MODEL = 'fal-ai/nano-banana-2' as const;
const ESSAY_HUB_FAL_FLUX_DEV_MODEL = 'fal-ai/flux/dev' as const;

/** Portrait hero (`aspect_ratio` enum for nano-banana-2). */
const DEFAULT_FAL_IMAGE_ASPECT_RATIO = '9:16';

function buildNanoBanana2HeroBody(prompt: string): Record<string, unknown> {
  const aspect =
    process.env.FAL_IMAGE_ASPECT_RATIO?.trim() || DEFAULT_FAL_IMAGE_ASPECT_RATIO;
  return {
    prompt,
    /** Strictly one asset per essay (billing + UI). */
    num_images: 1,
    aspect_ratio: aspect,
    /** Standard tier; avoid 2K/4K multiplier unless env overrides resolution. */
    resolution: process.env.FAL_IMAGE_RESOLUTION?.trim() || '1K',
    /** Ignore any “generate multiple” wording inside the prompt. */
    limit_generations: true,
    enable_web_search: false
  };
}

function buildFluxDevHeroBody(prompt: string): Record<string, unknown> {
  /**
   * Default 704×396 (16:9) ≈0.28 MP — cheaper than 768×432 (~0.33 MP) on per-MP billing, still sharp enough
   * for Essay Hub after sharp→WebP. Cheaper preset: 640×360; sharper: 768×432 — set FLUX_HERO_WIDTH/HEIGHT.
   */
  const w = Math.max(
    256,
    Math.min(4096, Number.parseInt(process.env.FLUX_HERO_WIDTH?.trim() || '704', 10) || 704)
  );
  const h = Math.max(
    256,
    Math.min(4096, Number.parseInt(process.env.FLUX_HERO_HEIGHT?.trim() || '396', 10) || 396)
  );
  const steps = Math.max(
    12,
    Math.min(50, Number.parseInt(process.env.FLUX_HERO_INFERENCE_STEPS?.trim() || '28', 10) || 28)
  );
  return {
    prompt,
    image_size: { width: w, height: h },
    num_inference_steps: steps,
    guidance_scale: 3.5,
    num_images: 1,
    enable_safety_checker: true,
    output_format: 'jpeg'
  };
}

async function falGenerateHeroImageOnce(fullImagePrompt: string): Promise<FalHeroAttemptResult> {
  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return { url: null, httpStatus: 0, detail: 'FAL_KEY missing' };
  }

  const backend = essayHubHeroFalBackend();
  const model =
    backend === 'nano' ? ESSAY_HUB_FAL_NANO_MODEL : ESSAY_HUB_FAL_FLUX_DEV_MODEL;
  const endpoint = `https://fal.run/${model}`;

  const rawPrompt = fullImagePrompt.trim();
  const prompt =
    backend === 'nano' ? rawPrompt.slice(0, 3800) : rawPrompt.slice(0, 8000);
  const falBody =
    backend === 'nano' ? buildNanoBanana2HeroBody(prompt) : buildFluxDevHeroBody(prompt);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Key ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(falBody)
    });
    const json = (await res.json().catch(() => null)) as unknown;
    const raw =
      json && typeof json === 'object'
        ? JSON.stringify(json).slice(0, 900)
        : String(json);
    if (!res.ok) {
      return {
        url: null,
        httpStatus: res.status,
        detail: `HTTP ${res.status} ${raw}`
      };
    }
    const url = extractImageUrlFromFalJson(json);
    if (!url) {
      return {
        url: null,
        httpStatus: res.status,
        detail: `200 but no image URL in JSON: ${raw}`
      };
    }
    return { url, httpStatus: res.status, detail: 'ok' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { url: null, httpStatus: 0, detail: `fetch error: ${msg}` };
  }
}

/**
 * Exactly **one** `POST` to fal.run per hero — no retries (avoids duplicate billing when the first
 * response is slow or flaky). Returns `null` if `FAL_KEY` is missing or FAL returns no usable URL.
 * Queue generation uses this + `ingestEssayHeroFromFalOrFallback` so essays still publish with a hero.
 */
export async function tryResolveHeroImageUrl(fullImagePrompt: string): Promise<string | null> {
  const key = process.env.FAL_KEY?.trim();
  if (!key) return null;

  const r = await falGenerateHeroImageOnce(fullImagePrompt);
  return r.url?.startsWith('http') ? r.url : null;
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

  const r = await falGenerateHeroImageOnce(fullImagePrompt);
  if (r.url?.startsWith('http')) {
    return r.url;
  }

  throw new Error(
    `Hero image generation failed (single FAL attempt; no auto-retry to save quota). ${r.detail}`
  );
}

async function ensureUniqueEssaySlug(
  supabase: SupabaseClient<Database>,
  baseSlug: string
): Promise<string> {
  let candidate = baseSlug.slice(0, 200);
  for (let n = 0; n < 20; n += 1) {
    const trySlug = n === 0 ? candidate : `${baseSlug}-${n + 1}`.slice(0, 200);
    const { data, error } = await supabase
      .from('essays')
      .select('id')
      .eq('slug', trySlug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return trySlug;
  }
  throw new Error('Could not allocate unique essay slug');
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

  const { data, error } = await supabase
    .from('essay_generation_queue')
    .update({
      status: 'pending',
      error_message:
        'requeued: stale processing (worker reset — safe to retry)',
      updated_at: new Date().toISOString()
    })
    .eq('status', 'processing')
    .lt('updated_at', cutoff)
    .select('id');

  if (error) throw new Error(error.message);
  return data?.length ?? 0;
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

function isEssayGenerationPaused(): boolean {
  const v = process.env.ESSAY_GENERATION_DISABLED?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export async function processOneEssayQueueItem(
  supabase: SupabaseClient<Database>
): Promise<
  | { ok: true; skipped: 'queue_empty' | 'generation_paused' }
  | { ok: true; essaySlug: string; queueId: string }
  | { ok: false; error: string }
> {
  if (isEssayGenerationPaused()) {
    return { ok: true, skipped: 'generation_paused' };
  }

  let queueId: string | null = null;
  try {
    await resetStaleProcessingEssayQueueRows(supabase);

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
    const slug = await ensureUniqueEssaySlug(supabase, baseSlug);

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

    const completion = await openai.chat.completions.create({
      model: process.env.ESSAY_HUB_OPENAI_MODEL?.trim() || 'gpt-4o-mini',
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

    const faqJson = Array.isArray(parsed.faq) ? parsed.faq : [];

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
    const falHeroUrl = await tryResolveHeroImageUrl(heroPrompt);
    const { url: heroUrl, heroIsReal } = await ingestEssayHeroFromFalOrFallback(
      supabase,
      {
        falImageUrl: falHeroUrl,
        slug
      }
    );

    const { data: inserted, error: insErr } = await supabase
      .from('essays')
      .insert({
        slug,
        title: parsed.title.trim(),
        meta_description: parsed.meta_description?.trim() || null,
        content_html: parsed.content_html.trim(),
        hero_image_url: heroUrl,
        hero_is_real: heroIsReal,
        sources: verifiedSources as unknown as Json,
        faq: faqJson as unknown as Json,
        is_published: true
      })
      .select('id')
      .single();

    if (insErr) throw new Error(insErr.message);
    const essayId = inserted?.id;
    if (!essayId) throw new Error('Essay insert returned no id');

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

    const path = essayHubArticlePath(slug).replace(/^\/+/, '');
    enqueueGoogleIndexingUrls({
      kind: 'essay',
      urls: [getURL(path)],
      source: 'cron:process-essay-queue'
    });

    return { ok: true, essaySlug: slug, queueId };
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
