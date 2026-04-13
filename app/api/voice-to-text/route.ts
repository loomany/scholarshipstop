import { NextResponse } from 'next/server';

import { resolveOpenAiModel } from '@/lib/ai/resolveOpenAiModel';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

/** Очистка транскрипта: только gpt-4o-mini (или OPENAI_VOICE_CLEANUP_MODEL). */
const CLEANUP_MODEL_DEFAULT = 'gpt-4o-mini';

const CLEANUP_SYSTEM =
  'Ты — корректор. Очисти текст от слов-паразитов (э-э, ну, типа), повторов и грамматических ошибок, сохранив при этом живой стиль и все важные факты. Не меняй смысл.';

async function transcribeWhisper(apiKey: string, file: File): Promise<string> {
  const model = process.env.OPENAI_WHISPER_MODEL?.trim() || 'whisper-1';
  const form = new FormData();
  form.append('file', file);
  form.append('model', model);

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Whisper: ${res.status} ${raw.slice(0, 280)}`);
  }
  let parsed: { text?: string };
  try {
    parsed = JSON.parse(raw) as { text?: string };
  } catch {
    throw new Error('Whisper: invalid JSON');
  }
  return (parsed.text ?? '').trim();
}

/**
 * Очистка через GPT-4o-mini. При любой ошибке HTTP/парсинга — возвращает `raw` (сырой Whisper).
 */
async function cleanupTranscript(apiKey: string, raw: string): Promise<string> {
  const model = resolveOpenAiModel(
    CLEANUP_MODEL_DEFAULT,
    process.env.OPENAI_VOICE_CLEANUP_MODEL
  );

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.25,
      messages: [
        { role: 'system', content: CLEANUP_SYSTEM },
        { role: 'user', content: raw }
      ]
    })
  });

  const rawBody = await res.text();
  if (!res.ok) {
    return raw;
  }
  try {
    const parsed = JSON.parse(rawBody) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const out = parsed.choices?.[0]?.message?.content?.trim();
    return out && out.length > 0 ? out : raw;
  } catch {
    return raw;
  }
}

/**
 * POST multipart: поле `audio`.
 * Auth: не требуется — голос нужен и гостю в ментор-чате (`/api/interviewer/guest`), и залогиненному пользователю.
 * Ответ при успехе: JSON `{ text: string }`.
 */
export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured' },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('audio');
  if (!file || !(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'No audio file' }, { status: 400 });
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: 'Audio file is too large (max 25 MB)' },
      { status: 400 }
    );
  }

  try {
    const whisperText = await transcribeWhisper(apiKey, file);
    if (!whisperText) {
      return NextResponse.json(
        { error: 'Could not transcribe audio' },
        { status: 422 }
      );
    }
    const text = await cleanupTranscript(apiKey, whisperText);
    return NextResponse.json({ text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Transcription failed';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
