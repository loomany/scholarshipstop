/**
 * Полный прогон Essay Hub: на каждой итерации — поставить в очередь следующий
 * подходящий грант (если есть) и обработать одну задачу из FIFO (как `essay:queue-next`).
 * Повторяет, пока очередь не опустеет и новых грантов для постановки не останется.
 *
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/run-essay-pipeline-full.ts
 *
 * Env: как у `essay:queue-next` (Supabase service role, OPENAI_API_KEY, FAL_KEY, …).
 * Если задан CRON_SECRET — после каждой постановки вызывается HTTP cron (как в queue-next);
 * иначе `processOneEssayQueueItem` in-process.
 *
 * Остановка: Ctrl+C в терминале — безопасно; задачи в БД остаются pending.
 * Пауза без убийства процесса: `ESSAY_GENERATION_DISABLED=1` в .env.local — воркер
 * сразу возвращает skipped (очередь не трогает).
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

const MAX_ROUNDS = 5000;

async function main() {
  const supabase = serviceSupabase();
  const secret = cronSecretOrNull();
  const base = cronBaseUrl();

  let totalCompleted = 0;
  let round = 0;

  for (;;) {
    round += 1;
    if (round > MAX_ROUNDS) {
      console.error(
        JSON.stringify(
          {
            error: `Stopped after ${MAX_ROUNDS} rounds (safety cap).`,
            totalCompletedEssays: totalCompleted
          },
          null,
          2
        )
      );
      process.exit(1);
    }
    const enq = await enqueueNextEssayQueueJob(supabase);
    if (enq.ok) {
      console.log(
        JSON.stringify(
          {
            round,
            enqueue: enq,
            note:
              enq.pendingInQueueBefore > 0
                ? 'FIFO: older pending jobs run before the one just queued.'
                : null
          },
          null,
          2
        )
      );
    } else {
      console.log(
        JSON.stringify(
          { round, enqueue: { skipped: 'no_eligible_scholarship' } },
          null,
          2
        )
      );
    }

    if (secret) {
      const url = `${base}/api/cron/process-essay-queue?cron_secret=${encodeURIComponent(secret)}`;
      const res = await fetch(url, { method: 'GET' });
      const body = (await res.json().catch(() => ({}))) as unknown;
      console.log(JSON.stringify({ round, http: res.status, body }, null, 2));
      if (!res.ok) process.exit(1);

      const b = body as { ok?: boolean; skipped?: string; essaySlug?: string };
      if (b?.skipped === 'generation_paused') {
        console.log(
          JSON.stringify(
            {
              stopped: true,
              reason: 'ESSAY_GENERATION_DISABLED',
              totalCompletedEssays: totalCompleted,
              message:
                'Generation paused via env. Pending queue rows unchanged. Remove ESSAY_GENERATION_DISABLED to resume.'
            },
            null,
            2
          )
        );
        return;
      }
      if (b?.skipped === 'queue_empty' && !enq.ok) {
        console.log(
          JSON.stringify(
            {
              done: true,
              totalCompletedEssays: totalCompleted,
              message:
                totalCompleted === 0
                  ? 'No pending queue jobs and no scholarships to enqueue.'
                  : 'All queued jobs processed; no more scholarships to enqueue.'
            },
            null,
            2
          )
        );
        return;
      }
      if (b?.ok === true && b?.essaySlug) totalCompleted += 1;
      continue;
    }

    const { processOneEssayQueueItem } = await import(
      '@/lib/essays/runEssayGenerationJob'
    );
    const result = await processOneEssayQueueItem(supabase);
    console.log(JSON.stringify({ round, process: result }, null, 2));

    if (!result.ok) {
      process.exit(1);
    }

    if (result.ok && 'skipped' in result && result.skipped === 'generation_paused') {
      console.log(
        JSON.stringify(
          {
            stopped: true,
            reason: 'ESSAY_GENERATION_DISABLED',
            totalCompletedEssays: totalCompleted,
            message:
              'Generation paused via env. Pending queue rows unchanged. Remove ESSAY_GENERATION_DISABLED to resume.'
          },
          null,
          2
        )
      );
      return;
    }

    if (result.ok && 'skipped' in result && result.skipped === 'queue_empty') {
      if (!enq.ok) {
        console.log(
          JSON.stringify(
            {
              done: true,
              totalCompletedEssays: totalCompleted,
              message:
                totalCompleted === 0
                  ? 'No pending queue jobs and no scholarships to enqueue.'
                  : 'All queued jobs processed; no more scholarships to enqueue.'
            },
            null,
            2
          )
        );
        return;
      }
      continue;
    }

    if (result.ok && 'essaySlug' in result) {
      totalCompleted += 1;
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
