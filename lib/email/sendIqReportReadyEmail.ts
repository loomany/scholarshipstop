import 'server-only';

import { postResend } from '@/lib/email/postResend';
import { buildIqReportReadyEmailHtml } from '@/lib/email/templates/iqReportReadyEmailHtml';

export async function sendIqReportReadyEmail({
  toEmail,
  reportUrl,
  iqScore,
  archetype
}: {
  toEmail: string;
  reportUrl: string;
  iqScore: number;
  archetype: string;
}): Promise<{ ok: boolean; skipped?: string }> {
  const html = buildIqReportReadyEmailHtml({
    reportUrl,
    iqScore,
    archetype
  });

  return postResend({
    to: toEmail,
    subject: 'Your IQ report is ready',
    html,
    category: 'transactional'
  });
}
