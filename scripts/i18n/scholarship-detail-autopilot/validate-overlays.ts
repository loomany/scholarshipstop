import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { DATE } from './env';
import type { GeneratedWave } from './generate-overlays';
import type { AutopilotCandidate } from './types';

export type ValidationReport = {
  hardFails: string[];
  softWarns: string[];
  passed: boolean;
  failRate: number;
};

export function validateWave(
  generated: GeneratedWave,
  candidates: AutopilotCandidate[]
): ValidationReport {
  const hardFails = [...generated.validationErrors];
  const softWarns: string[] = [];

  for (const c of candidates) {
    if (!c.source_url_present) softWarns.push(`${c.slug}: no official URL in source`);
    if (c.amount === 'See official source') softWarns.push(`${c.slug}: unclear amount`);
    if (c.deadline === 'See official source') softWarns.push(`${c.slug}: unclear deadline`);
  }

  const expectedRows = candidates.length * 2;
  if (generated.rows.length !== expectedRows) {
    hardFails.push(`row count ${generated.rows.length} != ${expectedRows}`);
  }

  const failRate = candidates.length ? hardFails.length / (candidates.length * 2) : 1;
  const passed = hardFails.length === 0 && failRate <= 0.1;

  return { hardFails, softWarns, passed, failRate };
}

export function writeValidationReport(waveNum: number, report: ValidationReport, failedSlugs: string[]) {
  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  const mdPath = join(
    process.cwd(),
    'reports/seo',
    `i18n-stage5e-6-autopilot-wave-${waveNum}-validation-${DATE}.md`
  );
  const csvPath = join(
    process.cwd(),
    'reports/seo',
    `i18n-stage5e-6-autopilot-wave-${waveNum}-failed-rows-${DATE}.csv`
  );

  const body = `# Autopilot wave ${waveNum} validation (${DATE})

- Hard fails: ${report.hardFails.length}
- Soft warns: ${report.softWarns.length}
- Fail rate: ${(report.failRate * 100).toFixed(1)}%
- **Passed:** ${report.passed ? 'yes' : 'no'}

## Hard fails
${report.hardFails.length ? report.hardFails.map((f) => `- ${f}`).join('\n') : '- none'}

## Soft warns (first 20)
${report.softWarns.slice(0, 20).map((w) => `- ${w}`).join('\n') || '- none'}
`;
  writeFileSync(mdPath, body, 'utf8');

  if (failedSlugs.length) {
    writeFileSync(csvPath, 'slug\n' + failedSlugs.map((s) => `"${s}"`).join('\n') + '\n', 'utf8');
  }

  return { mdPath, csvPath };
}
