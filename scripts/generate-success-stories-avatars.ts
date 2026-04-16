/**
 * Generate 10 testimonial avatars for the home Success Stories carousel via Fal
 * `fal-ai/nano-banana-2` (same stack as `generate-featured-home-brand-logos.ts`).
 *
 * Style: one coherent “photo session” — soft natural library/campus light, blurred neutral
 * background (light grey / warm cream), calm genuine smile, premium minimal “Nana Banana 2 Pro” look.
 * Diverse faces (India, Nigeria, China, Brazil, USA, Middle East, Eastern Europe, etc.).
 *
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/generate-success-stories-avatars.ts
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/generate-success-stories-avatars.ts --limit=2
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/generate-success-stories-avatars.ts --skip-existing
 *
 * Requires: FAL_KEY
 *
 * Output: public/images/success-stories/avatar-{slug}.webp (512×512, quality 90)
 *
 * ---
 * Series prompt (prepend mentally to every row below):
 * "Photo-realistic close-up portrait of a university student, genuine confident calm smile, eye contact,
 * soft natural side light like a modern library or campus study hall. Background: uniform soft bokeh,
 * neutral light grey to warm cream, not busy. Minimalist trustworthy look, realistic skin texture,
 * not plastic-smoothed. Shot on Canon R5, 50mm f/1.8, shallow depth of field. Nana Banana 2 Pro aesthetic,
 * premium editorial, clean bright mood."
 *
 * Per-avatar prompts (1:1 headshot, shoulders visible at most):
 */
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

import sharp from 'sharp';

import { extractImageUrlFromFalJson } from '@/lib/fal/extractImageUrlFromFalJson';

const MODEL = 'fal-ai/nano-banana-2' as const;
const ENDPOINT = `https://fal.run/${MODEL}`;

const OUT_DIR = join(process.cwd(), 'public', 'images', 'success-stories');

const JOBS: { slug: string; prompt: string }[] = [
  {
    slug: 'alex-r',
    prompt:
      'Young Black American man, early 20s, computer science major energy, small thin wire-frame glasses, ' +
      'subtle proud smile, hoodie under open shirt. Same series lighting. Scholarship winner vibe, approachable genius.'
  },
  {
    slug: 'maria-l',
    prompt:
      'Young Latina woman from Brazil, tech major, neat ponytail, warm confident smile, small hoop earrings. ' +
      'Same soft library light and neutral blurred background. International student, hopeful and capable.'
  },
  {
    slug: 'david-k',
    prompt:
      'Young East Asian man, Chinese heritage, STEM student, crewneck sweater, calm focused smile, ' +
      'no props. Same session look: cream-grey bokeh, natural skin texture, trustworthy research energy.'
  },
  {
    slug: 'sophia-n',
    prompt:
      'Young Indian woman, fine arts / design student, light scarf, gentle authentic smile, small bindi optional subtle. ' +
      'Creative but disciplined look. Same premium minimal portrait style and lighting.'
  },
  {
    slug: 'james-w',
    prompt:
      'Young white American man, community volunteer aesthetic, simple jacket with subtle enamel pin, ' +
      'friendly grounded smile. Same neutral background, campus-organizer authenticity.'
  },
  {
    slug: 'aisha-m',
    prompt:
      'Young Nigerian woman, pre-med energy, elegant hijab, bright sincere eyes, minimal makeup. ' +
      'Same soft daylight and blurred neutral interior. Confident merit-student presence.'
  },
  {
    slug: 'omar-h',
    prompt:
      'Young Middle Eastern man, athletic build, varsity crewneck, relaxed proud smile, short beard neatly trimmed. ' +
      'Same cohesive lighting series, athletic-scholar blend.'
  },
  {
    slug: 'elena-v',
    prompt:
      'Young Eastern European woman, STEM, glasses pushed up on hair, messy bun, natural laugh lines, ' +
      'warm intelligent smile. Same library-like soft light and cream-grey backdrop.'
  },
  {
    slug: 'jennifer-k',
    prompt:
      'Woman in her late 40s, proud parent of a scholar, professional casual blouse, pearl studs, ' +
      'relieved grateful smile, warm eyes. Same lighting; slightly more mature but same premium minimal session.'
  },
  {
    slug: 'tyler-b',
    prompt:
      'Young Black American man, business-casual shirt, short neat curls, subtle gold stud earring, ' +
      'confident half-smile. Tech + business energy. Same session: clean, bright, trustworthy.'
  }
];

const SERIES_PREFIX =
  'Photo-realistic close-up portrait, university-age, genuine calm smile, eye contact, soft natural library/campus ' +
  'lighting, blurred uniform neutral background light grey to warm cream, realistic skin texture not airbrushed, ' +
  'Canon R5 50mm f/1.8 shallow DOF, premium minimal editorial, Nana Banana 2 Pro aesthetic. ';

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

async function main() {
  const skipExisting = process.argv.includes('--skip-existing');
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Math.max(1, Number.parseInt(limitArg.split('=')[1] || '0', 10) || 0) : 0;

  await mkdir(OUT_DIR, { recursive: true });

  let jobs = [...JOBS];
  if (limit > 0) jobs = jobs.slice(0, limit);

  if (skipExisting) {
    jobs = jobs.filter((j) => {
      const p = join(OUT_DIR, `avatar-${j.slug}.webp`);
      return !existsSync(p);
    });
    console.error(`After --skip-existing: ${jobs.length} job(s) remaining`);
  }

  let n = 0;
  for (const job of jobs) {
    n += 1;
    const prompt = `${SERIES_PREFIX}${job.prompt}`.slice(0, 3800);
    const falBody: Record<string, unknown> = {
      prompt,
      num_images: 1,
      aspect_ratio: '1:1',
      resolution: '1K',
      limit_generations: true,
      enable_web_search: false
    };

    console.error(`→ [${n}/${jobs.length}] Fal ${MODEL} (1:1): avatar-${job.slug}.webp`);
    const imageUrl = await withRetries(() => falNanoOnce(falBody), job.slug);
    const raw = await withRetries(() => downloadBuffer(imageUrl), `dl ${job.slug}`);
    const webp = await sharp(raw)
      .rotate()
      .resize(512, 512, { fit: 'cover', position: 'attention' })
      .webp({ quality: 90, effort: 4 })
      .toBuffer();
    const outPath = join(OUT_DIR, `avatar-${job.slug}.webp`);
    await writeFile(outPath, webp);
    console.error(`  saved ${outPath} (${webp.length} bytes)`);

    await new Promise((r) => setTimeout(r, 450));
  }

  console.error(`Done. ${jobs.length} avatar(s) in ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
