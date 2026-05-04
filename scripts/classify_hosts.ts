/**
 * Classify missing host countries for scholarships (Supabase reads only — result is a local JSON file).
 *
 *   dotenv -e .env.local -- npx tsx scripts/classify_hosts.ts
 *   dotenv -e .env.local -- npx tsx scripts/classify_hosts.ts --limit=500
 *
 * Resume: строки из JSON сопоставляются с текущей выборкой по scholarship id — не нужно заново проходить
 * уже сохранённые id, даже если в базе добавились новые гранты (список длиннее, порядок «плавает» по отношению
 * к старому дампу файла). Периодически перезаписывает файл.
 *
 * Flags:
 *   --fresh — не читать чекпоинт (начать с нуля и перезаписать файл)
 *   --flush=50 — как часто сохранять JSON на диск (число новых строк; по умолчанию 50)
 *   --no-wikidata — не вызывать Wikidata (только institution + HIPO по домену)
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (required)
 *   HIPO_UNIVERSITIES_JSON_PATH — path to world_universities_and_domains.json (optional)
 *   HIPO_UNIVERSITIES_JSON_URL — HIPO dataset URL override (optional)
 *   CLASSIFIED_HOSTS_RESULT_JSON — путь для чекпоинта и итога (совпадает с update_hosts_in_db.ts)
 *   WIKIDATA_ENABLED — 1/true (default) включает шаг Wikidata после HIPO; 0/false/off — выключить
 *   WIKIDATA_GAP_MS — пауза между запросами к wikidata.org (default 200)
 *   WIKIDATA_SEARCH_LIMIT — сколько результатов поиска смотреть (default 8, max 20)
 *   WIKIDATA_USER_AGENT — обязательно осмысленный UA для больших прогонов (желание Wikimedia Foundation)
 *
 * OpenAI (gpt-4o-mini по умолчанию), если HIPO+Wikidata не дали ISO:
 *   OPENAI_HOST_CLASSIFY_ENABLED=1
 *   OPENAI_HOST_CLASSIFY_MODEL=gpt-4o-mini   (опционально)
 *   OPENAI_HOST_GAP_MS=0                    (пауза перед каждым backfill-батчем / между последовательными вызовами)
 *   OPENAI_HOST_CONCURRENCY=8                 (параллельные запросы внутри одного backfill-батча; max 32)
 *   OPENAI_API_KEY
 *   OPENAI_HOST_CLASSIFY_VERBOSE=1          (логировать каждый null от OpenAI; иначе только ✓ OK и сводка)
 *
 * Повторно только для строк чекпоинта без ISO (например после LocalDomainOnly):
 *   npx tsx scripts/classify_hosts.ts --openai-backfill
 *   (требует OPENAI_HOST_CLASSIFY_ENABLED=1 и OPENAI_API_KEY)
 *
 * Output: classified_hosts_result.json под process.cwd(), если CLASSIFIED_HOSTS_RESULT_JSON не задан.
 * Бэкапы: перед каждой записью чекпоинта текущее содержимое копируется в *.bak (последнее откатное).
 * При --fresh перед обнулением отдельно пишется *.before-fresh.bak — не перезаписывается дальнейшими flush.
 */

