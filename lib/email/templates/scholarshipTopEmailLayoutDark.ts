import { escapeHtml } from '@/lib/email/templates/escapeHtml';

/** Lucide-style graduation cap (stroke), orange — on dark background. */
const LOGO_CAP_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="display:block;margin:0 auto">
  <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12 3.8 2.58 9.084a1 1 0 0 0 0 1.838L12 16.2l9.42-5.26a1 1 0 0 0 0-1.838z" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M12 16.2V22" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M12 22v-5" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="m12 16.2-4.5-2.7" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="m12 16.2 4.5-2.7" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`.trim();

const EMERALD_CHECK_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="display:inline-block;vertical-align:middle;margin-right:8px">
  <circle cx="12" cy="12" r="10" stroke="#34d399" stroke-width="2" fill="none"/>
  <path d="m9 12 2 2 4-4" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`.trim();

export type DarkEmailLayoutOptions = {
  preheader: string;
  headline: string;
  accentLine?: string;
  bodyParagraphsHtml: string[];
  /** Insert between paragraphs and CTA (e.g. plan details box). */
  extraHtml?: string;
  ctaHref: string;
  ctaLabel: string;
  siteOrigin: string;
  unsubscribeUrl: string;
  secondaryLinkNote?: string;
};

/**
 * Dark ScholarshipTop email shell: centered brand, centered primary CTA, table layout for clients.
 */
export function buildScholarshipTopDarkEmailHtml(opts: DarkEmailLayoutOptions): string {
  const origin = opts.siteOrigin.replace(/\/+$/, '');
  const unsub = opts.unsubscribeUrl || `${origin}/account`;
  const preEscaped = escapeHtml(opts.preheader);

  const paragraphs = opts.bodyParagraphsHtml
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.65;color:#d1d5db;">${p}</p>`
    )
    .join('');

  const accentBlock = opts.accentLine
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;">
        <tr>
          <td align="center" style="font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;line-height:1.5;color:#f9fafb;font-weight:600;">
            ${EMERALD_CHECK_SVG}<span style="vertical-align:middle;">${opts.accentLine}</span>
          </td>
        </tr>
      </table>`
    : '';

  const secondaryDefault = `If the button doesn&rsquo;t work, copy and paste this link into your browser:<br/>
    <a href="${escapeHtml(opts.ctaHref)}" style="color:#fb923c;word-break:break-all;">${escapeHtml(opts.ctaHref)}</a>`;
  const secondary =
    opts.secondaryLinkNote === ''
      ? ''
      : (opts.secondaryLinkNote ?? secondaryDefault);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <title>${escapeHtml(opts.headline)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0b1120;">
  <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;color:#0b1120;">
    ${preEscaped}
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0b1120;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;">
          <tr>
            <td style="background-color:#111827;border-radius:20px;padding:40px 32px;border:1px solid #1f2937;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                      <tr>
                        <td align="center" style="padding-bottom:12px;">${LOGO_CAP_SVG}</td>
                      </tr>
                      <tr>
                        <td align="center" style="font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:22px;font-weight:800;letter-spacing:-0.02em;line-height:1.2;">
                          <span style="color:#f9fafb;">Scholarship</span><span style="color:#f97316;">Top</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin:0 0 12px;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:24px;font-weight:800;line-height:1.25;color:#f9fafb;letter-spacing:-0.02em;">
                      ${escapeHtml(opts.headline)}
                    </h1>
                    ${accentBlock}
                  </td>
                </tr>
                <tr>
                  <td>
                    ${paragraphs}
                    ${opts.extraHtml ?? ''}
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:28px 0 8px;">
                      <tr>
                        <td align="center">
                          <a href="${escapeHtml(opts.ctaHref)}" style="display:inline-block;background-color:#f97316;color:#0f172a!important;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:12px;">
                            ${escapeHtml(opts.ctaLabel)}
                          </a>
                        </td>
                      </tr>
                    </table>
                    ${
                      secondary
                        ? `<p style="margin:20px 0 0;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:13px;line-height:1.55;color:#9ca3af;text-align:center;">
                      ${secondary}
                    </p>`
                        : ''
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 8px 0;text-align:center;">
              <p style="margin:0 0 8px;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:12px;line-height:1.5;color:#6b7280;">
                &copy; ${new Date().getFullYear()} ScholarshipTop. Built for students chasing scholarships.
              </p>
              <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:12px;line-height:1.5;">
                <a href="${escapeHtml(unsub)}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
                <span style="color:#4b5563;"> &middot; </span>
                <a href="${escapeHtml(origin)}" style="color:#9ca3af;text-decoration:underline;">scholarshiptop.com</a>
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
