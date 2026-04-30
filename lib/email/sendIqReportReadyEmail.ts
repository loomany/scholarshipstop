import 'server-only';

import { postResend } from '@/lib/email/postResend';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
  const safeUrl = escapeHtml(reportUrl);
  const safeArchetype = escapeHtml(archetype);

  const html = `
    <div style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:28px;padding:32px;box-shadow:0 24px 70px rgba(15,23,42,0.10);">
          <p style="margin:0 0 12px;font-size:12px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#4f46e5;">IQ report unlocked</p>
          <h1 style="margin:0;font-size:32px;line-height:1.08;letter-spacing:-0.04em;color:#020617;">Your full IQ-style report is ready.</h1>
          <p style="margin:18px 0 0;font-size:16px;line-height:1.7;color:#475569;">
            Your assessment has been processed and unlocked. Open your private report to view your score interpretation, domain breakdown, Brain Archetype, and strengths profile.
          </p>
          <div style="margin:24px 0;padding:18px;border-radius:20px;background:#f8fafc;border:1px solid #e2e8f0;">
            <p style="margin:0;font-size:14px;color:#64748b;">Preview</p>
            <p style="margin:8px 0 0;font-size:18px;font-weight:700;color:#0f172a;">IQ-style score: ${iqScore}</p>
            <p style="margin:6px 0 0;font-size:18px;font-weight:700;color:#0f172a;">Brain Archetype: ${safeArchetype}</p>
          </div>
          <a href="${safeUrl}" style="display:inline-block;width:100%;box-sizing:border-box;text-align:center;background:#020617;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;border-radius:999px;padding:16px 22px;">
            Open my full report
          </a>
          <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
            This is an educational IQ-style profile, not a clinical diagnosis or licensed psychological assessment.
          </p>
        </div>
      </div>
    </div>
  `;

  return postResend({
    to: toEmail,
    subject: 'Your IQ report is ready',
    html,
    category: 'transactional'
  });
}
