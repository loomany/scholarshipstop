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
  buildMentorInterviewContextBlock,
  transcriptForContextBlock
} from '@/lib/essay/mentorOnboarding';
import {
  buildInterviewerSystemPrompt,
  clampProgress,
  openAiInterviewerTurn,
  parseInterviewerJson,
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

type PostBody = {
  messages?: unknown;
  user_message?: string;
  scholarship_title?: string | null;
  /** After the first LLM turn, client sets true — subsequent turns use the standard interviewer prompt only. */
  mentor_interview_started?: boolean;
};

/**
 * Unauthenticated mentor turns: no `essay_chats` row until `/api/interviewer/claim` after sign-in.
 */
export async function POST(request: Request) {
  return withExpensiveApiGuard(
    request,
    { scope: 'interviewer-guest', maxBodyBytes: 128 * 1024 },
    async () => {
      if (!process.env.OPENAI_API_KEY?.trim()) {
        return NextResponse.json(
          { error: 'OPENAI_API_KEY is not configured' },
          { status: 503 }
        );
      }

      let body: PostBody;
      try {
        body = await readJsonBodyWithLimit<PostBody>(request, 128 * 1024);
      } catch (error) {
        if (error instanceof RequestBodyTooLargeError) {
          return NextResponse.json(
            { error: 'Request body is too large' },
            { status: 413 }
          );
        }
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
      }

      const userMessage =
        typeof body.user_message === 'string' ? body.user_message.trim() : '';
      if (!userMessage || userMessage.length > MAX_GUEST_USER_MESSAGE_CHARS) {
        return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
      }

      const prior = normalizeGuestInterviewMessages(body.messages);
      if (!prior || prior.length === 0) {
        return NextResponse.json(
          { error: 'Invalid messages' },
          { status: 400 }
        );
      }

      const stRaw =
        typeof body.scholarship_title === 'string'
          ? body.scholarship_title.trim()
          : '';
      const scholarshipTitle =
        stRaw.length > 0 && stRaw.length <= 500 ? stRaw : null;
      const mentorInterviewStarted = body.mentor_interview_started === true;

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
        if (!mentorInterviewStarted) {
          const appendix = buildMentorInterviewContextBlock({
            scholarshipTitle,
            setupTranscript: transcriptForContextBlock(
              history.map((m) => ({ role: m.role, content: m.content }))
            )
          });
          const raw = await openAiInterviewerTurn(toOpenAiHistory(history), {
            systemPrompt: buildInterviewerSystemPrompt(appendix)
          });
          assistantPayload = parseInterviewerJson(raw);
        } else {
          const raw = await openAiInterviewerTurn(toOpenAiHistory(history));
          assistantPayload = parseInterviewerJson(raw);
        }
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
        ready_to_generate: assistantPayload.ready_to_generate,
        mentor_interview_started: true
      });
    }
  );
}
