import { NextResponse } from 'next/server';

import {
  newAssistantMessage,
  newUserMessage,
  type EssayChatMessageRow
} from '@/lib/essay/essayChatMessages';
import {
  MAX_GUEST_USER_MESSAGE_CHARS,
  normalizeGuestInterviewMessages
} from '@/lib/essay/guestInterviewPayload';
import {
  clampProgress,
  openAiInterviewerTurn,
  parseInterviewerJson,
  toOpenAiHistory,
  type ThemeProgress
} from '@/lib/essay/interviewerAi';

export const maxDuration = 90;
export const dynamic = 'force-dynamic';

type PostBody = {
  messages?: unknown;
  user_message?: string;
};

/**
 * Unauthenticated mentor turns: no `essay_chats` row until `/api/interviewer/claim` after sign-in.
 */
export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured' },
      { status: 503 }
    );
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const userMessage =
    typeof body.user_message === 'string' ? body.user_message.trim() : '';
  if (!userMessage || userMessage.length > MAX_GUEST_USER_MESSAGE_CHARS) {
    return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
  }

  const prior = normalizeGuestInterviewMessages(body.messages);
  if (!prior || prior.length === 0) {
    return NextResponse.json({ error: 'Invalid messages' }, { status: 400 });
  }

  const now = new Date().toISOString();
  let history: EssayChatMessageRow[] = [
    ...prior,
    newUserMessage(userMessage, now)
  ];

  let assistantPayload: {
    message: string;
    progress: ThemeProgress;
    ready_to_generate: boolean;
  };
  try {
    const raw = await openAiInterviewerTurn(toOpenAiHistory(history));
    assistantPayload = parseInterviewerJson(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Interviewer failed';
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const assistantAt = new Date().toISOString();
  history = [
    ...history,
    newAssistantMessage(assistantPayload.message, assistantAt)
  ];

  return NextResponse.json({
    messages: history,
    progress: clampProgress(assistantPayload.progress),
    ready_to_generate: assistantPayload.ready_to_generate
  });
}
