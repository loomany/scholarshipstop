'use client';

import { useEffect } from 'react';

const SESSION_STORAGE_KEY = 'st_purchase_success_fired';

/**
 * Frontend `purchase_success` event is for ads attribution only. Subscription access is controlled by Lemon webhook.
 */
export default function PurchaseSuccessEvent() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      if (sessionStorage.getItem(SESSION_STORAGE_KEY) === '1') return;

      window.dataLayer = window.dataLayer || [];

      const params = new URLSearchParams(window.location.search);
      const checkoutId = params.get('checkout_id');
      const orderId = params.get('order_id');
      const sessionId = params.get('session_id');
      const transactionId = checkoutId ?? orderId ?? sessionId ?? undefined;

      const payload: Record<string, unknown> = { event: 'purchase_success' };
      if (transactionId) payload.transaction_id = transactionId;

      window.dataLayer.push(payload);
      sessionStorage.setItem(SESSION_STORAGE_KEY, '1');
    } catch {
      /* dataLayer / sessionStorage must not break the thank-you page */
    }
  }, []);

  return null;
}
