/**
 * Audit SEO scholarship JSON under data/seo-scholarship-content/ + manifest coverage.
 *
 *   npx tsx scripts/audit-seo-scholarship-content.ts
 *
 * Writes docs/seo-audit.md each run. Pass --no-write to skip the markdown file.
 */

import fs from 'fs';
import path from 'path';

import type { LongTailSeoBundle } from '../lib/scholarships/longTailSeoTypes';
import {
  BANNED_INTRO_PREFIXES,
  VAGUE_BULLET_PATTERNS,
  introOpeningWords,
  wordCount
} from '../lib/scholarships/seoScholarshipContentQuality';
import type { SeoScholarshipRoutesManifest } from '../lib/scholarships/seoScholarshipManifest';
import { routeIsSitemapIndexable } from '../lib/scholarships/seoScholarshipResolve';

const ROOT = path.join(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'data', 'seo-scholarship-routes.json');
const CONTENT_DIR = path.join(ROOT, 'data', 'seo-scholarship-content');
const DOC_OUT = path.join(ROOT, 'docs', 'seo-audit.md');

function fileNameToCanonical(fn: string): string | null {
  if (!fn.endsWith('.json')) return null;
  return fn.replace(/\.json$/, '').replace(/__/g, '/');
}

function normText(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

function introPrefixKey(s: string, n: number): string {
  return normText(s).slice(0, n);
}

type ParsedFile = {
  slug: string;
  bundle: LongTailSeoBundle;
};

function bulletsFromBundle(
  b: LongTailSeoBundle,
  key: 'who_for' | 'how_to_use'
): string[] {
  const v = b[key];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === 'string' && v.trim()) {
    return v
      .split(/\n+/)
      .map((l) => l.replace(/^[-*•]\s*/, '').trim())
      .filter(Boolean);
  }
  return [];
}

function loadParsedFiles(): ParsedFile[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const out: ParsedFile[] = [];
  for (const fn of fs.readdirSync(CONTENT_DIR)) {
    const slug = fileNameToCanonical(fn);
    if (!slug) continue;
    const fp = path.join(CONTENT_DIR, fn);
    try {
      const j = JSON.parse(fs.readFileSync(fp, 'utf8')) as LongTailSeoBundle;
      if (
        !j ||
        typeof j.seo_title !== 'string' ||
        typeof j.seo_description !== 'string' ||
        typeof j.intro !== 'string'
      ) {
        continue;
      }
      out.push({ slug, bundle: j });
    } catch {
      /* skip */
    }
  }
  return out;
}

function groupBy<T>(
  items: T[],
  keyFn: (t: T) => string
): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = keyFn(it);
    if (!k) continue;
    const arr = m.get(k) ?? [];
    arr.push(it);
    m.set(k, arr);
  }
  return m;
}

function formatDuplicateGroups(
  m: Map<string, ParsedFile[]>,
  minSize: number,
  maxGroups: number
): string {
  const groups = [...m.entries()]
    .filter(([, arr]) => arr.length >= minSize)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, maxGroups);
  if (groups.length === 0) return '_None._\n';
  return groups
    .map(([key, arr]) => {
      const slugs = arr.map((x) => x.slug).sort();
      return `- **${arr.length} pages** — \`${key.slice(0, 72)}${key.length > 72 ? '…' : ''}\`\n  - ${slugs.join(', ')}`;
    })
    .join('\n');
}

