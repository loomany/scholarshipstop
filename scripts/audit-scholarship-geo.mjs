/**
 * One-off: distribution of location_scope for active scholarships.
 * Usage: npx dotenv -e .env.local -- node scripts/audit-scholarship-geo.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnvLocal() {
  const p = resolve(process.cwd(), '.env.local');
  const raw = readFileSync(p, 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).replace(/\\n/g, '\n');
    if (process.env[m[1]] == null) process.env[m[1]] = v;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

const { count: totalActive, error: cErr } = await supabase
  .from('scholarships')
  .select('*', { count: 'exact', head: true })
  .eq('is_active', true);

if (cErr) {
  console.error(cErr);
  process.exit(1);
}

const pageSize = 1000;
let from = 0;
const scopeCounts = new Map();
let nullScope = 0;

for (;;) {
  const { data, error } = await supabase
    .from('scholarships')
    .select('location_scope')
    .eq('is_active', true)
    .range(from, from + pageSize - 1);

  if (error) {
    console.error(error);
    process.exit(1);
  }
  if (!data?.length) break;

  for (const row of data) {
    const s = row.location_scope?.trim();
    if (!s) nullScope += 1;
    else scopeCounts.set(s, (scopeCounts.get(s) ?? 0) + 1);
  }

  if (data.length < pageSize) break;
  from += pageSize;
}

const sorted = [...scopeCounts.entries()].sort((a, b) => b[1] - a[1]);

console.log(JSON.stringify({
  activeScholarshipsApprox: totalActive,
  locationScopeNullOrEmpty: nullScope,
  locationScopeDistinctValues: sorted.length,
  topLocationScopes: sorted.slice(0, 40)
}, null, 2));
