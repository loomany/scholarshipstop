/**
 * Одноразовый вывод SQL для Supabase / psql из classified_hosts_result.json.
 * Только method Wikidata или LocalDomain и валидный ISO2 в proposed_host_country.
 *
 *   npx tsx scripts/emit_host_country_sql_from_json.ts
 *
 * Пишет host_country_confident_updates.sql в cwd.
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const RESULT = join(process.cwd(), 'classified_hosts_result.json');
const OUT = join(process.cwd(), 'host_country_confident_updates.sql');

type Row = { id: string; proposed_host_country?: string | null; method?: string };

function escSql(s: string): string {
  return s.replace(/'/g, "''");
}

async function main() {
  const raw = await readFile(RESULT, 'utf-8');
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) throw new Error('JSON not array');

  const ok: Row[] = [];
  for (const item of parsed) {
    const r = item as Row;
    if (typeof r?.id !== 'string' || !r.id.trim()) continue;
    const m = (r.method || '').trim();
    if (m !== 'Wikidata' && m !== 'LocalDomain') continue;
    const p = typeof r.proposed_host_country === 'string' ? r.proposed_host_country.trim().toUpperCase() : '';
    if (!/^[A-Z]{2}$/.test(p)) continue;
    ok.push({ id: r.id.trim(), proposed_host_country: p, method: m });
  }

  const valueLines = ok.map((r) => `  ('${escSql(r.id)}', '${escSql(r.proposed_host_country!)}')`);

  const sql =
    `-- Автоген из classified_hosts_result.json\n` +
    `-- Строк: ${ok.length} (только Wikidata + LocalDomain, ISO2)\n` +
    `-- Проверь в staging, затем выполни в prod.\n\n` +
    `BEGIN;\n\n` +
    `UPDATE public.scholarships AS s\n` +
    `SET host_country_codes = to_jsonb(ARRAY[v.iso])\n` +
    `FROM (\nVALUES\n` +
    valueLines.join(',\n') +
    `\n) AS v(id, iso)\n` +
    `WHERE s.id::text = v.id;\n\n` +
    `COMMIT;\n`;

  await writeFile(OUT, sql, 'utf-8');
  console.log(`Записано ${OUT} (${ok.length} UPDATE-целей)`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
