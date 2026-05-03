/**
 * Apply classified_hosts_result.json to public.scholarships (writes DB).
 * Sets host_country_codes and clears any overlapping ISO2 from applicant_country_codes
 * so destination vs citizenship badges stay disjoint.
 *
 *   dotenv -e .env.local -- npx tsx scripts/update_hosts_in_db.ts
 *   dotenv -e .env.local -- npx tsx scripts/update_hosts_in_db.ts --confident-only
 *
 * Reads classified_hosts_result.json from cwd (override: CLASSIFIED_HOSTS_RESULT_JSON).
 *
 * Flags:
 *   --confident-only — в БД только строки с method Wikidata или LocalDomain (и валидный ISO).
 *   --all-methods — по умолчанию: любой method при валидном proposed (как раньше).
 */

import { readFile } from 'fs/promises';
import { join } from 'path';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types_db';

const RESULT_FILENAME = 'classified_hosts_result.json';
const BATCH_SIZE = 100;
/** Parallel row updates when batch upsert fails (keeps server load bounded). */
const FALLBACK_CONCURRENCY = 12;

type InputRow = {
  id: string;
  provider_name?: string | null;
  proposed_host_country?: string | null;
  method?: string;
};

const CONFIDENT_METHODS = new Set(['Wikidata', 'LocalDomain']);

function parseArgs(): { confidentOnly: boolean } {
  const argv = process.argv.slice(2);
  let confidentOnly = process.env.UPDATE_HOSTS_CONFIDENT_ONLY === '1';
  for (const a of argv) {
    if (a === '--confident-only') confidentOnly = true;
    if (a === '--all-methods') confidentOnly = false;
  }
  return { confidentOnly };
}

function methodAllowsDbWrite(method: string | undefined, confidentOnly: boolean): boolean {
  if (!confidentOnly) return true;
  const m = typeof method === 'string' ? method.trim() : '';
  return CONFIDENT_METHODS.has(m);
}

type UpsertPayload = {
  id: string;
  host_country_codes: string[];
  applicant_country_codes: string[];
};

/** Parse scholarships.applicant_country_codes JSON into normalized ISO Alpha-2. */
function applicantCodesFromDbJson(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out = v
    .filter((x): x is string => typeof x === 'string')
    .map((x) => x.trim().toUpperCase())
    .filter(isValidIsoAlpha2);
  return [...new Set(out)].sort((a, b) => a.localeCompare(b));
}

function applicantCodesWithoutHostOverlap(applicant: string[], host: string[]): string[] {
  if (host.length === 0) return applicant;
  const hs = new Set(host);
  return applicant.filter((c) => !hs.has(c));
}

async function fetchApplicantCodesByScholarshipIds(
  supabase: ReturnType<typeof serviceSupabase>,
  ids: string[]
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  const chunkSize = 500;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('scholarships')
      .select('id, applicant_country_codes')
      .in('id', chunk);
    if (error) throw error;
    for (const row of data ?? []) {
      if (typeof row?.id !== 'string') continue;
      out.set(row.id, applicantCodesFromDbJson(row.applicant_country_codes));
    }
  }
  return out;
}

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient<Database>(url, key);
}

function isValidIsoAlpha2(code: string): boolean {
  return /^[A-Z]{2}$/.test(code);
}

function normalizeProposed(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  return isValidIsoAlpha2(code) ? code : null;
}

function resultJsonPath(): string {
  const override = process.env.CLASSIFIED_HOSTS_RESULT_JSON?.trim();
  if (override) return override;
  return join(process.cwd(), RESULT_FILENAME);
}

async function runUpdatesLimitedParallel(
  supabase: ReturnType<typeof serviceSupabase>,
  rows: UpsertPayload[],
  concurrency: number,
  counters: { ok: number; fail: number }
) {
  for (let i = 0; i < rows.length; i += concurrency) {
    const slice = rows.slice(i, i + concurrency);
    await Promise.all(
      slice.map(async (row) => {
        const { error } = await supabase
          .from('scholarships')
          .update({
            host_country_codes: row.host_country_codes,
            applicant_country_codes: row.applicant_country_codes
          })
          .eq('id', row.id);
        if (error) {
          counters.fail += 1;
          console.warn(`  Ошибка id=${row.id}: ${error.message}`);
        } else {
          counters.ok += 1;
        }
      })
    );
  }
}

