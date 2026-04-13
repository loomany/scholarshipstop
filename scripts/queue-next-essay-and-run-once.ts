/**
 * Ставит в очередь следующий грант без готового эссе и дергает
 * GET /api/cron/process-essay-queue (тот же воркер, что в Vercel cron).
 *
 * Нужен запущенный Next (npm run dev) ИЛИ укажите публичный URL в ESSAY_QUEUE_HTTP_BASE.
 *
 * Запуск (см. npm run essay:queue-next): подхватывает .env.local.
 *
 * Если заданы ESSAY_CRON_SECRET или CRON_SECRET — вызывается GET /api/cron/process-essay-queue
 * (нужен `npm run dev` на localhost или ESSAY_QUEUE_HTTP_BASE на прод).
 * Если секрета нет — воркер выполняется в этом процессе (use npm run essay:queue-next).
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, FAL_KEY;
 * опционально CRON_SECRET / ESSAY_CRON_SECRET, ESSAY_QUEUE_HTTP_BASE.
 */
import { createClient } from '@supabase/supabase-js';

import { enqueueNextEssayQueueJob } from '@/lib/essays/enqueueNextEssayQueueJob';
import type { Database } from '@/types_db';

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient<Database>(url, key);
}

function cronSecretOrNull(): string | null {
  const s =
    process.env.ESSAY_CRON_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    '';
  return s || null;
}

function cronBaseUrl(): string {
  const raw =
    process.env.ESSAY_QUEUE_HTTP_BASE?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    'http://127.0.0.1:3000';
  return raw.replace(/\/+$/, '');
}

async function main() {
  const supabase = serviceSupabase();
  const secret = cronSecretOrNull();
  const base = cronBaseUrl();

  const enq = await enqueueNextEssayQueueJob(supabase);
  if (!enq.ok) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          message:
            'No eligible scholarship found (all have essays, are queued, or DB empty).'
        },
        null,
        2
      )
    );
    return;
  }

  if (enq.kind === 'requeued_failed') {
    console.log(
      JSON.stringify({ requeuedFailedRowId: enq.queueRowId }, null, 2)
    );
  }

  console.log(
    JSON.stringify(
      {
        queuedScholarshipId: enq.scholarshipId,
        title: enq.title.slice(0, 120),
        slug: enq.slug,
        pendingInQueueBefore: enq.pendingInQueueBefore,
        note:
          enq.pendingInQueueBefore > 0
            ? 'Older pending jobs run first (FIFO). This grant runs after them.'
            : 'This job should process next.'
      },
      null,
      2
    )
  );

  if (secret) {
    const url = `${base}/api/cron/process-essay-queue?cron_secret=${encodeURIComponent(secret)}`;
    console.log(`Calling: GET ${base}/api/cron/process-essay-queue?cron_secret=***`);

    const res = await fetch(url, { method: 'GET' });
    const body = (await res.json().catch(() => ({}))) as unknown;
    console.log('HTTP', res.status, JSON.stringify(body, null, 2));

    if (!res.ok) {
      process.exit(1);
    }
    return;
  }

  console.log(
    'No CRON_SECRET / ESSAY_CRON_SECRET — running processOneEssayQueueItem in-process (use npm run essay:queue-next).'
  );
  const { processOneEssayQueueItem } = await import(
    '@/lib/essays/runEssayGenerationJob'
  );
  const result = await processOneEssayQueueItem(supabase);
  console.log(JSON.stringify(result, null, 2));
  if (!('ok' in result) || result.ok === false) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
