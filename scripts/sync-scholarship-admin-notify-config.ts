/**
 * Writes URL + Bearer into public.scholarship_admin_notify_config (id=1) for DB trigger → pg_net → Telegram admins.
 * Run after migration 20260411160000_scholarship_admin_notify_pg_net.sql is applied.
 *
 * npm run telegram:sync-scholarship-admin-notify
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
    process.env.SCHOLARSHIP_NEW_ADMIN_NOTIFY_SECRET?.trim() ||
    process.env.TELEGRAM_WEBHOOK_SECRET?.trim() ||
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
      'Set SCHOLARSHIP_NEW_ADMIN_NOTIFY_SECRET or TELEGRAM_WEBHOOK_SECRET (must match notify-admin-new route).'
    );
    process.exit(1);
  }

  const endpointUrl = `${siteOrigin()}/api/internal/scholarships/notify-admin-new`;
  const supabase = createClient<Database>(url, key);

  const { error } = await supabase.from('scholarship_admin_notify_config').upsert(
    {
      id: 1,
      endpoint_url: endpointUrl,
      bearer_token: secret
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.error('Upsert failed:', error.message);
    console.error(
      'If the table does not exist, apply migration 20260411160000_scholarship_admin_notify_pg_net.sql first.'
    );
    process.exit(1);
  }

  console.log('OK: scholarship_admin_notify_config updated.');
  console.log('    endpoint_url:', endpointUrl);
  console.log('    bearer_token: (set, length', secret.length, ')');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
