import {
  createRunId,
  emitJobDone,
  emitJobFailed,
  emitJobProgress,
  emitJobStart,
  type JobCounters
} from './job-markers';

const SERVICE_NAME = 'Сео генерация';
const JOB_NAME = 'seo-generation-http';
const RUN_ID = createRunId();
const STARTED_AT_MS = Date.now();
const runCounters: JobCounters = { processed: 0, success: 0, failed: 0, skipped: 0 };

function resolveBaseUrl(): string {
  const raw =
    process.env.PUBLIC_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    '';
  return raw.replace(/\/+$/, '');
}

function toBoundedInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value ?? '');
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

async function postJson(url: string, bearer: string, payload: Record<string, unknown>) {
  const started = Date.now();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${bearer}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    text,
    durationMs: Date.now() - started
  };
}

async function main(): Promise<void> {
  emitJobStart({ service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID });

  const baseUrl = resolveBaseUrl();
  if (!baseUrl) {
    throw new Error('Set PUBLIC_URL or APP_URL (or NEXT_PUBLIC_SITE_URL / SITE_URL)');
  }
  const secret = process.env.GOOGLE_INDEXING_SECRET?.trim() || '';
  if (!secret) {
    throw new Error('Set GOOGLE_INDEXING_SECRET for seo-generation-http');
  }

  const generateLimit = toBoundedInt(process.env.SEO_WORKER_GENERATE_LIMIT, 175, 1, 5000);
  const metaLimit = toBoundedInt(process.env.SEO_AI_META_BATCH, 20, 1, 5000);

  const jobs = [
    {
      name: 'seo-worker-generate',
      path: '/api/internal/seo/worker-generate',
      payload: { limit: generateLimit }
    },
    {
      name: 'seo-meta-generate',
      path: '/api/internal/seo/meta-generate',
      payload: { limit: metaLimit }
    }
  ] as const;

  const failures: string[] = [];

  for (const job of jobs) {
    const url = `${baseUrl}${job.path}`;
    console.log(`[cron-seo-generation-http] start ${job.name}`, JSON.stringify({ url, payload: job.payload }));
    try {
      const result = await postJson(url, secret, job.payload);
      runCounters.processed += 1;
      if (result.ok) {
        runCounters.success += 1;
      } else {
        runCounters.failed += 1;
        failures.push(`${job.name} HTTP ${result.status}`);
      }
      console.log(
        `[cron-seo-generation-http] done ${job.name}`,
        JSON.stringify({
          status: result.status,
          durationMs: result.durationMs,
          ok: result.ok,
          body: result.text
        })
      );
      emitJobProgress({ service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID }, runCounters);
    } catch (error) {
      runCounters.processed += 1;
      runCounters.failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${job.name} ${message}`);
      emitJobProgress({ service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID }, runCounters);
    }
  }

  if (failures.length > 0) {
    throw new Error(failures.join('; '));
  }

  emitJobDone(
    { service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID },
    Date.now() - STARTED_AT_MS,
    runCounters
  );
}

main().catch((error) => {
  emitJobFailed(
    { service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID },
    Date.now() - STARTED_AT_MS,
    runCounters,
    error
  );
  console.error('[cron-seo-generation-http] fatal', error);
  process.exit(1);
});
