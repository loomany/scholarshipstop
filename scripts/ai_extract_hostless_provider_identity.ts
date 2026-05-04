/**
 * AI audit for active scholarships with no provider identity and no host country.
 *
 * Writes checkpointed JSON only. Apply results separately after review.
 *
 *   dotenv -e .env.local -- npx tsx scripts/ai_extract_hostless_provider_identity.ts
 *
 * Env:
 *   OPENAI_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   HOSTLESS_PROVIDER_AI_MODEL — default gpt-4o
 *   HOSTLESS_PROVIDER_AI_CONCURRENCY — default 10, max 24
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

import { providerIdentitySlugify } from '../lib/providers/providerIdentityCandidate';
import type { Database } from '../types_db';

const OUT_JSON = 'hostless_provider_identity_ai_audit.json';
const ISO_RE = /^[A-Z]{2}$/;

type Row = {
  id: string;
  slug: string | null;
  title: string | null;
  source: string | null;
  source_id: string | null;
  official_source_name: string | null;
  provider_name: string | null;
  provider_slug: string | null;
  provider_url: string | null;
  apply_url: string | null;
  url: string | null;
  summary_short: string | null;
  description: string | null;
  eligibility_text: string | null;
  requirements_text: string | null;
  institutions_text: string | null;
  state_territory_text: string | null;
  raw_data: unknown;
  host_country_codes: unknown;
  is_active: boolean | null;
};

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

function modelName(): string {
  return process.env.HOSTLESS_PROVIDER_AI_MODEL?.trim() || 'gpt-4o';
}

function concurrency(): number {
  const n = Number.parseInt(process.env.HOSTLESS_PROVIDER_AI_CONCURRENCY?.trim() || '10', 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(24, Math.floor(n));
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
  return ISO_RE.test(iso) ? iso : null;
}

function hasValidHost(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.some((item) => normalizeIso(item));
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

function buildPrompt(row: Row): string {
  const item = rawItem(row);
  return [
    'Extract the scholarship provider organization and host country from the evidence.',
    'Provider means the organization/foundation/company/university that offers/administers/sponsors the scholarship, not the directory website and not the scholarship title unless it is also clearly the organization.',
    'Host country means where that provider or program is based. If unsure, use null and low/none confidence.',
    'Return exactly one JSON object with keys: provider_name, host_iso, confidence, evidence.',
    'confidence must be one of high, medium, low, none.',
    'Use high only when the provider is explicitly named in the evidence and the host country is clear from text, URL/domain, or well-known named organization.',
    'Do not invent a provider. Do not use Scholarships.com as provider.',
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
    `raw_item.description: ${JSON.stringify(compact(item.description, 1500))}`,
    `raw_item.url: ${JSON.stringify(compact(item.url, 700))}`
  ].join('\n');
}

async function loadExisting(): Promise<AuditRow[]> {
  try {
    const parsed = JSON.parse(await readFile(OUT_JSON, 'utf-8')) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is AuditRow => {
      return typeof row === 'object' && row !== null && typeof (row as AuditRow).id === 'string';
    });
  } catch {
    return [];
  }
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

function parseConfidence(value: unknown): AuditRow['confidence'] {
  return value === 'high' || value === 'medium' || value === 'low' || value === 'none'
    ? value
    : 'none';
}

function normalizeProviderName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  if (/^scholarships?\.?com$/i.test(cleaned)) return null;
  return cleaned.slice(0, 160);
}

async function classify(client: OpenAI, row: Row): Promise<AuditRow> {
  const completion = await client.chat.completions.create({
    model: modelName(),
    temperature: 0,
    max_tokens: 160,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You extract structured scholarship provider identity. Output one JSON object only.'
      },
      { role: 'user', content: buildPrompt(row) }
    ]
  });
  const raw = completion.choices[0]?.message?.content?.trim() || '{}';
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    parsed = {};
  }
  const providerName = normalizeProviderName(parsed.provider_name);
  const providerSlug = providerName ? providerIdentitySlugify(providerName) : null;
  const hostIso = normalizeIso(parsed.host_iso);
  const confidence = parseConfidence(parsed.confidence);
  const evidence = compact(parsed.evidence, 500) || null;
  return {
    id: row.id,
    title: row.title,
    source: row.source,
    provider_name: providerName,
    provider_slug: providerSlug || null,
    host_iso: hostIso,
    confidence,
    evidence,
    should_apply: Boolean(providerName && providerSlug && hostIso && confidence === 'high')
  };
}

async function main() {
  if (!process.env.OPENAI_API_KEY?.trim()) throw new Error('OPENAI_API_KEY is required');
  const supabase = serviceSupabase();
  const rows: Row[] = [];
  const pageSize = 200;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('scholarships')
      .select(
        [
          'id',
          'slug',
          'title',
          'source',
          'source_id',
          'official_source_name',
          'provider_name',
          'provider_slug',
          'provider_url',
          'apply_url',
          'url',
          'summary_short',
          'description',
          'eligibility_text',
          'requirements_text',
          'institutions_text',
          'state_territory_text',
          'raw_data',
          'host_country_codes',
          'is_active'
        ].join(',')
      )
      .eq('is_active', true)
      .is('provider_name', null)
      .is('provider_slug', null)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    for (const row of (data ?? []) as Row[]) {
      if (!hasValidHost(row.host_country_codes)) rows.push(row);
    }
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  const results = await loadExisting();
  const doneIds = new Set(results.map((row) => row.id));
  const pending = rows.filter((row) => !doneIds.has(row.id));
  console.log(
    JSON.stringify(
      {
        total_candidates: rows.length,
        resume_loaded: results.length,
        pending: pending.length,
        model: modelName(),
        concurrency: concurrency()
      },
      null,
      2
    )
  );

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 1, timeout: 60_000 });
  const batchSize = 50;
  for (let offset = 0; offset < pending.length; offset += batchSize) {
    const batch = pending.slice(offset, offset + batchSize);
    const batchResults = await mapWithConcurrency(batch, concurrency(), async (row, idx) => {
      try {
        const result = await classify(client, row);
        if (result.should_apply) {
          console.log(
            `✓ high ${result.host_iso} — ${offset + idx + 1}/${pending.length} — ${result.provider_name}`
          );
        }
        return result;
      } catch (err) {
        console.warn(`AI error ${row.id}:`, (err as Error).message ?? err);
        return {
          id: row.id,
          title: row.title,
          source: row.source,
          provider_name: null,
          provider_slug: null,
          host_iso: null,
          confidence: 'none',
          evidence: null,
          should_apply: false
        } satisfies AuditRow;
      }
    });
    results.push(...batchResults);
    await writeFile(OUT_JSON, JSON.stringify(results, null, 2), 'utf-8');
    const applyCount = results.filter((row) => row.should_apply).length;
    console.log(
      `Checkpoint ${Math.min(offset + batch.length, pending.length)}/${pending.length}; saved ${results.length}; high apply ${applyCount}`
    );
  }

  const summary = {
    total: results.length,
    should_apply: results.filter((row) => row.should_apply).length,
    high: results.filter((row) => row.confidence === 'high').length,
    medium: results.filter((row) => row.confidence === 'medium').length,
    low: results.filter((row) => row.confidence === 'low').length,
    none: results.filter((row) => row.confidence === 'none').length
  };
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Wrote ${join(process.cwd(), OUT_JSON)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
