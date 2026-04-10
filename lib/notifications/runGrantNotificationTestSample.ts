import 'server-only';

import { sendGrantDigestEmail } from '@/lib/email/sendGrantDigestEmail';
import { mapScholarshipRow, type ScholarshipRow } from '@/lib/scholarships/supabase';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';
import { sendScholarshipTelegramCardToChat } from '@/lib/telegram/scholarshipTelegramCard';

const CHANNEL_LABEL = 'Test sample';

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
 * Sends one arbitrary active scholarship to a fixed test email and/or Telegram chat.
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

  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return {
      ok: false,
      emailSent: false,
      telegramSent: false,
      message: 'Service role client unavailable'
    };
  }

  const { data: row, error } = await admin
    .from('scholarships')
    .select('*')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      emailSent: false,
      telegramSent: false,
      message: error.message
    };
  }

  if (!row) {
    return {
      ok: false,
      emailSent: false,
      telegramSent: false,
      message: 'No active scholarships'
    };
  }

  const scholarship = mapScholarshipRow(row as ScholarshipRow);
  const sid = scholarship.id;
  const title = scholarship.title?.trim() || 'Scholarship';

  let emailSent = false;
  let telegramSent = false;

  if (email) {
    const r = await sendGrantDigestEmail({
      toEmail: email,
      scholarship,
      channelLabel: CHANNEL_LABEL,
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
    telegramSent = await sendScholarshipTelegramCardToChat(chatId, scholarship);
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
