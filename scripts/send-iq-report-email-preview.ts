import 'dotenv/config';

import { postResend } from '../lib/email/postResend';
import { buildIqReportReadyEmailHtml } from '../lib/email/templates/iqReportReadyEmailHtml';

const toEmail = process.argv[2]?.trim() || 'loomany.self@gmail.com';

async function main() {
  const html = buildIqReportReadyEmailHtml({
    reportUrl: 'https://scholarshiptop.com/iq/report/preview-sample',
    iqScore: 128,
    archetype: 'Strategic Pattern Solver'
  });

  const result = await postResend({
    to: toEmail,
    subject: 'Preview: Your IQ report is ready',
    html,
    category: 'transactional'
  });

  if (!result.ok) {
    throw new Error(result.skipped || 'Preview email failed');
  }

  console.log(`IQ report preview email sent to ${toEmail}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
