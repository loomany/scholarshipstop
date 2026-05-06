/**
 * Step 1 + Step 1.1: build static manifest + implementation report from Stage 1 preview JSON.
 * Step 1.1 hardens DE cluster (allowlist-only index) and domestic pair Ads policy.
 * Read-only (filesystem). Does not touch resolver, SSR, sitemap, or UI.
 *
 *   npm run seo:generate-cross-country-manifest
 *
 * Input:  docs/seo-cross-country-preview.json
 * Output: data/seo-cross-country-routes.json
 *         docs/seo-cross-country-implementation-report.md
 */

/** Only these applicant–host pairs may be index/sitemap when host is Germany. */
const GERMANY_INDEX_ALLOWLIST = new Set([
  'GB-DE',
  'IN-DE',
  'CA-DE',
  'US-DE',
  'MX-DE',
  'PH-DE'
]);

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PREVIEW_PATH = path.join(ROOT, 'docs', 'seo-cross-country-preview.json');
const MANIFEST_PATH = path.join(ROOT, 'data', 'seo-cross-country-routes.json');
const REPORT_PATH = path.join(ROOT, 'docs', 'seo-cross-country-implementation-report.md');

type PreviewPair = {
  href: string;
  applicantCode: string;
  applicantName: string;
  hostCode: string;
  hostName: string;
  totalCount: number;
  tier: string;
  duplicateRisk: string;
  unspecifiedRisk: string;
  unspecifiedFraction?: number;
  sampleScholarships?: Array<{ id: string; title: string; slug: string | null }>;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  faqQuestions: string[];
};

type PreviewFile = {
  generatedAt?: string;
  pairs: PreviewPair[];
};

export type CrossCountryManifestEntry = {
  applicantCode: string;
  hostCode: string;
  applicantSlug: string;
  hostSlug: string;
  canonicalPath: string;
  href: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  faqQuestions: string[];
  totalCountSnapshot: number;
  tier: 'low_count_noindex' | 'candidate_after_QA' | 'priority_candidate';
  qaStatus: 'auto_pass' | 'auto_fail';
  duplicateRisk: string;
  unspecifiedRisk: string;
  status:
    | 'approved_priority'
    | 'approved'
    | 'published_noindex'
    | 'manual_review'
    | 'skip';
  robots: 'index,follow' | 'noindex,follow';
  includeInSitemap: boolean;
  allowedForAds: boolean;
  enabled: boolean;
  qaNotes: string;
};

type ManifestFile = {
  version: 1;
  generatedAt: string;
  generatedFrom: string;
  previewGeneratedAt?: string;
  entries: CrossCountryManifestEntry[];
};

function hrefToSlugsAndCanonical(href: string): {
  applicantSlug: string;
  hostSlug: string;
  canonicalPath: string;
} | null {
  const m = href.match(
    /^\/scholarships\/for-students-from\/([^/]+)\/study-in\/([^/]+)\/?$/
  );
  if (!m) return null;
  const applicantSlug = m[1]!.toLowerCase();
  const hostSlug = m[2]!.toLowerCase();
  if (!applicantSlug || !hostSlug) return null;
  return {
    applicantSlug,
    hostSlug,
    canonicalPath: `for-students-from/${applicantSlug}/study-in/${hostSlug}`
  };
}

function countTier(n: number): CrossCountryManifestEntry['tier'] {
  if (n >= 50) return 'priority_candidate';
  if (n >= 20) return 'candidate_after_QA';
  return 'low_count_noindex';
}

function duplicateRiskHigh(duplicateRisk: string): boolean {
  const s = duplicateRisk.toLowerCase();
  if (s.includes('duplicate_risk_high')) return true;
  if (s.includes('duplicatehigh')) return true;
  return false;
}

function unspecifiedRiskHigh(unspecifiedRisk: string): boolean {
  const s = unspecifiedRisk.toLowerCase();
  if (s.startsWith('high_')) return true;
  if (s.includes('high_fraction')) return true;
  return false;
}

function autoQaPass(p: PreviewPair, parsed: { applicantSlug: string; hostSlug: string }): boolean {
  if (p.totalCount < 20) return false;
  if (!p.sampleScholarships || p.sampleScholarships.length === 0) return false;
  if (duplicateRiskHigh(p.duplicateRisk)) return false;
  if (unspecifiedRiskHigh(p.unspecifiedRisk)) return false;
  if (!/^[a-z0-9-]+$/.test(parsed.applicantSlug)) return false;
  if (!/^[a-z0-9-]+$/.test(parsed.hostSlug)) return false;
  return true;
}

