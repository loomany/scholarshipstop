import { createClient } from '@supabase/supabase-js';
import { chromium, type Page } from 'playwright';

import {
  cognitiveAssessmentQuestions,
  type CognitiveOptionKey
} from '@/lib/cognitiveAssessmentQuestions';
import { buildIqReportReadyEmailHtml } from '@/lib/email/templates/iqReportReadyEmailHtml';
import type { AssessmentResult } from '@/lib/iqAssessmentTypes';
import { createIqReportAccessToken } from '@/lib/iqReportOrders';
import { createLemonSignature } from '@/lib/payments/lemonWebhookSignature';

type CliOptions = {
  baseUrl: string;
  email: string;
  headful: boolean;
  simulatePaymentWebhook: boolean;
};

const GENERAL_ASSESSMENT_STORAGE_KEY = 'iq_general_assessment:v1';
const GENERAL_FUNNEL_PHASE_STORAGE_KEY = 'iq_general_funnel_phase:v1';
const GENERAL_EMAIL_STORAGE_KEY = 'iq_general_email:v1';
const GENERAL_RESULT_STORAGE_KEY = 'iq_general_result:v1';

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    baseUrl: process.env.IQ_SMOKE_BASE_URL || 'http://localhost:3000/iq',
    email: process.env.IQ_SMOKE_EMAIL || 'iq-smoke-test@example.com',
    headful: process.env.IQ_SMOKE_HEADFUL === '1',
    simulatePaymentWebhook: process.env.IQ_SMOKE_PAYMENT_WEBHOOK === '1'
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];
    if (arg === '--base-url' && next) {
      options.baseUrl = next;
      index += 1;
    } else if (arg === '--email' && next) {
      options.email = next;
      index += 1;
    } else if (arg === '--headful') {
      options.headful = true;
    } else if (arg === '--simulate-payment-webhook') {
      options.simulatePaymentWebhook = true;
    } else if (arg === '--help') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  npm run smoke:iq-flow
  npm run smoke:iq-flow -- --email user@example.com
  npm run smoke:iq-flow -- --base-url http://localhost:3000/iq --headful
  npm run smoke:iq-flow -- --simulate-payment-webhook --email real-test@example.com

Default mode:
  - opens /iq in Playwright
  - completes all IQ questions with correct answers
  - verifies the unlocked report appears
  - verifies the IQ email HTML that would be sent after payment

Webhook mode:
  - also inserts a pending iq_report_orders row
  - posts a signed fake Lemon order_created webhook to /api/webhooks
  - may send a real email if the local app has RESEND_API_KEY configured
