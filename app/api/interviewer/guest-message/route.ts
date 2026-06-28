import { NextResponse } from 'next/server';

import {
  MESSAGE_ID_UUID_RE,
  newAssistantMessage,
  type EssayChatMessageRow
} from '@/lib/essay/essayChatMessages';
import { normalizeGuestInterviewMessages } from '@/lib/essay/guestInterviewPayload';
import {
  clampProgress,
  EMPTY_PROGRESS,
  openAiInterviewerTurn,
  parseInterviewerJson,
  reassessProgressFromConversation,
  toOpenAiHistory,
  type ThemeProgress
} from '@/lib/essay/interviewerAi';
import {
  readJsonBodyWithLimit,
  RequestBodyTooLargeError,
  withExpensiveApiGuard
} from '@/lib/security/expensiveApiGuard';

export const maxDuration = 90;
export const dynamic = 'force-dynamic';

type PatchBody = {
  messages?: unknown;
  message_id?: string;
  new_text?: string;
};

type DeleteBody = {
  messages?: unknown;
  message_id?: string;
};

/**
 * Edit a user turn in an unauthenticated mentor interview (localStorage-backed).
 * Mirrors `/api/essay/message` PATCH without `essay_chats` ownership.
 */
export async function PATCH(request: Request) {
  return withExpensiveApiGuard(
    request,
    { scope: 'interviewer-guest-message', maxBodyBytes: 128 * 1024 },
    async () => {
      if (!process.env.OPENAI_API_KEY?.trim()) {
        return NextResponse.json(
          { error: 'OPENAI_API_KEY is not configured' },
          { status: 503 }
        );
      }

      let body: PatchBody;
      try {
        body = await readJsonBodyWithLimit<PatchBody>(request, 128 * 1024);
      } catch (error) {
        if (error instanceof RequestBodyTooLargeError) {
          return NextResponse.json(
            { error: 'Request body is too large' },
            { status: 413 }
          );
        }
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
      }

      const messageId =
        typeof body.message_id === 'string' ? body.message_id.trim() : '';
      const newText =
        typeof body.new_text === 'string' ? body.new_text.trim() : '';

      if (!messageId || !MESSAGE_ID_UUID_RE.test(messageId)) {
        return NextResponse.json(
          { error: 'Invalid message_id' },
          { status: 400 }
        );
      }
      if (!newText) {
        return NextResponse.json({ error: 'Empty new_text' }, { status: 400 });
      }

      const prior = normalizeGuestInterviewMessages(body.messages);
      if (!prior || prior.length === 0) {
        return NextResponse.json(
          { error: 'Invalid messages' },
          { status: 400 }
        );
      }

      const idx = prior.findIndex(
        (m) => m.id === messageId && m.role === 'user'
      );
      if (idx < 0) {
        return NextResponse.json(
          { error: 'Message not found' },
          { status: 404 }
        );
      }

      const now = new Date().toISOString();
      const prefix = prior.slice(0, idx);
      const edited: EssayChatMessageRow = {
        ...prior[idx],
        content: newText,
        at: now
      };
      const history: EssayChatMessageRow[] = [...prefix, edited];

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
      const finalMessages: EssayChatMessageRow[] = [
        ...history,
        newAssistantMessage(assistantPayload.message, assistantAt)
      ];

      return NextResponse.json({
        messages: finalMessages,
        progress: clampProgress(assistantPayload.progress),
        ready_to_generate: assistantPayload.ready_to_generate
      });
    }
  );
}

/**
 * Remove a user turn (and the following assistant reply if present) from a guest interview.
 * Mirrors `/api/essay/message` DELETE without `essay_chats` ownership.
 */
export async function DELETE(request: Request) {
  return withExpensiveApiGuard(
    request,
    { scope: 'interviewer-guest-message', maxBodyBytes: 128 * 1024 },
    async () => {
      let body: DeleteBody;
      try {
        body = await readJsonBodyWithLimit<DeleteBody>(request, 128 * 1024);
      } catch (error) {
        if (error instanceof RequestBodyTooLargeError) {
          return NextResponse.json(
            { error: 'Request body is too large' },
            { status: 413 }
          );
        }
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
      }

      const messageId =
        typeof body.message_id === 'string' ? body.message_id.trim() : '';

      if (!messageId || !MESSAGE_ID_UUID_RE.test(messageId)) {
        return NextResponse.json(
          { error: 'Invalid message_id' },
          { status: 400 }
        );
      }

      const prior = normalizeGuestInterviewMessages(body.messages);
      if (!prior || prior.length === 0) {
        return NextResponse.json(
          { error: 'Invalid messages' },
          { status: 400 }
        );
      }

      const idx = prior.findIndex(
        (m) => m.id === messageId && m.role === 'user'
      );
      if (idx < 0) {
        return NextResponse.json(
          { error: 'Message not found' },
          { status: 404 }
        );
      }

      const nextIsAssistant = prior[idx + 1]?.role === 'assistant';
      const indicesToDrop = new Set<number>([idx]);
      if (nextIsAssistant) indicesToDrop.add(idx + 1);

      const newMessages = prior.filter((_, i) => !indicesToDrop.has(i));

      let nextProgress = EMPTY_PROGRESS;
      let nextReady = false;
      if (process.env.OPENAI_API_KEY?.trim()) {
        try {
          const r = await reassessProgressFromConversation(
            toOpenAiHistory(newMessages)
          );
          nextProgress = r.progress;
          nextReady = r.ready_to_generate;
        } catch {
          nextProgress = EMPTY_PROGRESS;
          nextReady = false;
        }
      }

      return NextResponse.json({
        messages: newMessages,
        progress: clampProgress(nextProgress),
        ready_to_generate: nextReady
      });
    }
  );
}
