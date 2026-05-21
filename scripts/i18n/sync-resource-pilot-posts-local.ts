/**
 * Copy 25 pilot content_posts from hosted DB → local Supabase (read prod, write local only).
 * Usage:
 *   I18N_PILOT_ALLOW_DB_WRITES=1 I18N_PILOT_USE_SHELL_ENV=1 \
 *   PROD_SUPABASE_URL=... PROD_SERVICE_ROLE_KEY=... \
 *   LOCAL_SUPABASE_URL=http://127.0.0.1:54321 LOCAL_SERVICE_ROLE_KEY=... \
 *   npx tsx scripts/i18n/sync-resource-pilot-posts-local.ts
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { RESOURCE_PILOT_SLUGS } from '@/lib/i18n/resourcePilot/resourcePilotSlugs';
import type { Database } from '@/types_db';

const PILOT_TOPIC_LABEL = 'stage4d-resource-pilot-local';
const LOCAL_DEMO_SERVICE_ROLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

type ProdPostRow = {
  id: string;
  slug: string | null;
  title: string | null;
  status: string | null;
  meta_title: string | null;
  meta_description: string | null;
  body_html: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  updated_at: string | null;
  word_count: number | null;
  char_count: number | null;
};

function loadEnvLocal(): void {
  const path = join(process.cwd(), '.env.local');
  const raw = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

async function ensureLocalPilotTopic(
  local: SupabaseClient
): Promise<string> {
  const { data: existing, error: findErr } = await local
    .from('content_topics')
    .select('id')
    .eq('topic', PILOT_TOPIC_LABEL)
    .limit(1)
    .maybeSingle();
  if (findErr) throw findErr;
  if (existing?.id) return String(existing.id);

  const { data: created, error: insertErr } = await local
    .from('content_topics')
    .insert({ topic: PILOT_TOPIC_LABEL, status: 'done' })
    .select('id')
    .single();
  if (insertErr) throw insertErr;
  return String(created.id);
}

function normalizePostForLocalSchema(row: ProdPostRow, topicId: string) {
  const title = String(row.title ?? '').trim() || 'Resource';
  const slug = String(row.slug ?? '').trim();
  const metaTitle = String(row.meta_title ?? title).trim() || title;
  const metaDescription =
    String(row.meta_description ?? '').trim() || metaTitle;
  const bodyHtml =
    String(row.body_html ?? '').trim() || `<p>${metaDescription}</p>`;

  return {
    id: row.id,
    topic_id: topicId,
    title,
    slug,
    h1: title,
    excerpt: metaDescription,
    body_markdown: '',
    body_html: bodyHtml,
    meta_title: metaTitle,
    meta_description: metaDescription,
    primary_keyword: slug.replace(/-/g, ' ').slice(0, 120) || 'scholarship',
    secondary_keywords: [],
    faq_items: [],
    scholarship_links: [],
    faq_links: [],
    related_article_links: [],
    schema_json: {},
    cover_image_alt: '',
    cover_image_url: row.cover_image_url,
    status: row.status ?? 'published',
    published_at: row.published_at,
    updated_at: row.updated_at,
    word_count: row.word_count ?? 0,
    char_count: row.char_count ?? 0
  };
}

async function main() {
  if (process.env.I18N_PILOT_ALLOW_DB_WRITES !== '1') {
    console.error('Set I18N_PILOT_ALLOW_DB_WRITES=1');
    process.exit(1);
  }

  if (!process.env.PROD_SUPABASE_URL) loadEnvLocal();
  const prodUrl =
    process.env.PROD_SUPABASE_URL?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const prodKey =
    process.env.PROD_SERVICE_ROLE_KEY?.trim() ??
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const localUrl =
    process.env.LOCAL_SUPABASE_URL?.trim() ?? 'http://127.0.0.1:54321';
  const localKey =
    process.env.LOCAL_SERVICE_ROLE_KEY?.trim() ?? LOCAL_DEMO_SERVICE_ROLE;

  if (
    !prodUrl?.includes('supabase.co') ||
    !prodKey ||
    !localUrl.includes('127.0.0.1') ||
    !localKey
  ) {
    console.error(
      'Need PROD_SUPABASE_URL + PROD_SERVICE_ROLE_KEY (hosted read) and LOCAL_SUPABASE_URL (127.0.0.1) + LOCAL_SERVICE_ROLE_KEY.'
    );
    process.exit(1);
  }

  const prod = createClient<Database>(prodUrl, prodKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const local = createClient(localUrl, localKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data, error } = await prod
    .from('content_posts')
    .select(
      'id, slug, title, status, meta_title, meta_description, body_html, cover_image_url, published_at, updated_at, word_count, char_count'
    )
    .eq('status', 'published')
    .in('slug', [...RESOURCE_PILOT_SLUGS]);

  if (error) throw error;
  if (!data?.length) {
    console.error('No pilot posts returned from prod.');
    process.exit(1);
  }

  const missingSlugs = RESOURCE_PILOT_SLUGS.filter(
    (slug) => !data.some((row) => String(row.slug ?? '').trim() === slug)
  );
  if (missingSlugs.length > 0) {
    console.error(`Prod missing ${missingSlugs.length} pilot slug(s).`);
    process.exit(1);
  }

  const topicId = await ensureLocalPilotTopic(local);
  const rows = (data as ProdPostRow[]).map((row) =>
    normalizePostForLocalSchema(row, topicId)
  );

  const { error: upsertErr } = await local.from('content_posts').upsert(rows, {
    onConflict: 'id'
  });
  if (upsertErr) throw upsertErr;

  console.log(
    `Synced ${rows.length} content_posts to local (topic_id=${topicId}).`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
