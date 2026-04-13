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

  const progress = clampProgress(
    body.progress && typeof body.progress === 'object'
      ? (body.progress as Partial<ThemeProgress>)
      : EMPTY_PROGRESS
  );
  const ready = body.ready_to_generate === true;

  const now = new Date().toISOString();
  const insertRow: TablesInsert<'essay_chats'> = {
    user_id: user.id,
    messages: messagesJson,
    progress: progress as unknown as Json,
    ready_to_generate: ready,
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