import { copyFile, mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types_db';

import {
  resolveHostCountryViaWikidata,
  wikidataGapMs,
  wikidataLookupEnabled
} from './wikidata-host-country';
import {
  openaiHostClassifyEnabled,
  openaiHostConcurrency,
  openaiHostGapMs,
  resolveHostCountryViaOpenAi
} from './openai-host-country';

const HIPO_DEFAULT_URL =
  'https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json';

const RESULT_FILENAME = 'classified_hosts_result.json';
const PAGE_SIZE = 500;
const DEFAULT_FLUSH_EVERY = 50;

/** `LLM` — совместимость со старыми чекпоинтами; `OpenAI` — gpt-4o-mini (или OPENAI_HOST_CLASSIFY_MODEL). */
type Method = 'LocalDomain' | 'Wikidata' | 'LLM' | 'LocalDomainOnly' | 'OpenAI';

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

type SchRow = Pick<
  Database['public']['Tables']['scholarships']['Row'],
  | 'id'
  | 'provider_name'
  | 'provider_url'
  | 'official_source_name'
  | 'institution_id'
  | 'host_country_codes'
>;

function classifiedHostsOutputPath(): string {
  const override = process.env.CLASSIFIED_HOSTS_RESULT_JSON?.trim();
  if (override) return override;
  return join(process.cwd(), RESULT_FILENAME);
}

/** Предыдущая версия чекпоинта перед перезаписью (перезатирается на каждый сохранённый шаг). */
async function snapshotBackupRolling(primary: string): Promise<void> {
  try {
    await copyFile(primary, `${primary}.bak`);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return;
    throw err;
  }
}

async function writeClassifiedCheckpoint(primary: string, rows: ResultRow[]): Promise<void> {
  await snapshotBackupRolling(primary);
  await writeFile(primary, JSON.stringify(rows, null, 2), 'utf-8');
}

function isMethod(s: string): s is Method {
  return (
    s === 'LocalDomain' ||
    s === 'Wikidata' ||
    s === 'LLM' ||
    s === 'LocalDomainOnly' ||
    s === 'OpenAI'
  );
}

/** Нормализует одну сохранённую строку результата (без текущего ряда Supabase). Дубликаты id в файле → последний. */
function normalizeCheckpointEntry(raw: unknown): ResultRow | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id.trim()) return null;
  const methodRaw = typeof r.method === 'string' && isMethod(r.method) ? r.method : 'LocalDomainOnly';
  const phc = r.proposed_host_country;
  return {
    id: r.id.trim(),
    provider_name: typeof r.provider_name === 'string' ? r.provider_name : null,
    proposed_host_country: typeof phc === 'string' ? phc : phc === null ? null : null,
    method: methodRaw
  };
}

async function loadCheckpointById(outPath: string, fresh: boolean): Promise<Map<string, ResultRow>> {
  const byId = new Map<string, ResultRow>();
  if (fresh) return byId;
  try {
    const rawText = await readFile(outPath, 'utf-8');
    const parsed = JSON.parse(rawText) as unknown;
    if (!Array.isArray(parsed)) {
      console.warn(`Чекпоинт: файл не массив — игнорируем (${outPath})`);
      return byId;
    }
    for (const item of parsed) {
      const n = normalizeCheckpointEntry(item);
      if (n) byId.set(n.id, n);
    }
    const n = byId.size;
    if (n > 0) {
      console.log(`Чекпоинт: прочитано ${n.toLocaleString()} записей из файла по id (${outPath})`);
    }
    return byId;
  } catch {
    return byId;
  }
}

function parseArgs(): {
  limit: number | null;
  fresh: boolean;
  flushEvery: number;
  noWikidata: boolean;
  openaiBackfill: boolean;
} {
  const argv = process.argv.slice(2);
  let limit: number | null = null;
  let flushEvery = DEFAULT_FLUSH_EVERY;
  let fresh = false;
  let noWikidata = false;
  let openaiBackfill = false;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]!;
    if (a.startsWith('--limit=')) {
      const n = Number.parseInt(a.slice('--limit='.length), 10);
      if (Number.isFinite(n) && n > 0) limit = n;
    } else if (a.startsWith('--flush=')) {
      const n = Number.parseInt(a.slice('--flush='.length), 10);
      if (Number.isFinite(n) && n > 0) flushEvery = Math.min(5000, Math.max(1, n));
    } else if (a === '--fresh') {
      fresh = true;
    } else if (a === '--no-wikidata') {
      noWikidata = true;
    } else if (a === '--openai-backfill') {
      openaiBackfill = true;
    }
  }
  return { limit, fresh, flushEvery, noWikidata, openaiBackfill };
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

async function sleepMs(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Run async mapper on items with at most `concurrency` in flight (order preserved in output). */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const limit = Math.max(1, Math.min(concurrency, items.length));
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const worker = async (): Promise<void> => {
    for (;;) {
      const idx = cursor++;
      if (idx >= items.length) return;
      out[idx] = await mapper(items[idx]!, idx);
    }
  };
  await Promise.all(Array.from({ length: limit }, () => worker()));
  return out;
}

