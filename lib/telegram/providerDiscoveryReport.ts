import 'server-only';

import { collectTelegramAdminAlertChatIdsForCategory } from '@/lib/telegram/adminNotificationRouting';

export type ProviderDiscoveryEvidenceLike = {
  url: string;
  matchedKeywords: string[];
};

export type ProviderDiscoveryReportLike = {
  domain: string;
  emails: string[];
  hasPartnershipSignals: boolean;
  evidence: ProviderDiscoveryEvidenceLike[];
};

function parseEnvChatIds(raw: string | undefined): number[] {
  return (raw ?? '')
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));
}

async function resolveProviderDiscoveryChatIds(): Promise<number[]> {
  const routed = await collectTelegramAdminAlertChatIdsForCategory('grants');
  if (routed.length > 0) return routed;
  const fallback = new Set<number>();
  for (const id of parseEnvChatIds(process.env.TELEGRAM_ADMIN_IDS)) fallback.add(id);
  for (const id of parseEnvChatIds(process.env.TELEGRAM_CHAT_ID)) fallback.add(id);
  for (const id of parseEnvChatIds(process.env.GRANT_NOTIFICATION_TEST_SAMPLE_TELEGRAM_CHAT_ID)) {
    fallback.add(id);
  }
  return [...fallback];
}

async function sendTelegramTextToChats(text: string, chatIds: number[]): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? '';
  if (!token || chatIds.length === 0) return;
  for (const chatId of chatIds) {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true
      })
    }).catch(() => null);
  }
}

function partnerLinksFromReports(
  reports: ProviderDiscoveryReportLike[],
  maxLinks: number
): string[] {
  const links: string[] = [];
  const seen = new Set<string>();
  for (const report of reports) {
    for (const item of report.evidence ?? []) {
      if ((item.matchedKeywords ?? []).length === 0) continue;
      const link = String(item.url ?? '').trim();
      if (!link || seen.has(link)) continue;
      seen.add(link);
      links.push(link);
      if (links.length >= maxLinks) return links;
    }
  }
  return links;
}

export function buildProviderDiscoveryTelegramSummary(
  reports: ProviderDiscoveryReportLike[],
  options?: { maxPartnerLinks?: number }
): string {
  const maxPartnerLinks = Math.max(1, options?.maxPartnerLinks ?? 20);
  const uniqueEmails = new Set<string>();
  for (const report of reports) {
    for (const email of report.emails ?? []) {
      const normalized = String(email).trim().toLowerCase();
      if (!normalized) continue;
      uniqueEmails.add(normalized);
    }
  }
  const partnerDomainCount = reports.filter((r) => r.hasPartnershipSignals).length;
  const links = partnerLinksFromReports(reports, maxPartnerLinks);
  const lines = [
    'Provider scan finished',
    `Scanned domains: ${reports.length}`,
    `Unique emails found: ${uniqueEmails.size}`,
    `Domains with partner signals: ${partnerDomainCount}`,
    '',
    'Partner page links:'
  ];
  if (links.length === 0) {
    lines.push('- none found');
  } else {
    for (const link of links) lines.push(`- ${link}`);
  }
  const text = lines.join('\n');
  return text.length > 3900 ? `${text.slice(0, 3896)}\n...` : text;
}

export async function sendProviderDiscoveryTelegramSummary(
  reports: ProviderDiscoveryReportLike[]
): Promise<void> {
  const text = buildProviderDiscoveryTelegramSummary(reports);
  const chatIds = await resolveProviderDiscoveryChatIds();
  await sendTelegramTextToChats(text, chatIds);
}

export async function sendProviderDiscoveryTelegramFailure(
  message: string
): Promise<void> {
  const text = `Provider scan failed\n${message}`.slice(0, 3900);
  const chatIds = await resolveProviderDiscoveryChatIds();
  await sendTelegramTextToChats(text, chatIds);
}

/** Resend delivered (HTTP 200). */
export type ProviderOutreachMailingTelegramPayload = {
  /** e.g. "Боевая рассылка по списку", "Dry-run", "--test-samples" */
  modeLabel: string;
  totalInRun: number;
  /** Successful Resend send (HTTP 200). */
  sentResend: number;
  /** Marketing guard: unsubscribed in DB (no HTTP send to Resend). */
  skippedUnsubscribed: number;
  /** Already in `provider_outreach_log` for this campaign (no Resend call). */
  skippedCampaignDedupe: number;
  failed: number;
  listPath?: string;
  limit?: number | null;
  exitCode: number;
};

function isProviderOutreachTelegramNotifyDisabled(): boolean {
  const t = process.env.PROVIDER_OUTREACH_TELEGRAM_NOTIFY?.trim().toLowerCase();
  return t === '0' || t === 'false' || t === 'no' || t === 'off';
}

export function buildProviderOutreachMailingTelegramText(
  p: ProviderOutreachMailingTelegramPayload
): string {
  const lines: string[] = [
    '📧 Provider outreach — отчёт',
    '',
    `Режим: ${p.modeLabel}`
  ];
  if (p.listPath) {
    const short =
      p.listPath.length > 200 ? `…${p.listPath.slice(-180)}` : p.listPath;
    lines.push(`Список: ${short}`);
  }
  if (p.limit != null && p.limit > 0) {
    lines.push(`Лимит --limit: ${p.limit}`);
  }
  lines.push(
    `В прогоне адресов: ${p.totalInRun}`,
    `✅ Отправлено (Resend 200): ${p.sentResend}`,
    `⏭ Пропущено (unsubscribe в базе): ${p.skippedUnsubscribed}`,
    `⏭ Уже в кампании (provider_outreach_log): ${p.skippedCampaignDedupe ?? 0}`,
    `❌ Ошибки / не ушло: ${p.failed}`,
    '',
    `Код завершения: ${p.exitCode}`
  );
  const text = lines.join('\n');
  return text.length > 3900 ? `${text.slice(0, 3896)}\n...` : text;
}

/**
 * Same chat routing as provider discovery (`grants` admins → TELEGRAM_ADMIN_IDS / TELEGRAM_CHAT_ID).
 * Set `PROVIDER_OUTREACH_TELEGRAM_NOTIFY=0` to disable. Needs `TELEGRAM_BOT_TOKEN`.
 */
export async function notifyProviderOutreachMailingComplete(
  p: ProviderOutreachMailingTelegramPayload
): Promise<void> {
  if (isProviderOutreachTelegramNotifyDisabled()) {
    console.log(
      '[provider-outreach] Telegram summary skipped (PROVIDER_OUTREACH_TELEGRAM_NOTIFY off)'
    );
    return;
  }
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    console.log(
      '[provider-outreach] Telegram summary skipped (no TELEGRAM_BOT_TOKEN)'
    );
    return;
  }
  const chatIds = await resolveProviderDiscoveryChatIds();
  if (chatIds.length === 0) {
    console.log(
      '[provider-outreach] Telegram summary skipped (no target chats; grants routing / TELEGRAM_ADMIN_IDS / TELEGRAM_CHAT_ID)'
    );
    return;
  }
  const text = buildProviderOutreachMailingTelegramText(p);
  await sendTelegramTextToChats(text, chatIds);
  console.log('[provider-outreach] Telegram summary sent.');
}
