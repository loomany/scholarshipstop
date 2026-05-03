/**
 * Classify missing host countries for scholarships (Supabase reads only — result is a local JSON file).
 *
 *   dotenv -e .env.local -- npx tsx scripts/classify_hosts.ts
 *   dotenv -e .env.local -- npx tsx scripts/classify_hosts.ts --limit=500
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (required)
 *   FAL_KEY — optional fal.ai API key (LLM skipped if unset; client also reads env automatically)
 *   FAL_LLM_ENDPOINT — default fal-ai/any-llm
 *   FAL_LLM_MODEL — default meta-llama/llama-3.1-8b-instruct
 *   HIPO_UNIVERSITIES_JSON_PATH — path to world_universities_and_domains.json (optional)
 *   HIPO_UNIVERSITIES_JSON_URL — HIPO dataset URL override (optional)
 *
 * Output: classified_hosts_result.json under process.cwd() (run from repo root).
 */

import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

import { fal } from '@fal-ai/client';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types_db';

const HIPO_DEFAULT_URL =
  'https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json';

const RESULT_FILENAME = 'classified_hosts_result.json';
const PAGE_SIZE = 500;
const DELAY_MS = 260;
const DEFAULT_FAL_LLM_ENDPOINT = 'fal-ai/any-llm';
/** Cheap instruct model on fal (see `any-llm` ModelEnum); override via FAL_LLM_MODEL */
const DEFAULT_FAL_LLM_MODEL = 'meta-llama/llama-3.1-8b-instruct';

const SYSTEM_PROMPT_FAL =
  'You reply with JSON only — a single small object: {"host_country_alpha2":"<ISO Alpha-2 upper>"} OR {"host_country_alpha2":null}. ' +
  'Infer the host country where the scholarship or its provider is headquartered / primarily operated from. ' +
  'Two-letter uppercase country code only. Use null when uncertain or for clearly borderless NGOs with no inferable HQ. No markdown.';

type Method = 'LocalDomain' | 'LLM' | 'LocalDomainOnly';

type ResultRow = {
  id: string;
  provider_name: string | null;
  proposed_host_country: string | null;
  method: Method;
};

type HipoEntry = {
  alpha_two_code?: string;
  domains?: unknown;
};

function parseArgs(): { limit: number | null } {
  const argv = process.argv.slice(2);
  let limit: number | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]!;
    if (a.startsWith('--limit=')) {
      const n = Number.parseInt(a.slice('--limit='.length), 10);
      if (Number.isFinite(n) && n > 0) limit = n;
    }
  }
  return { limit };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jsonStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function isValidIsoAlpha2(code: string): boolean {
  return /^[A-Z]{2}$/.test(code);
}

function normalizeIso(code: unknown): string | null {
  if (typeof code !== 'string') return null;
  const u = code.trim().toUpperCase();
  return isValidIsoAlpha2(u) ? u : null;
}

/** True when we should classify: null/empty array or only non‑ISO-ish strings. */
function rowNeedsHostClassification(hostCountryCodes: unknown): boolean {
  if (hostCountryCodes == null) return true;
  const codes = jsonStringArray(hostCountryCodes).map((c) => c.trim().toUpperCase());
  const valid = codes.filter((c) => isValidIsoAlpha2(c));
  return valid.length === 0;
}

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient<Database>(url, key);
}

function defaultHipoJsonPath(): string {
  return join(process.cwd(), 'scripts', 'data', 'world_universities_and_domains.json');
}

