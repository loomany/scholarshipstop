/**
 * Prompt context for manifest SEO pages (scripts + OpenAI). Facts only from catalog + manifest.
 */

import { SCHOLARSHIP_CATEGORY_LABELS } from '@/app/scholarships/scholarshipCategories';
import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import type {
  SeoScholarshipRouteManifestEntry,
  SeoScholarshipRouteFiltersJson
} from '@/lib/scholarships/seoScholarshipManifest';
import { getScholarshipsMatchingManifestEntry } from '@/lib/scholarships/seoScholarshipListing';
import {
  parsePathSegmentsToTokens,
  type SeoRouteToken
} from '@/lib/scholarships/seoScholarshipRouteTokens';

function titleCaseSlug(seg: string): string {
  return seg
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function describeToken(t: SeoRouteToken): string {
  switch (t.kind) {
    case 'location':
      return `Study in: ${t.label}`;
    case 'eligibility':
      return `Eligibility bucket: ${t.id.replace(/_/g, ' ')}`;
    case 'education':
      return `Education level: ${t.id.replace(/_/g, ' ')}`;
    case 'easy_apply':
      return `Application style: ${t.id.replace(/_/g, ' ')}`;
    case 'gpa':
      return `GPA filter: ${t.id.replace(/_/g, ' ')}`;
    case 'legacy_preset':
      return `Topic / preset: ${titleCaseSlug(t.slug)}`;
    case 'deadline':
      return `Deadline preset: ${t.preset}`;
    case 'verified':
      return 'Verified listings only';
    case 'payout':
      return `Payout: ${t.id.replace(/_/g, ' ')}`;
    default:
      return 'Other filter';
  }
}

function filtersJsonLines(f: SeoScholarshipRouteFiltersJson | undefined): string[] {
  if (!f) return [];
  const lines: string[] = [];
  if (f.includeEligibility?.length)
    lines.push(`Eligibility IDs: ${f.includeEligibility.join(', ')}`);
  if (f.includeEducationLevels?.length)
    lines.push(`Education levels: ${f.includeEducationLevels.join(', ')}`);
  if (f.includeGpaBuckets?.length)
    lines.push(`GPA buckets: ${f.includeGpaBuckets.join(', ')}`);
  if (f.includeLocationLabels?.length)
    lines.push(`Locations: ${f.includeLocationLabels.join(', ')}`);
  if (f.includeEasyApply?.length)
    lines.push(`Easy-apply flags: ${f.includeEasyApply.join(', ')}`);
  if (f.deadlinePreset && f.deadlinePreset !== 'any')
    lines.push(`Deadline filter: ${f.deadlinePreset}`);
  if (f.amountCap != null && Number.isFinite(f.amountCap))
    lines.push(`Amount cap (upper bound in UI range): ${f.amountCap}`);
  if (f.dataCompletenessVerifiedOnly) lines.push('Data: verified-only');
  if (f.payoutCollege) lines.push('Payout: college');
  if (f.payoutStudent) lines.push('Payout: student');
  if (f.payoutNonMonetary) lines.push('Payout: non-monetary');
  if (f.payoutNotStated) lines.push('Payout: not stated');
  return lines;
}

export type SeoScholarshipExampleLine = {
  title: string;
  amount?: string;
  deadline?: string;
  categories?: string[];
};

export type SeoAwardSampleAggregate = {
  knownNumericCount: number;
  minUsd: number | null;
  maxUsd: number | null;
  totalRows: number;
};

export type SeoDeadlineAggregate = {
  rowsWithDeadlineText: number;
  uniqueDeadlineStrings: number;
  deadlinesVaried: boolean;
  nearTermInSample: boolean;
};

export type SeoRequirementAggregate = {
  essayRequiredYes: number;
  essayRequiredNo: number;
  essayUnknown: number;
  lowRequirementSignalRows: number;
};

export type SeoManifestAiContext = {
  canonicalPath: string;
  readablePageLabel: string;
  pageType: string;
  scholarshipsCount: number;
  tokenDescriptions: string[];
  legacyBaseSlugs: string[];
  filterLines: string[];
  exampleListings: SeoScholarshipExampleLine[];
  topCategoryLabels: string[];
  awardAggregate: SeoAwardSampleAggregate;
  deadlineAggregate: SeoDeadlineAggregate;
  requirementAggregate: SeoRequirementAggregate;
  topStudyLevels: string[];
  topCitizenshipLabels: string[];
  topFieldsOfStudy: string[];
};

function computeAwardAggregate(hits: Scholarship[]): SeoAwardSampleAggregate {
  const nums = hits
    .map((s) => s.awardAmountNumericSort)
    .filter((n): n is number => n != null && !Number.isNaN(n));
  if (nums.length === 0) {
    return {
      knownNumericCount: 0,
      minUsd: null,
      maxUsd: null,
      totalRows: hits.length
    };
  }
  return {
    knownNumericCount: nums.length,
    minUsd: Math.min(...nums),
    maxUsd: Math.max(...nums),
    totalRows: hits.length
  };
}

function computeDeadlineAggregate(hits: Scholarship[]): SeoDeadlineAggregate {
  const withText = hits.filter(
    (s) => s.deadline?.trim() && s.deadline !== '—'
  );
  const uniq = new Set(withText.map((s) => s.deadline!.trim()));
  const nearTermInSample = hits.some(
    (s) =>
      s.daysUntilDeadline != null &&
      s.daysUntilDeadline >= 0 &&
      s.daysUntilDeadline <= 45
  );
  return {
    rowsWithDeadlineText: withText.length,
    uniqueDeadlineStrings: uniq.size,
    deadlinesVaried: uniq.size >= 2,
    nearTermInSample
  };
}

function computeRequirementAggregate(hits: Scholarship[]): SeoRequirementAggregate {
  let essayRequiredYes = 0;
  let essayRequiredNo = 0;
  let essayUnknown = 0;
  let lowRequirementSignalRows = 0;
  for (const s of hits) {
    if (s.essayRequired === true) essayRequiredYes += 1;
    else if (s.essayRequired === false) essayRequiredNo += 1;
    else essayUnknown += 1;
    const rc = s.requirementSignalsCount;
    if (rc != null && rc <= 2) lowRequirementSignalRows += 1;
  }
  return {
    essayRequiredYes,
    essayRequiredNo,
    essayUnknown,
    lowRequirementSignalRows
  };
}

function topStringListCounts(
  hits: Scholarship[],
  pick: (s: Scholarship) => string[] | null | undefined,
  max: number
): string[] {
  const m = new Map<string, number>();
  for (const s of hits) {
    const arr = pick(s) ?? [];
    for (const raw of arr) {
      const x = raw.trim();
      if (!x) continue;
      m.set(x, (m.get(x) ?? 0) + 1);
    }
  }
  return Array.from(m.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([k]) => k);
}

function topCategoryLabelsFromScholarships(
  hits: Scholarship[],
  maxCats: number
): string[] {
  const counts = new Map<string, number>();
  for (const s of hits) {
    const cats = s.categories?.length ? s.categories : [];
    const primary = s.categorySlug?.trim();
    for (const c of cats) {
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    if (primary) counts.set(primary, (counts.get(primary) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCats)
    .map(([id]) =>
      id in SCHOLARSHIP_CATEGORY_LABELS
        ? SCHOLARSHIP_CATEGORY_LABELS[id as keyof typeof SCHOLARSHIP_CATEGORY_LABELS]
        : id
    );
}

function exampleLinesFromHits(hits: Scholarship[], maxN: number): SeoScholarshipExampleLine[] {
  return hits.slice(0, maxN).map((s) => ({
    title: s.title?.trim() || 'Untitled',
    amount: s.amount?.trim() || s.awardAmount?.trim() || undefined,
    deadline:
      s.deadline?.trim() && s.deadline !== '—' ? s.deadline.trim() : undefined,
    categories: s.categories?.filter(Boolean)
  }));
}

/**
 * Build structured facts for OpenAI prompts (no invented scholarship details beyond these lines).
 */
export function buildSeoManifestAiContext(
  list: Scholarship[],
  entry: SeoScholarshipRouteManifestEntry,
  opts?: { maxExamples?: number; maxCategories?: number }
): SeoManifestAiContext {
  const maxExamples = opts?.maxExamples ?? 8;
  const maxCategories = opts?.maxCategories ?? 6;

  const hits = getScholarshipsMatchingManifestEntry(list, entry);
  const segments = entry.canonicalPath.split('/').filter(Boolean);
  const tokens = parsePathSegmentsToTokens(segments);
  const tokenDescriptions =
    tokens?.map(describeToken) ?? segments.map((s) => `Segment: ${titleCaseSlug(s)}`);

  const legacy = (entry.legacyBaseSlugs ?? []) as string[];
  const filterLines = filtersJsonLines(entry.filters);

  return {
    canonicalPath: entry.canonicalPath,
    readablePageLabel: entry.h1Fallback,
    pageType: entry.pageType,
    scholarshipsCount: hits.length,
    tokenDescriptions,
    legacyBaseSlugs: legacy,
    filterLines,
    exampleListings: exampleLinesFromHits(hits, maxExamples),
    topCategoryLabels: topCategoryLabelsFromScholarships(hits, maxCategories),
    awardAggregate: computeAwardAggregate(hits),
    deadlineAggregate: computeDeadlineAggregate(hits),
    requirementAggregate: computeRequirementAggregate(hits),
    topStudyLevels: topStringListCounts(hits, (s) => s.studyLevels, 5),
    topCitizenshipLabels: topStringListCounts(hits, (s) => s.citizenshipStatuses, 5),
    topFieldsOfStudy: topStringListCounts(hits, (s) => s.fieldOfStudy, 5)
  };
}

export function formatAiContextForPrompt(ctx: SeoManifestAiContext): string {
  const examples =
    ctx.exampleListings.length > 0
      ? ctx.exampleListings
          .map((ex, i) => {
            const parts = [`${i + 1}. ${ex.title}`];
            if (ex.amount) parts.push(`   Amount (as listed): ${ex.amount}`);
            if (ex.deadline) parts.push(`   Deadline text (as listed): ${ex.deadline}`);
            if (ex.categories?.length)
              parts.push(`   Categories: ${ex.categories.join(', ')}`);
            return parts.join('\n');
          })
          .join('\n')
      : '(no rows matched this filter in the current catalog snapshot)';

  const aa = ctx.awardAggregate;
  const awardLines: string[] = [];
  if (aa.knownNumericCount >= 5 && aa.minUsd != null && aa.maxUsd != null) {
    awardLines.push(
      `Numeric award amounts exist for ${aa.knownNumericCount} of ${aa.totalRows} rows in this slice; sample min–max ≈ $${aa.minUsd.toLocaleString('en-US')}–$${aa.maxUsd.toLocaleString('en-US')} USD (not exhaustive, not every row).`
    );
  } else if (aa.knownNumericCount > 0 && aa.minUsd != null && aa.maxUsd != null) {
    awardLines.push(
      `Only ${aa.knownNumericCount} rows have numeric award data in this slice; rough range in that subset ≈ $${aa.minUsd.toLocaleString('en-US')}–$${aa.maxUsd.toLocaleString('en-US')} — treat as a weak hint.`
    );
  } else {
    awardLines.push(
      'Few or no numeric award amounts in this slice—describe variability without quoting dollar brackets unless you use the weak hint above.'
    );
  }

  const dd = ctx.deadlineAggregate;
  const deadlineLines: string[] = [
    `Rows with deadline text: ${dd.rowsWithDeadlineText} / ${ctx.scholarshipsCount}.`,
    dd.deadlinesVaried
      ? 'Deadline strings in the sample differ—do not state one universal deadline.'
      : 'Deadline text is sparse or uniform in the sample; still avoid inventing a calendar date.',
    dd.nearTermInSample
      ? 'At least one sampled row shows a deadline within ~45 days—suggest users check dates promptly (no exact date in copy unless from context lines).'
      : 'No near-term deadline signal in structured fields for the sample (still never invent dates).'
  ];

  const rq = ctx.requirementAggregate;
  const reqLines: string[] = [
    `Essay flag in data: yes≈${rq.essayRequiredYes}, no≈${rq.essayRequiredNo}, unknown≈${rq.essayUnknown} (sample only).`,
    rq.essayRequiredYes > 0 && rq.essayRequiredNo > 0
      ? 'Mixed essay requirements in sample—you may say requirements vary; do not claim “all no essay” or “all require essays”.'
      : rq.essayRequiredNo > rq.essayRequiredYes
        ? 'Many sampled rows flag no essay—still use cautious language (“often”, “many listings”).'
        : rq.essayRequiredYes > rq.essayRequiredNo
          ? 'Many sampled rows suggest essays may be involved—stay non-absolute.'
          : 'Essay requirement data is inconclusive in the sample—stay vague.',
    rq.lowRequirementSignalRows >= 3
      ? `${rq.lowRequirementSignalRows} rows show lighter requirement-signal counts in metadata—some programs may be comparatively lighter-touch (still verify each listing).`
      : ''
  ].filter(Boolean);

  const lines = [
    `Canonical URL path: ${ctx.canonicalPath}`,
    `Readable label (from manifest): ${ctx.readablePageLabel}`,
    `Page type: ${ctx.pageType}`,
    `Filtered listing count (current catalog snapshot): ${ctx.scholarshipsCount}`,
    '',
    'URL / filter tokens:',
    ...ctx.tokenDescriptions.map((t) => `- ${t}`),
    ''
  ];

  if (ctx.legacyBaseSlugs.length) {
    lines.push(
      'Legacy long-tail base slugs (AND):',
      ...ctx.legacyBaseSlugs.map((s) => `- ${s}`),
      ''
    );
  }
  if (ctx.filterLines.length) {
    lines.push(
      'Additional merged filters:',
      ...ctx.filterLines.map((s) => `- ${s}`),
      ''
    );
  }
  if (ctx.topCategoryLabels.length) {
    lines.push(
      'Frequent category labels (aggregated counts):',
      ctx.topCategoryLabels.join(', '),
      ''
    );
  }
  if (ctx.topStudyLevels.length) {
    lines.push('Common study levels (sample):', ctx.topStudyLevels.join(', '), '');
  }
  if (ctx.topCitizenshipLabels.length) {
    lines.push(
      'Common citizenship / residency labels (sample):',
      ctx.topCitizenshipLabels.join(', '),
      ''
    );
  }
  if (ctx.topFieldsOfStudy.length) {
    lines.push(
      'Common fields of study (sample):',
      ctx.topFieldsOfStudy.join(', '),
      ''
    );
    lines.push('');
  }

  lines.push('Award aggregates (safe phrasing only):', ...awardLines.map((l) => `- ${l}`), '');
  lines.push('Deadline aggregates:', ...deadlineLines.map((l) => `- ${l}`), '');
  lines.push('Requirement / essay hints (sample metadata):', ...reqLines.map((l) => `- ${l}`), '');

  lines.push(
    'Example visible listings (titles + fields; do not generalize one row to the whole page):',
    examples
  );

  return lines.join('\n');
}
