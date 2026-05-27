import 'server-only';

import { createHash } from 'crypto';
import OpenAI from 'openai';

import { openAiSeoHubModel } from '@/lib/seo/seoHubContentAi';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';
import { createPublicClient } from '@/utils/supabase/public';

export type AiMetaRouteKind =
  | 'scholarship_listing'
  | 'scholarship_detail'
  | 'compare_state'
  | 'compare_university';

export type AiMetaRequest = {
  canonicalPath: string;
  routeKind: AiMetaRouteKind;
  title: string;
  fallbackDescription: string;
  context?: Record<string, unknown>;
  priority?: number;
};

type CacheRow = {
  meta_description: string | null;
  prompt_hash: string;
  status: 'pending' | 'ready' | 'failed';
};

const META_MIN_LEN = 120;
const META_MAX_LEN = 160;

function isAiMetaEnabled(): boolean {
  const v = process.env.SEO_AI_META_ENABLED?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function normalizeCanonicalPath(raw: string): string {
  const s = raw.trim().toLowerCase();
  return s.startsWith('/') ? s : `/${s}`;
}

function safeString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function stripUnsafeChars(v: string): string {
  return v
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/["'`]/g, '')
    .replace(/[<>]/g, '')
    .trim();
}

export function sanitizeMetaDescription(raw: string): string {
  let cleaned = stripUnsafeChars(raw);
  if (!cleaned) return '';
  if (!/\b(compare|find|explore|apply|review)\b/i.test(cleaned)) {
    cleaned = `${cleaned} Compare options and apply.`;
  }
  if (cleaned.length < META_MIN_LEN) {
    cleaned = `${cleaned} Review eligibility, compare deadlines, and continue through provider application paths.`;
  }
  cleaned = stripUnsafeChars(cleaned);
  if (cleaned.length > META_MAX_LEN) {
    cleaned = `${cleaned.slice(0, META_MAX_LEN - 1).trimEnd()}…`;
  }
  return cleaned;
}

export function buildAiMetaPrompt(input: AiMetaRequest): string {
  const contextJson = JSON.stringify(input.context ?? {});
  return [
    'Write one SEO meta description in English.',
    'Rules:',
    '- Return plain text only.',
    '- Maximum 160 characters.',
    '- No quotes, no emojis, no markdown, no HTML.',
    '- Keep it factual and specific for this page.',
    '- Mention scholarships or financial aid context naturally.',
    '',
    `Route kind: ${input.routeKind}`,
    `Canonical path: ${normalizeCanonicalPath(input.canonicalPath)}`,
    `Title: ${input.title}`,
    `Fallback description: ${input.fallbackDescription}`,
    `Context JSON: ${contextJson}`
  ].join('\n');
}

export function computeAiMetaPromptHash(input: AiMetaRequest): string {
  const payload = JSON.stringify({
    v: 1,
    routeKind: input.routeKind,
    canonicalPath: normalizeCanonicalPath(input.canonicalPath),
    title: input.title,
    fallbackDescription: input.fallbackDescription,
    context: input.context ?? {}
  });
  return createHash('sha256').update(payload).digest('hex');
}

export async function generateAiMetaDescription(
  input: AiMetaRequest
): Promise<{ description: string; model: string } | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  const model = openAiSeoHubModel();
  if (model !== 'gpt-5.4') {
    throw new Error(
      `OPENAI_SEO_MODEL must be exactly gpt-5.4 for AI meta generation. Current model: ${model}`
    );
  }
  const client = new OpenAI({ apiKey: key });
  const res = await client.chat.completions.create({
    model,
    temperature: 0.25,
    messages: [
      {
        role: 'system',
        content:
          'You write concise SEO meta descriptions. Follow all user rules exactly.'
      },
      { role: 'user', content: buildAiMetaPrompt(input) }
    ]
  });
  const raw = safeString(res.choices[0]?.message?.content);
  if (!raw) return null;
  const description = sanitizeMetaDescription(raw);
  if (!description || description.length < META_MIN_LEN) return null;
  return { description, model };
}

async function readAiMetaCache(
  canonicalPath: string
): Promise<CacheRow | null> {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data, error } = await (supabase as any)
    .from('seo_meta_cache')
    .select('meta_description, prompt_hash, status')
    .eq('canonical_path', canonicalPath)
    .maybeSingle();
  if (error || !data) return null;
  return data as CacheRow;
}

