/**
 * Audit: published content_posts — related_scholarships vs scholarship_links for bottom cards.
 * Run: node scripts/audit-content-posts-related-scholarships.mjs
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env.local');

function loadEnvLocal(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(
      /^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=(.*)$/
    );
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v;
  }
  return env;
}

function countRelated(value) {
  if (value == null) return { kind: 'null', n: 0 };
  if (Array.isArray(value)) return { kind: 'array', n: value.length };
  if (typeof value === 'object') return { kind: 'object', n: Object.keys(value).length };
  return { kind: typeof value, n: 0 };
}

const env = loadEnvLocal(envPath);
const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  Accept: 'application/json'
};

const qs = new URLSearchParams({
  select: 'slug,status,related_scholarships,scholarship_links',
  status: 'eq.published',
  order: 'updated_at.desc',
  limit: '60'
});

const res = await fetch(`${url}/rest/v1/content_posts?${qs}`, { headers });
const rows = await res.json();
if (!res.ok) {
  console.error('HTTP', res.status, rows);
  process.exit(1);
}

let withRelated = 0;
let withLegacyLinks = 0;
let emptyBoth = 0;
const samplesEmpty = [];

for (const r of rows) {
  const rel = countRelated(r.related_scholarships);
  const leg = countRelated(r.scholarship_links);
  if (rel.n > 0) withRelated++;
  if (leg.n > 0) withLegacyLinks++;
  if (rel.n === 0 && (leg.kind === 'null' || leg.n === 0)) {
    emptyBoth++;
    if (samplesEmpty.length < 8) samplesEmpty.push(r.slug);
  }
}

console.log(
  JSON.stringify(
    {
      published_rows_sampled: rows.length,
      rows_with_nonempty_related_scholarships: withRelated,
      rows_with_nonempty_scholarship_links_legacy: withLegacyLinks,
      rows_with_empty_related_and_no_legacy_links: emptyBoth,
      sample_slugs_missing_cards: samplesEmpty
    },
    null,
    2
  )
);

console.log('---');
console.log(
  'Bottom cards use parseRelatedScholarshipsJson(related_scholarships) only; empty array => CTA fallback.'
);