async function main() {
  const { confidentOnly } = parseArgs();
  const path = resultJsonPath();
  const rawText = await readFile(path, 'utf-8');
  const parsed = JSON.parse(rawText) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected JSON array in ${path}`);
  }

  const valid: UpsertPayload[] = [];
  let skippedBadCode = 0;
  let skippedNull = 0;
  let skippedMethod = 0;

  for (const item of parsed) {
    const row = item as InputRow;
    if (typeof row?.id !== 'string' || !row.id.trim()) continue;
    if (row.proposed_host_country == null || row.proposed_host_country === '') {
      skippedNull += 1;
      continue;
    }
    const iso = normalizeProposed(row.proposed_host_country);
    if (!iso) {
      skippedBadCode += 1;
      continue;
    }
    if (!methodAllowsDbWrite(row.method, confidentOnly)) {
      skippedMethod += 1;
      continue;
    }
    valid.push({ id: row.id.trim(), host_country_codes: [iso], applicant_country_codes: [] });
  }

  console.log(`Файл: ${path}`);
  console.log(
    `Режим: ${confidentOnly ? 'только Wikidata + LocalDomain (--confident-only или UPDATE_HOSTS_CONFIDENT_ONLY=1)' : 'все method при валидном ISO (--all-methods)'}`
  );
  console.log(`Всего объектов в JSON: ${parsed.length.toLocaleString()}`);
  console.log(`К записи (proposed ≠ null и валидный ISO Alpha-2): ${valid.length.toLocaleString()}`);
  if (skippedNull) console.log(`Пропуск (proposed отсутствует): ${skippedNull.toLocaleString()}`);
  if (skippedBadCode) console.log(`Пропуск (неверный код страны): ${skippedBadCode.toLocaleString()}`);
  if (skippedMethod)
    console.log(
      `Пропуск (method не в списке уверенных при --confident-only): ${skippedMethod.toLocaleString()}`
    );

  if (valid.length === 0) {
    console.log('\nНечего обновлять. Выход.');
    return;
  }

  const supabase = serviceSupabase();
  const uniqueIds = [...new Set(valid.map((v) => v.id))];
  const applicantById = await fetchApplicantCodesByScholarshipIds(supabase, uniqueIds);

  /** Last JSON row wins host for duplicate ids */
  const byIdLatest = new Map<string, UpsertPayload>();
  for (const row of valid) {
    const curApplicant = applicantById.get(row.id) ?? [];
    const hosts = row.host_country_codes;
    byIdLatest.set(row.id, {
      id: row.id,
      host_country_codes: hosts,
      applicant_country_codes: applicantCodesWithoutHostOverlap(curApplicant, hosts)
    });
  }

  const validDedup = [...byIdLatest.values()];
  let strippedOverlaps = 0;
  for (const row of validDedup) {
    const beforeLen = applicantById.get(row.id)?.length ?? 0;
    if (beforeLen !== row.applicant_country_codes.length) strippedOverlaps += 1;
  }
  console.log(`Уникальных id: ${uniqueIds.length.toLocaleString()} (из JSON возможны дубликаты)`);
  if (strippedOverlaps)
    console.log(
      `Санитизация: applicant_country_codes очищен от пересечения с host у ${strippedOverlaps.toLocaleString()} строк`
    );

  const batches: UpsertPayload[][] = [];
  for (let offset = 0; offset < validDedup.length; offset += BATCH_SIZE) {
    batches.push(validDedup.slice(offset, offset + BATCH_SIZE));
  }

  let batchIndex = 0;
  let okRows = 0;
  let failedRows = 0;

  for (const batch of batches) {
    batchIndex += 1;
    const payload = batch.map(({ id, host_country_codes, applicant_country_codes }) => ({
      id,
      host_country_codes,
      applicant_country_codes
    }));

    const { error } = await supabase.from('scholarships').upsert(payload, { onConflict: 'id' });

    if (!error) {
      okRows += batch.length;
      console.log(`Батч ${batchIndex}/${batches.length} — upsert OK (${batch.length} строк)`);
      continue;
    }

    console.warn(
      `\nБатч ${batchIndex}/${batches.length} upsert: ${error.message}\nОткат к UPDATE пачками по ${FALLBACK_CONCURRENCY}…`
    );

    const fb = { ok: 0, fail: 0 };
    await runUpdatesLimitedParallel(supabase, batch, FALLBACK_CONCURRENCY, fb);
    okRows += fb.ok;
    failedRows += fb.fail;
    console.log(
      `  Fallback завершён: +${fb.ok} ок, ${fb.fail ? `−${fb.fail} ошибок` : 'ошибок нет'}`
    );
  }

  console.log('\n──────── Итог ────────');
  console.log(`Валидных записей из JSON к применению: ${validDedup.length.toLocaleString()} (после дедуп по id)`);
  console.log(`Батчей (по ${BATCH_SIZE}): ${batches.length}`);
  console.log(`Успешные обновления: ${okRows.toLocaleString()}`);
  console.log(`Ошибки строк: ${failedRows.toLocaleString()}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
