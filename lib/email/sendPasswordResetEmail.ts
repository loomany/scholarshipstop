import 'server-only';

import {
  buildResetPasswordEmailHtml,
  EMAIL_SUBJECT_RESET_PASSWORD
} from '@/lib/email/templates/premiumTemplates';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';
import { getServerAuthResetPasswordUrl } from '@/utils/auth-email-redirect.server';

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
