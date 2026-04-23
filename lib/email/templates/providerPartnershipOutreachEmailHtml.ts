import { escapeHtml } from "@/lib/email/templates/escapeHtml";

/** Example after substitution; sends use `buildProviderPartnershipOutreachEmailSubject()`. */
export const PROVIDER_OUTREACH_SUBJECT_TEMPLATE =
  "Feature [Organization Name] at the top of ScholarshipTop";

/**
 * Inbox subject with the recipient organization name (or “your organization” when generic).
 */
export function buildProviderPartnershipOutreachEmailSubject(
  organizationName: string
): string {
  const useNeutral =
    isOutreachOrganizationPlaceholder(organizationName) ||
    shouldUseGenericOrganizationName(organizationName);
  const org = useNeutral
    ? "your organization"
    : organizationName.trim() || "your organization";
  const safe = org.replace(/\r?\n/g, " ").replace(/[\x00-\x1f\x7f]/g, "").trim();
  return `Feature ${safe} at the top of ScholarshipTop`;
}

/** Plain copy for docs / optional `PROVIDER_OUTREACH_BODY` override. */
export const PROVIDER_OUTREACH_BODY_TEMPLATE = `Hello,

I'm Daur, founder of ScholarshipTop.com.

We list grant opportunities from organizations like yours, and [Organization Name] is already featured in our database.

Right now, your page looks like a standard listing: [view your provider page link].

I'm reaching out because I'd love to set up a dedicated Partner Dashboard for your team. This will allow you to easily enrich your profile, add your logo, and update your upcoming grant deadlines.

As soon as your profile is updated, we will boost your organization to the top of our official Providers Directory. This guarantees priority visibility among our most active applicants.

To support this, my team would also love to write a deep-dive article about your mission for our Resources section, handling all the writing and SEO to send relevant traffic back to your programs.

Are you open to a brief exchange to get your dashboard access set up?

Best regards,

Daur Mussatay
Founder, ScholarshipTop`;

/** Inbox preview line (hidden preheader div, not the H1). */
export const OUTREACH_EMAIL_PREHEADER =
  "I'd love to set up a dedicated Partner Dashboard for your team to easily enrich your profile.";

export const OUTREACH_URLS = {
  site: "https://scholarshiptop.com",
  providersIndex: "https://scholarshiptop.com/providers"
} as const;

export type ProviderOutreachEmailParams = {
  siteOrigin: string;
  /** Shown in body (organization name or "your organization"). */
  organizationName: string;
  /**
   * When set, the provider page link uses this slug. Otherwise the provider directory.
   */
  providerSlug: string | null;
  /** Actual delivery address — used for visible Unsubscribe + list tooling. */
  recipientEmail: string;
};

/** True → treat as generic, avoid fake company names. */
export function isOutreachOrganizationPlaceholder(name: string): boolean {
  const t = name.trim().toLowerCase();
  if (!t) return true;
  if (t === "[organization name]") return true;
  if (t === "your organization") return true;
  return false;
}

/**
 * Long or comma-heavy `providers.display_name` values read badly in a sentence.
 * Use "your organization" in subject/body for those (applies to all provider outreach using this template).
 */
export function shouldUseGenericOrganizationName(name: string): boolean {
  const t = name.trim();
  if (!t) return false;
  if (t.length > 50) return true;
  if (/,|，/.test(t)) return true;
  return false;
}

/** Same cap mark as in-app and subscription / digest mail (see scholarshipTopEmailLayout). */
const LOGO_CAP_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="display:block">
  <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12 3.8 2.58 9.084a1 1 0 0 0 0 1.838L12 16.2l9.42-5.26a1 1 0 0 0 0-1.838z" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M12 16.2V22" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M12 22v-5" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="m12 16.2-4.5-2.7" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="m12 16.2 4.5-2.7" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`.trim();

const FONT =
  "Arial,Helvetica,'Segoe UI',ui-sans-serif,system-ui,sans-serif";
const copyColor = "#d1d5db";
const linkColor = "#34d399";
const muted = "#6b7280";
const lineColor = "#374151";

function link(
  href: string,
  label: string
): string {
  return `<a href="${escapeHtml(
    href
  )}" style="color:${linkColor};text-decoration:underline;">${escapeHtml(
    label
  )}</a>`;
}

function p(html: string): string {
  return `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.65;color:${copyColor};">${html}</p>`;
}

function pMutedSmall(html: string): string {
  return `<p style="margin:24px 0 0;font-family:${FONT};font-size:12px;line-height:1.55;color:#9ca3af;">${html}</p>`;
}

/**
 * Table layout, brand colors — dark card, orange mark, emerald link(s), no CTA block.
 */
