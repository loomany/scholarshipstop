/**
 * Compare DB-backed SEO fields with rendered HTML for a small sample of URLs.
 *
 * Configure `SEO_RUNTIME_SYNC_SAMPLES` as JSON, e.g.
 * [{"kind":"essay","path":"/essays/your-slug"},{"kind":"article","path":"/resources/your-slug"}]
 *
 * Run: `dotenv -e .env.local -- npx tsx scripts/seo-verify-runtime-sync.ts`
 *
 * Exit: 0 if all pass or no samples; 1 if any mismatch or fetch error for a sample.
 */
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types_db';
import { SITE_BRAND } from '../lib/seo/siteTitle';
import { createPublicClient } from '../utils/supabase/public';

type SampleKind = 'essay' | 'article' | 'provider' | 'compare_university' | 'compare_state';

type Sample = { kind: SampleKind; path: string };

function normalizeWs(s: string | null | undefined): string {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

function parseTitleTag(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m?.[1] ? normalizeWs(m[1].replace(/<[^>]+>/g, '')) : null;
}

function parseMetaDescription(html: string): string | null {
  const re =
    /<meta[^>]+name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i;
  const m = html.match(re);
  if (m?.[1]) return normalizeWs(m[1]);
  const og = html.match(
    /<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']+)["'][^>]*>/i
  );
  return og?.[1] ? normalizeWs(og[1]) : null;
}

async function fetchHtmlTitleMeta(
  baseUrl: string,
  urlPath: string
): Promise<{ title: string | null; meta: string | null }> {
  const url = `${baseUrl.replace(/\/+$/, '')}${urlPath.startsWith('/') ? urlPath : `/${urlPath}`}`;
  const res = await fetch(url, { method: 'GET', redirect: 'follow' });
  if (!res.ok) throw new Error(`fetch_${res.status}`);
  const html = await res.text();
  return { title: parseTitleTag(html), meta: parseMetaDescription(html) };
}

async function loadExpectedFromDb(sample: Sample): Promise<{ title: string; meta: string } | null> {
  const pub = createPublicClient();
  if (pub) {
    if (sample.kind === 'essay') {
      const slug = decodeURIComponent(sample.path.replace(/^\/essays\//, '')).trim();
      const { data } = await pub
        .from('essays')
        .select('title, meta_description')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();
      if (!data?.title) return null;
      return {
        title: normalizeWs(data.title),
        meta: normalizeWs(data.meta_description ?? '')
      };
    }
    if (sample.kind === 'article') {
      const slug = decodeURIComponent(sample.path.replace(/^\/resources\//, '')).trim();
      const { data } = await pub
        .from('content_posts')
        .select('title, meta_title, meta_description')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();
      if (!data) return null;
      const title = normalizeWs(data.meta_title ?? data.title ?? '');
      return { title, meta: normalizeWs(data.meta_description ?? '') };
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  const db = createClient<Database>(url, key, { auth: { persistSession: false } });

  if (sample.kind === 'provider') {
    const slug = decodeURIComponent(sample.path.replace(/^\/providers\//, '')).trim();
    const { data } = await db
      .from('provider_hub_listing')
      .select('display_name, ai_description')
      .eq('slug', slug)
      .maybeSingle();
    if (!data?.display_name) return null;
    const displayName = normalizeWs(data.display_name);
    let meta =
      normalizeWs(data.ai_description ?? '') ||
      `Scholarships and profile for ${displayName} on ScholarshipTop.`;
    const singleLine = meta.replace(/\s+/g, ' ').trim();
    meta =
      singleLine.length <= 160
        ? singleLine
        : `${singleLine.slice(0, 157).trimEnd()}...`;
    return { title: `${displayName} | Scholarship Provider`, meta };
  }

  if (sample.kind === 'compare_university') {
    const slug = decodeURIComponent(sample.path.replace(/^\/compare\/universities\//, '')).trim();
    const { data } = await db
      .from('compare_pages')
      .select('meta_title, meta_description')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();
    if (!data) return null;
    return {
      title: normalizeWs(data.meta_title ?? ''),
      meta: normalizeWs(data.meta_description ?? '')
    };
  }

  if (sample.kind === 'compare_state') {
    const slug = decodeURIComponent(sample.path.replace(/^\/compare\/states\//, '')).trim();
    const { data } = await db
      .from('state_compare_pages')
      .select('meta_title, meta_description')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();
    if (!data) return null;
    return {
      title: normalizeWs(data.meta_title ?? ''),
      meta: normalizeWs(data.meta_description ?? '')
    };
  }

  return null;
}

function parseSamples(): Sample[] {
  const raw = process.env.SEO_RUNTIME_SYNC_SAMPLES?.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: Sample[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== 'object') continue;
      const o = row as Record<string, unknown>;
      const kind = o.kind;
      const path = o.path;
      if (
        kind === 'essay' ||
        kind === 'article' ||
        kind === 'provider' ||
        kind === 'compare_university' ||
        kind === 'compare_state'
      ) {
        if (typeof path === 'string' && path.startsWith('/')) {
          out.push({ kind, path: path.replace(/\/+$/, '') || '/' });
        }
      }
    }
    return out;
  } catch {
    return [];
  }
}

async function main(): Promise<void> {
  const baseUrl =
    process.env.SEO_AUDIT_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    'http://localhost:3000';

  const samples = parseSamples();
  if (samples.length === 0) {
    console.log(
      '[seo:verify:runtime-sync] No SEO_RUNTIME_SYNC_SAMPLES set; skipping (exit 0). Example:\n' +
        `  SEO_RUNTIME_SYNC_SAMPLES='[{"kind":"essay","path":"/essays/your-slug"}]'`
    );
    process.exit(0);
  }

  function titlesEquivalent(htmlTitle: string | null, dbTitle: string): boolean {
    if (!htmlTitle) return false;
    const h = normalizeWs(htmlTitle);
    const t = normalizeWs(dbTitle);
    return h === t || h === normalizeWs(`${SITE_BRAND} | ${t}`);
  }

  function metaEquivalent(
    kind: SampleKind,
    htmlMeta: string | null,
    dbMeta: string
  ): boolean {
    if (!htmlMeta || !dbMeta) return false;
    const h = normalizeWs(htmlMeta);
    const d = normalizeWs(dbMeta);
    if (h === d) return true;
    if (kind === 'compare_university' || kind === 'compare_state') {
      return h.slice(0, 48) === d.slice(0, 48);
    }
    return false;
  }

  let failed = false;
  for (const s of samples) {
    const label = `${s.kind} ${s.path}`;
    try {
      const db = await loadExpectedFromDb(s);
      if (!db) {
        console.log(`[seo:verify:runtime-sync] SKIP ${label} (no DB row or missing Supabase env)`);
        continue;
      }
      const html = await fetchHtmlTitleMeta(baseUrl, s.path);
      const titleMatch = titlesEquivalent(html.title, db.title);
      const metaMatch = metaEquivalent(s.kind, html.meta, db.meta);
      if (titleMatch && metaMatch) {
        console.log(`[seo:verify:runtime-sync] PASS ${label}`);
      } else {
        failed = true;
        console.log(`[seo:verify:runtime-sync] FAIL ${label}`, {
          dbTitle: db.title.slice(0, 120),
          htmlTitle: html.title,
          dbMeta: db.meta.slice(0, 120),
          htmlMeta: html.meta
        });
      }
    } catch (e) {
      failed = true;
      console.log(`[seo:verify:runtime-sync] FAIL ${label}`, {
        error: e instanceof Error ? e.message : String(e)
      });
    }
  }

  process.exit(failed ? 1 : 0);
}

void main();
