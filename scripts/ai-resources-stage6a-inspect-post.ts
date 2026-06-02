/**
 * Inspect generated post for Stage 6A report (no secrets).
 *   npx dotenv-cli -e services/content-hub/.env -- npx tsx scripts/ai-resources-stage6a-inspect-post.ts
 */
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';

const SLUG = 'best-scholarship-websites';

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function hasPattern(html: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(html));
}

async function main() {
  const supabase = createClient<Database>(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  );

  const { data: post, error } = await supabase
    .from('content_posts')
    .select(
      'id, topic_id, slug, status, title, h1, excerpt, meta_title, meta_description, word_count, char_count, body_html, body_markdown, faq_items, metrics_debug, primary_keyword, created_at'
    )
    .eq('slug', SLUG)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!post) throw new Error(`No content_posts row for slug: ${SLUG}`);

  const { data: topic } = await supabase
    .from('content_topics')
    .select('id, status, topic, last_error, processed_at')
    .eq('id', post.topic_id)
    .maybeSingle();

  const html = post.body_html ?? '';
  const md = post.body_markdown ?? '';
  const blob = `${html}\n${md}`.toLowerCase();

  const faqItems = Array.isArray(post.faq_items) ? post.faq_items : [];

  const quality = {
    hasDisclaimer:
      /scholarship discovery\/research platform/i.test(blob) &&
      /not an official scholarship provider/i.test(blob),
    hasComparisonTable: /<table\b/i.test(html),
    hasProsCons:
      /pros and cons/i.test(blob) ||
      (/pros/i.test(blob) && /cons/i.test(blob)),
    hasHowWeEvaluated: /how we evaluated/i.test(blob),
    hasQuickAnswer: /quick answer/i.test(blob),
    faqCount: faqItems.length,
    hasFaqSection: /faq|frequently asked/i.test(blob) || faqItems.length >= 4,
    claimsNumberOneWithoutEvidence:
      /\b#1\b.*scholarship|\bnumber one\b.*scholarship|best scholarship website in the world/i.test(
        blob
      ),
    hasBestFor: /best for/i.test(blob)
  };

  console.log(
    JSON.stringify(
      {
        topic: topic
          ? {
              id: topic.id,
              status: topic.status,
              last_error: topic.last_error,
              processed_at: topic.processed_at
            }
          : null,
        post: {
          id: post.id,
          topic_id: post.topic_id,
          slug: post.slug,
          status: post.status,
          title: post.title,
          h1: post.h1,
          excerpt: post.excerpt,
          meta_title: post.meta_title,
          meta_description: post.meta_description,
          word_count: post.word_count,
          char_count: post.char_count,
          primary_keyword: post.primary_keyword,
          plannedUrl: `/resources/${post.slug}`,
          metrics_debug: post.metrics_debug
        },
        quality,
        modelsFromEnv: {
          OPENAI_MODEL_STANDARD: process.env.OPENAI_MODEL_STANDARD ?? '(unset)',
          OPENAI_MODEL_SMART: process.env.OPENAI_MODEL_SMART ?? '(unset)'
        }
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
