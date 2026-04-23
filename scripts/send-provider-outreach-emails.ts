/**
 * Bulk / test sends to addresses from `scripts/output/provider-partnerships-emails-clean.txt` via Resend.
 *
 * Env:
 *   RESEND_API_KEY (required)
 *   NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY — optional but recommended; map each `to` email to `providers` via `scholarships.support_email`
 *   PROVIDER_OUTREACH_FROM — optional; default `Daur <daur@mail.scholarshiptop.com>`
 *   PROVIDER_OUTREACH_REPLY_TO — optional; default `support@scholarshiptop.com` (clients “Reply” go here; same in `--test` as live sends)
 *   `--test` only: `PROVIDER_OUTREACH_TEST_MIRROR_REPLY_TO_INBOX=1` — set Reply-To to the test `To` address (replies to yourself; for local debugging). Otherwise Reply-To = support / `PROVIDER_OUTREACH_REPLY_TO` (production-like)
 *   PROVIDER_OUTREACH_PUBLIC_SITE — optional; public origin for all links in the email (default https://scholarshiptop.com). Do not use NEXT_PUBLIC_SITE_URL here: local/ngrok would produce wrong provider URLs.
 *   PROVIDER_OUTREACH_LIST — optional path to newline-separated emails (default: clean list in output/)
 *   PROVIDER_OUTREACH_REPORT — optional path to `provider-partnerships-report.json` (fallback name when Supabase has no match)
 *   PROVIDER_OUTREACH_SUBJECT — optional; if set, same subject for every recipient (overrides per-recipient “Feature … at the top of ScholarshipTop”)
 *   PROVIDER_OUTREACH_BODY — optional; if set *with* PROVIDER_OUTREACH_SUBJECT, forces simple HTML (no dark template). Default copy: PROVIDER_OUTREACH_BODY_TEMPLATE in providerPartnershipOutreachEmailHtml.ts
 *   PROVIDER_OUTREACH_ORG_NAME — optional; fixed org for every recipient (overrides DB/report)
 *   PROVIDER_OUTREACH_PROVIDER_SLUG — optional; fixed slug when using fixed org (else null → link to /providers)
 *   PROVIDER_OUTREACH_TEMPLATE — optional path to JSON
 *   PROVIDER_OUTREACH_MS_BETWEEN — optional delay in ms (default 1000)
 *   PROVIDER_OUTREACH_TEST_TO — optional; `--test` delivery address (default loomany.self@gmail.com)
 *   `--test --test-samples N` — send N test messages to TEST_TO, each a different provider from the Supabase map (for previewing subject/body)
 *   Telegram summary after each run (same chats as provider discovery: `grants` → TELEGRAM_ADMIN_IDS / TELEGRAM_CHAT_ID): TELEGRAM_BOT_TOKEN + routing; disable with PROVIDER_OUTREACH_TELEGRAM_NOTIFY=0
 *   PROVIDER_OUTREACH_CAMPAIGN_KEY — optional; default `provider-partnership-spring-2026`. Bulk sends skip addresses already logged for this key in `provider_outreach_log` (requires Supabase service role).
 *
 * Usage:
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/send-provider-outreach-emails.ts --test
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/send-provider-outreach-emails.ts --test --test-samples 5
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/send-provider-outreach-emails.ts --dry-run
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/send-provider-outreach-emails.ts --limit 10
 *
 * Railway (mass send, keep process alive after exit — set in Service → Custom Start Command; add all env in Variables):
 *   npx --yes tsx scripts/send-provider-outreach-emails.ts && echo "Outreach finished successfully. Sleeping to avoid restart..." && tail -f /dev/null
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { buildMarketingUnsubscribeListHeaderUrl } from '../lib/email/buildMarketingUnsubscribeUrl';
import {
  createProviderOutreachLogClient,
  providerOutreachLogExists,
  providerOutreachLogInsertSent,
  resolveProviderOutreachCampaignKey
} from '../lib/email/providerOutreachCampaignLog';
import { postResend } from '../lib/email/postResend';
import {
  buildProviderPartnershipOutreachEmailHtml,
  buildProviderPartnershipOutreachEmailSubject,
  isOutreachOrganizationPlaceholder
} from '../lib/email/templates/providerPartnershipOutreachEmailHtml';
import { notifyProviderOutreachMailingComplete } from '../lib/telegram/providerDiscoveryReport';
import {
  loadProviderOutreachEmailMap,
  type ProviderOutreachLookup
} from './provider-outreach-lookup';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROVIDER_OUTREACH_FROM_DEFAULT = 'Daur <daur@mail.scholarshiptop.com>';
const PROVIDER_OUTREACH_REPLY_TO_DEFAULT = 'support@scholarshiptop.com';

function outreachFrom(): string {
  return (
    process.env.PROVIDER_OUTREACH_FROM?.trim() || PROVIDER_OUTREACH_FROM_DEFAULT
  );
}

function outreachReplyTo(): string {
  return (
    process.env.PROVIDER_OUTREACH_REPLY_TO?.trim() ||
    PROVIDER_OUTREACH_REPLY_TO_DEFAULT
  );
}

function isTruthyEnvFlag(raw: string | undefined): boolean {
  const t = raw?.trim().toLowerCase();
  return t === '1' || t === 'true' || t === 'yes' || t === 'on';
}

/**
 * `--test` / `--test-samples`: same Reply-To as production (support) unless you opt into
 * "reply to my own test inbox" for local debugging.
 */
