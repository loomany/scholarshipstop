import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { ClauseParityReport } from '@/lib/scholarships-v2/parity/types';

export type ParityArtifactV1 = {
  schemaVersion: 'v1';
  generatedAt: string;
  summary: {
    totalInputs: number;
    avgParityScore: number;
    missing: number;
    extra: number;
    mismatch: number;
    stubbed: number;
  };
  fixtures: Array<{
    id: string;
    summary: ClauseParityReport['summary'];
    diffs: ClauseParityReport['diffs'];
  }>;
};

export function buildParityArtifactV1(input: {
  generatedAt: string;
  reports: ClauseParityReport[];
  summary: ParityArtifactV1['summary'];
}): ParityArtifactV1 {
  return {
    schemaVersion: 'v1',
    generatedAt: input.generatedAt,
    summary: input.summary,
    fixtures: [...input.reports]
      .sort((a, b) => a.inputId.localeCompare(b.inputId))
      .map((report) => ({
        id: report.inputId,
        summary: report.summary,
        diffs: [...report.diffs].sort((a, b) => {
          const keyA = `${a.category}:${a.key}:${a.legacyClause ?? ''}:${a.v2Clause ?? ''}`;
          const keyB = `${b.category}:${b.key}:${b.legacyClause ?? ''}:${b.v2Clause ?? ''}`;
          return keyA.localeCompare(keyB);
        })
      }))
  };
}

export function serializeParityArtifactV1(artifact: ParityArtifactV1): string {
  return `${JSON.stringify(artifact, null, 2)}\n`;
}

export function writeParityArtifactV1(filePath: string, artifact: ParityArtifactV1): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, serializeParityArtifactV1(artifact), 'utf8');
}
