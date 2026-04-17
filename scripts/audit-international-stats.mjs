/**
 * One-off audit: international-friendly scholarships + profiles (citizenship).
 * Run: dotenv -e .env.local -- node scripts/audit-international-stats.mjs
 */
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnvLocal() {
  const envPath = path.join(root, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('Missing .env.local');
    process.exit(1);
  }
  const raw = fs.readFileSync(envPath, 'utf8');
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(
      /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/
    );
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

function textBlob(row) {
  const parts = [
    row.title,
    row.description,
    row.summary_short,
    row.who_can_apply,
    row.eligibility_text,
    row.summary_long
  ];
  return parts.filter(Boolean).join('\n').toLowerCase();
}

function citizenshipStr(row) {
  const c = row.citizenship_statuses;
  if (!c) return '';
  if (Array.isArray(c)) return c.map((x) => String(x).toLowerCase()).join(' ');
  return String(c).toLowerCase();
}

function structuredInternational(row) {
  const cit = citizenshipStr(row);
  if (
    /international|f-1|f1|foreign|non.u\.s|non-us|global student|visa holder|outside the u\.s/i.test(
      cit
    )
  ) {
    return true;
  }
  const tags = row.seo_tags;
  if (Array.isArray(tags) && tags.some((t) => String(t).includes('international'))) {
    return true;
  }
  return false;
}

function fullInternationalRelevant(row) {
  if (structuredInternational(row)) return true;
  const b = textBlob(row);
  return /international student|f-1|f1 visa|foreign national|students outside|non-u\.s\. citizen|non us citizen|eligible.*international/i.test(
    b
  );
}

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const PAGE = 1000;
let from = 0;
const rows = [];
for (;;) {
  const { data, error } = await supabase
    .from('scholarships')
    .select(
      'id,title,description,summary_short,summary_long,who_can_apply,eligibility_text,citizenship_statuses,seo_tags,is_active'
    )
    .eq('is_active', true)
    .order('id')
    .range(from, from + PAGE - 1);

  if (error) {
    console.error(error);
    process.exit(1);
  }
  const batch = data ?? [];
  rows.push(...batch);
  if (batch.length < PAGE) break;
  from += PAGE;
}

let structured = 0;
let full = 0;
for (const r of rows) {
  if (structuredInternational(r)) structured += 1;
  if (fullInternationalRelevant(r)) full += 1;
}

const { count: totalProfiles, error: pe } = await supabase
  .from('profiles')
  .select('*', { count: 'exact', head: true });

if (pe) console.error('profiles count error', pe);

const { count: intlProfiles, error: ie } = await supabase
  .from('profiles')
  .select('*', { count: 'exact', head: true })
  .eq('citizenship_status', 'international_student');

if (ie) console.error('intl profiles count error', ie);

console.log(JSON.stringify({
  scholarships_active_total: rows.length,
  scholarships_international_structured_facet_or_seo: structured,
  scholarships_international_including_text_heuristic: full,
  profiles_total: totalProfiles ?? null,
  profiles_citizenship_international_student: intlProfiles ?? null
}, null, 2));
