/**
 * Retry host UPDATE for specific ids (sequential, small delay) after transient fetch failures.
 *
 *   dotenv -e .env.local -- npx tsx scripts/retry_host_updates_ids.ts
 */

import { readFile } from 'fs/promises';
import { join } from 'path';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types_db';

const RESULT_FILENAME = 'classified_hosts_result.json';
const DELAY_MS = 200;

/** From log 184441.txt — batch 33/36 fetch failed */
const TARGET_IDS = new Set([
  '9c88407f-5b5b-41b4-9b1f-f4daaecc371f',
  '9c887bc9-2fc2-4ccb-9953-29fc3f288547',
  '9c4b6305-62fc-4f37-ba59-fbb888f17ab9',
  '9c816a6c-83e0-4d02-be1c-96bb0e725105',
  '9cab9799-a893-4ed7-b109-258f9fecb2e5',
  '9c9d177e-0802-4619-8c7e-f9f100f0e6a0',
  'a92052e5-d5f8-41e0-aa10-244a0249b540',
  'a8e36825-9b7f-4a46-8647-b3d90c50425b',
  'a92bb759-c3e4-4920-a3d1-1190d1b30008',
  'a90bc7e5-1861-4555-b44a-48fc46e38a3f',
  'a8e6ad26-89da-4f16-b48b-f0ed4989bffe',
  'a8ee9a06-282f-4eee-b4a6-4b517a6618ac',
  'a8f3054d-fed3-4a3f-b421-ff4ef1fb220a',
  'a92459c2-b0f7-4953-a2f3-b61e87ac3445',
  'a90f6901-32cf-4d14-9be5-98951e4ac072',
  'a90e7f93-7229-4c4b-b44b-0efa87b4567b',
  'a8f88ade-c138-4364-95ae-d68dab5e0daa',
  'a8f31f35-56b5-46c6-ba7f-01e620710b38',
  'a9412ab2-eb4e-4ae7-8548-53fc8c29c9e0',
  'a9347aae-8337-43a3-990a-fb5ee52cd036'
]);

type InputRow = { id: string; proposed_host_country?: string | null };

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
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

function applicantCodesFromDbJson(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return [
    ...new Set(
      v
        .filter((x): x is string => typeof x === 'string')
        .map((x) => x.trim().toUpperCase())
        .filter(isValidIsoAlpha2)
    )
  ].sort((a, b) => a.localeCompare(b));
}

function applicantCodesWithoutHostOverlap(applicant: string[], host: string[]): string[] {
  if (host.length === 0) return applicant;
  const hs = new Set(host);
  return applicant.filter((c) => !hs.has(c));
}

function resultJsonPath(): string {
  const override = process.env.CLASSIFIED_HOSTS_RESULT_JSON?.trim();
  if (override) return override;
  return join(process.cwd(), RESULT_FILENAME);
}

async function main() {
  const path = resultJsonPath();
  const parsed = JSON.parse(await readFile(path, 'utf-8')) as unknown;
  if (!Array.isArray(parsed)) throw new Error(`Expected JSON array in ${path}`);

  const isoById = new Map<string, string>();
  for (const item of parsed) {
    const row = item as InputRow;
    if (typeof row?.id !== 'string' || !TARGET_IDS.has(row.id)) continue;
    const iso = normalizeProposed(row.proposed_host_country ?? null);
    if (iso) isoById.set(row.id, iso);
  }

  if (isoById.size !== TARGET_IDS.size) {
    const missing = [...TARGET_IDS].filter((id) => !isoById.has(id));
    console.warn('В JSON нет валидного ISO для id:', missing.join(', '));
  }

  const ids = [...isoById.keys()];
  if (ids.length === 0) {
    console.log('Нечего обновлять.');
    return;
  }

  const supabase = serviceSupabase();
  const { data: rows, error: fetchErr } = await supabase
    .from('scholarships')
    .select('id, applicant_country_codes')
    .in('id', ids);
  if (fetchErr) throw fetchErr;

  const applicantById = new Map<string, string[]>();
  for (const row of rows ?? []) {
    if (typeof row.id === 'string') {
      applicantById.set(row.id, applicantCodesFromDbJson(row.applicant_country_codes));
    }
  }

  let ok = 0;
  let fail = 0;
  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i]!;
    const host = [isoById.get(id)!];
    const applicant = applicantCodesWithoutHostOverlap(applicantById.get(id) ?? [], host);
    if (i > 0) await new Promise((r) => setTimeout(r, DELAY_MS));
    const { error } = await supabase
      .from('scholarships')
      .update({
        host_country_codes: host,
        applicant_country_codes: applicant
      })
      .eq('id', id);
    if (error) {
      fail += 1;
      console.warn(`Ошибка ${id}: ${error.message}`);
    } else {
      ok += 1;
      console.log(`OK ${id} → host ${host[0]}`);
    }
  }

  console.log(`\nГотово: ${ok} ок, ${fail} ошибок из ${ids.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
