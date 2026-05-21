/**
 * Preflight for AI resources test generation (no OpenAI calls, no secrets in output).
 *
 *   npx dotenv-cli -e services/content-hub/.env -e .env.local -- npx tsx scripts/ai-resources-preflight.ts
 */
import fs from 'node:fs';
import path from 'node:path';

const OPENAI_VARS = [
  'OPENAI_API_KEY',
  'OPENAI_MODEL_STANDARD',
  'OPENAI_MODEL_SMART',
  'OPENAI_MAX_COMPLETION_TOKENS',
  'OPENAI_REQUEST_TIMEOUT_MS'
] as const;

const WORKER_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SITE_URL',
  'CONTENT_HUB_ALLOW_PRODUCTION_WRITES',
  'CONTENT_HUB_SOURCE',
  'CONTENT_HUB_BATCH_LIMIT',
  'CONTENT_HUB_POSTS_PER_RUN',
  'CONTENT_HUB_AUTO_PUBLISH'
] as const;

function classifySupabaseHost(host: string): 'local' | 'staging' | 'production' | 'unknown' {
  const h = host.toLowerCase();
  if (h.includes('127.0.0.1') || h.includes('localhost') || h.startsWith('192.168.')) {
    return 'local';
  }
  if (h.includes('supabase.co')) {
    // Heuristic: project ref only; cannot know prod vs staging without project naming convention
    return 'production';
  }
  return 'unknown';
}

function hostFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function envStatus(name: string): 'set' | 'missing' {
  const v = process.env[name];
  return v !== undefined && String(v).trim() !== '' ? 'set' : 'missing';
}

function main() {
  const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
  const host = supabaseUrl ? hostFromUrl(supabaseUrl) : null;
  const dbTarget = host ? classifySupabaseHost(host) : 'unknown';

  const modelStandard = process.env.OPENAI_MODEL_STANDARD?.trim() || '(default gpt-4.1-mini per env schema)';
  const modelSmart = process.env.OPENAI_MODEL_SMART?.trim() || '(default gpt-4.1 per env schema)';
  const smartIsGpt55 = process.env.OPENAI_MODEL_SMART?.trim() === 'gpt-5.5';

  const report = {
    phase: 'preflight',
    openAiVars: Object.fromEntries(OPENAI_VARS.map((n) => [n, envStatus(n)])),
    workerVars: Object.fromEntries(WORKER_VARS.map((n) => [n, envStatus(n)])),
    models: {
      seoBriefUses: 'OPENAI_MODEL_STANDARD (generateSeoBrief in openai.ts)',
      articleGenerationUses: 'OPENAI_MODEL_SMART first, may fall back to STANDARD on retry paths',
      OPENAI_MODEL_STANDARD: modelStandard,
      OPENAI_MODEL_SMART: modelSmart,
      smartModelIsGpt55: smartIsGpt55,
      recommendationIfNotGpt55:
        smartIsGpt55 || process.env.OPENAI_MODEL_SMART?.trim()
          ? null
          : 'Add to services/content-hub/.env: OPENAI_MODEL_SMART=gpt-5.5 (and optionally OPENAI_MODEL_STANDARD=gpt-5.5 for SEO brief)'
    },
    db: {
      target: dbTarget,
      supabaseHost: host ?? '(no Supabase URL in env)',
      supabaseUrlFrom:
        envStatus('SUPABASE_URL') === 'set'
          ? 'SUPABASE_URL'
          : envStatus('NEXT_PUBLIC_SUPABASE_URL') === 'set'
            ? 'NEXT_PUBLIC_SUPABASE_URL'
            : 'none',
      workerRequiresSupabaseUrl:
        'runContentJob reads SUPABASE_URL only — set it in services/content-hub/.env or pass via dotenv-cli',
      writeRequires: 'CONTENT_HUB_ALLOW_PRODUCTION_WRITES=1 for AI_PACK topics',
      note:
        dbTarget === 'production'
          ? 'Host looks like hosted Supabase — treat as production unless you use a dedicated staging project ref.'
          : undefined
    },
    plannedRun: {
      slug: 'best-scholarship-websites',
      topicCount: 1,
      CONTENT_HUB_AUTO_PUBLISH: '0 (review_needed expected)',
      CONTENT_HUB_POSTS_PER_RUN: '1',
      CONTENT_HUB_BATCH_LIMIT: '1',
      CONTENT_HUB_SOURCE: 'ai-resources-2026-05-21',
      publish: false,
      esFrTranslations: false
    },
    envFilesChecked: [
      fs.existsSync(path.join(process.cwd(), 'services/content-hub/.env'))
        ? 'services/content-hub/.env (load with dotenv-cli -e)'
        : 'services/content-hub/.env (missing — worker may fail without env)',
      fs.existsSync(path.join(process.cwd(), '.env.local'))
        ? '.env.local (optional for seed script)'
        : '.env.local (missing)'
    ]
  };

  console.log(JSON.stringify(report, null, 2));
}

main();
