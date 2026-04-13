import { resolveOpenAiModel } from '@/lib/ai/resolveOpenAiModel';

export type ThemeProgress = {
  background: number;
  achievements: number;
  gap: number;
  personality: number;
};

export const EMPTY_PROGRESS: ThemeProgress = {
  background: 0,
  achievements: 0,
  gap: 0,
  personality: 0
};

export const FIRST_ASSISTANT_MESSAGE =
  "Hi! I'm your AI mentor. My goal is to extract the facts needed for a powerful essay. Let's start with the basics: what shaped you as a person and why did you decide to continue your studies (or change your path)? Write naturally — the main thing is specifics: circumstances, numbers, and emotions.";

const INTERVIEWER_SYSTEM = `You are an experienced mentor (Ivy League caliber). Your goal is to draw out the student's strongest, most emotional stories. Be polite but persistent. Look for numbers, details, and feelings.

Gradually cover four themes (not as a dry checklist — keep the conversation natural):
1) Background — where the person comes from, what shaped them.
2) Achievements — concrete results, metrics, responsibility.
3) The gap — why they need to keep learning, what's missing, where they're headed.
4) Personality — hobbies, values, distinctive details that make the story human.

Rules:
- Don't fire all four blocks in a row with templated questions. React to what the student already said.
- If an answer is short or generic — gently ask for one concrete angle (e.g. what a delivery job taught them about discipline and deadlines).
- Usually 5–8 exchanges are enough, but you decide when there's enough material for a strong essay.
- Write in the same language the student uses (any language; if they switch mid-conversation, adapt). Tone: warm and professional.

Response format: ONLY one JSON object, no markdown, with this shape:
{
  "message": "your next message to the student",
  "progress": {
    "background": <number 0-100>,
    "achievements": <0-100>,
    "gap": <0-100>,
    "personality": <0-100>
  },
  "ready_to_generate": <true if it's time to suggest final essay generation, else false>
}

The progress fields estimate how fully each theme is covered. ready_to_generate: true only when all four themes have substantive material and the dialogue can logically wrap up.`;

export function clampProgress(p: Partial<ThemeProgress>): ThemeProgress {
  const c = (n: unknown) =>
    Math.min(100, Math.max(0, typeof n === 'number' && !Number.isNaN(n) ? n : 0));
  return {
    background: c(p.background),
    achievements: c(p.achievements),
    gap: c(p.gap),
    personality: c(p.personality)
  };
}

export function parseInterviewerJson(text: string): {
  message: string;
  progress: ThemeProgress;
  ready_to_generate: boolean;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Invalid interviewer JSON');
    parsed = JSON.parse(m[0]) as unknown;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid interviewer JSON shape');
  }
  const o = parsed as Record<string, unknown>;
  const message = typeof o.message === 'string' ? o.message.trim() : '';
  if (!message) throw new Error('Empty interviewer message');
  const pr = o.progress;
  const progress =
    pr && typeof pr === 'object' && !Array.isArray(pr)
      ? clampProgress(pr as Partial<ThemeProgress>)
      : EMPTY_PROGRESS;
  const ready = o.ready_to_generate === true;
  return { message, progress, ready_to_generate: ready };
}

type ChatTurn = { role: 'user' | 'assistant'; content: string };

export function toOpenAiHistory(
  rows: Array<{ role: 'user' | 'assistant'; content: string }>
): ChatTurn[] {
  return rows.map((r) => ({
    role: r.role,
    content: r.content
  }));
}

const REASSESS_PROGRESS_SYSTEM = `Assess how fully the EXISTING conversation below already contains material for an essay across four themes:
1) Background — origin, what shaped the person
2) Achievements — facts, numbers, responsibility
3) The gap — why keep studying, what's missing
4) Personality — vivid details, values, not only ambition

Return ONLY JSON (no markdown):
{"progress":{"background":0-100,"achievements":0-100,"gap":0-100,"personality":0-100},"ready_to_generate":true or false}

ready_to_generate: true only if all four themes have enough substantive material for a strong essay.
If the student barely replied or the history is only the mentor greeting — use low percentages (close to 0).`;

export function parseProgressOnlyJson(text: string): {
  progress: ThemeProgress;
  ready_to_generate: boolean;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Invalid progress JSON');
    parsed = JSON.parse(m[0]) as unknown;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid progress JSON shape');
  }
  const o = parsed as Record<string, unknown>;
  const pr = o.progress;
  const progress =
    pr && typeof pr === 'object' && !Array.isArray(pr)
      ? clampProgress(pr as Partial<ThemeProgress>)
      : EMPTY_PROGRESS;
  const ready = o.ready_to_generate === true;
  return { progress, ready_to_generate: ready };
}

/** Recompute progress bars from the current history (e.g. after deleting messages). */
export async function reassessProgressFromConversation(
  conversation: ChatTurn[]
): Promise<{ progress: ThemeProgress; ready_to_generate: boolean }> {
  const hasUserInput = conversation.some(
    (t) =>
      t.role === 'user' &&
      typeof t.content === 'string' &&
      t.content.trim().length > 0
  );
  if (!hasUserInput) {
    return {
      progress: { ...EMPTY_PROGRESS },
      ready_to_generate: false
    };
  }

  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error('OPENAI_API_KEY missing');
  const model = resolveOpenAiModel(
    'gpt-4o-mini',
    process.env.OPENAI_INTERVIEWER_MODEL,
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
      temperature: 0.25,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: REASSESS_PROGRESS_SYSTEM },
        ...conversation.map((t) => ({
          role: t.role,
          content: t.content
        }))
      ]
    })
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI HTTP ${res.status}: ${raw.slice(0, 400)}`);
  }
  const parsed = JSON.parse(raw) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = parsed.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Empty progress reassessment');
  return parseProgressOnlyJson(text);
}

export async function openAiInterviewerTurn(
  conversation: ChatTurn[]
): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error('OPENAI_API_KEY missing');
  const model = resolveOpenAiModel(
    'gpt-4o-mini',
    process.env.OPENAI_INTERVIEWER_MODEL,
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
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: INTERVIEWER_SYSTEM },
        ...conversation
      ]
    })
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI HTTP ${res.status}: ${raw.slice(0, 400)}`);
  }
  const parsed = JSON.parse(raw) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = parsed.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Empty OpenAI interviewer response');
  return text;
}
