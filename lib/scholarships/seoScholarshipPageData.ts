import {
  fieldOfStudyDisplayList,
  studyLevelsDisplayList,
  type Scholarship
} from '@/app/scholarships/scholarshipsData';
import type { SeoScholarshipRouteManifestEntry } from '@/lib/scholarships/seoScholarshipManifest';
import { getScholarshipsMatchingManifestEntry } from '@/lib/scholarships/seoScholarshipListing';

export type SeoListingPageData = {
  exactCount: number;
  award: {
    medianUsd: number | null;
    minUsd: number | null;
    maxUsd: number | null;
    statedAmountCount: number;
    unstatedAmountCount: number;
  };
  deadline: {
    within30Days: number;
    within60Days: number;
    rollingOrUnknown: number;
    nearestDays: number | null;
    nearestLabels: string[];
  };
  essays: {
    yesCount: number;
    noCount: number;
    unknownCount: number;
  };
  requirements: {
    commonRequirementTypes: string[];
    commonStudyLevels: string[];
    commonFields: string[];
    commonResidency: string[];
  };
  topProviders: Array<{ name: string; count: number }>;
  topTags: string[];
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}

function topStringCounts(values: string[], max: number): string[] {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([value]) => value);
}

export function buildSeoListingPageData(
  list: Scholarship[],
  entry: SeoScholarshipRouteManifestEntry
): SeoListingPageData {
  const hits = getScholarshipsMatchingManifestEntry(list, entry);
  const numericAwards = hits
    .map((row) => row.awardAmountNumericSort)
    .filter((value): value is number => value != null && !Number.isNaN(value));
  const providers = new Map<string, number>();
  const nearestLabels: string[] = [];
  let within30Days = 0;
  let within60Days = 0;
  let rollingOrUnknown = 0;
  let nearestDays: number | null = null;
  let essayYes = 0;
  let essayNo = 0;
  let essayUnknown = 0;
  const requirementTypes: string[] = [];
  const studyLevels: string[] = [];
  const fields: string[] = [];
  const residency: string[] = [];
  const tags: string[] = [];

  for (const row of hits) {
    if (row.provider?.trim()) {
      const provider = row.provider.trim();
      providers.set(provider, (providers.get(provider) ?? 0) + 1);
    }

    if (row.daysUntilDeadline != null && row.daysUntilDeadline >= 0) {
      if (row.daysUntilDeadline <= 30) within30Days += 1;
      if (row.daysUntilDeadline <= 60) within60Days += 1;
      if (nearestDays == null || row.daysUntilDeadline < nearestDays) {
        nearestDays = row.daysUntilDeadline;
      }
      if (nearestLabels.length < 3 && row.deadline?.trim() && row.deadline !== '—') {
        nearestLabels.push(row.deadline.trim());
      }
    } else {
      rollingOrUnknown += 1;
    }

    if (row.essayRequired === true) essayYes += 1;
    else if (row.essayRequired === false) essayNo += 1;
    else essayUnknown += 1;

    requirementTypes.push(...(row.requirementTypes ?? []));
    studyLevels.push(...studyLevelsDisplayList(row));
    fields.push(...fieldOfStudyDisplayList(row));
    residency.push(...(row.citizenshipStatuses ?? []));
    tags.push(...(row.categories ?? []));
    if (row.categorySlug?.trim()) tags.push(row.categorySlug.trim());
  }

  const topProviders = Array.from(providers.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return {
    exactCount: hits.length,
    award: {
      medianUsd: median(numericAwards),
      minUsd: numericAwards.length > 0 ? Math.min(...numericAwards) : null,
      maxUsd: numericAwards.length > 0 ? Math.max(...numericAwards) : null,
      statedAmountCount: numericAwards.length,
      unstatedAmountCount: Math.max(0, hits.length - numericAwards.length)
    },
    deadline: {
      within30Days,
      within60Days,
      rollingOrUnknown,
      nearestDays,
      nearestLabels
    },
    essays: {
      yesCount: essayYes,
      noCount: essayNo,
      unknownCount: essayUnknown
    },
    requirements: {
      commonRequirementTypes: topStringCounts(requirementTypes, 6),
      commonStudyLevels: topStringCounts(studyLevels, 4),
      commonFields: topStringCounts(fields, 5),
      commonResidency: topStringCounts(residency, 4)
    },
    topProviders,
    topTags: topStringCounts(tags, 6)
  };
}
