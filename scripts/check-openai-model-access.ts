/**
 * Read-only OpenAI model access check (no article generation).
 *   npx dotenv-cli -e services/content-hub/.env -- npx tsx scripts/check-openai-model-access.ts
 */
import OpenAI from 'openai';

const MODEL = process.env.OPENAI_MODEL_SMART?.trim() || 'gpt-5.5';

async function main() {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error('OPENAI_API_KEY is missing');
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const listed = await client.models.list();
  const ids = new Set(listed.data.map((m) => m.id));
  const exact = ids.has(MODEL);
  const prefixMatch = [...ids].filter((id) => id.startsWith(MODEL) || id.includes(MODEL));

  if (exact) {
    console.log(
      JSON.stringify(
        { ok: true, model: MODEL, check: 'models.list', exactMatch: true },
        null,
        2
      )
    );
    return;
  }

  if (prefixMatch.length > 0) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          model: MODEL,
          check: 'models.list',
          exactMatch: false,
          similarIds: prefixMatch.slice(0, 10),
          error: `Model id "${MODEL}" not found exactly; similar ids listed. No fallback applied.`
        },
        null,
        2
      )
    );
    process.exitCode = 1;
    return;
  }

  // Minimal completion probe when model not in list (some orgs have access not reflected in list)
  try {
    await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: 'Reply with exactly: ok' }],
      max_completion_tokens: 5
    });
    console.log(
      JSON.stringify(
        { ok: true, model: MODEL, check: 'chat.completions.probe', note: 'not in models.list but probe succeeded' },
        null,
        2
      )
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(
      JSON.stringify(
        {
          ok: false,
          model: MODEL,
          check: 'models.list and chat.completions.probe',
          error: message,
          noFallback: true
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  }
}

main();
