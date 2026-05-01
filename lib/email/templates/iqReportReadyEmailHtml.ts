import { getEmailSiteOrigin } from '@/lib/email/emailSiteOrigin';
import { escapeHtml } from '@/lib/email/templates/escapeHtml';
import { buildScholarshipTopPremiumEmailHtml } from '@/lib/email/templates/scholarshipTopEmailLayout';

export type IqReportReadyEmailHtmlOptions = {
  reportUrl: string;
  iqScore: number;
  archetype: string;
};

export function buildIqReportReadyEmailHtml({
  reportUrl,
  iqScore,
  archetype
}: IqReportReadyEmailHtmlOptions): string {
  const siteOrigin = getEmailSiteOrigin();
  const safeArchetype = escapeHtml(archetype);
  const summaryHtml = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:22px 0 6px;border:1px solid #374151;border-radius:18px;background-color:#0f172a;">
      <tr>
        <td style="padding:18px;">
          <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;color:#9ca3af;text-transform:uppercase;letter-spacing:0.16em;font-weight:700;">Your result preview</p>
          <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.35;color:#f9fafb;font-weight:800;">IQ-style score: ${iqScore}</p>
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.35;color:#f9fafb;font-weight:800;">Brain Archetype: ${safeArchetype}</p>
        </td>
      </tr>
    </table>
  `;

  return buildScholarshipTopPremiumEmailHtml({
    preheader: `Your IQ-style report is ready. Score preview: ${iqScore}.`,
    headline: 'Your full IQ-style report is ready',
    accentLine: 'Payment received. Your private result link is unlocked.',
    bodyParagraphsHtml: [
      'Your assessment has been processed and unlocked. Open your private report to view the score interpretation, domain breakdown, Brain Archetype, and strengths profile.',
      'This is an educational IQ-style profile, not a clinical diagnosis or licensed psychological assessment.'
    ],
    extraHtml: summaryHtml,
    ctaHref: reportUrl,
    ctaLabel: 'Open my full report',
    siteOrigin,
    unsubscribeUrl: `${siteOrigin}/iq/help`,
    postCtaMutedText: 'Keep this email. The button is your private link back to the report.'
  });
}