`);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function baseOrigin(baseUrl: string) {
  return new URL(baseUrl).origin;
}

async function clearIqStorage(page: Page) {
  await page.addInitScript(
    ({ keys }) => {
      for (const key of keys) window.localStorage.removeItem(key);
    },
    {
      keys: [
        GENERAL_ASSESSMENT_STORAGE_KEY,
        GENERAL_FUNNEL_PHASE_STORAGE_KEY,
        GENERAL_EMAIL_STORAGE_KEY,
        GENERAL_RESULT_STORAGE_KEY
      ]
    }
  );
}

async function clickCorrectAnswer(page: Page, index: number) {
  const question = cognitiveAssessmentQuestions[index];
  if (!question) throw new Error(`Question ${index + 1} is missing from bank.`);

  await page.getByText(`Question ${index + 1}`, { exact: false }).first().waitFor({
    timeout: 15_000
  });

  const optionKey: CognitiveOptionKey = question.correct_option;
  const optionLabel = question.options[optionKey];
  const buttonName = new RegExp(`^${optionKey}\\s+${escapeRegExp(optionLabel)}$`, 'i');

  await page.getByRole('button', { name: buttonName }).click();
}

function assertAssessmentResult(value: unknown): AssessmentResult {
  if (!value || typeof value !== 'object') {
    throw new Error('No IQ assessment result was saved to localStorage.');
  }

  const result = value as AssessmentResult;
  const answerCount = Object.keys(result.answers ?? {}).length;
  if (answerCount !== cognitiveAssessmentQuestions.length) {
    throw new Error(
      `Expected ${cognitiveAssessmentQuestions.length} answers, got ${answerCount}.`
    );
  }

  const wrong = cognitiveAssessmentQuestions.filter(
    (question) => result.answers[question.id] !== question.correct_option
  );
  if (wrong.length) {
    throw new Error(`Wrong answers detected: ${wrong.map((q) => q.id).join(', ')}`);
  }

  if (typeof result.iqScore !== 'number' || result.iqScore < 70) {
    throw new Error(`Unexpected IQ score in result: ${String(result.iqScore)}`);
  }

  if (!result.archetype) {
    throw new Error('Result has no Brain Archetype.');
  }

  return result;
}

async function completeIqAssessment(options: CliOptions): Promise<AssessmentResult> {
  const browser = await chromium.launch({ headless: !options.headful });
  const page = await browser.newPage();
  await clearIqStorage(page);

  try {
    await page.goto(options.baseUrl, { waitUntil: 'networkidle' });

    const aiWidgetCount = await page
      .getByLabel(/ScholarshipTop Navigator AI assistant/i)
      .count();
    if (aiWidgetCount !== 0) {
      throw new Error(`AI navigator widget is visible on IQ flow (${aiWidgetCount}).`);
    }

    await page.getByRole('button', { name: /^Start assessment$/i }).click();
    await page.getByRole('textbox').first().fill(options.email);
    await page.getByRole('button', { name: /^Continue to IQ test$/i }).click();

    for (let index = 0; index < cognitiveAssessmentQuestions.length; index += 1) {
      await clickCorrectAnswer(page, index);
    }

    await page.getByText(/Calculating your IQ score/i).waitFor({ timeout: 15_000 });
    await page
      .getByRole('heading', { name: /Your IQ-style cognitive profile/i })
      .waitFor({ timeout: 20_000 });

    const result = await page.evaluate((key) => {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }, GENERAL_RESULT_STORAGE_KEY);

    return assertAssessmentResult(result);
  } finally {
    await browser.close();
  }
}

function verifyIqReportEmailDryRun(options: CliOptions, result: AssessmentResult) {
  const token = createIqReportAccessToken();
  const reportUrl = `${baseOrigin(options.baseUrl)}/iq/report/${encodeURIComponent(token)}`;
  const html = buildIqReportReadyEmailHtml({
    reportUrl,
    iqScore: result.iqScore,
    archetype: result.archetype
  });

  const requiredSnippets = [
    'Your full IQ-style report is ready',
    'Payment received. Your private result link is unlocked.',
    `IQ-style score: ${result.iqScore}`,
    result.archetype,
    reportUrl
  ];

  const missing = requiredSnippets.filter((snippet) => !html.includes(snippet));
  if (missing.length) {
    throw new Error(`IQ email dry-run is missing: ${missing.join(', ')}`);
  }

  return { reportUrl, htmlLength: html.length };
}

async function simulatePaymentWebhook(options: CliOptions, result: AssessmentResult) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const webhookSecret =
    process.env.LEMON_SQUEEZY_WEBHOOK_SECRET?.trim() ||
    process.env.LEMON_SQUEEZY_SECRET?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Webhook simulation requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }
  if (!webhookSecret) {
    throw new Error(
      'Webhook simulation requires LEMON_SQUEEZY_WEBHOOK_SECRET or LEMON_SQUEEZY_SECRET.'
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const accessToken = createIqReportAccessToken();
  const { data: order, error } = await supabase
    .from('iq_report_orders')
    .insert({
      access_token: accessToken,
      email: options.email.trim().toLowerCase(),
      assessment_result: result,
      status: 'pending'
    })
    .select('id')
    .single();

  if (error || !order?.id) {
    throw new Error(`Could not insert iq_report_orders row: ${error?.message}`);
  }

  const orderId = `iq-smoke-${Date.now()}`;
  const payload = {
    meta: {
      event_name: 'order_created',
      custom_data: {
        funnel: 'iq_smoke',
        iq_report_id: order.id
      }
    },
    data: {
      id: orderId,
      type: 'orders',
      attributes: {
        order_id: orderId,
        user_email: options.email.trim().toLowerCase(),
        custom_data: {
          funnel: 'iq_smoke',
          iq_report_id: order.id
        },
        updated_at: new Date().toISOString()
      }
    }
  };

  const rawBody = JSON.stringify(payload);
  const signature = createLemonSignature(rawBody, webhookSecret);
  const res = await fetch(`${baseOrigin(options.baseUrl)}/api/webhooks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Signature': signature
    },
    body: rawBody
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Webhook returned ${res.status}: ${text.slice(0, 800)}`);
  }

  const { data: updatedOrder, error: lookupError } = await supabase
    .from('iq_report_orders')
    .select('status,email_sent_at,lemon_order_id')
    .eq('id', order.id)
    .single();

  if (lookupError || !updatedOrder) {
    throw new Error(`Could not read updated iq_report_orders row: ${lookupError?.message}`);
  }

  return {
    reportOrderId: order.id,
    response: text,
    status: updatedOrder.status,
    emailSentAt: updatedOrder.email_sent_at,
    lemonOrderId: updatedOrder.lemon_order_id
  };
}

async function main() {
  const options = parseArgs();
  console.log('[iq-smoke] Starting IQ flow', {
    baseUrl: options.baseUrl,
    email: options.email,
    simulatePaymentWebhook: options.simulatePaymentWebhook
  });

  const result = await completeIqAssessment(options);
  console.log('[iq-smoke] Assessment completed', {
    questions: cognitiveAssessmentQuestions.length,
    iqScore: result.iqScore,
    percentile: result.percentile,
    archetype: result.archetype
  });

  const emailDryRun = verifyIqReportEmailDryRun(options, result);
  console.log('[iq-smoke] Payment email dry-run passed', emailDryRun);

  if (options.simulatePaymentWebhook) {
    const webhook = await simulatePaymentWebhook(options, result);
    console.log('[iq-smoke] Payment webhook simulation passed', webhook);
  } else {
    console.log(
      '[iq-smoke] Skipped real payment webhook. Add --simulate-payment-webhook to hit /api/webhooks.'
    );
  }
}

main().catch((error) => {
  console.error('[iq-smoke] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
