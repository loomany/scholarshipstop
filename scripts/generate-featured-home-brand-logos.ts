/**
 * Generate monochrome brand marks for every **unique** `brandDomain` in
 * `FEATURED_BRAND_SCHOLARSHIPS_ALL` via Fal `fal-ai/nano-banana-2` (square 1:1).
 * Writes `public/images/featured-brands/domains/{key}.webp`.
 *
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/generate-featured-home-brand-logos.ts
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/generate-featured-home-brand-logos.ts --strip-only
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/generate-featured-home-brand-logos.ts --skip-existing
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/generate-featured-home-brand-logos.ts --limit 3
 *
 * Requires: FAL_KEY
 */
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

import sharp from 'sharp';

import { FEATURED_BRAND_SCHOLARSHIPS_ALL } from '@/lib/home/featuredBrandScholarshipsData';
import { brandDomainToLogoFileKey } from '@/lib/home/featuredBrandHomeLogos';
import { extractImageUrlFromFalJson } from '@/lib/fal/extractImageUrlFromFalJson';

const OUT_ROOT = join(process.cwd(), 'public', 'images', 'featured-brands');
const OUT_DOMAINS = join(OUT_ROOT, 'domains');

const MODEL = 'fal-ai/nano-banana-2' as const;
const ENDPOINT = `https://fal.run/${MODEL}`;

/** Flat logo tile — UI adds its own frame; do not bake glow/borders into pixels. */
const BASE_SQUARE =
  'Premium scholarship website UI asset, square 1:1 composition. ' +
  'Monochromatic company logo only: solid dark charcoal / black on a **flat** pure white background (full bleed, no vignette). ' +
  'The mark centered with comfortable padding. ' +
  '**No** cyan, teal, mint, or green glow or halo. **No** gradient border, **no** outer decorative frame, **no** nested square inside square, **no** double outline, **no** colored ring around the logo. ' +
  'Clean vector-like edges, no photo texture, no extra text beyond the brand wordmark/symbol. ' +
  'No watermarks, high contrast.';

const STRIP_PROMPT =
  'Horizontal row of exactly three equal **square** rounded-corner badges on pure white background, generous spacing. ' +
  'Left to right: AMD mark, Google G mark, Microsoft four-square mark. ' +
  'Each tile: **flat** white fill only — **no** cyan/mint/teal glow, **no** gradient halos, **no** nested frames; optional subtle light gray border at most. Monochromatic dark gray/black logos. ' +
  'Premium SaaS aesthetic, no text labels, no watermarks, no UI chrome.';

async function falNanoOnce(body: Record<string, unknown>): Promise<string> {
  const key = process.env.FAL_KEY?.trim();
  if (!key) throw new Error('FAL_KEY missing (.env.local)');

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Key ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000)
  });
  const json = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const raw = json && typeof json === 'object' ? JSON.stringify(json).slice(0, 800) : String(json);
    throw new Error(`FAL HTTP ${res.status}: ${raw}`);
  }
  const url = extractImageUrlFromFalJson(json);
  if (!url) throw new Error(`No image URL in FAL response: ${JSON.stringify(json).slice(0, 600)}`);
  return url;
}

async function downloadBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`Download failed ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function withRetries<T>(fn: () => Promise<T>, label: string, maxAttempts = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i < maxAttempts - 1) {
        const ms = 1200 * 2 ** i + Math.floor(Math.random() * 400);
        console.error(`  ${label}: retry ${i + 2}/${maxAttempts} in ${ms}ms…`);
        await new Promise((r) => setTimeout(r, ms));
      }
    }
  }
  throw last;
}

function uniqueBrandJobs(): { key: string; brandName: string; brandDomain: string }[] {
  const map = new Map<string, { brandName: string; brandDomain: string }>();
  for (const row of FEATURED_BRAND_SCHOLARSHIPS_ALL) {
    const key = brandDomainToLogoFileKey(row.brandDomain);
    if (!map.has(key)) {
      map.set(key, { brandName: row.brandName, brandDomain: row.brandDomain });
    }
  }
  return [...map.entries()].map(([key, v]) => ({ key, ...v }));
}

async function main() {
  const stripOnly = process.argv.includes('--strip-only');
  const skipExisting = process.argv.includes('--skip-existing');
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Math.max(1, Number.parseInt(limitArg.split('=')[1] || '0', 10) || 0) : 0;

  await mkdir(OUT_DOMAINS, { recursive: true });
  await mkdir(OUT_ROOT, { recursive: true });

  if (stripOnly) {
    const falBody: Record<string, unknown> = {
      prompt: STRIP_PROMPT.slice(0, 3800),
      num_images: 1,
      aspect_ratio: '16:9',
      resolution: '1K',
      limit_generations: true,
      enable_web_search: false
    };
    console.error(`→ Fal ${MODEL} (16:9): strip.webp`);
    const imageUrl = await withRetries(() => falNanoOnce(falBody), 'strip');
    const raw = await withRetries(() => downloadBuffer(imageUrl), 'download strip');
    const webp = await sharp(raw).rotate().webp({ quality: 90, effort: 4 }).toBuffer();
    const outPath = join(OUT_ROOT, 'strip.webp');
    await writeFile(outPath, webp);
    console.error(`  saved ${outPath} (${webp.length} bytes)`);
    console.error('Done.');
    return;
  }

  let jobs = uniqueBrandJobs();
  if (limit > 0) jobs = jobs.slice(0, limit);

  if (skipExisting) {
    jobs = jobs.filter((j) => {
      const p = join(OUT_DOMAINS, `${j.key}.webp`);
      return !existsSync(p);
    });
    console.error(`After --skip-existing: ${jobs.length} job(s) remaining`);
  }

  let n = 0;
  for (const job of jobs) {
    n += 1;
    const prompt = `${BASE_SQUARE} Brand: ${job.brandName}. Domain context: ${job.brandDomain}. Single recognizable brand mark.`.slice(
      0,
      3800
    );
    const falBody: Record<string, unknown> = {
      prompt,
      num_images: 1,
      aspect_ratio: '1:1',
      resolution: '1K',
      limit_generations: true,
      enable_web_search: false
    };

    console.error(`→ [${n}/${jobs.length}] Fal ${MODEL} (1:1): domains/${job.key}.webp (${job.brandName})`);
    const imageUrl = await withRetries(() => falNanoOnce(falBody), job.key);
    const raw = await withRetries(() => downloadBuffer(imageUrl), `dl ${job.key}`);
    const webp = await sharp(raw).rotate().webp({ quality: 90, effort: 4 }).toBuffer();
    const outPath = join(OUT_DOMAINS, `${job.key}.webp`);
    await writeFile(outPath, webp);
    console.error(`  saved ${outPath} (${webp.length} bytes)`);

    await new Promise((r) => setTimeout(r, 450));
  }

  console.error(`Done. ${jobs.length} domain logo(s) in /images/featured-brands/domains/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
