/**
 * Один hero через FLUX.1 [dev] с тем же промптом Essay Hub, что и Nano Banana.
 * Размер 16:9 — как на странице гайда (`app/essays/[slug]/page.tsx` → `aspect-[16/9]`).
 *
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/try-flux1-essay-hero-once.ts
 */
import { writeFileSync } from 'fs';
import { resolve } from 'path';

import { buildEssayHubHeroImagePrompt } from '@/lib/essays/runEssayGenerationJob';

const FLUX_DEV = 'fal-ai/flux/dev';

/** Как в try-production-essay-hero-once.ts — тот же грант / индекс сцены */
const GRANT_TITLE = 'Gabrielle Fritsche & Paige Derenne Memorial Scholarship';
const EXISTING_INDEX = 11;
const GRANT_CATEGORY =
  'education humanities scholarship essay writing undergraduate general';

function extractUrl(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const images = d.images;
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0];
    if (first && typeof first === 'object') {
      const u = (first as Record<string, unknown>).url;
      if (typeof u === 'string' && u.startsWith('http')) return u;
    }
  }
  return null;
}

async function main() {
  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    throw new Error('FAL_KEY missing in env (.env.local)');
  }

  const prompt = buildEssayHubHeroImagePrompt({
    existingIndex: EXISTING_INDEX,
    grantTitle: GRANT_TITLE,
    grantCategory: GRANT_CATEGORY
  });

  /** 16:9, ~0.92 MP — соответствует блоку hero на странице гайда */
  const body = {
    prompt: prompt.slice(0, 8000),
    image_size: { width: 1280, height: 720 },
    num_inference_steps: 28,
    guidance_scale: 3.5,
    num_images: 1,
    enable_safety_checker: true,
    output_format: 'jpeg' as const
  };

  const endpoint = `https://fal.run/${FLUX_DEV}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Key ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const json = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    console.error(JSON.stringify(json, null, 2));
    throw new Error(`FAL HTTP ${res.status}`);
  }

  const url = extractUrl(json);
  if (!url) {
    console.error(JSON.stringify(json, null, 2));
    throw new Error('No image URL in FAL response');
  }

  const title =
    'How to Craft Your Essay for the Gabrielle Fritsche & Paige Derenne Scholarship';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FLUX hero — article 16:9 preview</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #fff; padding: 24px; margin: 0; max-width: 48rem; margin-inline: auto; }
    .hint { color: #64748b; font-size: 14px; margin-bottom: 16px; line-height: 1.5; }
    h1 { font-size: 1.5rem; font-weight: 700; color: #111; line-height: 1.25; }
    .meta { margin-top: 12px; font-size: 12px; color: #4b5563; border-left: 2px solid #c7d2fe; padding-left: 10px; }
    .hero {
      margin-top: 24px;
      overflow: hidden;
      border-radius: 1rem;
      border: 1px solid #e5e7eb;
      background: #f3f4f6;
    }
    .hero img {
      width: 100%;
      aspect-ratio: 16 / 9;
      object-fit: cover;
      display: block;
    }
  </style>
</head>
<body>
  <p class="hint">Превью как на странице гайда: hero <strong>16:9</strong>, модель <strong>FLUX.1 [dev]</strong>, промпт Essay Hub.</p>
  <h1>${title.replace(/</g, '&lt;')}</h1>
  <p class="meta">Written by ScholarshipTop AI • Reviewed by Editorial Team</p>
  <div class="hero">
    <img src="${url}" alt="" width="1280" height="720" loading="eager" />
  </div>
</body>
</html>`;

  const outPath = resolve(process.cwd(), 'public', 'essay-hero-flux-article-preview.html');
  writeFileSync(outPath, html, 'utf8');

  console.log('');
  console.log(
    JSON.stringify(
      {
        model: 'fal-ai/flux/dev',
        image_size: '1280x720 (16:9)',
        flux_pricing_note: '~$0.025 per MP on fal; this request ~0.92 MP',
        hero_image_url: url,
        article_layout_preview: 'http://localhost:3000/essay-hero-flux-article-preview.html',
        preview_file: outPath
      },
      null,
      2
    )
  );
  console.log('');
  console.log('--- prompt preview (first 600 chars) ---');
  console.log(prompt.slice(0, 600) + (prompt.length > 600 ? '…' : ''));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