function main() {
  const writeDocs = !process.argv.includes('--no-write');

  const manifest = JSON.parse(
    fs.readFileSync(MANIFEST_PATH, 'utf8')
  ) as SeoScholarshipRoutesManifest;

  const indexable = manifest.routes.filter(routeIsSitemapIndexable);
  const parsed = loadParsedFiles();
  const bySlug = new Map(parsed.map((p) => [p.slug, p]));

  const missingOnIndexable: string[] = [];
  for (const r of indexable) {
    if (!bySlug.has(r.canonicalPath)) missingOnIndexable.push(r.canonicalPath);
  }

  const orphanFiles = parsed.filter((p) => !manifest.routes.some((r) => r.canonicalPath === p.slug));

  const titleDup = groupBy(parsed, (p) => normText(p.bundle.seo_title));
  const descDup = groupBy(parsed, (p) => normText(p.bundle.seo_description));
  const introDup = groupBy(parsed, (p) => normText(p.bundle.intro));

  const titleWarnings: { slug: string; msg: string }[] = [];
  const descWarnings: { slug: string; msg: string }[] = [];
  const introWarnings: { slug: string; msg: string }[] = [];

  for (const p of parsed) {
    const t = p.bundle.seo_title.trim();
    const d = p.bundle.seo_description.trim();
    const intro = p.bundle.intro.trim();
    const tw = t.length;
    if (tw < 25) titleWarnings.push({ slug: p.slug, msg: `title short (${tw} chars)` });
    if (tw > 70) titleWarnings.push({ slug: p.slug, msg: `title long (${tw} chars)` });
    const dw = d.length;
    if (dw < 80) descWarnings.push({ slug: p.slug, msg: `meta description short (${dw} chars)` });
    if (dw > 170) descWarnings.push({ slug: p.slug, msg: `meta description long (${dw} chars)` });
    const wc = wordCount(intro);
    if (wc < 85) introWarnings.push({ slug: p.slug, msg: `intro thin (${wc} words, target ~90+)` });
  }

  const genericIntroWarnings: { slug: string; pattern: string }[] = [];
  for (const p of parsed) {
    const introLower = normText(p.bundle.intro);
    for (const banned of BANNED_INTRO_PREFIXES) {
      if (introLower.startsWith(banned) || introLower.startsWith(`${banned} `)) {
        genericIntroWarnings.push({ slug: p.slug, pattern: banned });
        break;
      }
    }
  }

  const opening10 = groupBy(parsed, (p) => introOpeningWords(p.bundle.intro, 10));
  const repeatedOpening10 = [...opening10.entries()].filter(
    ([k, arr]) => k.length >= 12 && arr.length >= 4
  );

  const bulletWarnings: { slug: string; section: string; msg: string }[] = [];
  function auditBulletList(
    slug: string,
    section: 'who_for' | 'how_to_use',
    lines: string[]
  ) {
    for (const line of lines) {
      const wc = wordCount(line);
      if (wc < 6) {
        bulletWarnings.push({
          slug,
          section,
          msg: `short bullet (${wc} w): ${line.slice(0, 52)}…`
        });
      }
      for (const pat of VAGUE_BULLET_PATTERNS) {
        if (pat.test(line)) {
          bulletWarnings.push({
            slug,
            section,
            msg: `vague: ${line.slice(0, 64)}`
          });
          break;
        }
      }
    }
  }

  for (const p of parsed) {
    const who = bulletsFromBundle(p.bundle, 'who_for');
    const how = bulletsFromBundle(p.bundle, 'how_to_use');
    auditBulletList(p.slug, 'who_for', who);
    auditBulletList(p.slug, 'how_to_use', how);
    if (who.length > 0 && who.length < 3) {
      bulletWarnings.push({
        slug: p.slug,
        section: 'who_for',
        msg: `only ${who.length} bullet(s)`
      });
    }
    if (how.length > 0 && how.length < 3) {
      bulletWarnings.push({
        slug: p.slug,
        section: 'how_to_use',
        msg: `only ${how.length} bullet(s)`
      });
    }
  }

  const prefixGroups = groupBy(parsed, (p) => introPrefixKey(p.bundle.intro, 100));
  const similarIntros = [...prefixGroups.entries()].filter(
    ([k, arr]) => k.length >= 40 && arr.length >= 3
  );

  const summary = {
    manifestRoutes: manifest.routes.length,
    indexableRoutes: indexable.length,
    contentFiles: parsed.length,
    missingAiOnIndexable: missingOnIndexable.length,
    orphanContentFiles: orphanFiles.length,
    exactDuplicateTitles: [...titleDup.values()].filter((a) => a.length > 1).length,
    exactDuplicateDescriptions: [...descDup.values()].filter((a) => a.length > 1).length,
    exactDuplicateIntros: [...introDup.values()].filter((a) => a.length > 1).length,
    titleLengthWarnings: titleWarnings.length,
    metaLengthWarnings: descWarnings.length,
    introWordWarnings: introWarnings.length,
    similarIntroPrefixGroups: similarIntros.length,
    genericIntroOpenings: genericIntroWarnings.length,
    repeatedFirst10WordOpenings: repeatedOpening10.length,
    bulletQualityWarnings: bulletWarnings.length
  };

  console.log('\n=== SEO scholarship content audit ===\n');
  console.log(JSON.stringify(summary, null, 2));
  console.log(
    `\nQuality signals: genericIntroOpenings=${summary.genericIntroOpenings}, repeated10WordOpenings=${summary.repeatedFirst10WordOpenings}, bulletWarnings=${summary.bulletQualityWarnings}`
  );
  console.log('\n--- Top duplicate title groups (sample) ---');
  console.log(formatDuplicateGroups(titleDup, 2, 8));
  console.log('\n--- Top duplicate intro groups (sample) ---');
  console.log(formatDuplicateGroups(introDup, 2, 6));

  if (missingOnIndexable.length && missingOnIndexable.length <= 30) {
    console.log('\nMissing content (indexable), sample:', missingOnIndexable.slice(0, 25).join(', '));
  } else if (missingOnIndexable.length) {
    console.log(
      `\nMissing content (indexable): ${missingOnIndexable.length} (show first 15)`,
      missingOnIndexable.slice(0, 15).join(', ')
    );
  }

  const generatedAt = new Date().toISOString();
  const md = `# SEO scholarship content audit

Generated: ${generatedAt}

## Summary

| Metric | Count |
| --- | ---: |
| Manifest routes | ${summary.manifestRoutes} |
| Sitemap-indexable routes | ${summary.indexableRoutes} |
| Valid JSON content files | ${summary.contentFiles} |
| Indexable without content file | ${summary.missingAiOnIndexable} |
| Content files not in manifest | ${summary.orphanContentFiles} |
| Exact duplicate titles (groups with 2+) | ${summary.exactDuplicateTitles} |
| Exact duplicate meta descriptions (groups) | ${summary.exactDuplicateDescriptions} |
| Exact duplicate intros (groups) | ${summary.exactDuplicateIntros} |
| Title length warnings | ${summary.titleLengthWarnings} |
| Meta description length warnings | ${summary.metaLengthWarnings} |
| Intro word-count warnings (under ~85 words) | ${summary.introWordWarnings} |
| Similar intro prefix groups (≥3 pages, 100-char prefix) | ${summary.similarIntroPrefixGroups} |
| Generic banned intro openings | ${summary.genericIntroOpenings} |
| Repeated first-10-word intro openings (≥4 pages) | ${summary.repeatedFirst10WordOpenings} |
| who_for / how_to_use bullet warnings | ${summary.bulletQualityWarnings} |

## Duplicate titles (top groups)

${formatDuplicateGroups(titleDup, 2, 15)}

## Duplicate meta descriptions (top groups)

${formatDuplicateGroups(descDup, 2, 12)}

## Duplicate intros (top groups)

${formatDuplicateGroups(introDup, 2, 12)}

## Similar intros (shared 100-char prefix, ≥3 pages)

${
  similarIntros.length === 0
    ? '_None._\n'
    : similarIntros
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 12)
        .map(([pref, arr]) => `- **${arr.length}** — \`${pref.slice(0, 80)}…\`\n  - ${arr.map((x) => x.slug).sort().join(', ')}`)
        .join('\n')
}

