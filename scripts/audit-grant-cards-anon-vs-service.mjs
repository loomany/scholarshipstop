/**
 * Compare anon vs service_role reads for content_posts.scholarship_links (RLS diagnostic).
 * Run: node scripts/audit-grant-cards-anon-vs-service.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env.local');

function loadEnv(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(
      /^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY)=(.*)$/
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

const env = loadEnv(envPath);
const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const service = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const slug = 'trustworthy-scholarship-database-2026';

async function fetchRow(key, label) {
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: 'application/json'
  };
  const qs = new URLSearchParams({
    select:
      'slug,status,related_scholarships,scholarship_links,body_html',
    slug: `eq.${slug}`,
    limit: '1'
  });
  const res = await fetch(`${url}/rest/v1/content_posts?${qs}`, { headers });
  const data = await res.json();
  return { label, status: res.status, row: Array.isArray(data) ? data[0] : data };
}

const svc = await fetchRow(service, 'service_role');
const pub = await fetchRow(anon, 'anon');

function summarize(row) {
  if (!row) return null;
  const rel = row.related_scholarships;
  const leg = row.scholarship_links;
  return {
    has_related: rel != null && (Array.isArray(rel) ? rel.length : 'non-array'),
    related_type: rel == null ? 'null' : Array.isArray(rel) ? 'array' : typeof rel,
    has_links: leg != null && (Array.isArray(leg) ? leg.length : 'non-array'),
    links_type: leg == null ? 'null' : Array.isArray(leg) ? 'array' : typeof leg,
    links_sample:
      Array.isArray(leg) && leg[0]
        ? JSON.stringify(leg[0]).slice(0, 400)
        : null
  };
}

console.log(
  JSON.stringify(
    {
      slug,
      service: summarize(svc.row),
      anon: summarize(pub.row),
      raw_links_service_first_item:
        svc.row?.scholarship_links?.[0] ?? null
    },
    null,
    2
  )
);