async function upsertAiMetaQueue(input: AiMetaRequest, promptHash: string) {
  const admin = createServiceRoleSupabaseClient();
  if (!admin) return;
  await (admin as any).from('seo_meta_generation_queue').upsert(
    {
      canonical_path: normalizeCanonicalPath(input.canonicalPath),
      route_kind: input.routeKind,
      prompt_hash: promptHash,
      fallback_description: sanitizeMetaDescription(input.fallbackDescription),
      context_json: input.context ?? {},
      priority: Math.floor(input.priority ?? 0),
      status: 'pending',
      last_error: null
    },
    { onConflict: 'canonical_path' }
  );
}

export async function resolveAiMetaDescription(
  input: AiMetaRequest
): Promise<string | null> {
  if (!isAiMetaEnabled()) return null;
  const canonicalPath = normalizeCanonicalPath(input.canonicalPath);
  const promptHash = computeAiMetaPromptHash({ ...input, canonicalPath });
  const cached = await readAiMetaCache(canonicalPath);
  if (
    cached?.status === 'ready' &&
    cached.prompt_hash === promptHash &&
    safeString(cached.meta_description)
  ) {
    return sanitizeMetaDescription(cached.meta_description ?? '');
  }

  await upsertAiMetaQueue({ ...input, canonicalPath }, promptHash);
  if (safeString(cached?.meta_description)) {
    return sanitizeMetaDescription(cached?.meta_description ?? '');
  }
  return null;
}

export async function processAiMetaQueueBatch(limit: number): Promise<{
  selected: number;
  completed: number;
  failed: number;
}> {
  const admin = createServiceRoleSupabaseClient();
  if (!admin) return { selected: 0, completed: 0, failed: 0 };
  const nowIso = new Date().toISOString();
  const { data: rows, error } = await (admin as any)
    .from('seo_meta_generation_queue')
    .select(
      'id, canonical_path, route_kind, prompt_hash, fallback_description, context_json, attempts, max_attempts'
    )
    .eq('status', 'pending')
    .or(`next_retry_at.is.null,next_retry_at.lte.${nowIso}`)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error || !rows) return { selected: 0, completed: 0, failed: 0 };

  let completed = 0;
  let failed = 0;
  for (const row of rows as Array<Record<string, unknown>>) {
    const id = safeString(row.id);
    if (!id) continue;
    const claim = await (admin as any)
      .from('seo_meta_generation_queue')
      .update({ status: 'processing' })
      .eq('id', id)
      .eq('status', 'pending');
    if (claim.error) continue;
    const input: AiMetaRequest = {
      canonicalPath: safeString(row.canonical_path),
      routeKind: (safeString(row.route_kind) as AiMetaRouteKind) || 'scholarship_listing',
      title: safeString((row.context_json as any)?.title) || 'Scholarship page',
      fallbackDescription:
        safeString(row.fallback_description) ||
        'Compare scholarship options, eligibility, and deadlines.',
      context:
        row.context_json && typeof row.context_json === 'object'
          ? (row.context_json as Record<string, unknown>)
          : {}
    };
    try {
      const generated = await generateAiMetaDescription(input);
      if (!generated) throw new Error('No AI response');
      await (admin as any).from('seo_meta_cache').upsert(
        {
          canonical_path: normalizeCanonicalPath(input.canonicalPath),
          route_kind: input.routeKind,
          prompt_hash: safeString(row.prompt_hash),
          meta_description: generated.description,
          status: 'ready',
          model: generated.model,
          source: 'ai',
          error_message: null,
          generated_at: new Date().toISOString()
        },
        { onConflict: 'canonical_path' }
      );
      await (admin as any)
        .from('seo_meta_generation_queue')
        .update({
          status: 'completed',
          last_error: null,
          attempts: Number(row.attempts ?? 0) + 1
        })
        .eq('id', id);
      completed += 1;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'AI generation failed';
      const attempts = Number(row.attempts ?? 0) + 1;
      const maxAttempts = Number(row.max_attempts ?? 3);
      const finalStatus = attempts >= maxAttempts ? 'failed' : 'pending';
      await (admin as any)
        .from('seo_meta_generation_queue')
        .update({
          status: finalStatus,
          attempts,
          last_error: message,
          next_retry_at:
            finalStatus === 'pending'
              ? new Date(Date.now() + Math.min(60, Math.max(5, attempts * 5)) * 60_000).toISOString()
              : null
        })
        .eq('id', id);
      await (admin as any).from('seo_meta_cache').upsert(
        {
          canonical_path: normalizeCanonicalPath(input.canonicalPath),
          route_kind: input.routeKind,
          prompt_hash: safeString(row.prompt_hash),
          meta_description: sanitizeMetaDescription(input.fallbackDescription),
          status: 'failed',
          model: null,
          source: 'fallback',
          error_message: message
        },
        { onConflict: 'canonical_path' }
      );
      failed += 1;
    }
  }
  return { selected: rows.length, completed, failed };
}
