import 'server-only';

import {
  GRANT_DIGEST_DEMO_CHANNEL_LABELS,
  sendGrantDigestBatchEmail
} from '@/lib/email/sendGrantDigestEmail';
import { grantNotifyTelegramCardCategoryLabel } from '@/lib/notifications/grantNotificationPrefs';
import { fetchActiveScholarshipPreviews } from '@/lib/scholarships/supabase';
import { sendScholarshipTelegramCardToChat } from '@/lib/telegram/scholarshipTelegramCard';

export type GrantNotificationTestSampleResult = {
  ok: boolean;
  skipped?: boolean;
  scholarshipId?: string;
  scholarshipTitle?: string;
  emailSent: boolean;
  telegramSent: boolean;
  message?: string;
};

/**
 * Sends a 4-card digest email (demo category labels) and/or one Telegram card.
 * Guarded by GRANT_NOTIFICATION_TEST_SAMPLE_CRON so it cannot run by accident.
 */
export async function runGrantNotificationTestSample(): Promise<GrantNotificationTestSampleResult> {
  const cronFlag = process.env.GRANT_NOTIFICATION_TEST_SAMPLE_CRON?.trim();
  if (cronFlag !== '1' && cronFlag?.toLowerCase() !== 'true') {
    return {
      ok: true,
      skipped: true,
      emailSent: false,
      telegramSent: false,
      message:
        'Disabled: set GRANT_NOTIFICATION_TEST_SAMPLE_CRON=1 on the server to enable.'
    };
  }

  const email = process.env.GRANT_NOTIFICATION_TEST_SAMPLE_EMAIL?.trim();
  const chatIdRaw = process.env.GRANT_NOTIFICATION_TEST_SAMPLE_TELEGRAM_CHAT_ID?.trim();

  if (!email && !chatIdRaw) {
    return {
      ok: false,
      emailSent: false,
      telegramSent: false,
      message:
        'Set GRANT_NOTIFICATION_TEST_SAMPLE_EMAIL and/or GRANT_NOTIFICATION_TEST_SAMPLE_TELEGRAM_CHAT_ID'
    };
  }

  const digestList = await fetchActiveScholarshipPreviews(4);
  if (digestList.length === 0) {
    return {
      ok: false,
      emailSent: false,
      telegramSent: false,
      message: 'No active scholarships'
    };
  }

  const labels = [...GRANT_DIGEST_DEMO_CHANNEL_LABELS];
  const emailItems = digestList.map((scholarship, i) => ({
    scholarship,
    channelLabel: `${labels[i % labels.length]!} (test)`
  }));

  const previewTelegram = digestList[0]!;
  const sid = previewTelegram.id;
  const title = digestList.map((s) => s.title?.trim() || 'Scholarship').join(' · ');

  let emailSent = false;
  let telegramSent = false;

  if (email) {
    const r = await sendGrantDigestBatchEmail({
      toEmail: email,
      items: emailItems,
      firstName: 'there'
    });
    emailSent = r.ok;
  }

  if (chatIdRaw) {
    const chatId = Number(chatIdRaw);
    if (!Number.isFinite(chatId)) {
      return {
        ok: false,
        scholarshipId: sid,
        scholarshipTitle: title,
        emailSent,
        telegramSent: false,
        message: 'GRANT_NOTIFICATION_TEST_SAMPLE_TELEGRAM_CHAT_ID must be a number'
      };
    }
    telegramSent = await sendScholarshipTelegramCardToChat(chatId, previewTelegram, {
      categoryLabel: grantNotifyTelegramCardCategoryLabel('best')
    });
  }

  return {
    ok: true,
    scholarshipId: sid,
    scholarshipTitle: title,
    emailSent,
    telegramSent,
    message: undefined
  };
}
