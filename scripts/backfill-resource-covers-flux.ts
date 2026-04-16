/**
 * Backfill missing `content_posts.cover_image_url` for published Resources using
 * Fal FLUX.1 [dev] (same as `lib/content-hub/resourceCoverFromFlux.ts`) + Storage upload.
 *
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/backfill-resource-covers-flux.ts --dry-run
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/backfill-resource-covers-flux.ts --limit=10
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FAL_KEY;
 * optional: FLUX_HERO_*, FAL_HERO_* (see `lib/fal/postFluxDevImageOnce.ts`).
 */
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

import { tryResolveResourceCoverImageUrlWithMeta } from '@/lib/content-hub/resourceCoverFromFlux';
import type { Database } from '@/types_db';

const BUCKET = 'content-images';
const COVER_W = 1280;
const COVER_H = 720;
const JPEG_QUALITIES = [82, 78, 74] as const;
const MAX_BYTES = 500 * 1024;

function argFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function argNum(name: string, defaultValue: number): number {
  const raw = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!raw) return defaultValue;
  const n = Number.parseInt(raw.split('=')[1] ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? n : defaultValue;
}

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  return createClient<Database>(url, key);
}

function buildCoverPrompt(title: string, meta: string | null): string {
  const t = title.trim() || 'Scholarships guide';
  const m = (meta ?? '').replace(/\s+/g, ' ').trim().slice(0, 400);
  return [
    `Editorial hero image for an educational article about: ${t}.`,
    m ? `Context: ${m}` : '',
    'Modern, clean university or study environment; realistic documentary photography; soft natural light; shallow depth of field; premium EdTech polish.',
    'Palette: subtle blues and soft purples in the scene, cohesive and muted.',
    'Hard bans: NO text, NO letters, NO logos, NO watermark on the image.'
  ]
    .filter(Boolean)
    .join(' ');
}

async function imageBufferToCoverJpeg(buf: Buffer): Promise<Buffer> {
  const meta = await sharp(buf).metadata();
  const hasAlpha = Boolean(meta.hasAlpha);
  let out: Buffer | null = null;
  for (const q of JPEG_QUALITIES) {
    let p = sharp(buf).rotate().resize(COVER_W, COVER_H, {
      fit: 'cover',
      position: 'centre'
    });
    if (hasAlpha) p = p.flatten({ background: '#ffffff' });
    const candidate = await p.jpeg({ quality: q, mozjpeg: true, chromaSubsampling: '4:2:0' }).toBuffer();
    out = candidate;
    if (candidate.byteLength <= MAX_BYTES) break;
  }
  return out!;
}

async function main() {
  const dryRun = argFlag('dry-run');
  const limit = argNum('limit', 0);

  const supabase = serviceSupabase();

  const { data: rows, error } = await supabase
    .from('content_posts')
    .select('id, slug, title, meta_description, cover_image_url, status')
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false });

  if (error) throw new Error(error.message);

  const missing = (rows ?? []).filter((r) => {
    const u = r.cover_image_url?.trim();
    return !u && r.slug?.trim();
  });

  const toProcess = limit > 0 ? missing.slice(0, limit) : missing;

  console.log(
    JSON.stringify(
      {
        published_missing_cover_total: missing.length,
        will_process: toProcess.length,
        dryRun
      },
      null,
      2
    )
  );

  if (dryRun) {
    console.log('slugs:', toProcess.map((r) => r.slug));
    return;
  }

  const day = new Date().toISOString().slice(0, 10);

  for (const row of toProcess) {
    const slug = row.slug!.trim();
    const title = row.title?.trim() ?? slug;
    const prompt = buildCoverPrompt(title, row.meta_description);
    const meta = await tryResolveResourceCoverImageUrlWithMeta(prompt);
    if (!meta.url) {
      console.error(JSON.stringify({ slug, ok: false, detail: meta.detail, httpStatus: meta.httpStatus }));
      continue;
    }

    const res = await fetch(meta.url);
    if (!res.ok) {
      console.error(JSON.stringify({ slug, ok: false, step: 'download', status: res.status }));
      continue;
    }
    const raw = Buffer.from(await res.arrayBuffer());
    let jpeg: Buffer;
    try {
      jpeg = await imageBufferToCoverJpeg(raw);
    } catch (e) {
      console.error(JSON.stringify({ slug, ok: false, step: 'sharp', err: e instanceof Error ? e.message : String(e) }));
      continue;
    }

    const safeSlug = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 120) || 'post';
    const fileName = `${safeSlug}-cover-${Date.now()}.jpg`;
    const path = `content-hub/${day}/${fileName}`;

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, jpeg, {
      contentType: 'image/jpeg',
      upsert: true,
      cacheControl: '31536000'
    });
    if (upErr) {
      console.error(JSON.stringify({ slug, ok: false, step: 'storage', message: upErr.message }));
      continue;
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = pub.publicUrl;
    if (!publicUrl?.startsWith('http')) {
      console.error(JSON.stringify({ slug, ok: false, step: 'publicUrl' }));
      continue;
    }

    const { error: upPost } = await supabase
      .from('content_posts')
      .update({
        cover_image_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', row.id);

    if (upPost) {
      console.error(JSON.stringify({ slug, ok: false, step: 'db', message: upPost.message }));
      continue;
    }

    console.log(JSON.stringify({ slug, ok: true, cover_image_url: publicUrl }));
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
