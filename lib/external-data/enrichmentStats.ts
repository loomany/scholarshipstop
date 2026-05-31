import 'server-only';

import { loadSchoolEnrichmentRecords } from './loadStaticEnrichment';
import type { SchoolEnrichment } from './types';

export type SchoolEnrichmentCoverageStats = {
  totalSchools: number;
  withTuitionInState: number;
  withTuitionOutOfState: number;
  withAdmissionRate: number;
  withCompletionRate: number;
  withMedianEarnings: number;
  withResearchSignal: number;
};

export type SchoolEnrichmentPreviewRow = {
  school_name: string;
  state: string;
  tuition_in_state: number | null;
  median_earnings: number | null;
  admission_rate: number | null;
};

let coverageCache: SchoolEnrichmentCoverageStats | null = null;

function scoreSchoolRow(row: SchoolEnrichment): number {
  let score = 0;
  if (row.tuition_in_state != null) score += 1;
  if (row.tuition_out_of_state != null) score += 1;
  if (row.admission_rate != null) score += 1;
  if (row.completion_rate != null) score += 1;
  if (row.median_earnings != null) score += 1;
  if (row.student_size != null) score += 1;
  if (row.research_signal != null) score += 1;
  return score;
}

export function getSchoolEnrichmentCoverageStats(): SchoolEnrichmentCoverageStats {
  if (coverageCache) return coverageCache;

  const records = loadSchoolEnrichmentRecords();
  coverageCache = {
    totalSchools: records.length,
    withTuitionInState: records.filter((r) => r.tuition_in_state != null).length,
    withTuitionOutOfState: records.filter((r) => r.tuition_out_of_state != null)
      .length,
    withAdmissionRate: records.filter((r) => r.admission_rate != null).length,
    withCompletionRate: records.filter((r) => r.completion_rate != null).length,
    withMedianEarnings: records.filter((r) => r.median_earnings != null).length,
    withResearchSignal: records.filter((r) => r.research_signal != null).length
  };
  return coverageCache;
}

export function getUniversityComparePreview(limit = 3): SchoolEnrichmentPreviewRow[] {
  const cap = Math.max(1, Math.min(limit, 10));
  return loadSchoolEnrichmentRecords()
    .filter((row) => row.state?.trim() && row.school_name?.trim())
    .sort((a, b) => scoreSchoolRow(b) - scoreSchoolRow(a))
    .slice(0, cap)
    .map((row) => ({
      school_name: row.school_name,
      state: row.state!.trim().toUpperCase(),
      tuition_in_state: row.tuition_in_state ?? null,
      median_earnings: row.median_earnings ?? null,
      admission_rate: row.admission_rate ?? null
    }));
}
