/**
 * Runs `seo-worker-generate` one queue row at a time, only for compare paths
 * (`compare/universities/*`, `compare/states/*`), until none are left or --max is hit.
 *
 * Requires: same env as other SEO scripts (.env.local), OPENAI_API_KEY, Supabase service role.
 *
 *   dotenv -e .env.local -- npx tsx scripts/compare-battle-sequential.ts
 *   dotenv -e .env.local -- npx tsx scripts/compare-battle-sequential.ts --max=50 --sleep-ms=2000
 *   dotenv -e .env.local -- npx tsx scripts/compare-battle-sequential.ts --retry-failed --sleep-ms=2000
 *
 * Default append-only log: logs/compare-battle-sequential.log
 *   Override: --log-file=relative/or/absolute.log
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types_db';

const DEFAULT_LOG_REL = join('logs', 'compare-battle-sequential.log');

let logFilePath: string | null = null;

function isoNow(): string {
  return new Date().toISOString();
}

function initLogFile(resolvedPath: string) {
  mkdirSync(dirname(resolvedPath), { recursive: true });
  logFilePath = resolvedPath;
  appendFileSync(
    logFilePath,
    `\n==== ${isoNow()} session pid=${process.pid} cwd=${process.cwd()} ====\n`
  );
  appendFileSync(logFilePath, `argv: ${JSON.stringify(process.argv.slice(2))}\n`);
}

/** Writes to stdout + append-only log file (if initialized). */
function logBoth(message: string) {
  const line = `[${isoNow()}] ${message}`;
  console.log(line);
  if (logFilePath) {
    try {
      appendFileSync(logFilePath, `${line}\n`);
    } catch (e) {
      console.error('[compare-battle-sequential] log append failed:', e instanceof Error ? e.message : e);
    }
  }
}

function loadAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient<Database>(url, key);
}

