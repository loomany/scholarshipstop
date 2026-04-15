/**
 * First-touch counts: TikTok / Meta (Instagram) vs Supabase `anonymous_visitor_first_touch`.
 * Uses SUPABASE_SERVICE_ROLE_KEY from `.env.local` (does not print secrets).
 * Run: node scripts/audit-social-first-touch.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

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

const env = loadEnvLocal(envPath);
const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function countFiltered(q) {
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

function base(humansOnly) {
  let q = supabase
    .from('anonymous_visitor_first_touch')
    .select('*', { count: 'exact', head: true });
  if (humansOnly) q = q.eq('is_likely_bot', false);
  return q;
}

async function main() {
  const humansOnly = true;

  const total = await countFiltered(base(humansOnly));
  const totalAll = await countFiltered(base(false));

  const tiktokUtm = await countFiltered(
    base(humansOnly).ilike('utm_source', '%tiktok%')
  );

  const metaInstagramPlacementUtmIg = await countFiltered(
    base(humansOnly).eq('utm_source', 'ig')
  );

  const metaUtmFbFamily = await countFiltered(
    base(humansOnly).or('utm_source.eq.facebook,utm_source.eq.fb,utm_source.eq.instagram')
  );

  const referrerHasInstagram = await countFiltered(
    base(humansOnly).ilike('referrer', '%instagram%')
  );

  const earliest = await supabase
    .from('anonymous_visitor_first_touch')
    .select('created_at')
    .eq('is_likely_bot', false)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const latest = await supabase
    .from('anonymous_visitor_first_touch')
    .select('created_at')
    .eq('is_likely_bot', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log(
    JSON.stringify(
      {
        scope: 'anonymous_visitor_first_touch',
        humansOnly,
        totalVisitorsHumans: total,
        totalVisitorsIncludingBots: totalAll,
        dateRangeHumans: {
          first: earliest.data?.created_at ?? null,
          last: latest.data?.created_at ?? null
        },
        matchedHumans: {
          tiktok_utm_source_contains_tiktok: tiktokUtm,
          meta_ads_utm_source_eq_ig_instagram_placement: metaInstagramPlacementUtmIg,
          meta_ads_utm_source_facebook_or_fb_or_instagram: metaUtmFbFamily,
          referrer_contains_instagram: referrerHasInstagram
        },
        notes: [
          'utm_source=ig is Meta Ads traffic attributed to Instagram placement.',
          'tiktok in utm_source reflects TikTok Ads (or tagged links); sample showed utm_medium=cpc, campaign cold_prospecting.',
          'referrer_contains_instagram matches instagram.com / l.instagram.com (often overlaps with utm ig).',
          'Many in-app clicks have no referrer — undercount vs Ads Manager is possible.'
        ]
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
