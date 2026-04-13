/**
 * Обрабатывает очередь `essay_generation_queue` подряд: один вызов
 * `processOneEssayQueueItem` за итерацию, пока не закончатся pending.
 *
 * Не добавляет новые строки в очередь — только существующие jobs.
 *
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/run-essay-queue-drain.ts
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/run-essay-queue-drain.ts --max 3
 *
 * `--max N` — остановиться после N успешно сгенерированных эссе (очередь может остаться непустой).
 * Иначе скрипт идёт, пока очередь не пуста: одна задача часто 1–3+ минуты (OpenAI + FAL + Storage).
 *
 * Лимит можно задать env: `ESSAY_QUEUE_DRAIN_MAX_JOBS=3`
 *
 * Пауза: `ESSAY_GENERATION_DISABLED=1` — воркер сразу выходит (очередь не меняется).
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

function parseMaxCompletedJobs(): number | null {
  const argv = process.argv.slice(2);
  const eq = argv.find((a) => a.startsWith('--max='));
  if (eq) {
    const n = Number(eq.slice('--max='.length));
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  const idx = argv.indexOf('--max');
  if (idx >= 0 && argv[idx + 1] != null) {
    const n = Number(argv[idx + 1]);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  const env = process.env.ESSAY_QUEUE_DRAIN_MAX_JOBS?.trim();
  if (env) {
    const n = Number(env);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return null;
}

async function main() {
  const maxCompleted = parseMaxCompletedJobs();
  const started = Date.now();
  const supabase = serviceSupabase();
  const { processOneEssayQueueItem } = await import(
    '@/lib/essays/runEssayGenerationJob'
  );

  let completed = 0;
  let iteration = 0;

  console.log(
    JSON.stringify(
      {
        drain: 'started',
        maxCompletedJobs: maxCompleted ?? 'unlimited',
        hint:
          maxCompleted == null
            ? 'Pass --max N to stop after N essays (avoids long runs).'
            : undefined
      },
      null,
      2
    )
  );

  for (;;) {
    iteration += 1;
    const t0 = Date.now();
    const result = await processOneEssayQueueItem(supabase);
    const elapsedMs = Date.now() - t0;
    console.log(
      JSON.stringify({ iteration, elapsedMs, result }, null, 2)
    );

    if (result.ok === true && 'skipped' in result && result.skipped === 'generation_paused') {
      console.log(
        JSON.stringify(
          {
            stopped: true,
            reason: 'ESSAY_GENERATION_DISABLED',
            completedJobs: completed,
            message:
              'Generation paused via env. Pending rows unchanged. Remove ESSAY_GENERATION_DISABLED to resume.'
          },
          null,
          2
        )
      );
      return;
    }

    if (result.ok === true && 'skipped' in result && result.skipped === 'queue_empty') {
      console.log(
        JSON.stringify(
          {
            done: true,
            completedJobs: completed,
            message:
              completed === 0
                ? 'Queue was already empty.'
                : `Processed ${completed} job(s); queue is now empty.`
          },
          null,
          2
        )
      );
      return;
    }

    if (result.ok === false) {
      console.error(JSON.stringify({ fatal: true, result }, null, 2));
      process.exit(1);
    }

    if (result.ok === true && 'essaySlug' in result) {
      completed += 1;
      if (maxCompleted != null && completed >= maxCompleted) {
        console.log(
          JSON.stringify(
            {
              stopped: true,
              reason: 'max_jobs',
              completedJobs: completed,
              maxCompletedJobs: maxCompleted,
              totalElapsedMs: Date.now() - started,
              message:
                'Stopped after reaching --max / ESSAY_QUEUE_DRAIN_MAX_JOBS; remaining pending jobs were not processed.'
            },
            null,
            2
          )
        );
        return;
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