function parseArgs() {
  const argv = process.argv.slice(2);
  let maxIterations: number | null = null;
  let sleepMs = 0;
  let retryFailed = false;
  let logFile: string | null = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--retry-failed') {
      retryFailed = true;
      continue;
    }
    if (arg === '--max' && argv[i + 1]) {
      maxIterations = Math.max(1, Number.parseInt(argv[i + 1], 10) || 1);
      i += 1;
      continue;
    }
    if (arg.startsWith('--max=')) {
      maxIterations = Math.max(1, Number.parseInt(arg.slice('--max='.length), 10) || 1);
      continue;
    }
    if (arg === '--sleep-ms' && argv[i + 1]) {
      sleepMs = Math.max(0, Number.parseInt(argv[i + 1], 10) || 0);
      i += 1;
      continue;
    }
    if (arg.startsWith('--sleep-ms=')) {
      sleepMs = Math.max(0, Number.parseInt(arg.slice('--sleep-ms='.length), 10) || 0);
      continue;
    }
    if (arg === '--log-file' && argv[i + 1]) {
      logFile = argv[i + 1].trim() || null;
      i += 1;
      continue;
    }
    if (arg.startsWith('--log-file=')) {
      logFile = arg.slice('--log-file='.length).trim() || null;
    }
  }

  return { maxIterations, sleepMs, retryFailed, logFile };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function countPendingCompare(admin: ReturnType<typeof loadAdmin>): Promise<number> {
  const q = (likePattern: string) =>
    admin
      .from('seo_generation_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .like('canonical_path', likePattern);

  const [uni, st] = await Promise.all([
    q('compare/universities%'),
    q('compare/states%')
  ]);

  if (uni.error) throw new Error(uni.error.message);
  if (st.error) throw new Error(st.error.message);
  return (uni.count ?? 0) + (st.count ?? 0);
}

async function resetFailedCompareToPending(admin: ReturnType<typeof loadAdmin>): Promise<number> {
  let total = 0;
  const patterns = ['compare/universities%', 'compare/states%'] as const;

  for (const pattern of patterns) {
    for (;;) {
      const { data: rows, error: selErr } = await admin
        .from('seo_generation_queue')
        .select('id')
        .eq('status', 'failed')
        .like('canonical_path', pattern)
        .limit(500);

      if (selErr) throw new Error(selErr.message);
      const batch = rows ?? [];
      if (batch.length === 0) break;

      const ids = batch.map((r) => r.id);
      const { error: upErr } = await admin
        .from('seo_generation_queue')
        .update({ status: 'pending', error_message: null })
        .in('id', ids);

      if (upErr) throw new Error(upErr.message);
      total += batch.length;
      if (batch.length < 500) break;
    }
  }

  return total;
}

function installSignalAndCrashLogs() {
  const onSignal = (sig: string) => {
    logBoth(`process signal ${sig} (pid=${process.pid}) — exiting`);
    process.exit(sig === 'SIGINT' ? 130 : 143);
  };
  process.on('SIGINT', () => onSignal('SIGINT'));
  process.on('SIGTERM', () => onSignal('SIGTERM'));

  process.on('uncaughtException', (err) => {
    logBoth(`uncaughtException: ${err.message}`);
    if (err.stack) logBoth(err.stack);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    const msg = reason instanceof Error ? reason.message : String(reason);
    logBoth(`unhandledRejection: ${msg}`);
    if (reason instanceof Error && reason.stack) logBoth(reason.stack);
    process.exit(1);
  });
}

async function main() {
  const { maxIterations, sleepMs, retryFailed, logFile } = parseArgs();
  const resolvedLog = (() => {
    const raw = logFile?.trim();
    if (!raw) return join(process.cwd(), DEFAULT_LOG_REL);
    return isAbsolute(raw) ? raw : join(process.cwd(), raw);
  })();
  initLogFile(resolvedLog);
  installSignalAndCrashLogs();

  logBoth(
    `boot pid=${process.pid} logFile=${resolvedLog}` +
      (maxIterations != null ? ` maxIterations=${maxIterations}` : '') +
      (sleepMs > 0 ? ` sleepMs=${sleepMs}` : '') +
      (retryFailed ? ' retryFailed=true' : '')
  );

  const admin = loadAdmin();

  let startPending = await countPendingCompare(admin);
  console.log(
    `[compare-battle-sequential] pending compare rows: ${startPending}` +
      (maxIterations != null ? `; max iterations: ${maxIterations}` : '') +
      (sleepMs > 0 ? `; sleep ${sleepMs}ms between runs` : '') +
      (retryFailed ? '; --retry-failed enabled' : '') +
      `\n[compare-battle-sequential] log: ${resolvedLog}`
  );
  logBoth(`pending_compare(initial)=${startPending}`);

  if (startPending === 0 && retryFailed) {
    const reset = await resetFailedCompareToPending(admin);
    logBoth(`reset failed→pending: ${reset} row(s)`);
    console.log(`[compare-battle-sequential] reset failed → pending (compare paths): ${reset} row(s)`);
    startPending = await countPendingCompare(admin);
    console.log(`[compare-battle-sequential] pending compare rows after reset: ${startPending}`);
    logBoth(`pending_compare(after reset)=${startPending}`);
  }

  if (startPending === 0) {
    console.log('Nothing to do (no pending compare rows).');
    console.log('  Enqueue: npm run seo:enqueue-university-compare && npm run seo:enqueue-state-compare');
    console.log('  Or retry prior failures: add --retry-failed');
    logBoth('exit: nothing to do');
    return;
  }

  let iteration = 0;
  for (;;) {
    const pending = await countPendingCompare(admin);
    if (pending <= 0) {
      const msg = `done after ${iteration} worker run(s)`;
      console.log(`[compare-battle-sequential] ${msg}.`);
      logBoth(`exit: ${msg}`);
      return;
    }
    iteration += 1;
    if (maxIterations != null && iteration > maxIterations) {
      const msg = `stopped at --max=${maxIterations} (${pending} compare rows still pending)`;
      console.log(`[compare-battle-sequential] ${msg}.`);
      logBoth(`exit: ${msg}`);
      return;
    }

    const t0 = Date.now();
    logBoth(
      `iteration ${iteration} START pending_compare=${pending} pid=${process.pid} → npm run seo:worker-generate -- --compare-only --limit=1`
    );

    try {
      execFileSync('npm', ['run', 'seo:worker-generate', '--', '--compare-only', '--limit=1'], {
        stdio: 'inherit',
        shell: process.platform === 'win32'
      });
      const ms = Date.now() - t0;
      logBoth(`iteration ${iteration} END ok elapsedMs=${ms} worker_exit=0`);
    } catch (err: unknown) {
      const ms = Date.now() - t0;
      const e = err as NodeJS.ErrnoException & { status?: number | null; stdout?: Buffer; stderr?: Buffer };
      const status = typeof e.status === 'number' ? e.status : 'n/a';
      const extra = e.stderr?.length ? ` stderr=${e.stderr.toString().slice(0, 2000)}` : '';
      logBoth(
        `iteration ${iteration} END FAIL elapsedMs=${ms} worker_exit=${status} errno=${e.code ?? 'n/a'} message=${e.message ?? String(err)}${extra}`
      );
      if (err instanceof Error && err.stack) {
        logBoth(err.stack);
      }
      throw err;
    }

    if (sleepMs > 0) await sleep(sleepMs);
  }
}

main().catch((err) => {
  logBoth(`main().catch: ${err instanceof Error ? err.message : String(err)}`);
  if (err instanceof Error && err.stack) logBoth(err.stack);
  console.error(err);
  process.exit(1);
});
