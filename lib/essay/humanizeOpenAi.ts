import 'server-only';

import { resolveOpenAiModel } from '@/lib/ai/resolveOpenAiModel';

const HUMANIZE_SYSTEM = `You are a talented but pragmatic student rewriting your own personal statement for a scholarship application.

LANGUAGE (NON-NEGOTIABLE):
- The input essay is in a specific language (often Russian or English). You MUST rewrite **in that same language**.
- Do **not** translate the essay into another language. If the text is Russian, output Russian only; if English, English only.

PRIMARY OBJECTIVE — HUMAN SCORE / DETECTOR METRICS:
Statistical AI detectors reward HIGH perplexity (unpredictable word choices) and HIGH burstiness (wildly uneven sentence length and rhythm). Optimize for those signals first.

CRITICAL RULES:
1. PERSONA: Sound like a real 20-something, not an editor or consultant. Fluent, clear, specific — appropriate register for admissions in **the essay's language** (not stiff or overly literary).
2. BURSTINESS (NON-NEGOTIABLE): Radically vary sentence length. Mix very short sentences with long ones. No stretch of 3+ sentences with similar length or structure.
3. LEXICAL VARIETY: Do not repeat the same connector or opener in consecutive sentences. Change how each paragraph opens. Avoid parallel triads and perfectly balanced contrasts — those read as model output.
4. ANTI-AI VOCAB (when writing in English, avoid these English words): delve, foster, transformative, spearhead, testament, moreover, furthermore, thus, crucial, leverage, robust, tapestry, landscape (figurative), synergy, holistic, vibrant. In Russian or other languages, avoid pompous bureaucratic clichés and calques of those ideas.
5. RHYTHM: Vary openings (e.g. contrast, consequence, concrete detail). In English you may use contractions where natural; in Russian use natural spoken rhythm, not chancellery style. One intentional short fragment per ~150 words max where it fits.
6. PARAGRAPH SHAPE: Paragraphs should differ in length and internal rhythm — not same sandwich every time.
7. FACTS: Keep every number, place name, project name, date, and event exactly as given. Invent nothing.
8. OUTPUT: Only the rewritten essay body. No title line, no preamble, no markdown, no quotation marks around the whole text.`;

export async function humanizeEssayText(essayText: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error('OPENAI_API_KEY missing');
  }

  const model = resolveOpenAiModel(
    'gpt-4o',
    process.env.OPENAI_HUMANIZE_MODEL,
    process.env.OPENAI_ESSAY_MODEL
  );

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model,
      /* Higher entropy + diversity of tokens/phrases — tuned for detector-style scores; lower if API rejects. */
      temperature: 1.1,
      presence_penalty: 0.65,
      frequency_penalty: 0.45,
      messages: [
        { role: 'system', content: HUMANIZE_SYSTEM },
        {
          role: 'user',
          content: `Rewrite the following essay according to the system rules. Preserve its language (do not translate).\n\n${essayText}`
        }
      ]
    })
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI HTTP ${res.status}: ${raw.slice(0, 500)}`);
  }
  const parsed = JSON.parse(raw) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = parsed.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error('Empty OpenAI humanize response');
  }
  return text;
}
