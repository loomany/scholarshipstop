import 'server-only';

import { postResend } from '@/lib/email/postResend';
import type { LemonWebhookPayload } from '@/lib/payments/lemonSubscriptionState';

const ADMIN_PAYMENT_EMAIL = 'loomany.self@gmail.com';

const SUCCESSFUL_PAYMENT_EVENTS = new Set([
  'order_created',
  'subscription_created',
  'subscription_payment_success',
  'subscription_payment_recovered'
]);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getAttrs(payload: LemonWebhookPayload): Record<string, unknown> {
  return (payload.data?.attributes ?? payload.attributes ?? {}) as Record<string, unknown>;
}

function readString(attrs: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = attrs[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

function formatAmount(attrs: Record<string, unknown>): string {
  const formatted = readString(attrs, [
    'total_formatted',
    'subtotal_formatted',
    'total_usd_formatted'
  ]);
  if (formatted) return formatted;

  const total = attrs.total ?? attrs.subtotal;
  const currency = readString(attrs, ['currency'])?.toUpperCase() ?? 'USD';
  if (typeof total === 'number' && Number.isFinite(total)) {
    return `${(total / 100).toFixed(2)} ${currency}`;
  }
  return '—';
}

export function shouldSendLemonAdminPaymentEmail(eventName: string | null | undefined): boolean {
  return SUCCESSFUL_PAYMENT_EVENTS.has((eventName ?? '').trim());
}

export async function sendLemonAdminPaymentEmail(options: {
  payload: LemonWebhookPayload;
  eventName: string;
  userEmail?: string | null;
  context?: string;
  orderId?: string | null;
  reportId?: string | null;
  subscriptionId?: string | null;
}): Promise<{ ok: boolean; skipped?: string }> {
  const attrs = getAttrs(options.payload);
  const customerEmail =
    options.userEmail?.trim() ||
    readString(attrs, ['user_email', 'user_email_address', 'customer_email', 'email']) ||
    '—';
  const product = readString(attrs, ['product_name']) ?? 'LemonSqueezy payment';
  const variant = readString(attrs, ['variant_name']) ?? '—';
  const amount = formatAmount(attrs);
  const orderId =
    options.orderId ||
    readString(attrs, ['order_id', 'order_number']) ||
    options.payload.data?.id ||
    '—';
  const subscriptionId =
    options.subscriptionId || readString(attrs, ['subscription_id']) || '—';
  const testMode = attrs.test_mode === true ? 'yes' : 'no';

  const rows: [string, string][] = [
    ['Event', options.eventName],
    ['Context', options.context ?? 'lemon_webhook'],
    ['Product', product],
    ['Variant', variant],
    ['Amount', amount],
    ['Customer email', customerEmail],
    ['Order ID', orderId],
    ['Subscription ID', subscriptionId],
    ['IQ Report ID', options.reportId ?? '—'],
    ['Test mode', testMode]
  ];

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
      <h1 style="font-size:20px;margin:0 0 16px">LemonSqueezy payment received</h1>
      <table style="border-collapse:collapse;width:100%;max-width:640px">
        <tbody>
          ${rows
            .map(
              ([label, value]) => `
                <tr>
                  <td style="border:1px solid #e5e7eb;padding:8px 10px;font-weight:700;background:#f9fafb">${escapeHtml(label)}</td>
                  <td style="border:1px solid #e5e7eb;padding:8px 10px">${escapeHtml(value)}</td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;

  return postResend({
    to: ADMIN_PAYMENT_EMAIL,
    subject: `Lemon payment received: ${product}`,
    html,
    category: 'transactional'
  });
}