export function buildProviderPartnershipOutreachEmailHtml(
  params: ProviderOutreachEmailParams
): string {
  const origin = params.siteOrigin.replace(/\/+$/, "");
  const useNeutral =
    isOutreachOrganizationPlaceholder(params.organizationName) ||
    shouldUseGenericOrganizationName(params.organizationName);
  const org =
    (useNeutral
      ? "your organization"
      : params.organizationName.trim()) || "your organization";
  const orgSafe = escapeHtml(org);
  const slug = params.providerSlug?.trim() || null;
  const preheader = OUTREACH_EMAIL_PREHEADER;
  const providerListHref = slug
    ? `${origin}/providers/${encodeURIComponent(slug)}`
    : OUTREACH_URLS.providersIndex;
  const listingLink = link(providerListHref, "view your provider page");

  const pSite = link(origin, "ScholarshipTop.com");

  const lead = p(
    `Hello,<br /><br />
I&rsquo;m Daur, founder of ${pSite}.<br /><br />
We list grant opportunities from organizations like yours, and <strong style="color:#f9fafb;">${orgSafe}</strong> is already featured in our database.`
  );

  const listingLine = p(
    `Right now, your page looks like a standard listing: ${listingLink}.`
  );

  const dashboard = p(
    `I&rsquo;m reaching out because I&rsquo;d love to set up a dedicated Partner Dashboard for your team. This will allow you to easily enrich your profile, add your logo, and update your upcoming grant deadlines.`
  );

  const boost = p(
    `As soon as your profile is updated, we will boost your organization to the top of our official Providers Directory. This guarantees priority visibility among our most active applicants.`
  );

  const resources = p(
    `To support this, my team would also love to write a deep-dive article about your mission for our Resources section, handling all the writing and SEO to send relevant traffic back to your programs.`
  );

  const question = p(
    `Are you open to a brief exchange to get your dashboard access set up?`
  );

  const signoff = p(
    `Best regards,<br /><br />
<span style="color:#f9fafb;">Daur Mussatay</span><br />
<span style="font-size:14px;color:${muted};">Founder, ScholarshipTop</span>`
  );

  const unsubPage = `${origin}/unsubscribe?email=${encodeURIComponent(
    params.recipientEmail.trim()
  )}`;
  const legal = pMutedSmall(
    `You&rsquo;re receiving this because we found a public contact for your program on the web. ${link(
      unsubPage,
      "Unsubscribe"
    )} from ScholarshipTop marketing, or reply and we&rsquo;ll stop using this address for this campaign.`
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <title>${escapeHtml(OUTREACH_EMAIL_PREHEADER.slice(0, 58))}…</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0f14;">
  <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;color:#0b0f14;">${escapeHtml(
    preheader
  )}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0b0f14;">
    <tr>
      <td align="center" style="padding:36px 16px 48px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;">
          <tr>
            <td style="background-color:#111827;border-radius:24px;padding:32px 28px;box-shadow:0 4px 24px rgba(0,0,0,0.35);border:1px solid #374151;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:22px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                      <tr>
                        <td align="center" style="padding-bottom:10px;">${LOGO_CAP_SVG}</td>
                      </tr>
                      <tr>
                        <td align="center" style="font-family:${FONT};font-size:20px;font-weight:800;letter-spacing:-0.02em;line-height:1.15;">
                          <span style="color:#f3f4f6;">Scholarship</span><span style="color:#f97316;">Top</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <h1 style="margin:0 0 20px;font-family:${FONT};font-size:20px;font-weight:800;line-height:1.3;color:#f9fafb;letter-spacing:-0.02em;text-align:left;">
                      Your listing, Resources, and what&rsquo;s next
                    </h1>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 22px;">
                      <tr><td style="height:1px;background-color:${lineColor};line-height:1px;font-size:1px;">&nbsp;</td></tr>
                    </table>
                    ${lead}
                    ${listingLine}
                    ${dashboard}
                    ${boost}
                    ${resources}
                    ${question}
                    ${signoff}
                    ${legal}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px 0;text-align:center;">
              <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.5;color:${muted};">
                &copy; ${new Date().getFullYear()} ScholarshipTop &middot; Built for students chasing scholarships
              </p>
              <p style="margin:8px 0 0;font-family:${FONT};font-size:12px;">
                <a href="${escapeHtml(
                  unsubPage
                )}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
                <span style="color:#4b5563;"> &middot; </span>
                <a href="${escapeHtml(
                  origin
                )}" style="color:#9ca3af;text-decoration:underline;">${escapeHtml(
    origin.replace(/^https?:\/\//, "")
  )}</a>
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
