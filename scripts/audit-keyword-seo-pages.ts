import fs from 'node:fs/promises';
import path from 'node:path';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';
import type { SeoScholarshipRoutesManifest } from '@/lib/scholarships/seoScholarshipManifest';

const DEFAULT_TOPICS_PATH = 'data/manual-essay-guides/international-students-topics.txt';
const MANIFEST_PATH = 'data/seo-scholarship-routes.json';
const SEO_CONTENT_DIR = 'data/seo-scholarship-content';

type KeywordTopic = {
  line: number;
  keyword: string;
  slug: string;
};

function optionalIntArg(name: string, fallback: number): number {
  const raw = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  const n = Number(raw?.slice(name.length + 3) ?? '');
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 160);
}

function parseTopics(raw: string, fromLine: number, toLine: number): KeywordTopic[] {
  return raw
    .split(/\r?\n/)
    .map((line, index) => ({
      line: index + 1,
      keyword: line.trim().replace(/^\d+[.)]\s*/, '')
    }))
    .filter((row) => row.line >= fromLine && row.line <= toLine)
    .filter((row) => row.keyword && !row.keyword.startsWith('#'))
    .map((row) => ({ ...row, slug: slugify(row.keyword) }));
}

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

async function main() {
  const fromLine = optionalIntArg('from-line', 141);
  const toLine = optionalIntArg('to-line', 240);
  const limit = optionalIntArg('limit', 20);
  const topicsPathArg = process.argv.find((arg) => arg.startsWith('--file='));
  const topicsPath = path.resolve(topicsPathArg?.slice('--file='.length) || DEFAULT_TOPICS_PATH);
  const topics = parseTopics(await fs.readFile(topicsPath, 'utf8'), fromLine, toLine).slice(0, limit);
  const manifest = JSON.parse(
    await fs.readFile(path.resolve(MANIFEST_PATH), 'utf8')
  ) as SeoScholarshipRoutesManifest;
  const manifestPaths = new Set(manifest.routes.map((route) => route.canonicalPath));
  const supabase = createClient<Database>(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  );

  const results = [];
  for (const topic of topics) {
    const seoContentPath = path.join(
      process.cwd(),
      SEO_CONTENT_DIR,
      `${topic.slug.replace(/\//g, '__')}.json`
    );
    const seoJsonExists = await fs
      .access(seoContentPath)
      .then(() => true)
      .catch(() => false);
    const { data: resource, error } = await supabase
      .from('content_posts')
      .select('slug,status,published_at,meta_title,meta_description')
      .eq('slug', topic.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    results.push({
      line: topic.line,
      keyword: topic.keyword,
      slug: topic.slug,
      scholarship_manifest: manifestPaths.has(topic.slug),
      scholarship_content_json: seoJsonExists,
      resource_status: resource?.status ?? null,
      resource_published_at: resource?.published_at ?? null,
      url: manifestPaths.has(topic.slug)
        ? `/scholarships/${topic.slug}`
        : resource?.status === 'published'
          ? `/resources/${topic.slug}`
          : null
    });
  }

  console.log(
    JSON.stringify(
      {
        file: topicsPath,
        from_line: fromLine,
        to_line: toLine,
        limit,
        checked: results.length,
        published_or_generated: results.filter(
          (row) =>
            row.scholarship_manifest ||
            row.scholarship_content_json ||
            row.resource_status === 'published'
        ).length,
        results
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
