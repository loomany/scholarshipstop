/**
 * Count active scholarships whose eligibility_tags contain `first_generation`.
 *
 *   npx tsx scripts/debug-eligibility-first-generation.ts
 *
 * Uses .env / .env.local (same loader as smoke-seo-listing-fallback).
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types_db';

function loadEnvFiles() {
  const root = path.resolve(__dirname, '..');
  for (const name of ['.env', '.env.local']) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    for (const line of text.split(/\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i <= 0) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (process.env[k] === undefined) process.env[k] = v;
    }
  }
}

async function main() {
  loadEnvFiles();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('Missing Supabase URL/key');
    process.exit(1);
  }
  const supabase = createClient<Database>(url, key);

  const { count, error } = await supabase
    .from('scholarships')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .contains('eligibility_tags', ['first_generation']);

  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log(
    'Active scholarships with eligibility_tags containing first_generation:',
    count ?? 0
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
