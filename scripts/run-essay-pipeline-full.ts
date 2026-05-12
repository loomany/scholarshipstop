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
import { OPENAI_QUOTA_EXCEEDED_LOG_MARK } from '@/lib/essays/openAiQuotaBillingError';
import { resetStaleProcessingEssayQueueRows } from '@/lib/essays/runEssayGenerationJob';
import type { Database } from '@/types_db';
import {
  createRunId,
  emitJobDone,
  emitJobFailed,
  emitJobProgress,
  emitJobSkipped,
  emitJobStart,
  type JobCounters
} from './job-markers';

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
const SERVICE_NAME = 'Скрипты';
const JOB_NAME = 'run-essay-pipeline-full';
const RUN_ID = createRunId();
const STARTED_AT_MS = Date.now();
let roundCounter = 0;
let totalCompletedCounter = 0;

async function main() {
  emitJobStart({ service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID });
  const supabase = serviceSupabase();
  const staleReset = await resetStaleProcessingEssayQueueRows(supabase);
  if (staleReset > 0) {
    console.log(
      JSON.stringify(
        { stale_processing_reset_to_pending: staleReset },
        null,
        2
      )
    );
  }

  const secret = cronSecretOrNull();
  const base = cronBaseUrl();

  let totalCompleted = 0;
  let round = 0;

  for (;;) {
    round += 1;
    roundCounter = round;
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
      throw new Error(`Stopped after ${MAX_ROUNDS} rounds (safety cap).`);
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
      if (!res.ok) throw new Error(`Essay queue cron HTTP failed with status ${res.status}`);

      const b = body as {
        ok?: boolean;
        skipped?: string;
        essaySlug?: string;
        phase?: string;
        queueId?: string;
        upstreamOpenAiMessage?: string;
      };
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
      if (b?.skipped === 'openai_quota_exceeded') {
        emitJobSkipped(
          { service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID },
          OPENAI_QUOTA_EXCEEDED_LOG_MARK,
          typeof b?.upstreamOpenAiMessage === 'string' ? b.upstreamOpenAiMessage : undefined
        );
        console.log(
          JSON.stringify(
            {
              stopped: true,
              reason: OPENAI_QUOTA_EXCEEDED_LOG_MARK,
              totalCompletedEssays: totalCompleted,
              queueId: b?.queueId,
              message:
                'OpenAI quota or billing limit — pipeline stopped gracefully. Item requeued as pending; check OpenAI billing.',
              upstreamOpenAiMessage: b?.upstreamOpenAiMessage
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
      if (b?.skipped === 'hero_retry_deferred') {
        continue;
      }
      if (
        b?.ok === true &&
        (b.phase === 'published' || b.phase === 'resume_published')
      ) {
        totalCompleted += 1;
        totalCompletedCounter = totalCompleted;
      }
      continue;
    }

    const { processOneEssayQueueItem } = await import(
      '@/lib/essays/runEssayGenerationJob'
    );
    const result = await processOneEssayQueueItem(supabase);
    console.log(JSON.stringify({ round, process: result }, null, 2));

    if (!result.ok) {
      throw new Error('processOneEssayQueueItem returned ok=false');
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

    if (result.ok && 'skipped' in result && result.skipped === 'openai_quota_exceeded') {
      emitJobSkipped(
        { service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID },
        OPENAI_QUOTA_EXCEEDED_LOG_MARK,
        result.upstreamOpenAiMessage
      );
      console.log(
        JSON.stringify(
          {
            stopped: true,
            reason: OPENAI_QUOTA_EXCEEDED_LOG_MARK,
            totalCompletedEssays: totalCompleted,
            queueId: result.queueId,
            upstreamOpenAiMessage: result.upstreamOpenAiMessage,
            message:
              'OpenAI quota or billing limit — pipeline stopped gracefully. Item requeued as pending; check OpenAI billing.'
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

    if (result.ok && 'skipped' in result && result.skipped === 'hero_retry_deferred') {
      continue;
    }

    if (
      result.ok &&
      'phase' in result &&
      (result.phase === 'published' || result.phase === 'resume_published')
    ) {
      totalCompleted += 1;
      totalCompletedCounter = totalCompleted;
    }
  }
}

main()
  .then(() => {
    const counters: JobCounters = {
      processed: roundCounter,
      success: totalCompletedCounter,
      failed: 0,
      skipped: Math.max(0, roundCounter - totalCompletedCounter)
    };
    emitJobProgress({ service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID }, counters);
    emitJobDone(
      { service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID },
      Date.now() - STARTED_AT_MS,
      counters
    );
  })
  .catch((e) => {
    const counters: JobCounters = {
      processed: roundCounter,
      success: totalCompletedCounter,
      failed: 1,
      skipped: Math.max(0, roundCounter - totalCompletedCounter)
    };
    emitJobProgress({ service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID }, counters);
    emitJobFailed(
      { service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID },
      Date.now() - STARTED_AT_MS,
      counters,
      e
    );
    console.error(e);
    process.exit(1);
  });
