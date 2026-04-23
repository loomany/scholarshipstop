import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';

import { normalizeMarketingEmail } from '@/lib/email/normalizeMarketingEmail';
import { resendReplyToFields, resolveResendFrom } from '@/lib/email/resendEnvelope';

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
  /** Override default Resend From (e.g. provider outreach). */
  from?: string;
  /** Single address or list; spread into Resend `reply_to`. */
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
 * Central Resend send: optional marketing guard + RFC 8058 headers for marketing.
 * Safe to import from CLI scripts (no `server-only`).
 */
export async function postResend(
  params: PostResendParams
): Promise<{ ok: boolean; skipped?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = params.from?.trim() || resolveResendFrom();
  if (!apiKey) {
    return { ok: false, skipped: 'RESEND_API_KEY not set' };
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

  const replyToFields: Record<string, string | string[]> = {};
  if (params.replyTo !== undefined) {
    const rt = Array.isArray(params.replyTo) ? params.replyTo : [params.replyTo];
    const cleaned = rt.map((s) => s.trim()).filter(Boolean);
    if (cleaned.length) replyToFields.reply_to = cleaned;
  } else {
    Object.assign(replyToFields, resendReplyToFields());
  }

  const headers: Record<string, string> = {};
  if (params.category === 'marketing' && params.marketingListUnsubscribeUrl) {
    Object.assign(
      headers,
      marketingListUnsubscribeHeaders(params.marketingListUnsubscribeUrl.trim())
    );
  }

  const body: Record<string, unknown> = {
    from,
    to: [params.to.trim()],
    subject: params.subject,
    html: params.html,
    ...replyToFields
  };
  if (Object.keys(headers).length) {
    body.headers = headers;
  }

  if (params.category === 'marketing' && body.headers) {
    const h = body.headers as Record<string, string>;
    const hasList = Boolean(h['List-Unsubscribe']);
    const hasPost = Boolean(h['List-Unsubscribe-Post']);
    console.log(
      '[email:postResend] Resend JSON body includes unsubscribe headers:',
      hasList && hasPost
        ? 'OK — List-Unsubscribe + List-Unsubscribe-Post on request'
        : `INCOMPLETE (List-Unsubscribe=${hasList}, List-Unsubscribe-Post=${hasPost})`
    );
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[email:postResend] Resend error', res.status, text);
    return { ok: false, skipped: `Resend HTTP ${res.status}` };
  }
  return { ok: true };
}
