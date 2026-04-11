/**
 * Writes URL + Bearer into public.telegram_resource_notify_config (id=1) for DB trigger → pg_net → Telegram.
 * Run after migration 20260411150000_content_posts_telegram_net_webhook.sql is applied.
 *
 * npx dotenv -e .env.local -- npx tsx scripts/sync-telegram-resource-webhook-config.ts
 */
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types_db';

function siteOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    'https://scholarshiptop.com';
  return raw.replace(/\/+$/, '');
}

function bearerSecret(): string {
  return (
    process.env.TELEGRAM_RESOURCE_NOTIFY_SECRET?.trim() ||
    process.env.CONTENT_ARTICLE_MATCH_SECRET?.trim() ||
    ''
  );
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const secret = bearerSecret();
  if (!secret) {
    console.error(
      'Set TELEGRAM_RESOURCE_NOTIFY_SECRET or CONTENT_ARTICLE_MATCH_SECRET (must match notify-published route).'
    );
    process.exit(1);
  }

  const endpointUrl = `${siteOrigin()}/api/internal/resources/notify-published`;
  const supabase = createClient<Database>(url, key);

  const { error } = await supabase.from('telegram_resource_notify_config').upsert(
    {
      id: 1,
      endpoint_url: endpointUrl,
      bearer_token: secret
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.error('Upsert failed:', error.message);
    console.error('If the table does not exist, apply migration 20260411150000_content_posts_telegram_net_webhook.sql first.');
    process.exit(1);
  }

  console.log('OK: telegram_resource_notify_config updated.');
  console.log('    endpoint_url:', endpointUrl);
  console.log('    bearer_token: (set, length', secret.length, ')');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
