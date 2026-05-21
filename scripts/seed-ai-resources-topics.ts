/**
 * Seed content_topics from AI resources topic pack (dry-run by default).
 *
 *   npx tsx scripts/seed-ai-resources-topics.ts --slug best-scholarship-websites
 *   CONTENT_HUB_ALLOW_PRODUCTION_WRITES=1 npx tsx scripts/seed-ai-resources-topics.ts --write --slug best-scholarship-websites
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';
import {
  AI_RESOURCES_PACK_ID,
  buildAiPackTopicString,
  type AiResourcesPackFile
} from '@/lib/content-hub/aiResourcesPackShared';

const PACK_PATH = path.join(
  process.cwd(),
  'data/content/ai-resources-topics-2026-05-21.json'
);

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function parseSlugArg(): string | null {
  const eq = process.argv.find((a) => a.startsWith('--slug='));
  if (eq) return eq.slice('--slug='.length).trim() || null;
  const i = process.argv.indexOf('--slug');
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1].trim();
  return null;
}

async function main() {
  const write = process.argv.includes('--write');
  const slugFilter = parseSlugArg();
  const raw = await fs.readFile(PACK_PATH, 'utf8');
  const pack = JSON.parse(raw) as AiResourcesPackFile;

  if (pack.packId !== AI_RESOURCES_PACK_ID) {
    throw new Error(`Unexpected packId: ${pack.packId}`);
  }

  let topics = pack.topics;
  if (slugFilter) {
    topics = topics.filter((t) => t.slug === slugFilter);
    if (topics.length === 0) {
      throw new Error(`No topic with slug: ${slugFilter}`);
    }
  }

  const rows = topics.map((topic, index) => ({
    topic: buildAiPackTopicString(topic, pack.packId),
    priority: 1000 + index,
    status: 'queued' as const
  }));

  const plan = {
    packId: pack.packId,
    slugFilter,
    topicCount: rows.length,
    write,
    allowWritesEnv: process.env.CONTENT_HUB_ALLOW_PRODUCTION_WRITES === '1',
    slugs: topics.map((t) => t.slug)
  };

  console.log(JSON.stringify({ phase: 'plan', ...plan }, null, 2));

  if (!write) {
    console.log('Dry-run: no content_topics inserts. Pass --write with CONTENT_HUB_ALLOW_PRODUCTION_WRITES=1.');
    return;
  }

  if (process.env.CONTENT_HUB_ALLOW_PRODUCTION_WRITES !== '1') {
    throw new Error('Refusing write: set CONTENT_HUB_ALLOW_PRODUCTION_WRITES=1');
  }

  const url =
    process.env.SUPABASE_URL?.trim() ||
    requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false }
  });

  const { error } = await supabase.from('content_topics').insert(rows);
  if (error) throw error;
  console.log(JSON.stringify({ phase: 'done', inserted: rows.length }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