function appendQaNotes(base: string, add: string): string {
  if (!add) return base;
  if (!base.trim()) return add;
  return `${base}; ${add}`;
}

function germanyPairKey(applicantCode: string, hostCode: string): string {
  return `${applicantCode.toUpperCase()}-${hostCode.toUpperCase()}`;
}

function buildEntry(p: PreviewPair): CrossCountryManifestEntry | null {
  if (p.totalCount < 5) return null;

  const parsed = hrefToSlugsAndCanonical(p.href);
  if (!parsed) return null;

  const applicantU = p.applicantCode.toUpperCase();
  const hostU = p.hostCode.toUpperCase();
  const tier = countTier(p.totalCount);
  const qaPass = autoQaPass(p, parsed);
  const dupH = duplicateRiskHigh(p.duplicateRisk);
  const unspecH = unspecifiedRiskHigh(p.unspecifiedRisk);
  const hostDe = hostU === 'DE';
  const allowlistedDe =
    hostDe &&
    GERMANY_INDEX_ALLOWLIST.has(germanyPairKey(applicantU, hostU)) &&
    p.totalCount >= 20 &&
    qaPass &&
    !dupH &&
    !unspecH;

  let status: CrossCountryManifestEntry['status'];
  let robots: CrossCountryManifestEntry['robots'];
  let includeInSitemap: boolean;
  let allowedForAds: boolean;
  let qaStatus: CrossCountryManifestEntry['qaStatus'];
  let qaNotes = '';

  if (hostDe) {
    allowedForAds = false;
    if (allowlistedDe) {
      qaStatus = 'auto_pass';
      qaNotes = 'germany_cluster_allowlisted';
      if (p.totalCount >= 50) {
        status = 'approved_priority';
        robots = 'index,follow';
        includeInSitemap = true;
      } else {
        status = 'approved';
        robots = 'index,follow';
        includeInSitemap = true;
      }
    } else {
      status = 'manual_review';
      robots = 'noindex,follow';
      includeInSitemap = false;
      allowedForAds = false;
      qaStatus = 'auto_fail';
      qaNotes = 'germany_cluster_manual_review';
      const onDeAllowlist = GERMANY_INDEX_ALLOWLIST.has(germanyPairKey(applicantU, hostU));
      if (!onDeAllowlist) {
        qaNotes = appendQaNotes(qaNotes, 'not_on_germany_index_allowlist');
      }
      if (p.totalCount < 20) {
        qaNotes = appendQaNotes(qaNotes, 'low_volume_5_19_bucket');
      } else if (onDeAllowlist && (!qaPass || dupH || unspecH)) {
        if (!qaPass) qaNotes = appendQaNotes(qaNotes, 'auto_QA_failed');
        if (dupH) qaNotes = appendQaNotes(qaNotes, 'duplicateRisk_high');
        if (unspecH) qaNotes = appendQaNotes(qaNotes, 'unspecifiedRisk_high');
      } else if (!onDeAllowlist) {
        if (!qaPass) qaNotes = appendQaNotes(qaNotes, 'auto_QA_failed');
        if (dupH) qaNotes = appendQaNotes(qaNotes, 'duplicateRisk_high');
        if (unspecH) qaNotes = appendQaNotes(qaNotes, 'unspecifiedRisk_high');
      }
    }
  } else if (p.totalCount >= 50) {
    if (qaPass && !dupH && !unspecH) {
      status = 'approved_priority';
      robots = 'index,follow';
      includeInSitemap = true;
      allowedForAds = true;
      qaStatus = 'auto_pass';
    } else {
      status = 'manual_review';
      robots = 'noindex,follow';
      includeInSitemap = false;
      allowedForAds = false;
      qaStatus = 'auto_fail';
      qaNotes = [
        !qaPass ? 'auto_QA_failed' : null,
        dupH ? 'duplicateRisk_high' : null,
        unspecH ? 'unspecifiedRisk_high' : null
      ]
        .filter(Boolean)
        .join('; ');
    }
  } else if (p.totalCount >= 20) {
    if (qaPass && !dupH && !unspecH) {
      status = 'approved';
      robots = 'index,follow';
      includeInSitemap = true;
      allowedForAds = false;
      qaStatus = 'auto_pass';
      qaNotes = 'ads_optional_after_manual_QA';
    } else {
      status = 'manual_review';
      robots = 'noindex,follow';
      includeInSitemap = false;
      allowedForAds = false;
      qaStatus = 'auto_fail';
      qaNotes = [
        !qaPass ? 'auto_QA_failed' : null,
        dupH ? 'duplicateRisk_high' : null,
        unspecH ? 'unspecifiedRisk_high' : null
      ]
        .filter(Boolean)
        .join('; ');
    }
  } else {
    status = 'published_noindex';
    robots = 'noindex,follow';
    includeInSitemap = false;
    allowedForAds = false;
    qaStatus = 'auto_fail';
    qaNotes = 'low_volume_5_19_bucket';
  }

  if (applicantU === hostU) {
    allowedForAds = false;
    qaNotes = appendQaNotes(qaNotes, 'domestic_pair_not_primary_ads');
  }

  return {
    applicantCode: applicantU,
    hostCode: hostU,
    applicantSlug: parsed.applicantSlug,
    hostSlug: parsed.hostSlug,
    canonicalPath: parsed.canonicalPath,
    href: p.href,
    h1: p.h1,
    metaTitle: p.metaTitle,
    metaDescription: p.metaDescription,
    intro: p.intro,
    faqQuestions: [...p.faqQuestions],
    totalCountSnapshot: p.totalCount,
    tier,
    qaStatus,
    duplicateRisk: p.duplicateRisk,
    unspecifiedRisk: p.unspecifiedRisk,
    status,
    robots,
    includeInSitemap,
    allowedForAds,
    enabled: true,
    qaNotes
  };
}

