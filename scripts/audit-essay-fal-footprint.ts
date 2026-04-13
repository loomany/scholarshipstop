/**
 * Compares Essay Hub data in Supabase with what we know about FAL usage.
 *
 * Important: fal.ai does not expose "how many images sit in your account" via this repo.
 * Billing is per **API request** (each `POST https://fal.run/...` that succeeds is charged).
 * Retries (up to 3) and backfill `--force` multiply calls. Other tools using the same FAL_KEY also spend quota.
 *
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/audit-essay-fal-footprint.ts
 */
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient<Database>(url, key);
}

function classifyHeroUrl(raw: string | null | undefined): string {
  const u = raw?.trim() ?? '';
  if (!u) return 'missing';
  try {
    const host = new URL(u).hostname.toLowerCase();
    if (host.includes('supabase.co') && u.includes('/storage/v1/object')) {
      return 'supabase_storage_webp';
    }
    if (
      host.includes('fal.media') ||
      host.includes('fal.ai') ||
      host.includes('fal.run')
    ) {
      return 'fal_cdn_url_still_in_db';
    }
    if (host.includes('googleapis.com') || host.includes('gcs')) {
      return 'gcs_or_similar_often_fal_output';
    }
    return 'other_host';
  } catch {
    return 'invalid_url';
  }
}

async function main() {
  const supabase = serviceSupabase();

  const { count: publishedEssays, error: e1 } = await supabase
    .from('essays')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true);
  if (e1) throw new Error(e1.message);

  const BATCH = 500;
  const heroBuckets: Record<string, number> = {};
  let offset = 0;
  for (;;) {
    const { data: rows, error: e2 } = await supabase
      .from('essays')
      .select('id, slug, hero_image_url')
      .eq('is_published', true)
      .order('created_at', { ascending: true })
      .range(offset, offset + BATCH - 1);
    if (e2) throw new Error(e2.message);
    const batch = rows ?? [];
    for (const r of batch) {
      const k = classifyHeroUrl(r.hero_image_url);
      heroBuckets[k] = (heroBuckets[k] ?? 0) + 1;
    }
    if (batch.length < BATCH) break;
    offset += BATCH;
  }

  const queueStatuses = ['pending', 'processing', 'completed', 'failed'] as const;
  const queueCounts: Record<string, number> = {};
  for (const st of queueStatuses) {
    const { count, error: eq } = await supabase
      .from('essay_generation_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', st);
    if (eq) throw new Error(eq.message);
    queueCounts[st] = count ?? 0;
  }

  const falLikeInDb =
    (heroBuckets['fal_cdn_url_still_in_db'] ?? 0) +
    (heroBuckets['gcs_or_similar_often_fal_output'] ?? 0);

  const report = {
    note:
      'Точное число вызовов FAL в fal.ai по этому проекту из БД не восстановить. Ниже — только соответствие URL в essays и очередь.',
    publishedEssaysTotal: publishedEssays ?? 0,
    heroImageUrlBreakdown: heroBuckets,
    essayGenerationQueueByStatus: queueCounts,
    interpretation: {
      supabaseStorageHeroes:
        heroBuckets['supabase_storage_webp'] ?? 0,
      legacyFalUrlsStillPointingToFalCdn: falLikeInDb,
      whyBalanceCanDropFasterThanEssayCount: [
        'Сейчас на один гайд — ровно один вызов FAL за герой (без ретраев). Повтор — только новый прогон очереди/ручной re-queue.',
        'Бэкфилл hero с --force / --all снова вызывает FAL по уже существующим эссе.',
        'Любой другой скрипт или ключ FAL_KEY вне Essay Hub тоже тратит баланс.',
        'Один успешный гайд = минимум 1 вызов FAL; затем мы качаем картинку и заливаем в Supabase — FAL уже отдал файл по URL.'
      ]
    },
    falDashboard: 'https://fal.ai/dashboard — смотрите Usage / Billing по ключу.'
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
