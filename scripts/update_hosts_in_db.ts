/**
 * Apply classified_hosts_result.json to public.scholarships.host_country_codes (writes DB).
 *
 *   dotenv -e .env.local -- npx tsx scripts/update_hosts_in_db.ts
 *
 * Reads classified_hosts_result.json from cwd (override: CLASSIFIED_HOSTS_RESULT_JSON).
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

type UpsertPayload = { id: string; host_country_codes: string[] };

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
          .update({ host_country_codes: row.host_country_codes })
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
  const path = resultJsonPath();
  const rawText = await readFile(path, 'utf-8');
  const parsed = JSON.parse(rawText) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected JSON array in ${path}`);
  }

  const valid: UpsertPayload[] = [];
  let skippedBadCode = 0;
  let skippedNull = 0;

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
    valid.push({ id: row.id.trim(), host_country_codes: [iso] });
  }

  console.log(`Файл: ${path}`);
  console.log(`Всего объектов в JSON: ${parsed.length.toLocaleString()}`);
  console.log(`К записи (proposed ≠ null и валидный ISO Alpha-2): ${valid.length.toLocaleString()}`);
  if (skippedNull) console.log(`Пропуск (proposed отсутствует): ${skippedNull.toLocaleString()}`);
  if (skippedBadCode) console.log(`Пропуск (неверный код страны): ${skippedBadCode.toLocaleString()}`);

  if (valid.length === 0) {
    console.log('\nНечего обновлять. Выход.');
    return;
  }

  const supabase = serviceSupabase();
  const batches: UpsertPayload[][] = [];
  for (let offset = 0; offset < valid.length; offset += BATCH_SIZE) {
    batches.push(valid.slice(offset, offset + BATCH_SIZE));
  }

  let batchIndex = 0;
  let okRows = 0;
  let failedRows = 0;

  for (const batch of batches) {
    batchIndex += 1;
    const payload = batch.map(({ id, host_country_codes }) => ({
      id,
      host_country_codes
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
  console.log(`Валидных записей из JSON к применению: ${valid.length.toLocaleString()}`);
  console.log(`Батчей (по ${BATCH_SIZE}): ${batches.length}`);
  console.log(`Успешные обновления: ${okRows.toLocaleString()}`);
  console.log(`Ошибки строк: ${failedRows.toLocaleString()}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
