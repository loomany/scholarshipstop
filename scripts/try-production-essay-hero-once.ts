/**
 * Один hero строго как в проде: Nano Banana 2, 9:16, 1K, тот же промпт Essay Hub.
 * Пишет public/essay-hero-preview-last.html — карточка как в сетке (aspect 16/10 + object-cover).
 *
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/try-production-essay-hero-once.ts
 */
import { writeFileSync } from 'fs';
import { resolve } from 'path';

import { essayHubArticlePath } from '@/lib/essays/essayHubSection';
import {
  buildEssayHubHeroImagePrompt,
  tryResolveHeroImageUrl
} from '@/lib/essays/runEssayGenerationJob';
import { buildDefaultEssaySlugFromScholarshipTitle } from '@/lib/essays/slugifyEssaySlug';
import { getURL } from '@/utils/helpers';

/** Пример гранта — можно поменять */
const GRANT_TITLE = 'Gabrielle Fritsche & Paige Derenne Memorial Scholarship';
const EXISTING_INDEX = 11;
const GRANT_CATEGORY =
  'education humanities scholarship essay writing undergraduate general';

function buildPreviewHtml(opts: { heroUrl: string; title: string; meta: string }) {
  const safeTitle = opts.title.replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const safeMeta = opts.meta.replace(/</g, '&lt;').replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Essay hub card preview (production hero)</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f8fafc; padding: 24px; margin: 0; }
    .hint { color: #64748b; font-size: 14px; margin-bottom: 16px; max-width: 42rem; line-height: 1.5; }
    .card {
      max-width: 380px;
      border-radius: 1rem;
      border: 1px solid #e5e7eb;
      background: #fff;
      box-shadow: 0 12px 40px -16px rgba(15,23,42,0.12);
      overflow: hidden;
    }
    .media {
      position: relative;
      aspect-ratio: 16 / 10;
      width: 100%;
      overflow: hidden;
      background: #f3f4f6;
    }
    .media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      display: block;
    }
    .body { padding: 1.25rem 1.5rem; }
    .body h2 {
      font-size: 1.125rem;
      font-weight: 700;
      line-height: 1.35;
      margin: 0 0 0.5rem;
      color: #111827;
    }
    .body p {
      font-size: 0.875rem;
      line-height: 1.6;
      color: #4b5563;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .cta { margin-top: 1rem; font-size: 0.875rem; font-weight: 600; color: #ea580c; }
  </style>
</head>
<body>
  <p class="hint">
    Превью как в <code>EssaysGrid</code>: исходник hero 9:16 (Nano Banana 1K), в карточке — <code>aspect-[16/10]</code> + <code>object-cover</code>.
  </p>
  <div class="card">
    <div class="media">
      <img src="${opts.heroUrl}" alt="" width="768" height="480" loading="eager" />
    </div>
    <div class="body">
      <h2>${safeTitle}</h2>
      <p>${safeMeta}</p>
      <div class="cta">Read guide →</div>
    </div>
  </div>
</body>
</html>
`;
}

async function main() {
  const prompt = buildEssayHubHeroImagePrompt({
    existingIndex: EXISTING_INDEX,
    grantTitle: GRANT_TITLE,
    grantCategory: GRANT_CATEGORY
  });

  const heroUrl = await tryResolveHeroImageUrl(prompt);
  if (!heroUrl?.startsWith('http')) {
    throw new Error('tryResolveHeroImageUrl returned no URL (check FAL_KEY and balance)');
  }

  const slug = buildDefaultEssaySlugFromScholarshipTitle(GRANT_TITLE);
  const path = essayHubArticlePath(slug).replace(/^\/+/, '');
  const exampleEssayPageUrl = getURL(path);

  const title = `How to Craft Your Essay for the ${GRANT_TITLE.replace(/ Memorial Scholarship$/i, ' Scholarship')}`;
  const meta =
    'Practical structure and tone tips for this scholarship’s essay prompt—grounded in the listing, with a checklist before you submit.';

  const html = buildPreviewHtml({ heroUrl, title, meta });
  const outPath = resolve(process.cwd(), 'public', 'essay-hero-preview-last.html');
  writeFileSync(outPath, html, 'utf8');

  const localPreview = 'http://localhost:3000/essay-hero-preview-last.html';

  console.log('');
  console.log(JSON.stringify(
    {
      model: 'fal-ai/nano-banana-2',
      aspect_ratio: '9:16',
      resolution: '1K (default; override with FAL_IMAGE_RESOLUTION)',
      hero_image_direct_url: heroUrl,
      example_essay_page_url_if_published_with_default_slug: exampleEssayPageUrl,
      slug_used_for_example: slug,
      local_card_preview_open_in_browser: localPreview,
      preview_file_written: outPath
    },
    null,
    2
  ));
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
