import type { SupabaseClient } from '@supabase/supabase-js';
import sharp from 'sharp';

import type { Database } from '@/types_db';

/** Must match `supabase/migrations/*_essay_heroes_storage_bucket.sql`. */
export const ESSAY_HERO_STORAGE_BUCKET = 'essay-heroes';

/** Max width for hero (9:16); enough for retina on typical layouts without shipping full FAL resolution. */
const HERO_MAX_WIDTH_PX = 1200;

/** Muted blues/purples — aligned with Essay Hub palette lock when FAL or ingest fails. */
const FALLBACK_GRADIENT_START = '#3d4a8c';
const FALLBACK_GRADIENT_END = '#5a4d86';

export function sanitizeEssayHeroStorageSlug(slug: string): string {
  const s = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 180);
  return s || 'essay';
}

async function downloadImageBuffer(url: string): Promise<Buffer> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(90_000),
        headers: { Accept: 'image/*' }
      });
      if (!res.ok) {
        throw new Error(`Failed to download hero image: HTTP ${res.status}`);
      }
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      lastErr = e;
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/**
 * Resize + WebP — visually compact vs raw FAL PNG while keeping clean edges (quality 88).
 */
export async function optimizeEssayHeroToWebp(input: Buffer): Promise<Buffer> {
  const maxH = Math.round((HERO_MAX_WIDTH_PX * 16) / 9);
  return sharp(input)
    .rotate()
    .resize({
      width: HERO_MAX_WIDTH_PX,
      height: maxH,
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({
      quality: 88,
      effort: 6,
      smartSubsample: true
    })
    .toBuffer();
}

/**
 * Fetches the temporary FAL URL, compresses to WebP, uploads to Supabase Storage, returns public CDN URL.
 */
export async function ingestFalHeroImageToSupabase(
  supabase: SupabaseClient<Database>,
  opts: { falImageUrl: string; slug: string }
): Promise<string> {
  const safeSlug = sanitizeEssayHeroStorageSlug(opts.slug);
  const path = `${safeSlug}/hero.webp`;

  const raw = await downloadImageBuffer(opts.falImageUrl);
  const webp = await optimizeEssayHeroToWebp(raw);

  const { error } = await supabase.storage.from(ESSAY_HERO_STORAGE_BUCKET).upload(path, webp, {
    contentType: 'image/webp',
    cacheControl: '31536000, immutable',
    upsert: true
  });
  if (error) {
    throw new Error(`Essay hero Storage upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(ESSAY_HERO_STORAGE_BUCKET).getPublicUrl(path);
  const url = data.publicUrl;
  if (!url?.startsWith('http')) {
    throw new Error('Essay hero getPublicUrl returned an invalid URL');
  }
  return url;
}

function heroPortraitDimensions(): { width: number; height: number } {
  const width = HERO_MAX_WIDTH_PX;
  const height = Math.round((HERO_MAX_WIDTH_PX * 16) / 9);
  return { width, height };
}

/**
 * Solid gradient hero (no FAL) — same aspect and bucket path as real heroes so UI/OG stay consistent.
 */
export async function buildFallbackEssayHeroWebpBuffer(): Promise<Buffer> {
  const { width, height } = heroPortraitDimensions();
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="essayHeroFallback" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${FALLBACK_GRADIENT_START}"/>
      <stop offset="100%" stop-color="${FALLBACK_GRADIENT_END}"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#essayHeroFallback)"/>
</svg>`;
  return sharp(Buffer.from(svg)).webp({ quality: 88, effort: 6, smartSubsample: true }).toBuffer();
}

export async function ingestFallbackHeroWebpToSupabase(
  supabase: SupabaseClient<Database>,
  opts: { slug: string }
): Promise<string> {
  const safeSlug = sanitizeEssayHeroStorageSlug(opts.slug);
  const path = `${safeSlug}/hero.webp`;
  const webp = await buildFallbackEssayHeroWebpBuffer();

  const { error } = await supabase.storage.from(ESSAY_HERO_STORAGE_BUCKET).upload(path, webp, {
    contentType: 'image/webp',
    cacheControl: '31536000, immutable',
    upsert: true
  });
  if (error) {
    throw new Error(`Essay hero Storage upload failed (fallback): ${error.message}`);
  }

  const { data } = supabase.storage.from(ESSAY_HERO_STORAGE_BUCKET).getPublicUrl(path);
  const url = data.publicUrl;
  if (!url?.startsWith('http')) {
    throw new Error('Essay hero getPublicUrl returned an invalid URL (fallback)');
  }
  return url;
}

/**
 * Prefer FAL → WebP → Storage; if FAL URL is missing or any step fails, uploads a gradient placeholder
 * so every essay still gets a valid `hero_image_url`.
 */
export async function ingestEssayHeroFromFalOrFallback(
  supabase: SupabaseClient<Database>,
  opts: { falImageUrl: string | null; slug: string }
): Promise<{ url: string; heroIsReal: boolean }> {
  if (opts.falImageUrl?.startsWith('http')) {
    try {
      const url = await ingestFalHeroImageToSupabase(supabase, {
        falImageUrl: opts.falImageUrl,
        slug: opts.slug
      });
      return { url, heroIsReal: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[essay-hero] FAL URL present but ingest failed; using gradient fallback', {
        slug: opts.slug,
        error: msg.slice(0, 500)
      });
    }
  }
  const url = await ingestFallbackHeroWebpToSupabase(supabase, { slug: opts.slug });
  return { url, heroIsReal: false };
}
