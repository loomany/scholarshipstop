/**
 * Stage 4D — Read-only CMS resource inventory + candidate scoring (no writes).
 * Usage: npx tsx scripts/seo/i18n-stage4d-resources-pilot-inventory.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

import { STATIC_SCHOLARSHIP_GUIDES } from '@/lib/resources/staticScholarshipGuides';

const DATE = '2026-05-21';
const OUT_MD = join(
  process.cwd(),
  'reports/seo',
  `i18n-stage4d-resources-pilot-inventory-${DATE}.md`
);
const OUT_CSV = join(
  process.cwd(),
  'reports/seo',
  `i18n-stage4d-resources-pilot-candidates-${DATE}.csv`
);

const TOP_SEO_RESOURCE_SLUGS = [
  'how-to-search-for-scholarships-step-by-step',
  'how-to-build-a-strong-scholarship-application-profile',
  'ultimate-scholarship-application-checklist',
  'financial-aid-vs-scholarships-whats-the-difference',
  'tips-for-writing-a-winning-scholarship-essay',
  'how-gpa-affects-scholarship-opportunities',
  '10-easiest-scholarships-to-apply-for',
  'scholarship-scams-and-red-flags',
  'fafsa-timeline-and-priority-dates',
  'how-to-track-deadlines-without-missing-opportunities'
];

const STATIC_ROUTE_SLUGS = new Set([
  'how-to-apply-for-scholarships',
  'scholarship-deadlines-explained',
  'combine-multiple-scholarships',
  'medical-scholarships-guide',
  'scholarships-for-international-students-guide'
]);

const STATIC_GUIDE_SLUGS = new Set(
  STATIC_SCHOLARSHIP_GUIDES.map((g) => g.slug)
);

const DEADLINE_SLUG_RE =
  /\b(202[0-9]|deadline|january|february|march|april|may|june|july|august|september|october|november|december)-\d{4}\b/i;

function loadEnv(): Record<string, string> {
  const raw = require('node:fs').readFileSync(
    join(process.cwd(), '.env.local'),
    'utf8'
  ).replace(/^\uFEFF/, '');
  const env: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    let v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    env[t.slice(0, eq).trim()] = v;
  }
  return env;
}

type PostRow = {
  id: string;
  slug: string;
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  word_count: number;
  char_count: number;
  published_at: string | null;
  primary_keyword: string | null;
};

function complexityLabel(words: number, slug: string): string {
  if (words >= 2500) return 'high';
  if (words >= 1200) return 'medium';
  if (words >= 600) return 'low';
  return 'thin';
}

const TEMPLATE_CLUSTER_RE =
  /^(create-trusted-scholarship-guides|scholarship-transparency-checklist|scholarship-application-checklist)/;

function scorePost(post: PostRow): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  const words = post.word_count ?? 0;
  const slug = post.slug;

  if (words >= 1800) {
    score += 20;
    reasons.push('substantial body');
  } else if (words >= 1000) {
    score += 12;
    reasons.push('moderate body');
  } else if (words >= 600) {
    score += 4;
    reasons.push('acceptable body');
  } else {
    score -= 30;
    reasons.push('thin body');
  }

  if (post.meta_title?.trim() && post.meta_description?.trim()) {
    score += 10;
    reasons.push('meta complete');
  }

  if (TOP_SEO_RESOURCE_SLUGS.includes(slug)) {
    score += 50;
    reasons.push('home carousel priority slug');
  }

  if (
    /^(how-to-|ultimate-|types-of-|scholarship-scams|fafsa-|financial-aid-|tips-for-|avoid-scholarship-scams|verify-scholarship|trustworthy-scholarship|organize-scholarship|four-year-scholarship-plan)/i.test(
      slug
    )
  ) {
    score += 25;
    reasons.push('pillar evergreen slug');
  } else if (/how-to|explained|difference|scams|fafsa|track|checklist|thank-you|proofread|faq/i.test(slug)) {
    score += 8;
    reasons.push('evergreen intent slug');
  }

  if (TEMPLATE_CLUSTER_RE.test(slug)) {
    score -= 35;
    reasons.push('content-hub template cluster');
  }

  if (/^usa-[a-z0-9-]+-scholarships$/.test(slug) || /^scholarships-usa-[a-z0-9-]+$/.test(slug)) {
    score -= 18;
    reasons.push('narrow listicle page');
  }

  if (/march-deadlines|january-deadlines|february-deadlines/i.test(slug)) {
    score -= 30;
    reasons.push('month-deadline stale risk');
  }

  if (DEADLINE_SLUG_RE.test(slug) || DEADLINE_SLUG_RE.test(post.title)) {
    score -= 25;
    reasons.push('deadline-dated risk');
  }

  if (/^\d+-/.test(slug)) {
    score -= 8;
    reasons.push('numbered list slug');
  }

  return { score, reasons };
}

function escapeCsv(v: string) {
  return `"${String(v).replace(/"/g, '""')}"`;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url?.includes('supabase.co')) {
    console.error('Refusing: configure production .env.local');
    process.exit(1);
  }

  const admin = createClient(url, key);
  const posts: PostRow[] = [];
  let from = 0;
  const batch = 500;
  for (;;) {
    const { data, error } = await admin
      .from('content_posts')
      .select(
        'id, slug, title, meta_title, meta_description, word_count, char_count, published_at, primary_keyword'
      )
      .eq('status', 'published')
      .not('slug', 'is', null)
      .neq('slug', '')
      .order('published_at', { ascending: false })
      .range(from, from + batch - 1);
    if (error) throw error;
    const rows = (data ?? []) as PostRow[];
    posts.push(...rows);
    if (rows.length < batch) break;
    from += batch;
  }

  const { data: trans } = await admin
    .from('content_translations')
    .select('source_id, locale')
    .eq('source_type', 'resource_article');
  const resourceTransCount = trans?.length ?? 0;

  const { count: catCount } = await admin
    .from('content_translations')
    .select('id', { count: 'exact', head: true })
    .eq('source_type', 'scholarship_category');

  type Cand = PostRow & {
    score: number;
    reasons: string;
    include: boolean;
    excludeReason: string;
    complexity: string;
    inSitemap: boolean;
    esFrBehavior: string;
  };

  const candidates: Cand[] = posts.map((post) => {
    const slug = post.slug.trim();
    let excludeReason = '';
    let include = true;
    let esFr = '404 (no DB route yet)';

    if (STATIC_GUIDE_SLUGS.has(slug)) {
      include = false;
      excludeReason = 'static TS guide (EN file-based)';
      esFr = 'static guide: EN only in app/resources/[slug]; ES/FR not in extended slug map unless added';
    } else if (STATIC_ROUTE_SLUGS.has(slug)) {
      include = false;
      excludeReason = 'dedicated static route + ES/FR resourceShell pilot';
      esFr = '/es|fr/resources/{slug} shell only (LocalizedPilot)';
    } else if (slug === 'how-to-find-scholarships') {
      include = false;
      excludeReason = 'already ES/FR static slug page (extendedResourceSlugPages)';
      esFr = '/es|fr/resources/how-to-find-scholarships (static pilot)';
    }

    const { score, reasons } = scorePost(post);
    return {
      ...post,
      score,
      reasons: reasons.join('; '),
      include,
      excludeReason,
      complexity: complexityLabel(post.word_count, slug),
      inSitemap: true,
      esFr
    };
  });

  candidates.sort((a, b) => b.score - a.score);

  const included = candidates.filter((c) => c.include);
  const top50 = included.slice(0, 50);
  const top25 = included.slice(0, 25);

  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });

  const header =
    'id,slug,title,en_url,word_count,char_count,published_at,indexable,in_sitemap,complexity,priority_score,include,exclude_reason,es_fr_behavior,reasons\n';
  const lines = candidates
    .map((c) =>
      [
        c.id,
        c.slug,
        c.title?.replace(/\s+/g, ' ').trim(),
        `/resources/${c.slug}`,
        c.word_count,
        c.char_count,
        c.published_at ?? '',
        'yes',
        c.inSitemap ? 'yes' : 'no',
        c.complexity,
        c.score,
        c.include ? 'yes' : 'no',
        c.excludeReason,
        c.esFr,
        c.reasons
      ]
        .map(escapeCsv)
        .join(',')
    )
    .join('\n');
  writeFileSync(OUT_CSV, header + lines + '\n', 'utf8');

  const md = `# Stage 4D — Resources CMS pilot inventory (${DATE})

## Production read-only

- \`content_translations\` resource_article rows: **${resourceTransCount}**
- category pilot rows (sanity): **${catCount ?? 'n/a'}**
- Published \`content_posts\` with slug: **${posts.length}**

## Route inventory summary

| Pattern | File(s) | Source | ES/FR today |
| --- | --- | --- | --- |
| \`/resources\` | \`app/resources/page.tsx\`, \`ResourcesIndexPageContent\` | DB list + static guides | Hub UI translated; **article titles still EN** |
| \`/resources/[slug]\` | \`app/resources/[slug]/page.tsx\` | \`content_posts\` or \`STATIC_SCHOLARSHIP_GUIDES\` | **EN only** for CMS slugs |
| Static route pages (5) | \`app/resources/*/page.tsx\` | TS/static + \`resourceShell\` | ES/FR shell via \`extendedResourceShellPages\` |
| \`/es/resources/{slug}\` | \`app/[locale]/[[...slugPath]]\` | static pilot map only | **Not CMS DB** |

## Candidate batches

- Eligible CMS posts: **${included.length}**
- Recommended first batch: **25** (safest)
- Stretch batch: **50**

### Top 25 slugs

${top25.map((c, i) => `${i + 1}. \`${c.slug}\` (score ${c.score}, ${c.word_count} words)`).join('\n')}

### Top 26–50 (next wave)

${top50.slice(25).map((c, i) => `${i + 26}. \`${c.slug}\` (score ${c.score})`).join('\n') || '_none_'}

## Excluded from CMS pilot (by design)

- ${candidates.filter((c) => !c.include).length} rows (static guides, static shells, already-translated slug pages)

`;

  writeFileSync(OUT_MD, md, 'utf8');
  console.log(`Wrote ${OUT_CSV}`);
  console.log(`Wrote ${OUT_MD}`);
  console.log(
    JSON.stringify(
      {
        publishedPosts: posts.length,
        eligible: included.length,
        top25: top25.length,
        top50: top50.length,
        resourceTranslations: resourceTransCount
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
