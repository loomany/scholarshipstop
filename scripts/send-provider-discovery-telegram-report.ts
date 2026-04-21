import fs from 'node:fs';
import path from 'node:path';

import {
  sendProviderDiscoveryTelegramSummary,
  type ProviderDiscoveryReportLike
} from '@/lib/telegram/providerDiscoveryReport';

const ROOT = path.resolve(__dirname, '..');
const REPORT_JSON = path.join(
  ROOT,
  'scripts',
  'output',
  'provider-partnerships-report.json'
);

async function main() {
  if (!fs.existsSync(REPORT_JSON)) {
    throw new Error(`Report file not found: ${REPORT_JSON}`);
  }
  const raw = fs.readFileSync(REPORT_JSON, 'utf8');
  const parsed = JSON.parse(raw) as ProviderDiscoveryReportLike[];
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Report JSON is empty.');
  }
  await sendProviderDiscoveryTelegramSummary(parsed);
  console.log(
    JSON.stringify({
      ok: true,
      reportPath: REPORT_JSON,
      domains: parsed.length
    })
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
