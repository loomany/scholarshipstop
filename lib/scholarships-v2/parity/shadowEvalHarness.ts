import { buildV2FiltersFromLegacyInput } from '@/lib/scholarships-v2/adapters/buildV2FiltersFromLegacy';
import { compareLegacyAndV2Clauses } from '@/lib/scholarships-v2/parity/compareClauses';
import { buildLegacyReferenceClausesFromCanonicalInput } from '@/lib/scholarships-v2/parity/legacyReferencePath';
import { buildParityArtifactV1, type ParityArtifactV1 } from '@/lib/scholarships-v2/parity/reportWriter';
import type { CanonicalLegacyLikeInput, ClauseParityReport } from '@/lib/scholarships-v2/parity/types';
import { buildScholarshipsQuerySpec } from '@/lib/scholarships-v2/querySpec/buildQuerySpec';
import { buildSqlClausesFromQuerySpec } from '@/lib/scholarships-v2/sqlSpec/buildSqlClausesFromQuerySpec';

export function runShadowEvalHarness(inputs: CanonicalLegacyLikeInput[]): {
  reports: ClauseParityReport[];
  summary: {
    totalInputs: number;
    avgParityScore: number;
    missing: number;
    extra: number;
    mismatch: number;
    stubbed: number;
  };
} {
  const reports = inputs.map((input) => {
    const legacyClauses = buildLegacyReferenceClausesFromCanonicalInput(input);

    const effectiveFilters = buildV2FiltersFromLegacyInput({
      searchParams: new URLSearchParams(input.searchParams),
      moreFilters: input.moreFilters
    });
    const querySpec = buildScholarshipsQuerySpec(effectiveFilters);
    const v2Sql = buildSqlClausesFromQuerySpec(querySpec);

    return compareLegacyAndV2Clauses({
      inputId: input.id,
      legacyClauses,
      v2Clauses: v2Sql.clauses,
      v2Stubs: v2Sql.stubs
    });
  });

  const totalInputs = reports.length;
  const sumScore = reports.reduce((acc, r) => acc + r.summary.parityScore, 0);
  const missing = reports.reduce((acc, r) => acc + r.summary.missing, 0);
  const extra = reports.reduce((acc, r) => acc + r.summary.extra, 0);
  const mismatch = reports.reduce((acc, r) => acc + r.summary.mismatch, 0);
  const stubbed = reports.reduce((acc, r) => acc + r.summary.stubbed, 0);

  return {
    reports,
    summary: {
      totalInputs,
      avgParityScore: totalInputs > 0 ? Math.round(sumScore / totalInputs) : 100,
      missing,
      extra,
      mismatch,
      stubbed
    }
  };
}

export function runShadowEvalHarnessWithArtifact(
  inputs: CanonicalLegacyLikeInput[],
  generatedAt: string
): { artifact: ParityArtifactV1; reports: ClauseParityReport[]; summary: ReturnType<typeof runShadowEvalHarness>['summary'] } {
  const result = runShadowEvalHarness(inputs);
  const artifact = buildParityArtifactV1({
    generatedAt,
    reports: result.reports,
    summary: result.summary
  });
  return {
    artifact,
    reports: result.reports,
    summary: result.summary
  };
}