function resolveTestModeReplyTo(testDeliveryAddress: string): string {
  const mirror = isTruthyEnvFlag(
    process.env.PROVIDER_OUTREACH_TEST_MIRROR_REPLY_TO_INBOX
  );
  const custom = process.env.PROVIDER_OUTREACH_TEST_REPLY_TO?.trim();
  if (mirror) {
    return custom || testDeliveryAddress;
  }
  if (custom) {
    return custom;
  }
  return outreachReplyTo();
}

const DEFAULT_LIST = path.join(__dirname, 'output', 'provider-partnerships-emails-clean.txt');
const DEFAULT_REPORT = path.join(
  __dirname,
  'output',
  'provider-partnerships-report.json'
);
const DEFAULT_TEMPLATE = path.join(
  __dirname,
  'templates',
  'provider-partnership-outreach.json'
);

const FALLBACK_SUBJECT = 'ScholarshipTop — partnership inquiry';
const FALLBACK_BODY =
  'Hello,\n\nWe are reaching out from ScholarshipTop (scholarshiptop.com). Set scripts/templates/provider-partnership-outreach.json or env overrides.\n\nBest regards,\nScholarshipTop team';

const FREEMAIL_DOMAINS = new Set([
  'aol.com',
  'bk.ru',
  'googlemail.com',
  'hotmail.com',
  'icloud.com',
  'inbox.ru',
  'live.com',
  'mail.ru',
  'me.com',
  'msn.com',
  'outlook.com',
  'proton.me',
  'protonmail.com',
  'rocketmail.com',
  'yahoo.com',
  'ymail.com',
  'yandex.com',
  'yandex.ru',
  'gmail.com'
]);

type TemplateJson = {
  subject?: string;
  body?: string;
  organizationName?: string;
  usePremiumLayout?: boolean;
};

type ResolvedOutreach =
  | { format: 'plain'; subject: string; bodyPlain: string }
  | {
      format: 'premium';
      /** From `PROVIDER_OUTREACH_SUBJECT` only; if null, subject is built per recipient from org name. */
      subject: string | null;
      fixedOrganizationName?: string;
      fixedProviderSlug?: string;
    };

type ReportRow = {
  domain?: string;
  emails?: string[];
  evidence?: { emails?: string[] }[];
};

type RecipientContext = {
  organizationName: string;
  providerSlug: string | null;
};

const OUTREACH_DEFAULT_PUBLIC_SITE = 'https://scholarshiptop.com';

/**
 * Links in outreach (provider page, footer, “ScholarshipTop.com” in the body) must use the
 * live public site. `NEXT_PUBLIC_SITE_URL` is often a dev/ngrok host and must not be used here.
 */
function getOutreachEmailPublicOrigin(): string {
  const raw =
    process.env.PROVIDER_OUTREACH_PUBLIC_SITE?.trim() ||
    process.env.PROVIDER_OUTREACH_SITE_ORIGIN?.trim();
  if (raw) {
    const s = raw.replace(/\/+$/, '');
    if (s.startsWith('http://') || s.startsWith('https://')) return s;
    return `https://${s}`;
  }
  return OUTREACH_DEFAULT_PUBLIC_SITE;
}

