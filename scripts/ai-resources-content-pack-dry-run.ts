/**
 * Read-only dry-run for AI resources content pack.
 *
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/ai-resources-content-pack-dry-run.ts
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';
import {
  AI_RESOURCES_CATEGORY_ID,
  AI_RESOURCES_PACK_ID,
  type AiResourcesPackFile
} from '@/lib/content-hub/aiResourcesPackShared';
import {
  RESOURCE_CATEGORIES,
  RESOURCE_CATEGORY_ORDER
} from '@/lib/content-hub/resourceTaxonomy';
import resourceArticleClassification from '@/data/resource-article-classification.json';

const PACK_PATH = path.join(
  process.cwd(),
  'data/content/ai-resources-topics-2026-05-21.json'
);
const REPORT_PATH = path.join(
  process.cwd(),
  'reports/seo/ai-resources-dry-run-2026-05-21.json'
);
const SITE_BASE = 'https://scholarshiptop.com';

/** Heuristic $/1M tokens (no API calls). */
const EST_SEO_INPUT = 800;
const EST_SEO_OUTPUT = 600;
const EST_ARTICLE_INPUT = 2500;
const EST_ARTICLE_OUTPUT = 4500;
const EST_EXPANSION_CALLS = 0.35;
const COST_MINI_IN = 0.4;
const COST_MINI_OUT = 1.6;
const COST_SMART_IN = 2;
const COST_SMART_OUT = 8;

function optionalSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}

function estimateCostUsd(articleCount: number): {
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedUsdMin: number;
  estimatedUsdMax: number;
} {
  const calls = articleCount * (1 + EST_EXPANSION_CALLS);
  const seoIn = articleCount * EST_SEO_INPUT;
  const seoOut = articleCount * EST_SEO_OUTPUT;
  const artIn = calls * EST_ARTICLE_INPUT;
  const artOut = calls * EST_ARTICLE_OUTPUT;
  const input = seoIn + artIn;
  const output = seoOut + artOut;
  const usdLow =
    (seoIn / 1e6) * COST_MINI_IN +
    (seoOut / 1e6) * COST_MINI_OUT +
    (artIn / 1e6) * COST_SMART_IN +
    (artOut / 1e6) * COST_SMART_OUT;
  const usdHigh = usdLow * 1.35;
  return {
    estimatedInputTokens: Math.round(input),
    estimatedOutputTokens: Math.round(output),
    estimatedUsdMin: Math.round(usdLow * 100) / 100,
    estimatedUsdMax: Math.round(usdHigh * 100) / 100
  };
}

