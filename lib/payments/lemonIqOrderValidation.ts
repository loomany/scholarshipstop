import type { LemonIqCheckoutConfig } from '@/lib/payments/lemonRuntimeConfig';
import type { LemonWebhookPayload } from '@/lib/payments/lemonSubscriptionState';

export type ValidatedIqOrder = {
  orderId: string;
  reportId: string;
};

export function validateIqOrderCreatedPayload(
  payload: LemonWebhookPayload,
  config: LemonIqCheckoutConfig
): { ok: true; order: ValidatedIqOrder } | { ok: false; reason: string } {
  if (payload.meta?.event_name !== 'order_created') {
    return { ok: false, reason: 'wrong_event' };
  }
  const attrs = payload.data?.attributes ?? payload.attributes;
  const reportId =
    payload.meta?.custom_data?.iq_report_id ??
    payload.data?.attributes?.custom_data?.iq_report_id ??
    payload.attributes?.custom_data?.iq_report_id;
  const orderId = attrs?.order_id ?? payload.data?.id;
  const variantId = attrs?.first_order_item?.variant_id ?? attrs?.variant_id;

  if (typeof reportId !== 'string' || !reportId.trim()) {
    return { ok: false, reason: 'missing_report_id' };
  }
  if (orderId == null || !String(orderId).trim()) {
    return { ok: false, reason: 'missing_order_id' };
  }
  if (String(attrs?.store_id ?? '') !== config.storeId) {
    return { ok: false, reason: 'store_mismatch' };
  }
  if (String(variantId ?? '') !== config.variantId) {
    return { ok: false, reason: 'variant_mismatch' };
  }
  if (attrs?.test_mode !== (config.mode === 'test')) {
    return { ok: false, reason: 'mode_mismatch' };
  }
  if (attrs?.total !== config.expectedTotal) {
    return { ok: false, reason: 'total_mismatch' };
  }
  if (attrs?.currency?.toUpperCase() !== config.currency) {
    return { ok: false, reason: 'currency_mismatch' };
  }

  return {
    ok: true,
    order: { orderId: String(orderId), reportId: reportId.trim() }
  };
}