async function loadHipoJsonPath(): Promise<string> {
  const envPath = process.env.HIPO_UNIVERSITIES_JSON_PATH?.trim();
  if (envPath) return envPath;

  const target = defaultHipoJsonPath();
  try {
    await readFile(target, 'utf-8');
    return target;
  } catch {
    const url = process.env.HIPO_UNIVERSITIES_JSON_URL?.trim() || HIPO_DEFAULT_URL;
    console.log(`Downloading HIPO university domain list…\n  ${url}`);
    console.log(`  → ${target}`);
    await mkdir(join(process.cwd(), 'scripts', 'data'), { recursive: true });
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HIPO download failed: HTTP ${res.status}`);
    }
    const text = await res.text();
    await writeFile(target, text, 'utf-8');
    return target;
  }
}

function buildDomainToCountry(dataset: HipoEntry[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of dataset) {
    const code = normalizeIso(row.alpha_two_code);
    if (!code || !Array.isArray(row.domains)) continue;
    for (const d of row.domains) {
      if (typeof d !== 'string') continue;
      const host = d.trim().toLowerCase();
      if (!host) continue;
      if (!map.has(host)) map.set(host, code);
    }
  }
  return map;
}

function hostnameFromProviderUrl(raw: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    const { hostname } = new URL(u);
    const h = hostname.toLowerCase().replace(/^www\./, '');
    return h || null;
  } catch {
    return null;
  }
}

function lookupCountryByDomain(domainMap: Map<string, string>, host: string | null): string | null {
  if (!host) return null;
  const parts = host.split('.').filter(Boolean);
  for (let i = 0; i < parts.length - 1; i += 1) {
    const suffix = parts.slice(i).join('.');
    const hit = domainMap.get(suffix);
    if (hit) return hit;
  }
  return null;
}

/** Disable LLM run for remaining rows — fal ApiError exposes HTTP status .status */
function shouldDisableLlmGlobally(err: unknown): boolean {
  const status = extractHttpStatus(err);
  return status === 401 || status === 402 || status === 403 || status === 429;
}

function extractHttpStatus(err: unknown): number | undefined {
  const e = err as { status?: number; statusCode?: number; cause?: unknown };
  if (typeof e.status === 'number') return e.status;
  if (typeof e.statusCode === 'number') return e.statusCode;
  if (e.cause) return extractHttpStatus(e.cause);
  return undefined;
}

function falLlmEndpoint(): string {
  return process.env.FAL_LLM_ENDPOINT?.trim() || DEFAULT_FAL_LLM_ENDPOINT;
}

function falLlmModel(): string {
  return process.env.FAL_LLM_MODEL?.trim() || DEFAULT_FAL_LLM_MODEL;
}

/** Strip optional ``` fences; parse first JSON object in string */
function parseJsonAlpha2FromLlama(output: string): { host_country_alpha2?: unknown } | null {
  let t = output.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) t = fence[1].trim();
  try {
    return JSON.parse(t) as { host_country_alpha2?: unknown };
  } catch {
    const idx = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (idx !== -1 && end > idx) {
      try {
        return JSON.parse(t.slice(idx, end + 1)) as { host_country_alpha2?: unknown };
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function classifyWithFalLlm(input: {
  provider_name: string | null;
  official_source_name: string | null;
  provider_url: string | null;
  institution_country_hint: string | null;
}): Promise<string | null> {
  const userPayload = {
    provider_name: input.provider_name,
    official_source_name: input.official_source_name,
    provider_url: input.provider_url,
    institution_country_hint: input.institution_country_hint
  };

  const endpoint = falLlmEndpoint();
  const { data } = await fal.subscribe(endpoint, {
    input: {
      system_prompt: SYSTEM_PROMPT_FAL,
      prompt:
        `Classify HQ country.\nGrant/provider fields (JSON):\n${JSON.stringify(userPayload)}\n` +
        'Reply with ONLY: {"host_country_alpha2":"US"} or {"host_country_alpha2":null}',
      temperature: 0,
      max_tokens: 96,
      model: falLlmModel(),
      priority: 'throughput'
    },
    logs: false
  });

  type FalAnyLlmData = {
    output?: string;
    error?: string | null;
  };

  const d = data as FalAnyLlmData | undefined;
  if (!d?.output?.trim() || (d.error && String(d.error).trim())) {
    return null;
  }

  const parsed = parseJsonAlpha2FromLlama(d.output);
  if (!parsed) return null;
  const v = parsed.host_country_alpha2;
  if (v === null || v === undefined) return null;
  return normalizeIso(v);
}

async function main() {
  const { limit } = parseArgs();
  const supabase = serviceSupabase();

  const jsonPath = await loadHipoJsonPath();
  const rawJson = await readFile(jsonPath, 'utf-8');
  const dataset = JSON.parse(rawJson) as HipoEntry[];
  const domainMap = buildDomainToCountry(dataset);
  console.log(`HIPO mappings ready: ${domainMap.size.toLocaleString()} labeled domains`);

  const falKey = process.env.FAL_KEY?.trim();
  let llmEnabled = Boolean(falKey);
  if (!falKey) {
    console.log('FAL_KEY not set → LLM step skipped (remaining rows → LocalDomainOnly).');
  } else {
    fal.config({ credentials: falKey });
    console.log(
      `fal.ai LLM: endpoint=${falLlmEndpoint()} model=${falLlmModel()} (override with FAL_LLM_ENDPOINT / FAL_LLM_MODEL)`
    );
  }

  type SchRow = Pick<
    Database['public']['Tables']['scholarships']['Row'],
    | 'id'
    | 'provider_name'
    | 'provider_url'
    | 'official_source_name'
    | 'institution_id'
    | 'host_country_codes'
  >;

  const candidates: SchRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('scholarships')
      .select(
        'id, provider_name, provider_url, official_source_name, institution_id, host_country_codes'
      )
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    const rows = (data ?? []) as SchRow[];
    if (rows.length === 0) break;

    for (const row of rows) {
      if (!rowNeedsHostClassification(row.host_country_codes)) continue;
      candidates.push(row);
      if (limit != null && candidates.length >= limit) break;
    }

    if (limit != null && candidates.length >= limit) break;
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const total = candidates.length;
  console.log(`\nСтрок к классификации: ${total.toLocaleString()}`);

  const instIds = [...new Set(candidates.map((c) => c.institution_id).filter(Boolean))] as string[];
  const instCountryIsoById = new Map<string, string | null>();
  const instCountryRawById = new Map<string, string | null>();
  if (instIds.length > 0) {
    const chunkSize = 200;
    for (let i = 0; i < instIds.length; i += chunkSize) {
      const slice = instIds.slice(i, i + chunkSize);
      const { data, error } = await supabase.from('institutions').select('id, country').in('id', slice);
      if (error) throw new Error(error.message);
      for (const r of data ?? []) {
        const raw =
          typeof r.country === 'string' && r.country.trim().length > 0 ? r.country.trim() : null;
        instCountryIsoById.set(r.id, normalizeIso(r.country));
        instCountryRawById.set(r.id, raw);
      }
    }
  }

  const results: ResultRow[] = [];

  let done = 0;
  for (const row of candidates) {
    try {
      let proposed: string | null = null;
      let method: Method = 'LocalDomainOnly';

      const instIso = row.institution_id ? instCountryIsoById.get(row.institution_id) ?? null : null;
      const instRaw =
        row.institution_id ? instCountryRawById.get(row.institution_id) ?? null : null;
      if (instIso) {
        proposed = instIso;
        method = 'LocalDomain';
      }

      if (!proposed) {
        const host = hostnameFromProviderUrl(row.provider_url ?? null);
        const fromDomain = lookupCountryByDomain(domainMap, host);
        if (fromDomain) {
          proposed = fromDomain;
          method = 'LocalDomain';
        }
      }

      if (!proposed && llmEnabled) {
        try {
          await sleep(DELAY_MS);
          proposed = await classifyWithFalLlm({
            provider_name: row.provider_name ?? null,
            official_source_name: row.official_source_name ?? null,
            provider_url: row.provider_url ?? null,
            institution_country_hint:
              instRaw ?? instIso ?? null
          });
          method = 'LLM';
        } catch (llmErr) {
          if (shouldDisableLlmGlobally(llmErr)) {
            console.warn(
              '\n⚠️ Ошибка API fal.ai (авторизация/оплата/лимит). Шаг с LLM отключен для оставшихся записей.\n'
            );
            llmEnabled = false;
            proposed = null;
            method = 'LocalDomainOnly';
          } else {
            console.warn(`fal.ai ошибка (${row.id}):`, (llmErr as Error).message ?? llmErr);
            proposed = null;
            method = 'LLM';
          }
        }
      } else if (!proposed) {
        method = 'LocalDomainOnly';
      }

      results.push({
        id: row.id,
        provider_name: row.provider_name ?? null,
        proposed_host_country: proposed,
        method
      });
    } catch (rowErr) {
      console.warn(`Строка ${row.id}:`, (rowErr as Error).message ?? rowErr);
      results.push({
        id: row.id,
        provider_name: row.provider_name ?? null,
        proposed_host_country: null,
        method: 'LocalDomainOnly'
      });
    }

    done += 1;
    if (done === 1 || done % 100 === 0 || done === total) {
      console.log(`Обработано ${done}/${total}…`);
    }
  }

  const outPath = join(process.cwd(), RESULT_FILENAME);
  await writeFile(outPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\nГотово → ${results.length.toLocaleString()} записей сохранены в ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
