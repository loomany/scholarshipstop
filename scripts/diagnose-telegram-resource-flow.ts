/**
 * Why a published article may not appear in Telegram:
 * 1) TELEGRAM_RESOURCE_PUBLISH_NOTIFY_ENABLED=0 (publish notify disabled).
 * 2) Nothing calls POST /api/internal/resources/notify-published (needs DB webhook or manual).
 * 3) TELEGRAM_BOT_TOKEN missing / invalid.
 * 4) Zero target chats (TELEGRAM_RESOURCES_* / admin fallback).
 *
 * Run: npx dotenv-cli -e .env.local -- npx tsx scripts/diagnose-telegram-resource-flow.ts
 */
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types_db';

function mask(s: string | undefined): string {
  if (!s?.trim()) return '(not set)';
  const t = s.trim();
  if (t.length <= 8) return '***';
  return `${t.slice(0, 4)}…${t.slice(-4)} (${t.length} chars)`;
}

function parseEnvChatIds(raw: string | undefined): number[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isFinite(n));
}

function isTruthyEnv(raw: string | undefined): boolean {
  const v = raw?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

async function main() {
  console.log('=== Telegram resource article notify — diagnostics ===\n');

  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const notifySecret =
    process.env.TELEGRAM_RESOURCE_NOTIFY_SECRET?.trim() ||
    process.env.CONTENT_ARTICLE_MATCH_SECRET?.trim() ||
    '';
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim() || '';

  console.log('[1] Env (secrets masked)');
  const publishNotifyOff =
    process.env.TELEGRAM_RESOURCE_PUBLISH_NOTIFY_ENABLED?.trim().toLowerCase() === '0' ||
    process.env.TELEGRAM_RESOURCE_PUBLISH_NOTIFY_ENABLED?.trim().toLowerCase() === 'false' ||
    process.env.TELEGRAM_RESOURCE_PUBLISH_NOTIFY_ENABLED?.trim().toLowerCase() === 'no' ||
    process.env.TELEGRAM_RESOURCE_PUBLISH_NOTIFY_ENABLED?.trim().toLowerCase() === 'off';
  console.log(
    '    TELEGRAM_RESOURCE_PUBLISH_NOTIFY_ENABLED:',
    process.env.TELEGRAM_RESOURCE_PUBLISH_NOTIFY_ENABLED ?? '(unset = on)',
    publishNotifyOff ? '— publish → Telegram is OFF' : ''
  );
  console.log('    TELEGRAM_BOT_TOKEN:', botToken ? mask(botToken) : '(not set) — sends will fail');
  console.log(
    '    Bearer for /api/internal/resources/notify-published:',
    notifySecret ? mask(notifySecret) : '(not set) — webhook/manual calls get 401'
  );
  console.log('    TELEGRAM_RESOURCES_BROADCAST_ALL:', process.env.TELEGRAM_RESOURCES_BROADCAST_ALL ?? '(unset)');
  const envChats = parseEnvChatIds(process.env.TELEGRAM_RESOURCES_CHAT_ID);
  console.log('    TELEGRAM_RESOURCES_CHAT_ID:', envChats.length ? `${envChats.length} id(s)` : '(unset)');
  console.log('    NEXT_PUBLIC_SITE_URL / SITE_URL:', siteUrl || '(unset — links use default host in code)');
  console.log('');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.log('[2] Supabase: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing — cannot count Telegram targets.');
    process.exit(1);
  }

  const supabase = createClient<Database>(url, key);

  let broadcastStarted = 0;
  const { count: cntStarted, error: e1 } = await supabase
    .from('telegram_users')
    .select('*', { count: 'exact', head: true })
    .not('last_bot_started_at', 'is', null);
  if (!e1) broadcastStarted = cntStarted ?? 0;

  const { data: admins } = await supabase
    .from('telegram_users')
    .select('telegram_chat_id')
    .eq('is_admin', true)
    .eq('notifications_enabled', true);

  const adminIds = [...new Set((admins ?? []).map((r) => r.telegram_chat_id).filter(Boolean))] as number[];

  console.log('[2] Target chats (same logic as lib/telegram/notifyResources.ts)');
  if (isTruthyEnv(process.env.TELEGRAM_RESOURCES_BROADCAST_ALL)) {
    console.log('    Mode: TELEGRAM_RESOURCES_BROADCAST_ALL — users with last_bot_started_at set');
    console.log('    Count:', broadcastStarted);
    if (broadcastStarted === 0) {
      console.log('    ⚠ No users to broadcast to (nobody used /start or field not set).');
    }
  } else if (envChats.length > 0) {
    console.log('    Mode: TELEGRAM_RESOURCES_CHAT_ID');
    console.log('    Count:', envChats.length);
  } else {
    console.log(
      '    Mode: fallback — telegram_users is_admin + notifications + category «resources» (admin_notification_prefs)'
    );
    console.log('    Admin chat ids:', adminIds.length ? adminIds.join(', ') : '(none)');
    if (adminIds.length === 0) {
      console.log(
        '    ⚠ sendTelegramResourceNotification returns false: no target chats. Set TELEGRAM_RESOURCES_BROADCAST_ALL=1 or TELEGRAM_RESOURCES_CHAT_ID=...'
      );
    }
  }
  console.log('');

  const since = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
  const { data: recent, error: e2 } = await supabase
    .from('content_posts')
    .select('id, slug, title, status, published_at, created_at, updated_at')
    .eq('status', 'published')
    .not('slug', 'is', null)
    .neq('slug', '')
    .or(`published_at.gte.${since},updated_at.gte.${since}`)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(5);

  console.log('[3] Recent published articles (last ~36h, max 5)');
  if (e2) {
    console.log('    Query error:', e2.message);
  } else if (!recent?.length) {
    console.log('    (none in window — or RLS/service role issue)');
  } else {
    for (const p of recent) {
      console.log(
        `    • slug=${p.slug} published_at=${p.published_at ?? 'null'} updated_at=${p.updated_at}`
      );
    }
  }
  console.log('');

  console.log('[4] Likely reasons the article did NOT appear in Telegram');
  console.log('    • Publishing in CMS/DB does not call Telegram by itself. Something must POST to:');
  console.log('      {origin}/api/internal/resources/notify-published');
  console.log('      with Header: Authorization: Bearer <TELEGRAM_RESOURCE_NOTIFY_SECRET or CONTENT_ARTICLE_MATCH_SECRET>');
  console.log('      Usually: Supabase Database Webhook on table content_posts (INSERT/UPDATE).');
  console.log('    • If the endpoint was never called: configure webhook or trigger manually after publish.');
  console.log('    • If endpoint returned 401: webhook uses wrong Bearer secret.');
  console.log('    • If endpoint returned 502 "Telegram send failed": check TELEGRAM_BOT_TOKEN and target chats (section [2]).');
  console.log('    • If endpoint returned { skipped: "not_a_publish_event" }: UPDATE already had status=published (only first publish notifies).');
  console.log('    • DB trigger (migration 20260411150000): after apply + npm run telegram:sync-resource-webhook, publishes call the endpoint from Postgres (pg_net).');
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
