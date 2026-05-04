/**
 * Second-pass strict review for medium-confidence provider+host candidates.
 *
 * Reads hostless_provider_identity_ai_audit.json, reviews only medium rows with
 * provider+host candidates, and writes an apply-compatible audit JSON containing
 * only rows confirmed as high-confidence.
 *
 *   dotenv -e .env.local -- npx tsx scripts/ai_review_medium_hostless_provider_identity.ts
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

import { providerIdentitySlugify } from '../lib/providers/providerIdentityCandidate';
import type { Database } from '../types_db';

const INPUT_AUDIT_JSON = 'hostless_provider_identity_ai_audit.json';
const OUT_AUDIT_JSON = 'hostless_provider_identity_ai_review_audit.json';

type AuditRow = {
  id: string;
  title: string | null;
  source: string | null;
  provider_name: string | null;
  provider_slug: string | null;
  host_iso: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  evidence: string | null;
  should_apply: boolean;
};

type Row = {
  id: string;
  title: string | null;
  source: string | null;
  source_id: string | null;
  official_source_name: string | null;
  provider_name: string | null;
  provider_slug: string | null;
  apply_url: string | null;
  url: string | null;
  summary_short: string | null;
  description: string | null;
  eligibility_text: string | null;
  requirements_text: string | null;
  institutions_text: string | null;
  state_territory_text: string | null;
  raw_data: unknown;
};

function modelName(): string {
  return process.env.HOSTLESS_PROVIDER_AI_REVIEW_MODEL?.trim() || 'gpt-4o';
}

function concurrency(): number {
  const n = Number.parseInt(process.env.HOSTLESS_PROVIDER_AI_REVIEW_CONCURRENCY?.trim() || '8', 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(16, Math.floor(n));
}

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  return createClient<Database>(url, key);
}

function normalizeIso(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const iso = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(iso) ? iso : null;
}

function compact(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

function rawItem(row: Row): Record<string, unknown> {
  if (typeof row.raw_data !== 'object' || row.raw_data === null || Array.isArray(row.raw_data)) {
    return {};
  }
  const item = (row.raw_data as { raw_item?: unknown }).raw_item;
  return typeof item === 'object' && item !== null && !Array.isArray(item)
    ? (item as Record<string, unknown>)
    : {};
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const worker = async () => {
    for (;;) {
      const idx = cursor++;
      if (idx >= items.length) return;
      out[idx] = await mapper(items[idx]!, idx);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

function buildPrompt(candidate: AuditRow, row: Row): string {
  const item = rawItem(row);
  return [
    'Strictly review this proposed scholarship provider and host country.',
    'Approve only if the evidence explicitly supports BOTH provider identity and host country.',
    'Reject if the provider could be the scholarship/program title rather than an organization.',
    'Reject if host country is only a guess.',
    'Return exactly one JSON object: {"approved":true|false,"provider_name":string|null,"host_iso":"US"|null,"reason":string}.',
    '',
    `proposed_provider_name: ${JSON.stringify(candidate.provider_name)}`,
    `proposed_host_iso: ${JSON.stringify(candidate.host_iso)}`,
    `previous_evidence: ${JSON.stringify(candidate.evidence)}`,
    '',
    `title: ${JSON.stringify(compact(row.title, 500))}`,
    `source: ${JSON.stringify(compact(row.source, 100))}`,
    `source_id: ${JSON.stringify(compact(row.source_id, 200))}`,
    `official_source_name: ${JSON.stringify(compact(row.official_source_name, 200))}`,
    `apply_url: ${JSON.stringify(compact(row.apply_url, 700))}`,
    `url: ${JSON.stringify(compact(row.url, 700))}`,
    `summary_short: ${JSON.stringify(compact(row.summary_short, 900))}`,
    `description: ${JSON.stringify(compact(row.description, 1200))}`,
    `eligibility_text: ${JSON.stringify(compact(row.eligibility_text, 1000))}`,
    `requirements_text: ${JSON.stringify(compact(row.requirements_text, 1000))}`,
    `institutions_text: ${JSON.stringify(compact(row.institutions_text, 700))}`,
    `state_territory_text: ${JSON.stringify(compact(row.state_territory_text, 700))}`,
    `raw_item.name: ${JSON.stringify(compact(item.name, 500))}`,
    `raw_item.title: ${JSON.stringify(compact(item.title, 500))}`,
    `raw_item.description: ${JSON.stringify(compact(item.description, 1500))}`
  ].join('\n');
}

async function review(client: OpenAI, candidate: AuditRow, row: Row): Promise<AuditRow> {
  const completion = await client.chat.completions.create({
    model: modelName(),
    temperature: 0,
    max_tokens: 160,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are a conservative data-quality reviewer. Approve only when evidence is explicit.'
      },
      { role: 'user', content: buildPrompt(candidate, row) }
    ]
  });
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(completion.choices[0]?.message?.content?.trim() || '{}') as Record<
      string,
      unknown
    >;
  } catch {
    parsed = {};
  }

  const providerName =
    typeof parsed.provider_name === 'string' && parsed.provider_name.trim()
      ? parsed.provider_name.trim().slice(0, 160)
      : candidate.provider_name;
  const hostIso = normalizeIso(parsed.host_iso) ?? normalizeIso(candidate.host_iso);
  const approved = parsed.approved === true && providerName && hostIso;
  const providerSlug = approved ? providerIdentitySlugify(providerName) : null;

  return {
    id: candidate.id,
    title: row.title,
    source: row.source,
    provider_name: approved ? providerName : null,
    provider_slug: providerSlug || null,
    host_iso: approved ? hostIso : null,
    confidence: approved ? 'high' : 'none',
    evidence: compact(parsed.reason, 500) || candidate.evidence,
    should_apply: Boolean(approved && providerSlug)
  };
}

async function main() {
  if (!process.env.OPENAI_API_KEY?.trim()) throw new Error('OPENAI_API_KEY is required');

  const parsed = JSON.parse(await readFile(INPUT_AUDIT_JSON, 'utf-8')) as unknown;
  if (!Array.isArray(parsed)) throw new Error(`Expected array in ${INPUT_AUDIT_JSON}`);
  const candidates = parsed.filter((row): row is AuditRow => {
    if (typeof row !== 'object' || row === null) return false;
    const r = row as AuditRow;
    return (
      r.confidence === 'medium' &&
      typeof r.id === 'string' &&
      typeof r.provider_name === 'string' &&
      normalizeIso(r.host_iso) != null
    );
  });

  const supabase = serviceSupabase();
  const rowsById = new Map<string, Row>();
  for (let i = 0; i < candidates.length; i += 50) {
    const ids = candidates.slice(i, i + 50).map((row) => row.id);
    const { data, error } = await supabase
      .from('scholarships')
      .select(
        [
          'id',
          'title',
          'source',
          'source_id',
          'official_source_name',
          'provider_name',
          'provider_slug',
          'apply_url',
          'url',
          'summary_short',
          'description',
          'eligibility_text',
          'requirements_text',
          'institutions_text',
          'state_territory_text',
          'raw_data'
        ].join(',')
      )
      .in('id', ids);
    if (error) throw error;
    for (const row of (data ?? []) as Row[]) rowsById.set(row.id, row);
  }

  const reviewTargets = candidates.filter((candidate) => rowsById.has(candidate.id));
  console.log(
    JSON.stringify(
      {
        medium_candidates: candidates.length,
        review_targets: reviewTargets.length,
        model: modelName(),
        concurrency: concurrency()
      },
      null,
      2
    )
  );

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 1, timeout: 60_000 });
  const results: AuditRow[] = [];
  const batchSize = 50;
  for (let offset = 0; offset < reviewTargets.length; offset += batchSize) {
    const batch = reviewTargets.slice(offset, offset + batchSize);
    const batchResults = await mapWithConcurrency(batch, concurrency(), async (candidate, idx) => {
      const row = rowsById.get(candidate.id)!;
      const result = await review(client, candidate, row);
      if (result.should_apply) {
        console.log(
          `✓ approved ${result.host_iso} — ${offset + idx + 1}/${reviewTargets.length} — ${result.provider_name}`
        );
      }
      return result;
    });
    results.push(...batchResults);
    await writeFile(OUT_AUDIT_JSON, JSON.stringify(results, null, 2), 'utf-8');
    console.log(
      `Checkpoint ${Math.min(offset + batch.length, reviewTargets.length)}/${reviewTargets.length}; approved ${results.filter((row) => row.should_apply).length}`
    );
  }

  console.log(
    JSON.stringify(
      {
        reviewed: results.length,
        approved: results.filter((row) => row.should_apply).length,
        output: join(process.cwd(), OUT_AUDIT_JSON)
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