function readTemplateJson(): TemplateJson | null {
  const templatePath =
    process.env.PROVIDER_OUTREACH_TEMPLATE?.trim() || DEFAULT_TEMPLATE;
  if (!fs.existsSync(templatePath)) return null;
  try {
    const raw = fs.readFileSync(templatePath, 'utf8');
    return JSON.parse(raw) as TemplateJson;
  } catch {
    return null;
  }
}

function normalizeEmailForMap(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let x = raw.trim().toLowerCase();
  x = x.replace(/\u200b|\u200c|\u200d|\ufeff/g, '');
  try {
    x = decodeURIComponent(x);
  } catch {
    /* keep */
  }
  x = x.replace(/\u200b|\u200c|\u200d|\ufeff/g, '').trim().toLowerCase();
  if (!x.includes('@')) return null;
  return x;
}

function loadEmailToDomainMap(): Map<string, string> {
  const map = new Map<string, string>();
  const reportPath =
    process.env.PROVIDER_OUTREACH_REPORT?.trim() || DEFAULT_REPORT;
  if (!fs.existsSync(reportPath)) return map;
  let rows: ReportRow[];
  try {
    rows = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as ReportRow[];
  } catch {
    return map;
  }
  if (!Array.isArray(rows)) return map;
  for (const row of rows) {
    const domain =
      typeof row.domain === 'string' ? row.domain.trim().toLowerCase() : '';
    if (!domain) continue;
    const bucket = new Set<string>();
    for (const e of row.emails ?? []) {
      const n = normalizeEmailForMap(e);
      if (n) bucket.add(n);
    }
    for (const ev of row.evidence ?? []) {
      for (const e of ev.emails ?? []) {
        const n = normalizeEmailForMap(e);
        if (n) bucket.add(n);
      }
    }
    for (const em of bucket) {
      map.set(em, domain);
    }
  }
  return map;
}

function getRecipientContextAndMatchMeta(
  toEmail: string,
  supabaseMap: Map<string, ProviderOutreachLookup> | null,
  reportMap: Map<string, string>
): { ctx: RecipientContext; matchLine: string } {
  const lower = toEmail.trim().toLowerCase();
  if (supabaseMap?.has(lower)) {
    const p = supabaseMap.get(lower)!;
    return {
      ctx: { organizationName: p.displayName, providerSlug: p.slug },
      matchLine: `MATCH: ${p.displayName} (exact support_email)`
    };
  }
  const byDomain = lookupProviderByRecipientDomain(lower, supabaseMap);
  if (byDomain) {
    return {
      ctx: {
        organizationName: byDomain.displayName,
        providerSlug: byDomain.slug
      },
      matchLine: `MATCH: ${byDomain.displayName} (same domain as support_email)`
    };
  }
  const fromReport = reportMap.get(lower);
  if (fromReport) {
    return {
      ctx: { organizationName: fromReport, providerSlug: null },
      matchLine: `FALLBACK: report domain "${fromReport}"`
    };
  }
  const host = lower.split('@')[1] ?? '';
  if (!host || FREEMAIL_DOMAINS.has(host)) {
    return {
      ctx: { organizationName: 'Your organization', providerSlug: null },
      matchLine: `FALLBACK: generic ("Your organization"; freemail or missing host)`
    };
  }
  return {
    ctx: { organizationName: host, providerSlug: null },
    matchLine: `FALLBACK: recipient mailbox domain "${host}"`
  };
}

function getRecipientContext(
  toEmail: string,
  supabaseMap: Map<string, ProviderOutreachLookup> | null,
  reportMap: Map<string, string>
): RecipientContext {
  return getRecipientContextAndMatchMeta(toEmail, supabaseMap, reportMap).ctx;
}

function findFirstListEmailWithProvider(
  listEmails: string[],
  supabaseMap: Map<string, ProviderOutreachLookup> | null
): (ProviderOutreachLookup & { listEmail: string }) | null {
  if (!supabaseMap) return null;
  for (const e of listEmails) {
    const hit = supabaseMap.get(e);
    if (hit) {
      return { ...hit, listEmail: e };
    }
  }
  return null;
}

