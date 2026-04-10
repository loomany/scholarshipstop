import 'server-only';

import {
  buildResetPasswordEmailHtml,
  EMAIL_SUBJECT_RESET_PASSWORD
} from '@/lib/email/templates/premiumTemplates';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';
import { getServerAuthResetPasswordUrl } from '@/utils/auth-email-redirect.server';

function maskEmail(email: string): string {
  const [localPart, domain = ''] = email.trim().split('@');
  if (!localPart) return `***@${domain}`;
  if (localPart.length <= 2) return `${localPart[0] ?? '*'}***@${domain}`;
  return `${localPart.slice(0, 2)}***@${domain}`;
}

export async function sendPasswordResetEmail(
  toEmail: string
): Promise<{ ok: boolean; skipped?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey) {
    return { ok: false, skipped: 'RESEND_API_KEY not set' };
  }
  if (!from) {
    return { ok: false, skipped: 'RESEND_FROM not set' };
  }

  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return { ok: false, skipped: 'SUPABASE_SERVICE_ROLE_KEY not set' };
  }

  const redirectTo = getServerAuthResetPasswordUrl();
  console.info('[email:reset-password] generating recovery link', {
    email: maskEmail(toEmail),
    redirectTo,
    envSiteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? null,
    nodeEnv: process.env.NODE_ENV ?? null
  });

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: toEmail,
    options: {
      redirectTo
    }
  });

  if (error) {
    console.error('[email:reset-password] generateLink error', error.message);
    return { ok: false, skipped: error.message };
  }

  const actionLink = data?.properties?.action_link?.trim();
  if (!actionLink) {
    return { ok: false, skipped: 'Recovery action link missing' };
  }

  const actionUrl = new URL(actionLink);
  console.info('[email:reset-password] generated recovery link', {
    email: maskEmail(toEmail),
    actionOrigin: actionUrl.origin,
    actionPath: actionUrl.pathname,
    redirectToParam: actionUrl.searchParams.get('redirect_to')
  });

  const origin = redirectTo.replace(/\/auth\/reset_password\/?$/, '');
  const html = buildResetPasswordEmailHtml({
    confirmationUrl: actionLink,
    siteOrigin: origin
  });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [toEmail],
      subject: EMAIL_SUBJECT_RESET_PASSWORD,
      html
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[email:reset-password] Resend error', res.status, text);
    return { ok: false, skipped: `Resend HTTP ${res.status}` };
  }

  return { ok: true };
}
