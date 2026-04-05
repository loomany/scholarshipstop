import type { ClauseParityReport } from '@/lib/scholarships-v2/parity/types';

export type ParityThresholds = {
  maxMismatch: number;
  maxStubbed: number;
  maxMissing: number;
  maxExtra: number;
  minAvgParityScore: number;
};

export const DEFAULT_PARITY_THRESHOLDS: ParityThresholds = {
  maxMismatch: 0,
  maxStubbed: 0,
  maxMissing: 0,
  maxExtra: 0,
  minAvgParityScore: 90
};

export type ParityThresholdViolation = {
  key: keyof ParityThresholds;
  expected: number;
  actual: number;
};

export function evaluateParityThresholds(
  summary: {
    mismatch: number;
    stubbed: number;
    missing: number;
    extra: number;
    avgParityScore: number;
  },
  thresholds: ParityThresholds = DEFAULT_PARITY_THRESHOLDS
): ParityThresholdViolation[] {
  const violations: ParityThresholdViolation[] = [];

  if (summary.mismatch > thresholds.maxMismatch) {
    violations.push({ key: 'maxMismatch', expected: thresholds.maxMismatch, actual: summary.mismatch });
  }
  if (summary.stubbed > thresholds.maxStubbed) {
    violations.push({ key: 'maxStubbed', expected: thresholds.maxStubbed, actual: summary.stubbed });
  }
  if (summary.missing > thresholds.maxMissing) {
    violations.push({ key: 'maxMissing', expected: thresholds.maxMissing, actual: summary.missing });
  }
  if (summary.extra > thresholds.maxExtra) {
    violations.push({ key: 'maxExtra', expected: thresholds.maxExtra, actual: summary.extra });
  }
  if (summary.avgParityScore < thresholds.minAvgParityScore) {
    violations.push({
      key: 'minAvgParityScore',
      expected: thresholds.minAvgParityScore,
      actual: summary.avgParityScore
    });
  }

  return violations;
}

export function assertParityThresholds(
  summary: {
    mismatch: number;
    stubbed: number;
    missing: number;
    extra: number;
    avgParityScore: number;
  },
  thresholds: ParityThresholds = DEFAULT_PARITY_THRESHOLDS
): void {
  const violations = evaluateParityThresholds(summary, thresholds);
  if (violations.length === 0) return;

  const message = violations
    .map((v) => `${v.key}: expected ${v.key === 'minAvgParityScore' ? '>=' : '<='} ${v.expected}, got ${v.actual}`)
    .join('; ');

  throw new Error(`Parity thresholds failed: ${message}`);
}

export function collectWorstFixtureIds(reports: ClauseParityReport[], top = 3): string[] {
  return [...reports]
    .sort((a, b) => a.summary.parityScore - b.summary.parityScore)
    .slice(0, Math.max(1, top))
    .map((r) => r.inputId);
}