function main() {
  if (!fs.existsSync(PREVIEW_PATH)) {
    console.error(`[generate-seo-cross-country-manifest] Missing ${PREVIEW_PATH}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(PREVIEW_PATH, 'utf8')) as PreviewFile;
  const pairs = raw.pairs ?? [];
  const skippedBelow5 = pairs.filter((p) => p.totalCount < 5).length;

  const entries: CrossCountryManifestEntry[] = [];
  for (const p of pairs) {
    const e = buildEntry(p);
    if (e) entries.push(e);
  }

  const manifest: ManifestFile = {
    version: 1,
    generatedAt: new Date().toISOString(),
    generatedFrom: 'docs/seo-cross-country-preview.json',
    previewGeneratedAt: raw.generatedAt,
    entries
  };

  const dataDir = path.dirname(MANIFEST_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');

  const indexable = entries.filter((e) => e.robots === 'index,follow');
  const sitemapEntries = entries.filter((e) => e.includeInSitemap);
  const noindex = entries.filter((e) => e.robots === 'noindex,follow');
  const manualReview = entries.filter((e) => e.status === 'manual_review');
  const approvedPriority = entries.filter((e) => e.status === 'approved_priority');
  const approved = entries.filter((e) => e.status === 'approved');
  const publishedNoindex = entries.filter((e) => e.status === 'published_noindex');
  const deHost = entries.filter((e) => e.hostCode === 'DE');
  const deIndexable = deHost.filter((e) => e.robots === 'index,follow');
  const deNoindex = deHost.filter((e) => e.robots === 'noindex,follow');
  const deManualReview = deHost.filter((e) => e.status === 'manual_review');
  const domesticPairs = entries.filter((e) => e.applicantCode === e.hostCode);
  const domesticIndexable = domesticPairs.filter((e) => e.robots === 'index,follow');

  const top20Indexable = [...indexable]
    .sort((a, b) => b.totalCountSnapshot - a.totalCountSnapshot)
    .slice(0, 20);

  const adsUrls = entries
    .filter(
      (e) =>
        e.status === 'approved_priority' &&
        e.includeInSitemap &&
        e.allowedForAds &&
        ['US', 'GB', 'CA', 'AU'].includes(e.hostCode)
    )
    .sort((a, b) => b.totalCountSnapshot - a.totalCountSnapshot);

  const pickExample = (
    pred: (e: CrossCountryManifestEntry) => boolean
  ): CrossCountryManifestEntry | undefined => {
    return entries.find(pred);
  };

  const exPriority = pickExample((e) => e.status === 'approved_priority');
  const exApproved = pickExample((e) => e.status === 'approved');
  const exPublished = pickExample((e) => e.status === 'published_noindex');
  const exManual = pickExample((e) => e.status === 'manual_review');

  const report = `# Cross-country SEO — implementation report (Step 1.1)

**Generated:** ${manifest.generatedAt}  
**Source preview:** ${manifest.generatedFrom}${manifest.previewGeneratedAt ? ` (preview at ${manifest.previewGeneratedAt})` : ''}

**Policy:** Germany index/sitemap only for allowlist pairs (GB, IN, CA, US, MX, PH → DE) with count ≥ 20 and auto-QA pass. All other DE → \`manual_review\`, noindex, not in sitemap. Domestic pairs (applicant = host) → \`allowedForAds: false\` + note \`domestic_pair_not_primary_ads\`.

## Summary

| Metric | Count |
|--------|------:|
| Total manifest entries | ${entries.length} |
| Skipped from preview (count < 5) | ${skippedBelow5} |
| Indexable total (\`robots: index,follow\`) | ${indexable.length} |
| Sitemap total (\`includeInSitemap: true\`) | ${sitemapEntries.length} |
| Noindex (\`robots: noindex,follow\`) | ${noindex.length} |
| \`manual_review\` (all hosts) | ${manualReview.length} |
| \`approved_priority\` | ${approvedPriority.length} |
| \`approved\` | ${approved.length} |
| \`published_noindex\` | ${publishedNoindex.length} |

## Germany cluster (host DE)

| Metric | Count |
|--------|------:|
| Germany total | ${deHost.length} |
| Germany indexable | ${deIndexable.length} |
| Germany noindex | ${deNoindex.length} |
| Germany \`manual_review\` | ${deManualReview.length} |

Allowlist for index (applicant-host): \`GB-DE\`, \`IN-DE\`, \`CA-DE\`, \`US-DE\`, \`MX-DE\`, \`PH-DE\`. All DE rows: \`allowedForAds: false\`.

## Domestic pairs (applicantCode === hostCode)

| Metric | Count |
|--------|------:|
| Domestic pairs total | ${domesticPairs.length} |
| Domestic indexable | ${domesticIndexable.length} |

All domestic pairs: \`allowedForAds: false\`, \`qaNotes\` includes \`domestic_pair_not_primary_ads\`.

## Top 20 indexable URLs (by \`totalCountSnapshot\`)

| # | Count | URL | Status |
|---|------:|-----|--------|
${top20Indexable
  .map(
    (e, i) =>
      `| ${i + 1} | ${e.totalCountSnapshot} | \`${e.href}\` | ${e.status} |`
  )
  .join('\n')}

## Top Google Ads URLs (\`approved_priority\` + sitemap + \`allowedForAds\` + host US/GB/CA/AU)

| # | Count | URL |
|---|------:|-----|
${adsUrls
  .map((e, i) => `| ${i + 1} | ${e.totalCountSnapshot} | \`${e.href}\` |`)
  .join('\n')}

## Example manifest entries (JSON excerpts)

### 1. \`approved_priority\` (sample)

${
  exPriority
    ? `\`\`\`json
${JSON.stringify(exPriority, null, 2).split('\n').slice(0, 45).join('\n')}
\`\`\``
    : '_(none)_'
}

### 2. \`approved\` (sample)

${
  exApproved
    ? `\`\`\`json
${JSON.stringify(exApproved, null, 2).split('\n').slice(0, 45).join('\n')}
\`\`\``
    : '_(none)_'
}

### 3. \`published_noindex\` (sample)

${
  exPublished
    ? `\`\`\`json
${JSON.stringify(exPublished, null, 2).split('\n').slice(0, 45).join('\n')}
\`\`\``
    : '_(none)_'
}

### 4. \`manual_review\` (sample)

${
  exManual
    ? `\`\`\`json
${JSON.stringify(exManual, null, 2).split('\n').slice(0, 45).join('\n')}
\`\`\``
    : '_(none — no manual_review rows in this run)_'
}

## Artifacts

- [\`data/seo-cross-country-routes.json\`](data/seo-cross-country-routes.json)
- This file: [\`docs/seo-cross-country-implementation-report.md\`](docs/seo-cross-country-implementation-report.md)

Step 2 (resolver, SSR, metadata, sitemap, UI, tests) is **not** included in Step 1.
`;

  fs.writeFileSync(REPORT_PATH, report, 'utf8');

  console.log('[generate-seo-cross-country-manifest] OK');
  console.log(`  entries: ${entries.length}`);
  console.log(`  indexable: ${indexable.length}`);
  console.log(`  sitemap: ${sitemapEntries.length}`);
  console.log(`  noindex: ${noindex.length}`);
  console.log(`  germany indexable: ${deIndexable.length} / germany total: ${deHost.length}`);
  console.log(`  domestic pairs: ${domesticPairs.length} (indexable: ${domesticIndexable.length})`);
  console.log(`  manual_review: ${manualReview.length}`);
  console.log(`  approved_priority: ${approvedPriority.length}`);
  console.log(`  approved: ${approved.length}`);
  console.log(`  published_noindex: ${publishedNoindex.length}`);
  console.log(`  skipped (count<5 in preview): ${skippedBelow5}`);
  console.log(`  wrote: ${MANIFEST_PATH}`);
  console.log(`  wrote: ${REPORT_PATH}`);
}

main();
