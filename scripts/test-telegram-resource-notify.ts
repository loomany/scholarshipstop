/**
 * Smoke test: send one resource card to the first TELEGRAM_ADMIN_IDS chat.
 * Run: npx dotenv-cli -e .env.local -- npx tsx scripts/test-telegram-resource-notify.ts
 */
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types_db';
import { sendResourceNotifyToChats } from '../lib/telegram/resourceNotifyCore';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const adminRaw = process.env.TELEGRAM_ADMIN_IDS?.trim()?.split(',')?.[0];
  const chatId = adminRaw ? Number(adminRaw.trim()) : NaN;

  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  if (!Number.isFinite(chatId)) {
    console.error('Missing or invalid TELEGRAM_ADMIN_IDS');
    process.exit(1);
  }

  const supabase = createClient<Database>(url, key);
  const { data: post, error } = await supabase
    .from('content_posts')
    .select('title, slug, meta_description, cover_image_url')
    .eq('status', 'published')
    .not('slug', 'is', null)
    .neq('slug', '')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Supabase:', error.message);
    process.exit(1);
  }

  const payload = post?.slug
    ? {
        title: post.title ?? 'Article',
        description: post.meta_description,
        image_url: post.cover_image_url,
        slug: post.slug
      }
    : {
        title: 'Scholarships in the USA for Tennis Players: College Options and How to Qualify',
        description:
          'Explore scholarships in the USA for tennis players, including NCAA and NAIA options, eligibility basics, recruiting tips, and how student-athletes can qualify.',
        image_url: null as string | null,
        slug: 'combine-multiple-scholarships'
      };

  console.log('Sending test card to chat', chatId, 'slug=', payload.slug);
  const ok = await sendResourceNotifyToChats(payload, [chatId]);
  console.log(ok ? 'OK: Telegram accepted the message.' : 'FAIL: see logs above.');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