async function main() {
  const raw = await fs.readFile(PACK_PATH, 'utf8');
  const pack = JSON.parse(raw) as AiResourcesPackFile;
  const slugs = pack.topics.map((t) => t.slug);
  const classification = resourceArticleClassification as Record<
    string,
    { categoryId: string; subcategoryId: string }
  >;

  const aiCategoryLast =
    RESOURCE_CATEGORY_ORDER[RESOURCE_CATEGORY_ORDER.length - 1] ===
    AI_RESOURCES_CATEGORY_ID;
  const aiCategoryPresent = RESOURCE_CATEGORIES.some((c) => c.id === 'ai');

  const missingClassification = slugs.filter(
    (s) => classification[s]?.categoryId !== AI_RESOURCES_CATEGORY_ID
  );

  const articles = pack.topics.map((t) => {
    const url = `${SITE_BASE}/resources/${t.slug}`;
    const hubFilter = `${SITE_BASE}/resources?cat=ai`;
    const classEntry = classification[t.slug];
    return {
      title: t.title,
      slug: t.slug,
      category: t.category,
      subcategoryId: t.subcategoryId,
      primaryKeyword: t.primaryKeyword,
      plannedUrl: url,
      classificationOverride: classEntry ?? null,
      sitemapEligibleWhenPublished: true,
      sitemapEligibleNow: false
    };
  });

  const slugStatus: Record<
    string,
    {
      contentPostExists: boolean;
      contentPostStatus: string | null;
      queuedTopicExists: boolean;
      relatedSlugNote: string | null
    }
  > = {};

  const supabase = optionalSupabase();
  if (supabase) {
    const { data: posts, error: postsErr } = await supabase
      .from('content_posts')
      .select('slug, status')
      .in('slug', slugs);
    if (postsErr) throw new Error(postsErr.message);

    const postBySlug = new Map((posts ?? []).map((p) => [p.slug, p.status]));

    const { data: topics, error: topicsErr } = await supabase
      .from('content_topics')
      .select('topic, status')
      .eq('status', 'queued');
    if (topicsErr) throw new Error(topicsErr.message);

    const queuedSlugs = new Set<string>();
    for (const row of topics ?? []) {
      const m = String(row.topic).match(/slug=([^|]+)/);
      if (m?.[1]) queuedSlugs.add(m[1]);
    }

    const relatedNotes: Record<string, string> = {
      'scholarshiptop-vs-fastweb':
        'DB may contain scholarshiptop-vs-fastweb-international-students (different slug)'
    };

    for (const slug of slugs) {
      slugStatus[slug] = {
        contentPostExists: postBySlug.has(slug),
        contentPostStatus: postBySlug.get(slug) ?? null,
        queuedTopicExists: queuedSlugs.has(slug),
        relatedSlugNote: relatedNotes[slug] ?? null
      };
    }
  } else {
    for (const slug of slugs) {
      slugStatus[slug] = {
        contentPostExists: false,
        contentPostStatus: null,
        queuedTopicExists: false,
        relatedSlugNote: null
      };
    }
  }

  const cost = estimateCostUsd(slugs.length);

  const report = {
    generatedAt: new Date().toISOString(),
    packId: pack.packId,
    source: pack.source,
    category: AI_RESOURCES_CATEGORY_ID,
    topicCount: slugs.length,
    dryRun: true,
    openAiGenerationExecuted: false,
    dbWritesExecuted: false,
    supabaseQueried: Boolean(supabase),
    taxonomy: {
      aiCategoryPresent,
      aiCategoryLast,
      categoryOrder: RESOURCE_CATEGORY_ORDER
    },
    classification: {
      overridesForPack: slugs.filter((s) => classification[s]?.categoryId === 'ai')
        .length,
      missingOrWrong: missingClassification
    },
    targetTables: ['content_topics', 'content_posts', 'content-images'],
    plannedHubFilterUrl: `${SITE_BASE}/resources?cat=ai`,
    plannedUrls: articles.map((a) => a.plannedUrl),
    articles,
    slugStatus,
    costEstimate: {
      ...cost,
      note: 'Heuristic only; no OpenAI calls in dry-run',
      modelAssumptions: {
        seo: 'gpt-4.1-mini',
        article: 'gpt-4.1',
        expansionFactor: EST_EXPANSION_CALLS
      }
    },
    generationCommandAfterApproval: [
      'CONTENT_HUB_ALLOW_PRODUCTION_WRITES=1 CONTENT_HUB_SOURCE=ai-resources-2026-05-21 npx tsx scripts/seed-ai-resources-topics.ts --write',
      'cd services/content-hub && npm run build',
      'CONTENT_HUB_ALLOW_PRODUCTION_WRITES=1 CONTENT_HUB_BATCH_LIMIT=30 CONTENT_HUB_SOURCE=ai-resources-2026-05-21 CONTENT_HUB_POSTS_PER_RUN=30 CONTENT_HUB_AUTO_PUBLISH=0 npm run content:run-once'
    ],
    publishCommandAfterApproval:
      'npx dotenv-cli -e .env.local -- npx tsx scripts/publish-unpublished-content.ts --dry-run'
  };

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nWrote ${REPORT_PATH}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
