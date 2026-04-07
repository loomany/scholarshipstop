import { escapeHtml } from '@/lib/email/templates/escapeHtml';

/** Lucide-style graduation cap (stroke), orange — matches in-app brand. */
const LOGO_CAP_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="display:block">
  <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12 3.8 2.58 9.084a1 1 0 0 0 0 1.838L12 16.2l9.42-5.26a1 1 0 0 0 0-1.838z" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M12 16.2V22" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M12 22v-5" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="m12 16.2-4.5-2.7" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="m12 16.2 4.5-2.7" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`.trim();

const EMERALD_CHECK_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="display:inline-block;vertical-align:middle;margin-right:8px">
  <circle cx="12" cy="12" r="10" stroke="#10b981" stroke-width="2" fill="none"/>
  <path d="m9 12 2 2 4-4" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`.trim();

export type PremiumEmailLayoutOptions = {
  /** Shown in inbox preview (hidden in body). */
  preheader: string;
  /** Main card headline (#111827). */
  headline: string;
  /** Optional emerald check + short line under headline. */
  accentLine?: string;
  /** Safe HTML fragments (already escaped or static) for main copy. */
  bodyParagraphsHtml: string[];
  ctaHref: string;
  ctaLabel: string;
  /** Primary site origin for absolute asset links / footer. */
  siteOrigin: string;
  /** One-click preferences; defaults to /account. */
  unsubscribeUrl: string;
  /** Plain fallback URL under the button. */
  secondaryLinkNote?: string;
};

/**
 * Table-based layout for broad client support; palette matches ScholarshipTop (light EdTech).
 */
export function buildScholarshipTopPremiumEmailHtml(
  opts: PremiumEmailLayoutOptions
): string {
  const origin = opts.siteOrigin.replace(/\/+$/, '');
  const unsub = opts.unsubscribeUrl || `${origin}/account`;
  const preEscaped = escapeHtml(opts.preheader);

  const paragraphs = opts.bodyParagraphsHtml
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.6;color:#374151;">${p}</p>`
    )
    .join('');

  const accentBlock = opts.accentLine
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;">
        <tr>
          <td style="font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;line-height:1.5;color:#111827;font-weight:600;">
            ${EMERALD_CHECK_SVG}<span style="vertical-align:middle;">${opts.accentLine}</span>
          </td>
        </tr>
      </table>`
    : '';

  const secondary =
    opts.secondaryLinkNote ??
    `If the button doesn&rsquo;t work, copy and paste this link into your browser:<br/>
    <a href="${escapeHtml(opts.ctaHref)}" style="color:#10b981;word-break:break-all;">${escapeHtml(opts.ctaHref)}</a>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <title>${escapeHtml(opts.headline)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;">
  <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;color:#f9fafb;">
    ${preEscaped}
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f9fafb;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;">
          <tr>
            <td style="background-color:#ffffff;border-radius:24px;padding:40px 36px;box-shadow:0 4px 24px rgba(17,24,39,0.06);border:1px solid #e5e7eb;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom:28px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:12px;">${LOGO_CAP_SVG}</td>
                        <td style="vertical-align:middle;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:22px;font-weight:800;letter-spacing:-0.02em;line-height:1.1;">
                          <span style="color:#111827;">Scholarship</span><span style="color:#f97316;">Top</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <h1 style="margin:0 0 12px;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:24px;font-weight:800;line-height:1.25;color:#111827;letter-spacing:-0.02em;">
                      ${escapeHtml(opts.headline)}
                    </h1>
                    ${accentBlock}
                    ${paragraphs}
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
                      <tr>
                        <td align="left">
                          <a href="${escapeHtml(opts.ctaHref)}" style="display:inline-block;background-color:#000000;color:#ffffff!important;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px;">
                            ${escapeHtml(opts.ctaLabel)}
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:20px 0 0;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:13px;line-height:1.55;color:#6b7280;">
                      ${secondary}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 8px 0;text-align:center;">
              <p style="margin:0 0 8px;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:12px;line-height:1.5;color:#9ca3af;">
                &copy; ${new Date().getFullYear()} ScholarshipTop. Built for students chasing scholarships.
              </p>
              <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:12px;line-height:1.5;">
                <a href="${escapeHtml(unsub)}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>
                <span style="color:#d1d5db;"> &middot; </span>
                <a href="${escapeHtml(origin)}" style="color:#6b7280;text-decoration:underline;">scholarshiptop.com</a>
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