/** Same org, different mailbox: list address vs scholarships.support_email on same domain. */
function findFirstListEmailWithProviderByDomain(
  listEmails: string[],
  supabaseMap: Map<string, ProviderOutreachLookup>
): (ProviderOutreachLookup & { listEmail: string; matchedSupportEmail: string }) | null {
  for (const listEmail of listEmails) {
    const host = listEmail.split('@')[1];
    if (!host) continue;
    for (const [supportEmail, lookup] of supabaseMap) {
      const sh = supportEmail.split('@')[1];
      if (sh === host) {
        return { ...lookup, listEmail, matchedSupportEmail: supportEmail };
      }
    }
  }
  return null;
}

function lookupProviderByRecipientDomain(
  toEmail: string,
  supabaseMap: Map<string, ProviderOutreachLookup> | null
): ProviderOutreachLookup | null {
  if (!supabaseMap?.size) return null;
  const host = toEmail.trim().toLowerCase().split('@')[1];
  if (!host) return null;
  for (const [supportEmail, lookup] of supabaseMap) {
    if (supportEmail.split('@')[1] === host) return lookup;
  }
  return null;
}

function resolveOutreach(): ResolvedOutreach {
  const envSubject = process.env.PROVIDER_OUTREACH_SUBJECT?.trim();
  const envBody = process.env.PROVIDER_OUTREACH_BODY?.trim();
  if (envSubject && envBody) {
    return { format: 'plain', subject: envSubject, bodyPlain: envBody };
  }

  const parsed = readTemplateJson();
  const usePremium =
    parsed == null ||
    parsed.usePremiumLayout !== false;

  if (parsed && parsed.body && parsed.usePremiumLayout === false) {
    const subject =
      envSubject ||
      (typeof parsed.subject === 'string' ? parsed.subject.trim() : '') ||
      FALLBACK_SUBJECT;
    return { format: 'plain', subject, bodyPlain: parsed.body.trim() };
  }

  if (usePremium) {
    const subject = envSubject || null;
    const orgEnv = process.env.PROVIDER_OUTREACH_ORG_NAME?.trim();
    const slugEnv = process.env.PROVIDER_OUTREACH_PROVIDER_SLUG?.trim();
    const orgJson =
      parsed && typeof parsed.organizationName === 'string'
        ? parsed.organizationName.trim()
        : '';
    const fixedFromJson =
      orgJson && !isOutreachOrganizationPlaceholder(orgJson)
        ? orgJson
        : undefined;
    const fixedOrganizationName = orgEnv || fixedFromJson;
    const fixedProviderSlug =
      fixedOrganizationName && slugEnv ? slugEnv : undefined;
    return {
      format: 'premium',
      subject,
      fixedOrganizationName,
      fixedProviderSlug
    };
  }

  return {
    format: 'plain',
    subject: FALLBACK_SUBJECT,
    bodyPlain: FALLBACK_BODY
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function plainTextToHtml(text: string): string {
  const paras = text.split(/\n\n+/).map((p) => {
    const lines = escapeHtml(p).split('\n').join('<br/>');
    return `<p style="margin:0 0 16px;font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#27272a;">${lines}</p>`;
  });
  return `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f4f4f5;">${paras.join('')}</body></html>`;
}

function buildPremiumHtml(ctx: RecipientContext, deliveryTo: string): string {
  return buildProviderPartnershipOutreachEmailHtml({
    siteOrigin: getOutreachEmailPublicOrigin(),
    organizationName: ctx.organizationName,
    providerSlug: ctx.providerSlug,
    recipientEmail: deliveryTo.trim()
  });
}

function parseArgs(argv: string[]) {
  const test = argv.includes('--test');
  const dryRun = argv.includes('--dry-run');
  let limit: number | undefined;
  const li = argv.indexOf('--limit');
  if (li >= 0 && argv[li + 1]) {
    const n = parseInt(argv[li + 1]!, 10);
    if (!Number.isNaN(n) && n > 0) limit = n;
  }
  let testSamples: number | undefined;
  const tsi = argv.indexOf('--test-samples');
  if (tsi >= 0 && argv[tsi + 1]) {
    const n = parseInt(argv[tsi + 1]!, 10);
    if (!Number.isNaN(n) && n > 0) testSamples = n;
  }
  return { test, dryRun, limit, testSamples };
}

/**
 * Up to `max` unique providers (by slug) from the Supabase map, stable email sort.
 */
function uniqueProviderSamplesFromMap(
  supabaseMap: Map<string, ProviderOutreachLookup> | null,
  max: number
): RecipientContext[] {
  if (!supabaseMap?.size || max < 1) return [];
  const bySlug = new Map<string, RecipientContext>();
  const entries = [...supabaseMap.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [, v] of entries) {
    if (!bySlug.has(v.slug)) {
      bySlug.set(v.slug, {
        organizationName: v.displayName,
        providerSlug: v.slug
      });
    }
    if (bySlug.size >= max) break;
  }
  return [...bySlug.values()];
}

async function sendOne(params: {
  to: string;
  subject: string;
  html: string;
  /** Overrides default `outreachReplyTo()` (e.g. `--test` + mirror flag). */
  replyToOverride?: string;
}): Promise<{ ok: boolean; status: number; body: string }> {
  const origin = getOutreachEmailPublicOrigin();
  const listUrl = buildMarketingUnsubscribeListHeaderUrl(origin, params.to);
  const replyToAddr =
    params.replyToOverride?.trim() || outreachReplyTo();
  const r = await postResend({
    to: params.to,
    subject: params.subject,
    html: params.html,
    category: 'marketing',
    marketingListUnsubscribeUrl: listUrl,
    from: outreachFrom(),
    replyTo: replyToAddr
  });
  if (r.skipped === 'RESEND_API_KEY not set') {
    return { ok: false, status: 0, body: r.skipped };
  }
  if (r.skipped === 'unsubscribed') {
    return { ok: true, status: 204, body: 'skipped: unsubscribed' };
  }
  if (!r.ok) {
    return { ok: false, status: 502, body: r.skipped ?? 'Resend error' };
  }
  return { ok: true, status: 200, body: '{}' };
}

function tallyOutreachSendResult(r: {
  ok: boolean;
  status: number;
  body: string;
}): 'sent' | 'skipped_unsubscribed' | 'failed' {
  if (!r.ok) return 'failed';
  if (r.status === 204) return 'skipped_unsubscribed';
  return 'sent';
}

async function safeNotifyOutreachComplete(
  payload: Parameters<typeof notifyProviderOutreachMailingComplete>[0]
): Promise<void> {
  try {
    await notifyProviderOutreachMailingComplete(payload);
  } catch (e) {
    console.warn(
      '[provider-outreach] Telegram summary error:',
      e instanceof Error ? e.message : String(e)
    );
  }
}

function outreachSubjectForRecipient(
  resolved: ResolvedOutreach,
  organizationName: string
): string {
  if (resolved.format === 'plain') return resolved.subject;
  return (
    resolved.subject ??
    buildProviderPartnershipOutreachEmailSubject(organizationName)
  );
}

async function main() {
  const { test, dryRun, limit, testSamples } = parseArgs(process.argv);
  const listPath =
    process.env.PROVIDER_OUTREACH_LIST?.trim() || DEFAULT_LIST;

  const resolved = resolveOutreach();

  const testAddress =
    process.env.PROVIDER_OUTREACH_TEST_TO?.trim() || 'loomany.self@gmail.com';

  const delayMs = Math.max(
    0,
    parseInt(process.env.PROVIDER_OUTREACH_MS_BETWEEN?.trim() || '1000', 10) || 1000
  );

  if (test && testSamples && testSamples > 0) {
    if (resolved.format === 'plain') {
      console.error(
        '[test-samples] not supported with PROVIDER_OUTREACH_SUBJECT+BODY plain override; use premium template.'
      );
      process.exit(1);
    }
    const supabaseMap = await loadProviderOutreachEmailMap();
    if (!supabaseMap?.size) {
      console.error(
        '[test-samples] need Supabase map (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) with scholarships+providers data.'
      );
      process.exit(1);
    }
    const samples = uniqueProviderSamplesFromMap(supabaseMap, testSamples);
    if (samples.length === 0) {
      console.error('[test-samples] no unique providers in map');
      process.exit(1);
    }
    if (samples.length < testSamples) {
      console.warn(
        `[test-samples] only ${samples.length} unique provider(s) in map (requested ${testSamples})`
      );
    }
    const replyToForTest = resolveTestModeReplyTo(testAddress);
    console.log(
      '[test-samples] Sending',
      samples.length,
      'to',
      testAddress,
      'reply_to',
      replyToForTest
    );
    if (dryRun) {
      for (let i = 0; i < samples.length; i++) {
        const ctx = samples[i]!;
        const subject = outreachSubjectForRecipient(
          resolved,
          ctx.organizationName
        );
        console.log(
          `[dry-run] ${i + 1}/${samples.length}`,
          ctx.organizationName,
          subject
        );
      }
      await safeNotifyOutreachComplete({
        modeLabel: `Dry-run --test-samples → ${testAddress}`,
        totalInRun: samples.length,
        sentResend: 0,
        skippedUnsubscribed: 0,
        skippedCampaignDedupe: 0,
        failed: 0,
        listPath,
        limit: null,
        exitCode: 0
      });
      return;
    }
    let sentResend = 0;
    let skippedUnsub = 0;
    let fail = 0;
    for (let i = 0; i < samples.length; i++) {
      const ctx = samples[i]!;
      const html = buildPremiumHtml(ctx, testAddress);
      const subject = outreachSubjectForRecipient(
        resolved,
        ctx.organizationName
      );
      const r = await sendOne({
        to: testAddress,
        subject,
        html,
        replyToOverride: replyToForTest
      });
      const tally = tallyOutreachSendResult(r);
      if (tally === 'sent') sentResend++;
      else if (tally === 'skipped_unsubscribed') skippedUnsub++;
      else fail++;
      const line = r.ok
        ? `Success (HTTP ${r.status})`
        : `Error (HTTP ${r.status}) ${r.body.slice(0, 200)}`;
      console.log(
        `[test-samples ${i + 1}/${samples.length}] ${ctx.organizationName} -> ${line}`
      );
      if (i < samples.length - 1 && delayMs > 0) {
        await new Promise((res) => setTimeout(res, delayMs));
      }
    }
    const exitCode = fail > 0 ? 1 : 0;
    await safeNotifyOutreachComplete({
      modeLabel: `--test-samples (${samples.length}) → ${testAddress}`,
      totalInRun: samples.length,
      sentResend,
      skippedUnsubscribed: skippedUnsub,
      skippedCampaignDedupe: 0,
      failed: fail,
      listPath,
      limit: null,
      exitCode
    });
    process.exit(exitCode);
  }

  if (test) {
    let html: string;
    let premiumCtx: RecipientContext = {
      organizationName: 'Your organization',
      providerSlug: null
    };

    if (resolved.format === 'plain') {
      html = plainTextToHtml(resolved.bodyPlain);
    } else {
      const supabaseMap = await loadProviderOutreachEmailMap();
      if (!supabaseMap) {
        console.warn(
          '[provider-outreach] Supabase map empty or missing env (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) — using report / domain only.'
        );
      } else {
        console.log(
          `[test] Supabase support_email → provider map size: ${supabaseMap.size}`
        );
      }

      if (resolved.fixedOrganizationName) {
        premiumCtx = {
          organizationName: resolved.fixedOrganizationName,
          providerSlug: resolved.fixedProviderSlug || null
        };
        html = buildPremiumHtml(premiumCtx, testAddress);
      } else {
        const reportMap = loadEmailToDomainMap();
        let listEmails: string[] = [];
        if (fs.existsSync(listPath)) {
          listEmails = fs
            .readFileSync(listPath, 'utf8')
            .split(/\r?\n/)
            .map((l) => l.trim().toLowerCase())
            .filter(Boolean);
        }
        const hitExact = findFirstListEmailWithProvider(
          listEmails,
          supabaseMap
        );
        const hitDomain =
          !hitExact && supabaseMap && supabaseMap.size > 0
            ? findFirstListEmailWithProviderByDomain(listEmails, supabaseMap)
            : null;
        const hit = hitExact ?? hitDomain;
        if (hit) {
          premiumCtx = {
            organizationName: hit.displayName,
            providerSlug: hit.slug
          };
          html = buildPremiumHtml(premiumCtx, testAddress);
          if ('matchedSupportEmail' in hit) {
            console.log(
              `[test] Persona (list email domain = Supabase support_email domain): list=${hit.listEmail} matched_support=${hit.matchedSupportEmail} -> "${hit.displayName}" (slug: ${hit.slug})`
            );
          } else {
            console.log(
              `[test] Persona (from list + Supabase): ${hit.listEmail} -> "${hit.displayName}" (slug: ${hit.slug})`
            );
          }
        } else {
          const first = listEmails[0];
          premiumCtx = first
            ? getRecipientContext(first, supabaseMap, reportMap)
            : {
                organizationName: 'Your organization',
                providerSlug: null
              };
          html = buildPremiumHtml(premiumCtx, first ?? testAddress);
          console.log(
            `[test] No list email matched Supabase; using fallback context (first list row or generic). org="${premiumCtx.organizationName}" slug=${premiumCtx.providerSlug ?? 'none'}`
          );
        }
      }
    }

    const subject =
      resolved.format === 'plain'
        ? resolved.subject
        : outreachSubjectForRecipient(resolved, premiumCtx.organizationName);
    const replyToForTest = resolveTestModeReplyTo(testAddress);
    console.log(
      'Test send to',
      testAddress,
      'from',
      outreachFrom(),
      'reply_to',
      replyToForTest,
      `(${resolved.format})`
    );
    if (dryRun) {
      console.log('[dry-run] would POST', {
        subject,
        reply_to: replyToForTest
      });
      await safeNotifyOutreachComplete({
        modeLabel: `Dry-run --test (без отправки) → ${testAddress}`,
        totalInRun: 1,
        sentResend: 0,
        skippedUnsubscribed: 0,
        skippedCampaignDedupe: 0,
        failed: 0,
        listPath,
        limit: null,
        exitCode: 0
      });
      return;
    }
    const r = await sendOne({
      to: testAddress,
      subject,
      html,
      replyToOverride: replyToForTest
    });
    const line = r.ok
      ? `Success (HTTP ${r.status})`
      : `Error (HTTP ${r.status}) ${r.body.slice(0, 200)}`;
    console.log(`[test] ${testAddress} -> ${line}`);
    const tally = tallyOutreachSendResult(r);
    const exitCode = tally === 'failed' ? 1 : 0;
    await safeNotifyOutreachComplete({
      modeLabel: `--test одно письмо → ${testAddress}`,
      totalInRun: 1,
      sentResend: tally === 'sent' ? 1 : 0,
      skippedUnsubscribed: tally === 'skipped_unsubscribed' ? 1 : 0,
      skippedCampaignDedupe: 0,
      failed: tally === 'failed' ? 1 : 0,
      listPath,
      limit: null,
      exitCode
    });
    process.exit(exitCode);
  }

  if (!fs.existsSync(listPath)) {
    console.error('List file not found:', listPath);
    process.exit(1);
  }

  const supabaseMap = await loadProviderOutreachEmailMap();
  if (!supabaseMap) {
    console.warn(
      '[provider-outreach] Supabase not configured or load failed; names/slugs fall back to report / domain only.'
    );
  }
  const reportMap = loadEmailToDomainMap();

  const raw = fs.readFileSync(listPath, 'utf8');
  const emails = raw
    .split(/\r?\n/)
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean);

  const slice = limit != null ? emails.slice(0, limit) : emails;
  const campaignKey = resolveProviderOutreachCampaignKey();
  const logSb = createProviderOutreachLogClient();
  const hasServiceSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
  if (logSb) {
    console.log('[provider-outreach] Campaign dedupe key:', campaignKey);
    console.log(
      '[provider-outreach] provider_outreach_log: ON — skip if already sent; insert after Resend 200'
    );
  } else if (!dryRun) {
    console.warn(
      '[provider-outreach] Supabase missing — campaign dedupe (provider_outreach_log) disabled; repeats may resend.'
    );
  }
  console.log(
    '[provider-outreach] unsubscribed_emails (marketing guard in postResend):',
    hasServiceSupabase
      ? 'ON — skip if email is in table before Resend'
      : 'OFF (set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)'
  );
  console.log(
    dryRun ? '[dry-run]' : 'Sending',
    slice.length,
    'messages; list:',
    listPath,
    `; delay ${delayMs}ms`
  );

  let plainHtmlFixed: string | null = null;
  if (resolved.format === 'plain') {
    plainHtmlFixed = plainTextToHtml(resolved.bodyPlain);
  }

  const premiumFixedOrg =
    resolved.format === 'premium' && resolved.fixedOrganizationName
      ? {
          organizationName: resolved.fixedOrganizationName,
          providerSlug: resolved.fixedProviderSlug || null
        }
      : null;

  let sentResend = 0;
  let skippedUnsub = 0;
  let skippedCampaign = 0;
  let fail = 0;
  for (let i = 0; i < slice.length; i++) {
    const to = slice[i]!;
    const totalBatch = slice.length;
    if (dryRun) {
      if (logSb) {
        const ex = await providerOutreachLogExists(logSb, to, campaignKey);
        if (!ex.ok) {
          console.warn(
            `[dry-run] log lookup failed for ${to}:`,
            ex.message
          );
        } else if (ex.exists) {
          skippedCampaign++;
          console.log(
            `[SKIP] Email already reached in this campaign. (${to})`
          );
          continue;
        }
      }
      const ctx =
        plainHtmlFixed == null && !premiumFixedOrg
          ? getRecipientContext(to, supabaseMap, reportMap)
          : null;
      const dryNote = ctx
        ? `org=${ctx.organizationName} slug=${ctx.providerSlug ?? '—'}`
        : plainHtmlFixed != null
          ? '(plain fixed body)'
          : '(fixed org; footer built per recipient)';
      console.log(i + 1, to, dryNote);
      continue;
    }
    if (logSb) {
      const ex = await providerOutreachLogExists(logSb, to, campaignKey);
      if (!ex.ok) {
        console.error(
          '[provider-outreach-log] lookup failed (aborting):',
          ex.message
        );
        process.exit(1);
      }
      if (ex.exists) {
        skippedCampaign++;
        console.log(`[SKIP] Email already reached in this campaign. (${to})`);
        if (i < slice.length - 1 && delayMs > 0) {
          await new Promise((res) => setTimeout(res, delayMs));
        }
        continue;
      }
    }
    console.log(`[${i + 1}/${totalBatch}] Sending to ${to}...`);
    const { ctx, matchLine } = getRecipientContextAndMatchMeta(
      to,
      supabaseMap,
      reportMap
    );
    console.log(`  ${matchLine}`);
    const html =
      plainHtmlFixed != null
        ? plainHtmlFixed
        : premiumFixedOrg != null
          ? buildPremiumHtml(premiumFixedOrg, to)
          : buildPremiumHtml(ctx, to);
    const orgForSubject =
      resolved.format === 'premium' && resolved.fixedOrganizationName
        ? resolved.fixedOrganizationName
        : ctx.organizationName;
    const subject = outreachSubjectForRecipient(resolved, orgForSubject);
    const r = await sendOne({ to, subject, html });
    const tally = tallyOutreachSendResult(r);
    if (tally === 'sent') {
      sentResend++;
      console.log(`  Resend: OK (HTTP ${r.status})`);
      if (logSb) {
        const ins = await providerOutreachLogInsertSent(
          logSb,
          to,
          campaignKey
        );
        if (!ins.ok) {
          console.error(
            '[provider-outreach-log] CRITICAL: Resend 200 but log insert failed:',
            to,
            ins.message
          );
          process.exit(1);
        }
      }
    } else if (tally === 'skipped_unsubscribed') {
      skippedUnsub++;
      console.log(
        `  Resend: skipped — already unsubscribed (HTTP ${r.status})`
      );
    } else {
      fail++;
      console.log(
        `  Resend: ERROR (HTTP ${r.status}) ${r.body.slice(0, 200)}`
      );
    }
    if (i < slice.length - 1 && delayMs > 0) {
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }

  const exitCode = dryRun ? 0 : fail > 0 ? 1 : 0;
  if (!dryRun) {
    console.log(
      'Done. Sent (Resend 200):',
      sentResend,
      'Skipped (unsub):',
      skippedUnsub,
      'Skipped (campaign log):',
      skippedCampaign,
      'Errors:',
      fail
    );
  } else if (skippedCampaign > 0) {
    console.log(
      '[dry-run] Would skip (already in campaign):',
      skippedCampaign
    );
  }
  await safeNotifyOutreachComplete({
    modeLabel: dryRun
      ? 'Dry-run по списку (письма не отправлялись)'
      : 'Боевая рассылка по списку',
    totalInRun: slice.length,
    sentResend: dryRun ? 0 : sentResend,
    skippedUnsubscribed: dryRun ? 0 : skippedUnsub,
    skippedCampaignDedupe: skippedCampaign,
    failed: dryRun ? 0 : fail,
    listPath,
    limit: limit ?? null,
    exitCode
  });
  process.exit(exitCode);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
