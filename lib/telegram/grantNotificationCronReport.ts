import { collectTelegramAdminAlertChatIdsForCategory } from '@/lib/telegram/adminNotificationRouting';
import { escapeTelegramHtml } from '@/lib/telegram/resourceNotifyCore';
import type { GrantNotificationDispatchResult } from '@/lib/notifications/runGrantNotificationDispatch';

type CronReportTiming = {
  startedAtIso: string;
  finishedAtIso: string;
  durationMs: number;
};

function isGrantCronTelegramReportDisabled(): boolean {
  return process.env.GRANT_NOTIFICATION_TELEGRAM_REPORT?.trim() === '0';
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function formatNumber(n: number | undefined): string {
  return String(n ?? 0);
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  try {
    return JSON.stringify(e);
  } catch {
    return 'Unknown error';
  }
}

async function sendGrantCronTelegramHtml(text: string): Promise<void> {
  if (isGrantCronTelegramReportDisabled()) {
    console.log('[grant-notify] Telegram admin report skipped (GRANT_NOTIFICATION_TELEGRAM_REPORT=0)');
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    console.log('[grant-notify] Telegram admin report skipped (no TELEGRAM_BOT_TOKEN)');
    return;
  }

  const chatIds = await collectTelegramAdminAlertChatIdsForCategory('grants');
  if (chatIds.length === 0) {
    console.log('[grant-notify] Telegram admin report skipped (no grants admin chats)');
    return;
  }

  for (const chatId of chatIds) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error('[grant-notify] Telegram admin report failed', chatId, res.status, body);
      }
    } catch (e) {
      console.error('[grant-notify] Telegram admin report error', chatId, e);
    }
  }
}

export async function notifyGrantNotificationCronComplete(
  result: GrantNotificationDispatchResult,
  timing: CronReportTiming
): Promise<void> {
  const diagnostics = result.diagnostics;
  const status =
    !result.ok || result.errors > 0
      ? '❌ Daily grant digest: needs attention'
      : result.cappedOps
        ? '⚠️ Daily grant digest: capped'
        : '✅ Daily grant digest: sent';

  const lines = [
    `<b>${escapeTelegramHtml(status)}</b>`,
    '',
    `<b>Started:</b> ${escapeTelegramHtml(timing.startedAtIso)}`,
    `<b>Finished:</b> ${escapeTelegramHtml(timing.finishedAtIso)}`,
    `<b>Duration:</b> ${escapeTelegramHtml(formatDuration(timing.durationMs))}`,
    '',
    `<b>Emails sent:</b> ${formatNumber(result.emailSent)}`,
    `<b>Telegram sent:</b> ${formatNumber(result.telegramSent)}`,
    `<b>Errors:</b> ${formatNumber(result.errors)}`,
    `<b>Skipped duplicates:</b> ${formatNumber(result.skippedDup)}`,
    `<b>Capped:</b> ${result.cappedOps ? 'yes' : 'no'}`,
    '',
    `<b>Scholarships scanned:</b> ${formatNumber(result.scholarshipsConsidered)}`,
    `<b>Profiles loaded:</b> ${formatNumber(diagnostics?.profilesLoaded)}`,
    `<b>Matched pairs:</b> ${formatNumber(diagnostics?.matchedPairs)}`,
    `<b>Email candidates:</b> ${formatNumber(diagnostics?.emailCandidates)}`,
    `<b>Email attempts:</b> ${formatNumber(diagnostics?.emailDigestAttempts)}`,
    `<b>Email failed:</b> ${formatNumber(diagnostics?.emailDigestFailed)}`,
    `<b>Cooldown skips:</b> ${formatNumber(diagnostics?.emailSkippedCooldownUsers)}`,
    `<b>Fallback users:</b> ${formatNumber(diagnostics?.fallbackUsers)}`,
    '',
    `<b>Hint:</b> ${escapeTelegramHtml(result.bottleneckHint || result.message || 'Done')}`
  ];

  await sendGrantCronTelegramHtml(lines.join('\n'));
}

export async function notifyGrantNotificationCronFatal(
  error: unknown,
  timing: Omit<CronReportTiming, 'finishedAtIso'>
): Promise<void> {
  const finishedAtIso = new Date().toISOString();
  const lines = [
    '<b>❌ Daily grant digest: fatal error</b>',
    '',
    `<b>Started:</b> ${escapeTelegramHtml(timing.startedAtIso)}`,
    `<b>Failed:</b> ${escapeTelegramHtml(finishedAtIso)}`,
    `<b>Duration:</b> ${escapeTelegramHtml(formatDuration(timing.durationMs))}`,
    '',
    `<b>Error:</b> ${escapeTelegramHtml(errorMessage(error)).slice(0, 2500)}`
  ];

  await sendGrantCronTelegramHtml(lines.join('\n'));
}
