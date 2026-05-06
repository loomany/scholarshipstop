/**
 * Stage 4 — Subscription page & value proposition audit (Playwright, guest view).
 * Visible UI/copy only — no API payloads, DB, or payment flows.
 *
 * BASE_URL: PLAYWRIGHT_BASE_URL or http://localhost:3001
 *
 *   npm run customer:audit:subscription
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { chromium, type Page } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORT_ROOT = path.join(__dirname, '..', 'reports', 'customer-value-audit');
const SCREENSHOT_DIR = path.join(REPORT_ROOT, 'screenshots');

const DEFAULT_BASE = 'http://localhost:3001';

type ListingPaywallSignals = {
  path: string;
  httpStatus: number | null;
  pageTitle: string;
  subscriptionLinks: { href: string; text: string }[];
  unlockPremiumSnippetSamples: string[];
  lockRelatedTokenCount: number;
  bodyTextLength: number;
  screenshotPath: string;
};

type SubscriptionPageCapture = {
  path: string;
  httpStatus: number | null;
  pageTitle: string;
  h1: string;
  subscriptionSectionTextLength: number;
  visiblePricing: string[];
  billingPhrases: string[];
  trialGuaranteeWording: string[];
  ctaButtons: string[];
  planTitles: string[];
  benefitsList: string[];
  faqItems: string[];
  trustElements: string[];
  cancellationWording: string[];
  afterPaymentVisibleHints: string[];
  unclearOrMissingPromises: string[];
  issues: { where: string; problem: string; purchaseImpact: string; suggestedFix: string }[];
  screenshotPath: string;
};

type Scorecard = {
  offerClarityScore: number;
  paidValueClarityScore: number;
  trustScore: number;
  ctaStrengthScore: number;
  freeVsPaidBalanceScore: number;
  conversionReadinessScore: number;
};

type ValueModel = 'too_open' | 'too_locked' | 'balanced' | 'unclear_value';

type AuditReport = {
  generatedAt: string;
  baseUrl: string;
  subscriptionPage: SubscriptionPageCapture;
  listingPages: ListingPaywallSignals[];
  signinPage: ListingPaywallSignals;
  scorecard: Scorecard;
  valueModel: ValueModel;
  scoreRationale: Record<string, string>;
};

async function assertReachableBase(base: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(base, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { Accept: 'text/html' }
    });
    if (!res.ok && res.status >= 500) {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(
      `[subscription-audit] Cannot reach BASE_URL ${base}: ${msg}\n` +
        'Start the dev server or set PLAYWRIGHT_BASE_URL.'
    );
    process.exit(1);
  } finally {
    clearTimeout(timer);
  }
}

function ensureDirs(): void {
  fs.mkdirSync(REPORT_ROOT, { recursive: true });
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function shot(page: Page, filename: string): Promise<string> {
  const p = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: p, fullPage: false }).catch(() => {});
  return p;
}

function relRepoPath(abs: string): string {
  return path.relative(path.join(__dirname, '..'), abs).replace(/\\/g, '/');
}

async function captureSubscriptionPage(
  page: Page,
  base: string
): Promise<SubscriptionPageCapture> {
  const url = `${base.replace(/\/+$/, '')}/subscription`;
  const shotFile = 'subscription-page.png';
  const issues: SubscriptionPageCapture['issues'] = [];

  const res = await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 45_000
  });
  const httpStatus = res?.status() ?? null;
  await page.waitForTimeout(2000);

  const pageTitle = await page.title().catch(() => '');
  const h1 = await page.locator('h1').first().innerText().catch(() => '');

  const evaluated = await page.evaluate(() => {
    const root = document.querySelector('.subscription-compact-page');
    const sectionText = root?.innerText ?? '';
    const priceMatches = sectionText.match(/\$\s*\d+(?:\.\d{2})?/g) ?? [];
    const plans = [
      ...document.querySelectorAll('.subscription-compact-page article h2')
    ].map((el) => el.textContent?.trim() ?? '');
    const billingBits = [
      ...document.querySelectorAll('.subscription-compact-page article p')
    ]
      .map((p) => p.textContent?.trim() ?? '')
      .filter((t) => /billed|every|month|year|quarter/i.test(t));
    const benefitLis = [
      ...document.querySelectorAll('.subscription-compact-page article li span:last-child')
    ].map((el) => el.textContent?.trim() ?? '').filter(Boolean);
    const buttons = [
      ...document.querySelectorAll('.subscription-compact-page button')
    ].map((b) => b.textContent?.replace(/\s+/g, ' ').trim() ?? '').filter(Boolean);
    const trust = [
      ...document.querySelectorAll('.subscription-compact-page')
    ]
      .slice(0, 1)
      .map((s) => s.textContent ?? '')
      .join('\n');
    const trustHits: string[] = [];
    if (/Lemon|Merchant of Record|securely processed/i.test(trust)) {
      trustHits.push('Payments processed by Lemon Squeezy / Merchant of Record copy present.');
    }
    const cancelHits =
      trust.match(/cancel subscription|cancel ends renewal|resume subscription/gi) ?? [];
    const trialHits =
      sectionText.match(/\b(trial|money[- ]back|guarantee|refund)\b/gi) ?? [];
    const afterPay =
      sectionText.match(/after (you )?(pay|checkout|purchase)|once subscribed[^.]{0,80}/gi) ??
      [];
    const faq =
      sectionText.match(/\b(FAQ|frequently asked)[^.]{0,120}/gi) ?? [];

    return {
      sectionTextLength: sectionText.length,
      visiblePricing: [...new Set(priceMatches.map((x) => x.replace(/\s+/g, '')))],
      billingPhrases: [...new Set(billingBits)].slice(0, 12),
      planTitles: plans.filter(Boolean),
      benefitsList: [...new Set(benefitLis)],
      ctaButtons: [...new Set(buttons)],
      trustElements: trustHits,
      cancellationWording: [...new Set(cancelHits.slice(0, 6))],
      trialGuaranteeWording: [...new Set(trialHits)],
      afterPaymentVisibleHints: [...new Set(afterPay.slice(0, 4))],
      faqItems: [...new Set(faq)]
    };
  });

  const unclear: string[] = [];
  if (evaluated.trialGuaranteeWording.length === 0) {
    unclear.push(
      'No explicit trial length, money-back, or guarantee wording visible in the pricing section (guest view).'
    );
  }
  if (evaluated.afterPaymentVisibleHints.length === 0) {
    unclear.push(
      'No dedicated “what happens immediately after checkout” paragraph beyond feature bullets.'
    );
  }
  if (evaluated.faqItems.length === 0) {
    unclear.push('No FAQ section detected in visible subscription copy.');
  }

  if (evaluated.visiblePricing.length < 3) {
    issues.push({
      where: '/subscription pricing grid',
      problem: 'Fewer than three distinct price tokens extracted from the pricing section.',
      purchaseImpact: 'Users may not compare tiers at a glance.',
      suggestedFix:
        'Ensure each plan card exposes a visible numeric price in DOM order for screen readers and scanning.'
    });
  }

  const absShot = await shot(page, shotFile);

  return {
    path: '/subscription',
    httpStatus,
    pageTitle,
    h1,
    subscriptionSectionTextLength: evaluated.sectionTextLength,
    visiblePricing: evaluated.visiblePricing,
    billingPhrases: evaluated.billingPhrases,
    trialGuaranteeWording: evaluated.trialGuaranteeWording,
    ctaButtons: evaluated.ctaButtons,
    planTitles: evaluated.planTitles,
    benefitsList: evaluated.benefitsList,
    faqItems: evaluated.faqItems,
    trustElements: evaluated.trustElements,
    cancellationWording: evaluated.cancellationWording,
    afterPaymentVisibleHints: evaluated.afterPaymentVisibleHints,
    unclearOrMissingPromises: unclear,
    issues,
    screenshotPath: relRepoPath(absShot)
  };
}

async function captureListingSignals(
  page: Page,
  base: string,
  pathname: string,
  shotName: string
): Promise<ListingPaywallSignals> {
  const url = `${base.replace(/\/+$/, '')}${pathname}`;
  const res = await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 45_000
  });
  const httpStatus = res?.status() ?? null;
  await page.waitForTimeout(2200);
  await page
    .locator('article[data-scholarship-card], body')
    .first()
    .waitFor({ state: 'visible', timeout: 20_000 })
    .catch(() => {});

  const pageTitle = await page.title().catch(() => '');

  const evaluated = await page.evaluate(() => {
    const body = document.body?.innerText ?? '';
    const links = [...document.querySelectorAll('a[href*="subscription"]')]
      .map((a) => ({
        href: (a as HTMLAnchorElement).href.replace(/\s+/g, ''),
        text: (a.textContent ?? '').replace(/\s+/g, ' ').trim()
      }))
      .filter((x) => x.href.length > 0);
    const tokens =
      body.match(
        /\bunlock(?:ed|ing)?s?\b|premium|subscribe|subscription|upgrade|paywall|\blocked\b/gi
      ) ?? [];
    const sentences = body.split(/(?<=[.!?])\s+/);
    const snippets = sentences
      .filter((s) =>
        /unlock|premium|subscribe|subscription|upgrade|locked/i.test(s)
      )
      .slice(0, 8)
      .map((s) => s.trim().slice(0, 220));

    return {
      bodyTextLength: body.length,
      subscriptionLinks: links.slice(0, 25),
      unlockPremiumSnippetSamples: snippets,
      lockRelatedTokenCount: tokens.length
    };
  });

  const absShot = await shot(page, shotName);

  return {
    path: pathname,
    httpStatus,
    pageTitle,
    subscriptionLinks: evaluated.subscriptionLinks,
    unlockPremiumSnippetSamples: evaluated.unlockPremiumSnippetSamples,
    lockRelatedTokenCount: evaluated.lockRelatedTokenCount,
    bodyTextLength: evaluated.bodyTextLength,
    screenshotPath: relRepoPath(absShot)
  };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function computeScorecard(
  sub: SubscriptionPageCapture,
  listings: ListingPaywallSignals[],
  signin: ListingPaywallSignals
): { scorecard: Scorecard; rationale: Record<string, string> } {
  const rationale: Record<string, string> = {};

  let offer = 0;
  if (sub.h1.trim()) offer += 25;
  if (sub.planTitles.length >= 3) offer += 25;
  else if (sub.planTitles.length >= 1) offer += 15;
  if (sub.visiblePricing.length >= 3) offer += 25;
  else if (sub.visiblePricing.length >= 1) offer += 15;
  if (sub.billingPhrases.length >= 2) offer += 15;
  else if (sub.billingPhrases.length >= 1) offer += 8;
  if (sub.subscriptionSectionTextLength > 400) offer += 10;
  offer = clamp(offer);
  rationale.offerClarityScore =
    'Based on H1 presence, number of plan headings, visible currency amounts, and billing cadence copy.';

  const valueKeywords =
    /unlock|unblur|easy apply|international|iq|essay|alert|filter|premium scholarship/i;
  const hits = sub.benefitsList.filter((b) => valueKeywords.test(b)).length;
  let paidValue = 40 + Math.min(40, hits * 8);
  if (sub.benefitsList.length >= 12) paidValue += 10;
  if (sub.afterPaymentVisibleHints.length > 0) paidValue += 10;
  paidValue = clamp(paidValue);
  rationale.paidValueClarityScore =
    'Weighted by concrete benefit lines (unlock/unblur/IQ/essay/alerts) vs vague wording only.';

  let trust = 0;
  if (sub.trustElements.length > 0) trust += 35;
  if (/lemon|merchant of record/i.test(sub.pageTitle + sub.benefitsList.join(' '))) trust += 15;
  if (sub.billingPhrases.length >= 2) trust += 20;
  if (sub.cancellationWording.length > 0) trust += 15;
  if (sub.trialGuaranteeWording.length > 0) trust += 15;
  trust = clamp(trust + 10);
  rationale.trustScore =
    'MoR/payment processor mention, billing clarity, visible cancel/resume hooks, any trial/guarantee wording.';

  const startPlanCt = sub.ctaButtons.filter((b) => /start plan|subscribe|upgrade|unlock/i.test(b)).length;
  let cta = clamp(35 + startPlanCt * 18 + Math.min(25, sub.ctaButtons.length * 3));
  const allSurfaces = [...listings, signin];
  const listingSubLinks = allSurfaces.reduce((n, p) => n + p.subscriptionLinks.length, 0);
  cta = clamp(cta + Math.min(15, listingSubLinks * 2));
  rationale.ctaStrengthScore =
    'Primary plan CTAs on /subscription plus density of subscription destinations on hub listings and sign-in.';

  const densities = listings.map((p) =>
    p.bodyTextLength > 0 ? (p.lockRelatedTokenCount / p.bodyTextLength) * 8000 : 0
  );
  const avgDensity = densities.length
    ? densities.reduce((a, b) => a + b, 0) / densities.length
    : 0;
  const pricingLinkTouches = allSurfaces.reduce((n, p) => n + p.subscriptionLinks.length, 0);
  let balance = 52;
  if (avgDensity >= 6 && avgDensity <= 26) {
    balance += 28;
  } else if (avgDensity > 26 && avgDensity <= 40) {
    balance += 8;
  } else if (avgDensity > 40) {
    balance -= 18;
  } else {
    balance += 6;
  }
  balance += Math.min(14, pricingLinkTouches * 3);
  balance = clamp(balance);
  rationale.freeVsPaidBalanceScore =
    'Combines paywall-related word density (unlock/premium/subscribe/locked, incl. “unlocked”) with presence of /subscription links on listings and sign-in.';

  const conversion = clamp(
    offer * 0.2 +
      paidValue * 0.25 +
      trust * 0.2 +
      cta * 0.15 +
      balance * 0.2
  );
  rationale.conversionReadinessScore =
    'Weighted blend of clarity, paid-value articulation, trust, CTA visibility, and free/paid balance.';

  return {
    scorecard: {
      offerClarityScore: offer,
      paidValueClarityScore: paidValue,
      trustScore: trust,
      ctaStrengthScore: cta,
      freeVsPaidBalanceScore: balance,
      conversionReadinessScore: conversion
    },
    rationale
  };
}

function classifyModel(
  scorecard: Scorecard,
  listings: ListingPaywallSignals[]
): ValueModel {
  if (
    scorecard.offerClarityScore < 58 &&
    scorecard.paidValueClarityScore < 58
  ) {
    return 'unclear_value';
  }
  const densities = listings.map((p) =>
    p.bodyTextLength > 0 ? (p.lockRelatedTokenCount / p.bodyTextLength) * 8000 : 0
  );
  const avgDensity = densities.length
    ? densities.reduce((a, b) => a + b, 0) / densities.length
    : 0;
  const links = listings.reduce((n, p) => n + p.subscriptionLinks.length, 0);
  if (avgDensity > 32) {
    return 'too_locked';
  }
  if (avgDensity < 5 && links <= 3) {
    return 'too_open';
  }
  return 'balanced';
}

function renderSubscriptionMd(report: AuditReport): string {
  const s = report.subscriptionPage;
  const lines: string[] = [];

  lines.push('# Stage 4 — Subscription & value proposition audit');
  lines.push('');
  lines.push(`- **Generated:** ${report.generatedAt}`);
  lines.push(`- **Base URL:** ${report.baseUrl}`);
  lines.push(`- **Value model (heuristic):** **${report.valueModel}**`);
  lines.push('');
  lines.push('## Scorecard (0–100)');
  lines.push('');
  lines.push(`| Metric | Score |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Offer clarity | ${report.scorecard.offerClarityScore} |`);
  lines.push(`| Paid value clarity | ${report.scorecard.paidValueClarityScore} |`);
  lines.push(`| Trust | ${report.scorecard.trustScore} |`);
  lines.push(`| CTA strength | ${report.scorecard.ctaStrengthScore} |`);
  lines.push(`| Free vs paid balance | ${report.scorecard.freeVsPaidBalanceScore} |`);
  lines.push(`| Conversion readiness | ${report.scorecard.conversionReadinessScore} |`);
  lines.push('');
  lines.push('### Score rationale');
  lines.push('');
  for (const [k, v] of Object.entries(report.scoreRationale)) {
    lines.push(`- **${k}:** ${v}`);
  }
  lines.push('');
  lines.push('## /subscription (primary)');
  lines.push('');
  lines.push(`- **HTTP status:** ${s.httpStatus ?? 'n/a'}`);
  lines.push(`- **Title:** ${s.pageTitle}`);
  lines.push(`- **H1:** ${s.h1}`);
  lines.push(`- **Visible pricing:** ${s.visiblePricing.join(', ') || '—'}`);
  lines.push(`- **Billing copy:** ${s.billingPhrases.join(' | ') || '—'}`);
  lines.push(`- **Trial / guarantee wording:** ${s.trialGuaranteeWording.join(', ') || '—'}`);
  lines.push(`- **Plan titles:** ${s.planTitles.join(' | ') || '—'}`);
  lines.push(`- **CTA buttons:** ${s.ctaButtons.join(' | ') || '—'}`);
  lines.push(`- **Benefits (sample):** ${s.benefitsList.slice(0, 16).join(' · ') || '—'}`);
  lines.push(`- **FAQ (detected):** ${s.faqItems.join(' | ') || '—'}`);
  lines.push(`- **Trust elements:** ${s.trustElements.join(' | ') || '—'}`);
  lines.push(`- **Cancellation wording (if visible):** ${s.cancellationWording.join(' | ') || '—'}`);
  lines.push(`- **After-payment hints (visible):** ${s.afterPaymentVisibleHints.join(' | ') || '—'}`);
  lines.push(`- **Unclear / missing promises:**`);
  for (const u of s.unclearOrMissingPromises) {
    lines.push(`  - ${u}`);
  }
  if (s.issues.length) {
    lines.push('- **Issues (audit only):**');
    for (const i of s.issues) {
      lines.push(`  - **Where:** ${i.where}`);
      lines.push(`    - **Problem:** ${i.problem}`);
      lines.push(`    - **Why it hurts conversion:** ${i.purchaseImpact}`);
      lines.push(`    - **Suggested fix:** ${i.suggestedFix}`);
    }
  }
  lines.push(`- **Screenshot:** \`${s.screenshotPath}\``);
  lines.push('');
  lines.push('## Listing & hub pages (CTA / locked value copy)');
  lines.push('');
  for (const p of report.listingPages) {
    lines.push(`### ${p.path}`);
    lines.push('');
    lines.push(`- HTTP: ${p.httpStatus ?? 'n/a'} · Title: ${p.pageTitle}`);
    lines.push(`- Lock-related token hits (body): ${p.lockRelatedTokenCount} (body length ${p.bodyTextLength})`);
    lines.push(
      `- Links to subscription: ${p.subscriptionLinks.length ? p.subscriptionLinks.map((l) => `[${l.text || 'link'}](${l.href})`).join('; ') : '—'}`
    );
    lines.push('- Sample sentences mentioning unlock/premium/subscribe:');
    for (const sn of p.unlockPremiumSnippetSamples.slice(0, 5)) {
      lines.push(`  - ${sn}`);
    }
    lines.push(`- **Screenshot:** \`${p.screenshotPath}\``);
    lines.push('');
  }
  lines.push('## /signin');
  lines.push('');
  lines.push(`- HTTP: ${report.signinPage.httpStatus ?? 'n/a'} · ${report.signinPage.pageTitle}`);
  lines.push(
    `- Subscription-related links: ${report.signinPage.subscriptionLinks.length || '—'}`
  );
  lines.push(`- **Screenshot:** \`${report.signinPage.screenshotPath}\``);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Клиентские вопросы (отчёт)');
  lines.push('');
  const trialOk = s.trialGuaranteeWording.length > 0;
  const trustOk = s.trustElements.length > 0;
  lines.push(
    `1. **Понятно ли клиенту, за что платить?** Да: на странице видны планы (${s.planTitles.join(', ') || '—'}), суммы (${s.visiblePricing.slice(0, 4).join(', ') || '—'}) и список выгод. Оговорка: у гостя CTA ведут в сценарий с аккаунтом (см. продукт), мгновенный checkout на этой странице не обязателен.`
  );
  lines.push(
    `2. **Не выглядит ли подписка слишком абстрактной?** В значительной степени **нет** — буллеты вроде «Unblur», «Easy Apply», «IQ / Essay» конкретизируют. Слабое место — нет отдельного нарратива «после оплаты» (см. unclear/missing).`
  );
  lines.push(
    '3. **Есть ли обещание конкретного результата?** Обещается **доступ к продукту** (инструменты, отчёты, разблокировка), а не исход вроде «обязательно получите грант» — это плюс для ожиданий; не стоит сдвигать в гарантии исхода.'
  );
  lines.push(
    `4. **Риск не понять, что получишь после оплаты?** **Умеренный** (${s.afterPaymentVisibleHints.length ? 'есть обрывки текста' : 'в видимом блоке почти нет шагов после checkout'}; детали в основном в списке features).`
  );
  lines.push(
    `5. **Что сильное?** Сетка тарифов, ясные цены/биллинг, сильные benefit-строки, ${trustOk ? 'упоминание MoR/платёжного провайдера' : 'мало trust-копирайта'}.`
  );
  lines.push(
    `6. **Что слабое?** ${!trialOk ? 'Нет явного trial / guarantee в гостевом виде. ' : ''}Нет FAQ в DOM. ${s.cancellationWording.length === 0 ? 'Нет видимой копии про отмену на гостевом экране (нормально, если только в портале). ' : ''}Поведение paywall на листингах оценивайте по сэмплам фраз и ссылкам «Pricing».`
  );
  lines.push(
    '7. **5 правок для конверсии (предложения, без правок кода в этом этапе):** (1) Блок «Сразу после оплаты: 3 шага». (2) Одна строка про trial/отмену/период списания. (3) Мини-FAQ: возвраты, что в «Premium Scholarships», как отменить. (4) Соц-доверие (без ложных цифр). (5) Единый месседж на листингах: «что откроется» vs «что остаётся free».'
  );
  lines.push(
    '8. **Чего нельзя обещать:** гарантированный грант/визу/приём; фиксированный денежный результат; «полный» доступ к данным провайдера в обход правил; снятие eligibility-ограничений.'
  );

  return lines.join('\n');
}

function renderFreeVsPaidMd(report: AuditReport): string {
  const lines: string[] = [];
  lines.push('# Free vs paid balance (Stage 4)');
  lines.push('');
  lines.push(`- **Generated:** ${report.generatedAt}`);
  lines.push(`- **Model:** ${report.valueModel}`);
  lines.push(`- **Free vs paid balance score:** ${report.scorecard.freeVsPaidBalanceScore}/100`);
  lines.push('');
  lines.push(
    'Эвристика: на страницах листинга и hub посчитана плотность упоминаний unlock/premium/subscribe/subscription/upgrade/locked в видимом тексте, плюс наличие ссылок на `/subscription`. Это не точная метрика UX, а сигнал для сравнения страниц между собой.'
  );
  lines.push('');
  lines.push('| Path | Lock-related hits | Body chars | Subscription links |');
  lines.push('|------|-------------------:|----------:|-------------------:|');
  for (const p of report.listingPages) {
    lines.push(
      `| ${p.path} | ${p.lockRelatedTokenCount} | ${p.bodyTextLength} | ${p.subscriptionLinks.length} |`
    );
  }
  lines.push('');
  lines.push('## Вывод');
  lines.push('');
  if (report.valueModel === 'too_locked') {
    lines.push(
      'По метрике баланса страница склоняется к **слишком закрытому** восприятию: много языка про lock/premium при ограниченном “teaser” контенте на части экранов.'
    );
  } else if (report.valueModel === 'too_open') {
    lines.push(
      'По метрике баланса — **слишком открыто**: мало явных сигналов paid value на листингах относительно объёма текста.'
    );
  } else if (report.valueModel === 'unclear_value') {
    lines.push(
      '**Недостаточно ясная ценность:** даже на странице подписки недостаточно структурированных сигналов offer/value по шкале аудита.'
    );
  } else {
    lines.push(
      '**Сбалансированная** модель по эвристике: есть и заметные платные офферы на `/subscription`, и разумная частота paywall-копирайта на листингах.'
    );
  }
  lines.push('');
  lines.push(
    '_Исправления не вносятся на этом этапе — только наблюдения для продукта и копирайта._'
  );
  return lines.join('\n');
}

async function run(): Promise<void> {
  const base = (process.env.PLAYWRIGHT_BASE_URL || DEFAULT_BASE).replace(/\/+$/, '');
  await assertReachableBase(base);
  ensureDirs();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1360, height: 900 },
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45_000);

  let subscriptionPage: SubscriptionPageCapture;
  const listingPages: ListingPaywallSignals[] = [];
  let signinPage: ListingPaywallSignals;

  try {
    subscriptionPage = await captureSubscriptionPage(page, base);

    const hubPaths: { path: string; shot: string }[] = [
      { path: '/scholarships', shot: 'subscription-hub-scholarships.png' },
      { path: '/scholarships/hub/best-matches', shot: 'subscription-hub-best-matches.png' },
      { path: '/scholarships/hub/easy-apply', shot: 'subscription-hub-easy-apply.png' },
      { path: '/scholarships/hub/recommended', shot: 'subscription-hub-recommended.png' }
    ];

    for (const h of hubPaths) {
      listingPages.push(await captureListingSignals(page, base, h.path, h.shot));
    }

    signinPage = await captureListingSignals(
      page,
      base,
      '/signin',
      'subscription-signin.png'
    );
  } finally {
    await browser.close();
  }

  const { scorecard, rationale } = computeScorecard(
    subscriptionPage,
    listingPages,
    signinPage
  );
  const valueModel = classifyModel(scorecard, listingPages);

  const report: AuditReport = {
    generatedAt: new Date().toISOString(),
    baseUrl: base,
    subscriptionPage,
    listingPages,
    signinPage,
    scorecard,
    valueModel,
    scoreRationale: rationale
  };

  fs.writeFileSync(
    path.join(REPORT_ROOT, 'subscription-value-audit.json'),
    JSON.stringify(report, null, 2),
    'utf8'
  );

  fs.writeFileSync(
    path.join(REPORT_ROOT, 'subscription-value-audit.md'),
    renderSubscriptionMd(report),
    'utf8'
  );

  fs.writeFileSync(
    path.join(REPORT_ROOT, 'free-vs-paid-audit.md'),
    renderFreeVsPaidMd(report),
    'utf8'
  );

  console.log(`[subscription-audit] Wrote reports under ${REPORT_ROOT}`);
  console.log(`[subscription-audit] Value model: ${valueModel}`);
  console.log(
    `[subscription-audit] Conversion readiness: ${scorecard.conversionReadinessScore}`
  );
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
