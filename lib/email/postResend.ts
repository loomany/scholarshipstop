import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';

import { normalizeMarketingEmail } from '@/lib/email/normalizeMarketingEmail';
import { resolveMailFrom } from '@/lib/email/resendEnvelope';
import { isSmtpConfigured, sendViaSmtp } from '@/lib/email/smtpTransport';

export type PostResendCategory = 'marketing' | 'transactional';

export type PostResendParams = {
  to: string;
  subject: string;
  html: string;
  category: PostResendCategory;
  /**
   * HTTPS URL for `List-Unsubscribe` / one-click POST — use
   * `buildMarketingUnsubscribeListHeaderUrl` (`/api/unsubscribe?email=`).
   * Required when `category` is `marketing`.
   */
  marketingListUnsubscribeUrl?: string;
  /** Override default From (e.g. provider outreach). */
  from?: string;
  /** Single address or list → SMTP Reply-To. */
  replyTo?: string | string[];
};

function maskRecipient(email: string): string {
  const [a, d = ''] = email.split('@');
  if (!a) return `***@${d}`;
  if (a.length <= 2) return `${a[0] ?? '*'}***@${d}`;
  return `${a.slice(0, 2)}***@${d}`;
}

function createMarketingSupabase(): ReturnType<
  typeof createClient<Database>
> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient<Database>(url, key);
}

async function isMarketingEmailUnsubscribed(
  normalizedEmail: string
): Promise<boolean> {
  const sb = createMarketingSupabase();
  if (!sb) {
    return false;
  }
  const { data, error } = await sb
    .from('unsubscribed_emails')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();
  if (error) {
    console.warn('[email:postResend] unsubscribed_emails lookup failed', error.message);
    return false;
  }
  return Boolean(data?.id);
}

function marketingListUnsubscribeHeaders(
  listUnsubscribeTargetUrl: string
): Record<string, string> {
  return {
    'List-Unsubscribe': `<${listUnsubscribeTargetUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
  };
}

/**
 * Central outbound send (SMTP / Brevo). Keeps marketing unsubscribe guard + RFC 8058 headers.
 * Name retained for call-site compatibility after Resend → SMTP migration.
 * Safe to import from CLI scripts (no `server-only`).
 */
export async function postResend(
  params: PostResendParams
): Promise<{ ok: boolean; skipped?: string }> {
  const from = params.from?.trim() || resolveMailFrom();
  if (!isSmtpConfigured()) {
    return {
      ok: false,
      skipped: 'SMTP not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS)'
    };
  }

  const toNorm = normalizeMarketingEmail(params.to);
  if (params.category === 'marketing') {
    const listUrl = params.marketingListUnsubscribeUrl?.trim();
    if (!listUrl) {
      return {
        ok: false,
        skipped: 'marketingListUnsubscribeUrl required for marketing'
      };
    }
    const unsubscribed = await isMarketingEmailUnsubscribed(toNorm);
    if (unsubscribed) {
      console.log(
        `[email:postResend] Skipped sending to ${maskRecipient(toNorm)}: Unsubscribed`
      );
      return { ok: true, skipped: 'unsubscribed' };
    }
  }

  const headers: Record<string, string> = {};
  if (params.category === 'marketing' && params.marketingListUnsubscribeUrl) {
    Object.assign(
      headers,
      marketingListUnsubscribeHeaders(params.marketingListUnsubscribeUrl.trim())
    );
  }

  if (params.category === 'marketing' && Object.keys(headers).length) {
    const hasList = Boolean(headers['List-Unsubscribe']);
    const hasPost = Boolean(headers['List-Unsubscribe-Post']);
    console.log(
      '[email:postResend] SMTP headers include unsubscribe:',
      hasList && hasPost
        ? 'OK — List-Unsubscribe + List-Unsubscribe-Post'
        : `INCOMPLETE (List-Unsubscribe=${hasList}, List-Unsubscribe-Post=${hasPost})`
    );
  }

  return sendViaSmtp({
    to: params.to,
    subject: params.subject,
    html: params.html,
    from,
    replyTo: params.replyTo,
    headers: Object.keys(headers).length ? headers : undefined
  });
}
