import { NextResponse } from 'next/server';

import { readEssayChatMessages } from '@/lib/essay/essayChatMessages';
import {
  clampProgress,
  EMPTY_PROGRESS,
  type ThemeProgress
} from '@/lib/essay/interviewerAi';
import type { Json, Tables, TablesInsert } from '@/types_db';
import { createClient } from '@/utils/supabase/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any;

const MAX_MESSAGES = 120;

type PostBody = {
  messages?: unknown;
  progress?: unknown;
  ready_to_generate?: boolean;
  scholarship_title?: string | null;
  mentor_interview_started?: boolean;
  mentor_profile_prompt_sent?: boolean;
};

function validateMessagesJson(raw: unknown): Json | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_MESSAGES) {
    return null;
  }
  const { messages, backfilledIds } = readEssayChatMessages(raw as Json);
  if (messages.length === 0) return null;
  if (backfilledIds) {
    return JSON.parse(JSON.stringify(messages)) as Json;
  }
  return raw as Json;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const messagesJson = validateMessagesJson(body.messages);
  if (!messagesJson) {
    return NextResponse.json({ error: 'Invalid messages' }, { status: 400 });
  }

  const { messages: parsedForFlags } = readEssayChatMessages(messagesJson);
  const userMsgCount = parsedForFlags.filter((m) => m.role === 'user').length;
  const assistantMsgCount = parsedForFlags.filter(
    (m) => m.role === 'assistant'
  ).length;
  /** Guest / legacy: welcome + at least one more assistant ⇒ LLM has started. */
  const derivedInterviewStarted =
    userMsgCount >= 1 && assistantMsgCount >= 2;

  const progress = clampProgress(
    body.progress && typeof body.progress === 'object'
      ? (body.progress as Partial<ThemeProgress>)
      : EMPTY_PROGRESS
  );
  const ready = body.ready_to_generate === true;

  const st =
    typeof body.scholarship_title === 'string' && body.scholarship_title.trim()
      ? body.scholarship_title.trim().slice(0, 500)
      : null;
  const mentorStarted =
    body.mentor_interview_started === true
      ? true
      : body.mentor_interview_started === false
        ? false
        : derivedInterviewStarted;
  const profileSent = body.mentor_profile_prompt_sent === true;

  const now = new Date().toISOString();
  const insertRow: TablesInsert<'essay_chats'> = {
    user_id: user.id,
    messages: messagesJson,
    progress: progress as unknown as Json,
    ready_to_generate: ready,
    scholarship_title: st,
    mentor_interview_started: mentorStarted,
    mentor_profile_prompt_sent: profileSent,
    updated_at: now
  };

  const { data: row, error } = (await (supabase as Sb)
    .from('essay_chats')
    .insert(insertRow)
    .select('id, messages, progress, ready_to_generate')
    .single()) as {
    data: Pick<
      Tables<'essay_chats'>,
      'id' | 'messages' | 'progress' | 'ready_to_generate'
    > | null;
    error: { message: string } | null;
  };

  if (error || !row?.id) {
    return NextResponse.json(
      { error: error?.message ?? 'Failed to save chat' },
      { status: 500 }
    );
  }

  const { messages: out } = readEssayChatMessages(row.messages);

  return NextResponse.json({
    chat_id: row.id,
    messages: out,
    progress: clampProgress(row.progress as unknown as Partial<ThemeProgress>),
    ready_to_generate: Boolean(row.ready_to_generate)
  });
}
