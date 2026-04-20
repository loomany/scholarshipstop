import 'server-only';

import {
  GRANT_DIGEST_DEMO_CHANNEL_LABELS,
  sendGrantDigestBatchEmail,
  type GrantDigestCategory
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

type DemoCategoryId = GrantDigestCategory['id'];
const DEMO_CHANNEL_ORDER: DemoCategoryId[] = [
  'best',
  'easy_apply',
  'hot_deadlines',
  'saved_filters'
];

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

  const emailRaw = process.env.GRANT_NOTIFICATION_TEST_SAMPLE_EMAIL?.trim() || '';
  const emails = Array.from(
    new Set(
      emailRaw
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v.length > 0)
    )
  );
  const chatIdRaw = process.env.GRANT_NOTIFICATION_TEST_SAMPLE_TELEGRAM_CHAT_ID?.trim();

  if (emails.length === 0 && !chatIdRaw) {
    return {
      ok: false,
      emailSent: false,
      telegramSent: false,
      message:
        'Set GRANT_NOTIFICATION_TEST_SAMPLE_EMAIL and/or GRANT_NOTIFICATION_TEST_SAMPLE_TELEGRAM_CHAT_ID'
    };
  }

  const digestList = await fetchActiveScholarshipPreviews(24);
  if (digestList.length === 0) {
    return {
      ok: false,
      emailSent: false,
      telegramSent: false,
      message: 'No active scholarships'
    };
  }

  const labels = [...GRANT_DIGEST_DEMO_CHANNEL_LABELS];
  const groups = new Map<DemoCategoryId, typeof digestList>();
  for (const id of DEMO_CHANNEL_ORDER) groups.set(id, []);
  for (let i = 0; i < digestList.length; i++) {
    const id = DEMO_CHANNEL_ORDER[i % DEMO_CHANNEL_ORDER.length]!;
    groups.get(id)!.push(digestList[i]!);
  }
  const categories: GrantDigestCategory[] = DEMO_CHANNEL_ORDER.map((id, i) => {
    const items = groups.get(id)!;
    return {
      id,
      label: `${labels[i]!} (test)`,
      totalCount: items.length,
      viewAllUrl: `https://scholarshiptop.com/scholarships?tab=${
        id === 'best'
          ? 'best-recommendation'
          : id === 'easy_apply'
            ? 'easy-apply'
            : id === 'hot_deadlines'
              ? 'hot-deadlines'
              : 'recommended'
      }`,
      items: items.slice(0, 4)
    };
  }).filter((c) => c.totalCount > 0 && c.items.length > 0);

  const previewTelegram = digestList[0]!;
  const sid = previewTelegram.id;
  const title = digestList.map((s) => s.title?.trim() || 'Scholarship').join(' · ');

  let emailSent = false;
  let telegramSent = false;

  if (emails.length > 0) {
    emailSent = true;
    for (const toEmail of emails) {
      const r = await sendGrantDigestBatchEmail({
        toEmail,
        categories,
        firstName: 'there'
      });
      if (!r.ok) emailSent = false;
    }
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