## Repeated intro openings (first 10 words, ≥4 pages)

${
  repeatedOpening10.length === 0
    ? '_None._\n'
    : repeatedOpening10
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 15)
        .map(
          ([pref, arr]) =>
            `- **${arr.length}** — \`${pref.slice(0, 72)}…\`\n  - ${arr.map((x) => x.slug).sort().join(', ')}`
        )
        .join('\n')
}

## Generic intro openings (banned phrase list)

${
  genericIntroWarnings.length === 0
    ? '_None._\n'
    : genericIntroWarnings
        .slice(0, 120)
        .map((w) => `- \`${w.slug}\`: starts like “${w.pattern}…”`)
        .join('\n')
}

## who_for / how_to_use bullet warnings

${
  bulletWarnings.length === 0
    ? '_None._\n'
    : bulletWarnings
        .slice(0, 200)
        .map((w) => `- \`${w.slug}\` [${w.section}]: ${w.msg}`)
        .join('\n')
}

## Per-slug warnings (title / meta / intro)

${
  [...titleWarnings, ...descWarnings, ...introWarnings].length === 0
    ? '_None._\n'
    : [...titleWarnings, ...descWarnings, ...introWarnings]
        .slice(0, 200)
        .map((w) => `- \`${w.slug}\`: ${w.msg}`)
        .join('\n')
}

## Indexable routes without content file (first 80)

${
  missingOnIndexable.length === 0
    ? '_None._\n'
    : missingOnIndexable
        .slice(0, 80)
        .map((s) => `- \`${s}\``)
        .join('\n')
}

## Orphan content files (not in manifest)

${
  orphanFiles.length === 0
    ? '_None._\n'
    : orphanFiles
        .slice(0, 40)
        .map((p) => `- \`${p.slug}\``)
        .join('\n')
}
`;

  if (writeDocs) {
    fs.mkdirSync(path.dirname(DOC_OUT), { recursive: true });
    fs.writeFileSync(DOC_OUT, md, 'utf8');
    console.log('\nWrote', DOC_OUT);
  }
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
