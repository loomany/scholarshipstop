/**
 * Служебный реестр long-tail URL (не используется runtime).
 * Run: npm run generate-long-tail-links-manifest
 */

import fs from 'fs';
import path from 'path';

import {
  getLongTailPreset,
  getLongTailSitemapSlugs,
  LONG_TAIL_SLUGS
} from '../app/scholarships/scholarshipLongTailPresets';
import { longTailSeoJsonPath } from '../lib/scholarships/longTailSeoPaths';

type ManifestEntry = {
  slug: string;
  url: string;
  title: string;
  has_seo_json: boolean;
  is_routed: boolean;
  is_in_sitemap: boolean;
};

type ManifestRoot = {
  generated_at: string;
  /** Единый источник слагов для маршрута и этого манифеста. */
  slug_source: string;
  /** Как в app/sitemap.ts: longTailPages = LONG_TAIL_SLUGS.map(...) */
  sitemap_note: string;
  entries: ManifestEntry[];
};

function readSeoTitleIfAny(slug: string): string | null {
  const fp = longTailSeoJsonPath(slug);
  if (!fs.existsSync(fp)) return null;
  try {
    const raw = fs.readFileSync(fp, 'utf8');
    const j = JSON.parse(raw) as unknown;
    if (!j || typeof j !== 'object') return null;
    const t = (j as Record<string, unknown>).seo_title;
    if (typeof t === 'string' && t.trim()) return t.trim();
    return null;
  } catch {
    return null;
  }
}

function hasSeoJsonFile(slug: string): boolean {
  const fp = longTailSeoJsonPath(slug);
  if (!fs.existsSync(fp)) return false;
  try {
    JSON.parse(fs.readFileSync(fp, 'utf8'));
    return true;
  } catch {
    return false;
  }
}

function buildEntries(): ManifestEntry[] {
  const sitemapSet = new Set<string>(getLongTailSitemapSlugs());
  const out: ManifestEntry[] = [];
  for (const slug of LONG_TAIL_SLUGS) {
    const preset = getLongTailPreset(slug);
    const isRouted = preset != null;
    const seoTitle = readSeoTitleIfAny(slug);
    const title = seoTitle ?? preset?.h1 ?? slug;
    out.push({
      slug,
      url: `/scholarships/${slug}`,
      title,
      has_seo_json: hasSeoJsonFile(slug),
      is_routed: isRouted,
      is_in_sitemap: sitemapSet.has(slug)
    });
  }
  return out;
}

function buildMarkdown(entries: ManifestEntry[], generatedAt: string): string {
  const lines: string[] = [
    '# Long-tail scholarship links',
    '',
    `Generated: \`${generatedAt}\` (run \`npm run generate-long-tail-links-manifest\`).`,
    '',
    'Source of slugs: `LONG_TAIL_SLUGS` in `app/scholarships/scholarshipLongTailPresets.ts`.',
    '',
    'Sitemap: `app/sitemap.ts` uses `getLongTailSitemapSlugs()` (non-empty `LONG_TAIL_SITEMAP_SLUGS`, else all `LONG_TAIL_SLUGS`).',
    '',
    '| Slug | URL | Title | SEO JSON | Routed | Sitemap |',
    '| --- | --- | --- | :---: | :---: | :---: |'
  ];
  for (const e of entries) {
    const yn = (v: boolean) => (v ? 'yes' : 'no');
    lines.push(
      `| \`${e.slug}\` | \`${e.url}\` | ${e.title.replace(/\|/g, '\\|')} | ${yn(e.has_seo_json)} | ${yn(e.is_routed)} | ${yn(e.is_in_sitemap)} |`
    );
  }
  lines.push('', '## Plain list', '');
  for (const e of entries) {
    lines.push(`- [${e.title}](${e.url}) (\`${e.slug}\`)`);
  }
  lines.push('');
  return lines.join('\n');
}

function main() {
  const generatedAt = new Date().toISOString();
  const entries = buildEntries();
  const manifest: ManifestRoot = {
    generated_at: generatedAt,
    slug_source:
      'app/scholarships/scholarshipLongTailPresets.ts → LONG_TAIL_SLUGS',
    sitemap_note:
      'app/sitemap.ts → getLongTailSitemapSlugs().map; LONG_TAIL_SITEMAP_SLUGS empty ⇒ LONG_TAIL_SLUGS',
    entries
  };

  const root = process.cwd();
  const jsonPath = path.join(root, 'data', 'long-tail-links-manifest.json');
  const mdPath = path.join(root, 'docs', 'long-tail-links.md');

  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.mkdirSync(path.dirname(mdPath), { recursive: true });

  fs.writeFileSync(`${jsonPath}`, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  fs.writeFileSync(mdPath, buildMarkdown(entries, generatedAt), 'utf8');

  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
  console.log(`Entries: ${entries.length}`);
}

main();
