/**
 * Read-only DB snapshot before/after Stage 6A (no secrets).
 *   npx dotenv-cli -e services/content-hub/.env -- npx tsx scripts/ai-resources-stage6a-snapshot.ts
 */
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';
import { AI_RESOURCES_PACK_ID } from '@/lib/content-hub/aiResourcesPackShared';

const SLUG = 'best-scholarship-websites';
const PACK_PREFIX = `source=${AI_RESOURCES_PACK_ID}`;

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function main() {
  const supabase = createClient<Database>(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  );

  const { data: post, error: postErr } = await supabase
    .from('content_posts')
    .select('id, slug, status, title, created_at')
    .eq('slug', SLUG)
    .maybeSingle();
  if (postErr) throw new Error(postErr.message);

  const { data: topics, error: topicsErr } = await supabase
    .from('content_topics')
    .select('id, status, topic, priority, created_at')
    .ilike('topic', `%${PACK_PREFIX}%`);
  if (topicsErr) throw new Error(topicsErr.message);

  const queued = (topics ?? []).filter((t) => t.status === 'queued');
  const processing = (topics ?? []).filter((t) => t.status === 'processing');

  console.log(
    JSON.stringify(
      {
        slug: SLUG,
        contentPostExists: Boolean(post),
        contentPost: post
          ? { id: post.id, slug: post.slug, status: post.status, title: post.title }
          : null,
        slugCollision: Boolean(post),
        packTopicsTotal: topics?.length ?? 0,
        packTopicsQueued: queued.length,
        packTopicsProcessing: processing.length,
        packTopicIds: (topics ?? []).map((t) => ({
          id: t.id,
          status: t.status,
          priority: t.priority
        }))
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