function openAiVerboseNulls(): boolean {
  const v = process.env.OPENAI_HOST_CLASSIFY_VERBOSE?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

async function main() {
  const { limit, fresh, flushEvery, noWikidata, openaiBackfill } = parseArgs();
  const supabase = serviceSupabase();
  const outPath = classifiedHostsOutputPath();

  const jsonPath = await loadHipoJsonPath();
  const rawJson = await readFile(jsonPath, 'utf-8');
  const dataset = JSON.parse(rawJson) as HipoEntry[];
  const domainMap = buildDomainToCountry(dataset);
  console.log(`HIPO mappings ready: ${domainMap.size.toLocaleString()} labeled domains`);

  const wikiEnabled = wikidataLookupEnabled(noWikidata);
  if (wikiEnabled) {
    console.log(
      `Wikidata lookup: вкл (пауза ${wikidataGapMs()}ms между HTTP; выключить WIKIDATA_ENABLED=0 или --no-wikidata)`
    );
  } else {
    console.log('Wikidata lookup: выкл');
  }

  const openAiEnabled = openaiHostClassifyEnabled();
  const openAiKey = Boolean(process.env.OPENAI_API_KEY?.trim());
  if (openaiBackfill) {
    if (!openAiEnabled || !openAiKey) {
      throw new Error(
        '--openai-backfill требует OPENAI_HOST_CLASSIFY_ENABLED=1 и OPENAI_API_KEY в окружении'
      );
    }
    console.log(
      `OpenAI backfill: вкл (модель ${process.env.OPENAI_HOST_CLASSIFY_MODEL?.trim() || 'gpt-4o-mini'}, пауза ${openaiHostGapMs()}ms перед батчем, параллельно до ${openaiHostConcurrency()}) — только строки чекпоинта без proposed ISO`
    );
  } else if (openAiEnabled && openAiKey) {
    console.log(
      `OpenAI host fallback: вкл после HIPO+Wikidata (модель ${process.env.OPENAI_HOST_CLASSIFY_MODEL?.trim() || 'gpt-4o-mini'}, пауза ${openaiHostGapMs()}ms)`
    );
  } else if (openAiEnabled && !openAiKey) {
    console.warn('OPENAI_HOST_CLASSIFY_ENABLED=1, но OPENAI_API_KEY пуст — шаг OpenAI пропускается');
  }

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
  console.log(`Запись/чекпоинт: ${outPath} (flush каждые ${flushEvery} новых строк)`);
  if (fresh) console.log('Режим --fresh: сохранённые результаты в файле игнорируются для resume');

  const instIds = [...new Set(candidates.map((c) => c.institution_id).filter(Boolean))] as string[];
  const instCountryIsoById = new Map<string, string | null>();
  if (instIds.length > 0) {
    const chunkSize = 200;
    for (let i = 0; i < instIds.length; i += chunkSize) {
      const slice = instIds.slice(i, i + chunkSize);
      const { data, error } = await supabase.from('institutions').select('id, country').in('id', slice);
      if (error) throw new Error(error.message);
      for (const r of data ?? []) {
        instCountryIsoById.set(r.id, normalizeIso(r.country));
      }
    }
  }

  const checkpointById = await loadCheckpointById(outPath, fresh);
  if (fresh) {
    try {
      await copyFile(outPath, `${outPath}.before-fresh.bak`);
      console.log(`Копия перед --fresh (не трогается при flush): ${outPath}.before-fresh.bak`);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') throw err;
    }
    await snapshotBackupRolling(outPath);
    await writeFile(outPath, JSON.stringify([], null, 2), 'utf-8');
  }

  /** Сколько id из текущей выборки уже есть в сохранённом JSON (повторная классификация не нужна). */
  const reusedPlannedCount = candidates.reduce(
    (n, sch) => n + (checkpointById.has(sch.id) ? 1 : 0),
    0
  );
  const classifyPlanned = total - reusedPlannedCount;
  if (!fresh && reusedPlannedCount > 0) {
    console.log(
      `\nResume по scholarship id: ${reusedPlannedCount.toLocaleString()}/${total.toLocaleString()} уже в файле (не считают заново). Осталось классифицировать: ${classifyPlanned.toLocaleString()}`
    );
    if (classifyPlanned > 0) {
      console.log(
        `Прогресс каждые 500 позиций в выборке; Wikidata только для новых строк; чекпоинт каждые ${flushEvery} новых классификаций`
      );
    }
  }

  const results: ResultRow[] = [];
  let newClassifiedSinceStart = 0;
  let openAiOkThisRun = 0;
  let openAiMissThisRun = 0;

  /** Один новый результат по строке scholarships (ничего из чекпоинта). */
  const classifyCandidateRow = async (row: SchRow, uiIndexOneBased: number): Promise<ResultRow> => {
    try {
      let proposed: string | null = null;
      let method: Method = 'LocalDomainOnly';

      const instIso = row.institution_id ? instCountryIsoById.get(row.institution_id) ?? null : null;
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

      if (!proposed && wikiEnabled) {
        try {
          const hint =
            row.provider_name?.trim() ??
            row.official_source_name?.trim() ??
            '(без имени)';
          const sh = hint.slice(0, 64);
          console.log(`→ Wikidata строка ${uiIndexOneBased}/${total} (${sh}${hint.length > 64 ? '…' : ''})`);
          const wdIso = await resolveHostCountryViaWikidata({
            provider_name: row.provider_name ?? null,
            official_source_name: row.official_source_name ?? null
          });
          const normWd = wdIso ? normalizeIso(wdIso) : null;
          if (normWd) {
            proposed = normWd;
            method = 'Wikidata';
          }
        } catch (wdErr) {
          console.warn(`Wikidata ошибка (${row.id}):`, (wdErr as Error).message ?? wdErr);
        }
      }

      if (!proposed && openaiHostClassifyEnabled() && process.env.OPENAI_API_KEY?.trim()) {
        try {
          const gap = openaiHostGapMs();
          if (gap > 0) await sleepMs(gap);
          const oaIso = await resolveHostCountryViaOpenAi({
            provider_name: row.provider_name ?? null,
            official_source_name: row.official_source_name ?? null,
            provider_url: row.provider_url ?? null
          });
          const normOa = oaIso ? normalizeIso(oaIso) : null;
          if (normOa) {
            proposed = normOa;
            method = 'OpenAI';
            openAiOkThisRun += 1;
            const label = (row.provider_name?.trim() ?? row.official_source_name?.trim() ?? row.id).slice(
              0,
              72
            );
            console.log(
              `  ✓ OpenAI OK — ${normOa} — строка ${uiIndexOneBased}/${total} — ${label}${label.length >= 72 ? '…' : ''}`
            );
          } else {
            openAiMissThisRun += 1;
            if (openAiVerboseNulls()) {
              console.log(
                `  · OpenAI null — строка ${uiIndexOneBased}/${total} — id=${row.id} — ${(row.provider_name?.trim() ?? '').slice(0, 56)}`
              );
            }
          }
        } catch (oaErr) {
          openAiMissThisRun += 1;
          console.warn(`OpenAI ошибка (${row.id}):`, (oaErr as Error).message ?? oaErr);
        }
      }

      if (!proposed) {
        method = 'LocalDomainOnly';
      }

      return {
        id: row.id,
        provider_name: row.provider_name ?? null,
        proposed_host_country: proposed,
        method
      };
    } catch (rowErr) {
      console.warn(`Строка ${row.id}:`, (rowErr as Error).message ?? rowErr);
      return {
        id: row.id,
        provider_name: row.provider_name ?? null,
        proposed_host_country: null,
        method: 'LocalDomainOnly'
      };
    }
  };

  if (total > 0 && classifyPlanned === 0 && !fresh && !openaiBackfill) {
    const complete = candidates.map((sch) => checkpointById.get(sch.id)!);
    console.log(`\nУже есть полный результат по id (${total}). Синхронизируем порядок в файле → ${outPath}`);
    await writeClassifiedCheckpoint(outPath, complete);
    return;
  }

  const isOpenAiBackfillSlot = (idx: number): boolean => {
    if (!openaiBackfill || !openAiEnabled || !openAiKey) return false;
    const sch = candidates[idx]!;
    const reused = checkpointById.get(sch.id);
    if (!reused || reused.id !== sch.id) return false;
    const empty = reused.proposed_host_country == null || reused.proposed_host_country === '';
    return empty;
  };

  const afterRowWritten = async (done: number): Promise<void> => {
    const shouldCheckpointWrite =
      done === total ||
      done % 500 === 0 ||
      (newClassifiedSinceStart > 0 && newClassifiedSinceStart % flushEvery === 0);

    if (shouldCheckpointWrite) {
      await writeClassifiedCheckpoint(outPath, results);
      if (newClassifiedSinceStart > 0) {
        console.log(
          `Чекпоинт сохранён: позиция в выборке ${done}/${total} (за этот запуск классифицировано заново ${newClassifiedSinceStart}/${classifyPlanned})`
        );
      } else if (done % 500 === 0 || done === total) {
        console.log(
          `Чекпоинт сохранён: позиция в выборке ${done}/${total} (повторное использование из файла, без Wikidata)`
        );
      }
    }

    const shouldLogProgress =
      done === total ||
      done % 500 === 0 ||
      (newClassifiedSinceStart > 0 &&
        (newClassifiedSinceStart === 1 || newClassifiedSinceStart % 25 === 0));
    if (shouldLogProgress) {
      console.log(
        `Обработано ${done}/${total} позиций в выборке (заново посчитано в этом запуске: ${newClassifiedSinceStart}/${classifyPlanned})…`
      );
    }
  };

  for (let i = 0; i < total; ) {
    if (isOpenAiBackfillSlot(i)) {
      let j = i + 1;
      while (j < total && isOpenAiBackfillSlot(j)) j += 1;
      const sliceRows = candidates.slice(i, j);
      const gap = openaiHostGapMs();
      if (gap > 0) await sleepMs(gap);
      const conc = openaiHostConcurrency();
      console.log(
        `→ OpenAI backfill batch ${i + 1}–${j}/${total} (${sliceRows.length} строк, до ${conc} параллельных запросов)`
      );
      const norms = await mapWithConcurrency(sliceRows, conc, async (row) => {
        try {
          const iso = await resolveHostCountryViaOpenAi({
            provider_name: row.provider_name ?? null,
            official_source_name: row.official_source_name ?? null,
            provider_url: row.provider_url ?? null
          });
          return normalizeIso(iso);
        } catch (e) {
          console.warn(`OpenAI backfill ошибка (${row.id}):`, (e as Error).message ?? e);
          return null;
        }
      });
      for (let bi = 0; bi < sliceRows.length; bi += 1) {
        const row = sliceRows[bi]!;
        const done = i + bi + 1;
        const norm = norms[bi] ?? null;
        const sh = (row.provider_name?.trim() ?? '').slice(0, 64) || row.id;
        if (norm) {
          openAiOkThisRun += 1;
          console.log(
            `  ✓ OpenAI OK (backfill) — ${norm} — ${done}/${total} — id=${row.id} — ${sh}${sh.length >= 64 ? '…' : ''}`
          );
        } else {
          openAiMissThisRun += 1;
          if (openAiVerboseNulls()) {
            console.log(`  · OpenAI null (backfill) — ${done}/${total} — id=${row.id}`);
          }
        }
        results.push({
          id: row.id,
          provider_name: row.provider_name ?? null,
          proposed_host_country: norm,
          method: norm ? 'OpenAI' : 'LocalDomainOnly'
        });
        newClassifiedSinceStart += 1;
        await afterRowWritten(done);
      }
      i = j;
      continue;
    }

    const row = candidates[i]!;
    const reusedRow = checkpointById.get(row.id);
    let resultRow: ResultRow;
    if (reusedRow && reusedRow.id === row.id) {
      resultRow = reusedRow;
    } else {
      resultRow = await classifyCandidateRow(row, i + 1);
      newClassifiedSinceStart += 1;
    }

    results.push(resultRow);
    const done = i + 1;
    await afterRowWritten(done);
    i += 1;
  }

  if (total === 0) {
    await writeClassifiedCheckpoint(outPath, results);
  }
  if (
    openaiHostClassifyEnabled() &&
    process.env.OPENAI_API_KEY?.trim() &&
    openAiOkThisRun + openAiMissThisRun > 0
  ) {
    console.log(
      `\n── OpenAI за этот запуск ──\n` +
        `  Получили валидный ISO: ${openAiOkThisRun.toLocaleString()}\n` +
        `  Без ISO (null / не распарсилось / ошибка после вызова): ${openAiMissThisRun.toLocaleString()}`
    );
  }
  console.log(`\nГотово → ${results.length.toLocaleString()} записей сохранены в ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
