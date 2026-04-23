import { escapeHtml } from '@/lib/email/templates/escapeHtml';

export type WeeklyFreeDigestFreeRow = {
  title: string;
  amountLine: string;
  deadlineLine: string;
  href: string;
};

export type WeeklyFreeDigestPremiumRow = {
  title: string;
  amountLine: string;
};

/**
 * Dark theme, green accents, table layout — Gmail-safe inline styles.
 */
export function buildWeeklyFreeDigestEmailHtml(params: {
  siteOrigin: string;
  preheader: string;
  firstName: string;
  introNewCount: number;
  freeRows: WeeklyFreeDigestFreeRow[];
  premium: WeeklyFreeDigestPremiumRow;
  hubHref: string;
  subscriptionHref: string;
  unsubscribeHref: string;
}): string {
  const origin = params.siteOrigin.replace(/\/+$/, '');
  const font =
    "Arial, Helvetica, 'Segoe UI', sans-serif";

  const freeBlock = params.freeRows
    .map(
      (r) => `
<tr>
  <td style="padding:0 0 20px;">
    <a href="${escapeHtml(r.href)}" style="display:block;color:#34d399;font-size:16px;font-weight:700;line-height:1.35;text-decoration:none;font-family:${font};">${escapeHtml(r.title)}</a>
    <p style="margin:8px 0 0;font-size:13px;line-height:1.45;color:#9ca3af;font-family:${font};">Amount: ${escapeHtml(r.amountLine)} | Deadline: ${escapeHtml(r.deadlineLine)}</p>
  </td>
</tr>`
    )
    .join('');

  const pre = escapeHtml(params.preheader);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <title>ScholarshipTop AI Digest</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;">
  <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;color:#0f172a;">${pre}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0f172a;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background-color:#111827;border-radius:20px;border:1px solid #1f2937;">
          <tr>
            <td style="padding:28px 22px 8px;font-family:${font};">
              <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;line-height:1.2;color:#ffffff;text-align:center;letter-spacing:-0.02em;">ScholarshipTop AI Digest</h1>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:#e5e7eb;">Hi ${escapeHtml(params.firstName)},</p>
              <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#d1d5db;">In the last 7 days, our AI scanned <strong style="color:#ffffff;">${params.introNewCount}</strong> newly added scholarships and found a few that strongly match your profile. Here are your top opportunities:</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${freeBlock}</table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 24px;">
                <tr><td style="height:1px;background-color:#374151;line-height:1px;font-size:1px;">&nbsp;</td></tr>
              </table>
              <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.06em;color:#6b7280;text-transform:uppercase;font-family:${font};">Premium match</p>
              <p style="margin:0 0 8px;font-size:16px;line-height:1.45;color:#f9fafb;font-weight:600;font-family:${font};">${escapeHtml(params.premium.title)}</p>
              <p style="margin:0 0 20px;font-size:13px;line-height:1.5;color:#9ca3af;font-family:${font};">${escapeHtml(params.premium.amountLine)}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 8px;">
                <tr>
                  <td align="center" style="padding:0 4px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;">
                      <tr>
                        <td align="center" style="border-radius:14px;background-color:#10b981;">
                          <a href="${escapeHtml(params.hubHref)}" style="display:block;width:100%;box-sizing:border-box;padding:16px 20px;font-size:16px;font-weight:700;color:#ffffff!important;text-decoration:none;font-family:${font};text-align:center;">View All My Matches</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#6b7280;text-align:center;font-family:${font};">
                <a href="${escapeHtml(params.subscriptionHref)}" style="color:#34d399;text-decoration:underline;">Unlock Premium</a> to see every high-value listing.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 22px 26px;border-top:1px solid #1f2937;">
              <p style="margin:0 0 10px;font-size:12px;line-height:1.5;color:#6b7280;text-align:center;font-family:${font};">
                You receive this because you have an account on ScholarshipTop. <a href="${escapeHtml(params.unsubscribeHref)}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
              </p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:#4b5563;text-align:center;font-family:${font};">
                <a href="${escapeHtml(origin)}" style="color:#6b7280;text-decoration:none;">scholarshiptop.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
