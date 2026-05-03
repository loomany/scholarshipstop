/**
 * Список стипендий в том же порядке и отборе, что classify_hosts.ts (нет валидного ISO в host_country_codes).
 *
 *   dotenv -e .env.local -- npx tsx scripts/export_host_classify_candidates_list.ts
 *
 * По умолчанию пишет UTF-8: host_classify_candidates_google.txt в cwd (без URL).
 * Env: EXPORT_HOST_CLASSIFY_LIST — другой путь файла.
 */

import { writeFile } from 'fs/promises';
import { join } from 'path';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types_db';

const PAGE_SIZE = 500;

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

function providerTitle(row: {
  provider_name: string | null;
  official_source_name: string | null;
}): string {
  return (
    row.provider_name?.trim() ||
    row.official_source_name?.trim() ||
    '(без имени провайдера)'
  );
}

function usableLocationScope(raw: string | null): string | null {
  const t = raw?.trim();
  if (!t) return null;
  if (/^unknown$/i.test(t)) return null;
  return t;
}

/** Штат/территория из каталога + страна из institutions.country (ISO) или location_scope (без «unknown»). */
function geoHint(
  row: {
    state_territory_text: string | null;
    location_scope: string | null;
    institution_id: string | null;
  },
  instCountryIsoById: Map<string, string | null>
): string {
  const bits: string[] = [];
  const st = row.state_territory_text?.trim();
  if (st) bits.push(st);

  const instIso =
    row.institution_id != null ? instCountryIsoById.get(row.institution_id) ?? null : null;
  if (instIso) bits.push(instIso);
  else {
    const loc = usableLocationScope(row.location_scope);
    if (loc) bits.push(loc);
  }

  return bits.join(' · ');
}

async function main() {
  const supabase = serviceSupabase();
  const out =
    process.env.EXPORT_HOST_CLASSIFY_LIST?.trim() ||
    join(process.cwd(), 'host_classify_candidates_google.txt');

  type Row = Pick<
    Database['public']['Tables']['scholarships']['Row'],
    | 'id'
    | 'provider_name'
    | 'official_source_name'
    | 'host_country_codes'
    | 'state_territory_text'
    | 'location_scope'
    | 'institution_id'
  >;

  const candidates: Row[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('scholarships')
      .select(
        'id, provider_name, official_source_name, host_country_codes, state_territory_text, location_scope, institution_id'
      )
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Row[];
    if (rows.length === 0) break;

    for (const row of rows) {
      if (!rowNeedsHostClassification(row.host_country_codes)) continue;
      candidates.push(row);
    }

    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

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

  const lines = candidates.map((row, idx) => {
    const title = providerTitle(row);
    const geo = geoHint(row, instCountryIsoById);
    return geo ? `${idx + 1}. ${title} | ${geo}` : `${idx + 1}. ${title}`;
  });

  const header =
    `# Стипендии без валидного ISO в host_country_codes (порядок как в classify_hosts).\n` +
    `# Всего: ${candidates.length}\n` +
    `# Формат: номер. провайдер [| штат/территория · страна ISO или location_scope]. Без ссылок.\n\n`;

  await writeFile(out, `\uFEFF${header}${lines.join('\n')}\n`, 'utf-8');

  console.log(`Готово: ${candidates.length.toLocaleString()} строк → ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
