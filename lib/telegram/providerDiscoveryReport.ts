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
