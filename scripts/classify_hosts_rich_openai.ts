/**
 * Rich OpenAI host-country backfill for rows still missing host_country_codes.
 *
 * Uses more scholarship context than classify_hosts.ts. Writes a JSON file compatible
 * with scripts/update_hosts_in_db.ts.
 *
 *   dotenv -e .env.local -- npx tsx scripts/classify_hosts_rich_openai.ts
 *   dotenv -e .env.local -- npx tsx scripts/classify_hosts_rich_openai.ts --limit=100
 *
 * Env:
 *   OPENAI_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   RICH_OPENAI_HOST_MODEL — default gpt-4o
 *   RICH_OPENAI_HOST_CONCURRENCY — default 12, max 32
 *   RICH_OPENAI_HOST_OUTPUT_JSON — default classified_hosts_rich_openai_result.json
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types_db';

type Method = 'LocalDomain' | 'OpenAI' | 'LocalDomainOnly';

type ResultRow = {
  id: string;
  provider_name: string | null;
  proposed_host_country: string | null;
  method: Method;
};

type RichRow = {
  id: string;
  title: string | null;
  provider_name: string | null;
  provider_slug: string | null;
  provider_url: string | null;
  apply_url: string | null;
  url: string | null;
  official_source_name: string | null;
  summary_short: string | null;
  description: string | null;
  eligibility_text: string | null;
  requirements_text: string | null;
  institutions_text: string | null;
  state_territory_text: string | null;
  state_codes: unknown;
  host_country_codes: unknown;
  is_active: boolean | null;
};

const ISO_RE = /^[A-Z]{2}$/;
const US_STATE_RE =
  /^(A[LKZR]|C[AOT]|D[CE]|FL|GA|HI|I[ADLN]|K[SY]|LA|M[ADEHINOST]|N[CDEHJMVY]|O[HKR]|PA|RI|S[CD]|T[NX]|UT|V[AIT]|W[AIVY])$/;

function parseArgs(): { limit: number | null } {
  let limit: number | null = null;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--limit=')) {
      const n = Number.parseInt(arg.slice('--limit='.length), 10);
      if (Number.isFinite(n) && n > 0) limit = n;
    }
  }
  return { limit };
}

function outputPath(): string {
  return (
    process.env.RICH_OPENAI_HOST_OUTPUT_JSON?.trim() ||
    join(process.cwd(), 'classified_hosts_rich_openai_result.json')
  );
}

function modelName(): string {
  return process.env.RICH_OPENAI_HOST_MODEL?.trim() || 'gpt-4o';
}

function concurrency(): number {
  const n = Number.parseInt(process.env.RICH_OPENAI_HOST_CONCURRENCY?.trim() || '12', 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(32, Math.floor(n));
}

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient<Database>(url, key);
}

function hasValidHost(hostCountryCodes: unknown): boolean {
  if (!Array.isArray(hostCountryCodes)) return false;
  return hostCountryCodes.some(
    (code) => typeof code === 'string' && ISO_RE.test(code.trim().toUpperCase())
  );
}

function jsonStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function hasUsStateSignal(row: RichRow): boolean {
  return jsonStringArray(row.state_codes)
    .map((code) => code.trim().toUpperCase())
    .some((code) => US_STATE_RE.test(code));
}

function trimText(value: string | null, max: number): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalizeIso(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  return ISO_RE.test(code) ? code : null;
}

function stripJsonFences(raw: string): string {
  let t = raw.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  }
  return t;
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

function buildPrompt(row: RichRow): string {
  return [
    'Infer the host country for this scholarship/grant.',
    'Host country means where the program/provider/awarding body is based, or where study/program activity is hosted.',
    'Use only the evidence below. If evidence is insufficient, return {"iso":null}.',
    'Return a single JSON object only: {"iso":"US"} or {"iso":null}. ISO must be alpha-2.',
    '',
    `title: ${JSON.stringify(trimText(row.title, 500))}`,
    `provider_name: ${JSON.stringify(trimText(row.provider_name, 400))}`,
    `provider_slug: ${JSON.stringify(trimText(row.provider_slug, 200))}`,
    `official_source_name: ${JSON.stringify(trimText(row.official_source_name, 400))}`,
    `provider_url: ${JSON.stringify(trimText(row.provider_url, 600))}`,
    `apply_url: ${JSON.stringify(trimText(row.apply_url, 600))}`,
    `source_url: ${JSON.stringify(trimText(row.url, 600))}`,
    `summary_short: ${JSON.stringify(trimText(row.summary_short, 700))}`,
    `description: ${JSON.stringify(trimText(row.description, 1200))}`,
    `eligibility_text: ${JSON.stringify(trimText(row.eligibility_text, 900))}`,
    `requirements_text: ${JSON.stringify(trimText(row.requirements_text, 900))}`,
    `institutions_text: ${JSON.stringify(trimText(row.institutions_text, 500))}`,
    `state_territory_text: ${JSON.stringify(trimText(row.state_territory_text, 500))}`,
    `state_codes: ${JSON.stringify(jsonStringArray(row.state_codes))}`
  ].join('\n');
}

async function classifyWithOpenAi(client: OpenAI, row: RichRow): Promise<string | null> {
  const completion = await client.chat.completions.create({
    model: modelName(),
    temperature: 0,
    max_tokens: 64,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You classify scholarship host countries. Output one JSON object with key "iso"; value is ISO alpha-2 or null. No prose.'
      },
      { role: 'user', content: buildPrompt(row) }
    ]
  });
  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(stripJsonFences(raw)) as { iso?: unknown };
    return parsed.iso == null ? null : normalizeIso(parsed.iso);
  } catch {
    return null;
  }
}

async function loadExistingResults(path: string, candidateIds: Set<string>): Promise<ResultRow[]> {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf-8')) as unknown;
    if (!Array.isArray(parsed)) return [];
    const byId = new Map<string, ResultRow>();
    for (const item of parsed) {
      if (typeof item !== 'object' || item === null) continue;
      const row = item as Partial<ResultRow>;
      if (typeof row.id !== 'string' || !candidateIds.has(row.id)) continue;
      byId.set(row.id, {
        id: row.id,
        provider_name: typeof row.provider_name === 'string' ? row.provider_name : null,
        proposed_host_country: normalizeIso(row.proposed_host_country) ?? null,
        method:
          row.method === 'OpenAI' || row.method === 'LocalDomain'
            ? row.method
            : 'LocalDomainOnly'
      });
    }
    return [...byId.values()];
  } catch {
    return [];
  }
}

async function main() {
  const { limit } = parseArgs();
  if (!process.env.OPENAI_API_KEY?.trim()) throw new Error('OPENAI_API_KEY is required');

  const supabase = serviceSupabase();
  const candidates: RichRow[] = [];
  const pageSize = 500;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('scholarships')
      .select(
        [
          'id',
          'title',
          'provider_name',
          'provider_slug',
          'provider_url',
          'apply_url',
          'url',
          'official_source_name',
          'summary_short',
          'description',
          'eligibility_text',
          'requirements_text',
          'institutions_text',
          'state_territory_text',
          'state_codes',
          'host_country_codes',
          'is_active'
        ].join(',')
      )
      .eq('is_active', true)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    for (const row of (data ?? []) as RichRow[]) {
      if (!hasValidHost(row.host_country_codes)) {
        candidates.push(row);
        if (limit != null && candidates.length >= limit) break;
      }
    }
    if (limit != null && candidates.length >= limit) break;
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  console.log(`Rows missing host: ${candidates.length.toLocaleString()}`);
  console.log(`Model: ${modelName()}, concurrency: ${concurrency()}`);
  console.log(`Output: ${outputPath()}`);

  const outPath = outputPath();
  const candidateIds = new Set(candidates.map((row) => row.id));
  const results = await loadExistingResults(outPath, candidateIds);
  const resultIds = new Set(results.map((row) => row.id));
  if (results.length > 0) {
    console.log(`Resume: loaded ${results.length.toLocaleString()} existing result rows`);
  }

  const deterministic: ResultRow[] = [];
  const aiRows: RichRow[] = [];
  for (const row of candidates) {
    if (resultIds.has(row.id)) continue;
    if (hasUsStateSignal(row)) {
      deterministic.push({
        id: row.id,
        provider_name: row.provider_name,
        proposed_host_country: 'US',
        method: 'LocalDomain'
      });
    } else {
      aiRows.push(row);
    }
  }

  console.log(`Deterministic US from state_codes: ${deterministic.length.toLocaleString()}`);
  console.log(`Rows sent to OpenAI: ${aiRows.length.toLocaleString()}`);

  results.push(...deterministic);
  if (deterministic.length > 0) {
    await writeFile(outPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`Checkpoint after deterministic rows: ${results.length.toLocaleString()}`);
  }

  let ok = 0;
  let miss = 0;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 1, timeout: 60_000 });
  const batchSize = 100;
  for (let offset = 0; offset < aiRows.length; offset += batchSize) {
    const batch = aiRows.slice(offset, offset + batchSize);
    const batchResults = await mapWithConcurrency(batch, concurrency(), async (row, batchIdx) => {
      const idx = offset + batchIdx;
      try {
        const iso = await classifyWithOpenAi(client, row);
        if (iso) {
          ok += 1;
          console.log(
            `✓ ${ok.toLocaleString()} OK ${iso} — ${idx + 1}/${aiRows.length} — ${(row.provider_name ?? row.title ?? row.id).slice(0, 80)}`
          );
        } else {
          miss += 1;
        }
        return {
          id: row.id,
          provider_name: row.provider_name,
          proposed_host_country: iso,
          method: iso ? 'OpenAI' : 'LocalDomainOnly'
        } satisfies ResultRow;
      } catch (err) {
        miss += 1;
        console.warn(`OpenAI error ${row.id}:`, (err as Error).message ?? err);
        return {
          id: row.id,
          provider_name: row.provider_name,
          proposed_host_country: null,
          method: 'LocalDomainOnly'
        } satisfies ResultRow;
      }
    });
    results.push(...batchResults);
    await writeFile(outPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(
      `Checkpoint ${Math.min(offset + batch.length, aiRows.length)}/${aiRows.length} — valid ${ok}, null ${miss}, total saved ${results.length}`
    );
  }

  await writeFile(outPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log('\nDone');
  console.log(`Valid ISO total: ${results.filter((r) => r.proposed_host_country).length}`);
  console.log(`Null: ${results.filter((r) => !r.proposed_host_country).length}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
