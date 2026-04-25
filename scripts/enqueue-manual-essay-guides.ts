import fs from 'node:fs/promises';
import path from 'node:path';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';

const DEFAULT_TOPICS_PATH = 'data/manual-essay-guides/international-students-topics.txt';
const CATEGORY_SLUG = 'international-students';
const CATEGORY_LABEL = 'International students';

type ManualTopicInput = {
  topic: string;
  slug: string | null;
};

type TopicRange = {
  fromLine: number;
  toLine: number | null;
};

function requiredEnv(name: string): string {
  const primary = process.env[name]?.trim();
  const value =
    primary ||
    (name === 'NEXT_PUBLIC_SUPABASE_URL'
      ? process.env.SUPABASE_URL?.trim()
      : undefined);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function slugifyTopic(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 180);
}

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 2147483647;
}

function optionalPositiveIntArg(name: string): number | null {
  const raw = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!raw) return null;
  const n = Number(raw.slice(name.length + 3));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

function topicKey(topic: string): string {
  return topic.toLowerCase().replace(/\s+/g, ' ').trim();
}

function parseTopics(raw: string, range: TopicRange): ManualTopicInput[] {
  const seen = new Set<string>();
  const out: ManualTopicInput[] = [];
  const lines = raw.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const lineNumber = i + 1;
    if (lineNumber < range.fromLine) continue;
    if (range.toLine != null && lineNumber > range.toLine) continue;
    const line = lines[i] ?? '';
    const clean = line.trim().replace(/^\d+[.)]\s*/, '');
    if (!clean || clean.startsWith('#')) continue;
    const [topicRaw, slugRaw] = clean.split('|').map((part) => part.trim());
    const topic = topicRaw?.trim();
    if (!topic) continue;
    const key = topicKey(topic);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      topic,
      slug: slugRaw ? slugifyTopic(slugRaw) : null
    });
  }
  return out;
}

async function main() {
  const fileArg = process.argv.find((arg) => arg.startsWith('--file='));
  const fromLine = optionalPositiveIntArg('from-line') ?? 1;
  const toLine = optionalPositiveIntArg('to-line');
  const filePath = path.resolve(fileArg?.slice('--file='.length) || DEFAULT_TOPICS_PATH);
  const raw = await fs.readFile(filePath, 'utf8');
  const topics = parseTopics(raw, { fromLine, toLine })
    .map((item) => ({
      ...item,
      distributionRank: stableHash(item.topic)
    }))
    .sort((a, b) => a.distributionRank - b.distributionRank);

  const url = requiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false }
  });

  const { data: existingRows, error: existingError } = await supabase
    .from('manual_essay_generation_queue')
    .select('topic');
  if (existingError) throw new Error(existingError.message);

  const existing = new Set((existingRows ?? []).map((row) => topicKey(row.topic)));
  const rows = topics
    .filter((item) => !existing.has(topicKey(item.topic)))
    .map((item) => ({
      topic: item.topic,
      slug: item.slug,
      hub_category_slug: CATEGORY_SLUG,
      hub_category_label: CATEGORY_LABEL,
      hub_distribution_group: CATEGORY_SLUG,
      hub_distribution_rank: item.distributionRank,
      status: 'pending',
      error_message: null
    }));

  let inserted = 0;
  let skipped = topics.length - rows.length;
  if (rows.length > 0) {
    const { error } = await supabase.from('manual_essay_generation_queue').insert(rows);
    if (error) {
      throw new Error(error.message);
    }
    inserted = rows.length;
  }

  console.log(
    JSON.stringify(
      {
        file: filePath,
        from_line: fromLine,
        to_line: toLine,
        parsed: topics.length,
        inserted_or_existing: inserted,
        skipped
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
