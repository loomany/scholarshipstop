import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

import {
  resolveMailFrom,
  resolveMailReplyTo
} from '@/lib/email/resendEnvelope';

export type SmtpSendParams = {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string | string[];
  /** Extra SMTP headers (e.g. List-Unsubscribe). */
  headers?: Record<string, string>;
};

export type SmtpSendResult = { ok: true } | { ok: false; skipped: string };

function resolveSmtpConfig():
  | { host: string; port: number; user: string; pass: string; secure: boolean }
  | { skipped: string } {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) {
    return {
      skipped:
        'SMTP not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS)'
    };
  }
  const portRaw = process.env.SMTP_PORT?.trim() || '587';
  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) {
    return { skipped: `Invalid SMTP_PORT: ${portRaw}` };
  }
  const secureEnv = process.env.SMTP_SECURE?.trim().toLowerCase();
  const secure =
    secureEnv === '1' ||
    secureEnv === 'true' ||
    secureEnv === 'yes' ||
    port === 465;
  return { host, port, user, pass, secure };
}

function resolveReplyTo(
  explicit?: string | string[]
): string | string[] | undefined {
  if (explicit !== undefined) {
    const list = (Array.isArray(explicit) ? explicit : [explicit])
      .map((s) => s.trim())
      .filter(Boolean);
    if (!list.length) return undefined;
    return list.length === 1 ? list[0]! : list;
  }
  return resolveMailReplyTo();
}

/**
 * Send one email via SMTP (Brevo / SES / any relay).
 * Safe to import from CLI scripts (no `server-only`).
 */
export async function sendViaSmtp(
  params: SmtpSendParams
): Promise<SmtpSendResult> {
  const cfg = resolveSmtpConfig();
  if ('skipped' in cfg) {
    return { ok: false, skipped: cfg.skipped };
  }

  const from = params.from?.trim() || resolveMailFrom();
  const replyTo = resolveReplyTo(params.replyTo);

  const transportOpts: SMTPTransport.Options = {
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass
    }
  };

  const transporter = nodemailer.createTransport(transportOpts);

  try {
    await transporter.sendMail({
      from,
      to: params.to.trim(),
      subject: params.subject,
      html: params.html,
      ...(replyTo ? { replyTo } : {}),
      ...(params.headers && Object.keys(params.headers).length
        ? { headers: params.headers }
        : {})
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[email:smtp] send failed', message);
    return { ok: false, skipped: `SMTP error: ${message}` };
  } finally {
    transporter.close();
  }
}

/** True when SMTP_* credentials are present (mail can be sent). */
export function isSmtpConfigured(): boolean {
  return !('skipped' in resolveSmtpConfig());
}
