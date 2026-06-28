'use server';

import type { AssessmentResult } from '@/lib/iqAssessmentTypes';
import {
  createIqReportAccessToken,
  getIqReportAdminClient,
  isValidIqReportEmail,
  normalizeIqReportEmail
} from '@/lib/iqReportOrders';
import { notifyTelegramStandaloneIqEmailCaptured } from '@/lib/telegram/bot';
import {
  resolveLemonIqCheckoutConfig,
  SECURE_CHECKOUT_UNAVAILABLE_MESSAGE,
  validateLemonVariantMode
} from '@/lib/payments/lemonRuntimeConfig';

type IqReportCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export async function notifyIqReportEmailCaptured({
  email,
  result
}: {
  email: string;
  result: AssessmentResult;
}) {
  const normalizedEmail = normalizeIqReportEmail(email);
  if (!isValidIqReportEmail(normalizedEmail)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }

  await notifyTelegramStandaloneIqEmailCaptured({
    email: normalizedEmail,
    iqScore: result.iqScore,
    archetype: result.archetype
  });

  return { ok: true };
}

function iqReportDescriptionHtml() {
  return [
    '<p>One-time access to a personalized IQ-style cognitive report with score interpretation, domain breakdown, Brain Archetype, and strengths profile.</p>',
    '<p>This is an educational IQ-style profile, not a clinical psychological diagnosis.</p>'
  ].join('');
}

export async function getIqReportCheckoutURL({
  email,
  result,
  funnel = 'standalone_iq'
}: {
  email: string;
  result: AssessmentResult;
  funnel?: 'standalone_iq' | 'contextual_iq_assessment';
}): Promise<IqReportCheckoutResult> {
  const normalizedEmail = normalizeIqReportEmail(email);
  if (!isValidIqReportEmail(normalizedEmail)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }

  const resolved = resolveLemonIqCheckoutConfig();
  if (!resolved.ok) {
    console.warn('[iq-report-checkout] disabled by config guard', {
      reason: resolved.reason
    });
    return { ok: false, error: SECURE_CHECKOUT_UNAVAILABLE_MESSAGE };
  }
  try {
    const providerVariant = await validateLemonVariantMode(resolved.config);
    if (!providerVariant.ok) {
      console.warn('[iq-report-checkout] variant rejected', {
        reason: providerVariant.reason
      });
      return { ok: false, error: SECURE_CHECKOUT_UNAVAILABLE_MESSAGE };
    }
  } catch {
    return { ok: false, error: SECURE_CHECKOUT_UNAVAILABLE_MESSAGE };
  }

  const { apiKey, storeId, variantId } = resolved.config;

  const accessToken = createIqReportAccessToken();
  const { data: reportOrder, error: insertError } =
    await getIqReportAdminClient()
      .from('iq_report_orders')
      .insert({
        access_token: accessToken,
        email: normalizedEmail,
        assessment_result: result,
        status: 'pending'
      })
      .select('id')
      .single();

  if (insertError || !reportOrder?.id) {
    console.error(
      '[iq-report-checkout] failed to save report order',
      insertError
    );
    return {
      ok: false,
      error: 'Could not prepare your report checkout. Please try again.'
    };
  }

  const variantNum = Number.parseInt(variantId, 10);
  if (!Number.isFinite(variantNum)) {
    return {
      ok: false,
      error: 'IQ report checkout variant id is invalid.'
    };
  }

  const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          product_options: {
            enabled_variants: [variantNum],
            name: 'IQ Report',
            description: iqReportDescriptionHtml()
          },
          checkout_data: {
            email: normalizedEmail,
            custom: {
              funnel,
              iq_report_id: reportOrder.id
            }
          }
        },
        relationships: {
          store: {
            data: {
              type: 'stores',
              id: String(storeId)
            }
          },
          variant: {
            data: {
              type: 'variants',
              id: String(variantId)
            }
          }
        }
      }
    })
  });

  const raw = await res.text().catch(() => '');

  if (!res.ok) {
    console.error(
      '[iq-report-checkout] Lemon create checkout failed',
      res.status,
      raw.slice(0, 800)
    );
    return {
      ok: false,
      error: 'Could not create the IQ report checkout. Please try again.'
    };
  }

  let json: { data?: { attributes?: { url?: string } } };
  try {
    json = JSON.parse(raw) as { data?: { attributes?: { url?: string } } };
  } catch {
    return {
      ok: false,
      error: 'LemonSqueezy returned an invalid checkout response.'
    };
  }

  const url = json.data?.attributes?.url;
  if (typeof url === 'string' && url.trim()) {
    return { ok: true, url: url.trim() };
  }

  return {
    ok: false,
    error: 'LemonSqueezy did not return a checkout URL.'
  };
}
