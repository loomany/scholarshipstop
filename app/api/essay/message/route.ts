import { NextResponse } from 'next/server';

import {
  readEssayChatMessages,
  type EssayChatMessageRow,
  MESSAGE_ID_UUID_RE,
  newAssistantMessage
} from '@/lib/essay/essayChatMessages';
import {
  clampProgress,
  EMPTY_PROGRESS,
  openAiInterviewerTurn,
  parseInterviewerJson,
  reassessProgressFromConversation,
  toOpenAiHistory,
  type ThemeProgress
} from '@/lib/essay/interviewerAi';
import { pickCanonicalSubscription } from '@/lib/payments/subscriptionAccess';
import {
  hasEssayMentorAccess,
  type SubscriptionWithPriceAndProduct
} from '@/lib/payments/subscriptionEntitlements';
import type { Json, Tables } from '@/types_db';
import { createClient } from '@/utils/supabase/server';

export const maxDuration = 90;
export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any;

const CHAT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PatchBody = {
  chat_id?: string;
  message_id?: string;
  new_text?: string;
};

type DeleteBody = {
  chat_id?: string;
  message_id?: string;
};

async function ensureEssayMentorPlanAccess(supabase: Sb, userId: string) {
  const [{ data: profile }, { data: subRows }] = await Promise.all([
    (supabase as Sb).from('profiles').select('*').eq('id', userId).maybeSingle(),
    (supabase as Sb)
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created', { ascending: false })
      .limit(20)
  ]);
  const subscription = pickCanonicalSubscription(
    subRows ?? []
  ) as SubscriptionWithPriceAndProduct | null;
  return hasEssayMentorAccess(profile ?? null, subscription);
}

export async function PATCH(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await ensureEssayMentorPlanAccess(supabase, user.id))) {
    return NextResponse.json(
      {
        error:
          'AI Essay Mentor is available on Quarterly and Yearly plans only.'
      },
      { status: 402 }
    );
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured' },
      { status: 503 }
    );
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const chatId = typeof body.chat_id === 'string' ? body.chat_id.trim() : '';
  const messageId =
    typeof body.message_id === 'string' ? body.message_id.trim() : '';
  const newText =
    typeof body.new_text === 'string' ? body.new_text.trim() : '';

  if (!chatId || !CHAT_UUID_RE.test(chatId)) {
    return NextResponse.json({ error: 'Invalid chat_id' }, { status: 400 });
  }
  if (!messageId || !MESSAGE_ID_UUID_RE.test(messageId)) {
    return NextResponse.json({ error: 'Invalid message_id' }, { status: 400 });
  }
  if (!newText) {
    return NextResponse.json({ error: 'Empty new_text' }, { status: 400 });
  }

  const { data: chat, error: loadErr } = (await (supabase as Sb)
    .from('essay_chats')
    .select('id, user_id, messages, progress, ready_to_generate')
    .eq('id', chatId)
    .maybeSingle()) as {
    data: Pick<
      Tables<'essay_chats'>,
      'id' | 'user_id' | 'messages' | 'progress' | 'ready_to_generate'
    > | null;
    error: { message: string } | null;
  };

  if (loadErr) {
    return NextResponse.json({ error: loadErr.message }, { status: 500 });
  }
  if (!chat || chat.user_id !== user.id) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  const { messages: prior, backfilledIds } = readEssayChatMessages(chat.messages);
  if (backfilledIds) {
    await (supabase as Sb)
      .from('essay_chats')
      .update({
        messages: prior as unknown as Json,
        updated_at: new Date().toISOString()
      })
      .eq('id', chatId)
      .eq('user_id', user.id);
  }

  const idx = prior.findIndex(
    (m) => m.id === messageId && m.role === 'user'
  );
  if (idx < 0) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
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

  const { data: updated, error: upErr } = (await (supabase as Sb)
    .from('essay_chats')
    .update({
      messages: finalMessages as unknown as Json,
      progress: assistantPayload.progress as unknown as Json,
      ready_to_generate: assistantPayload.ready_to_generate,
      updated_at: assistantAt
    })
    .eq('id', chatId)
    .eq('user_id', user.id)
    .select('id, messages, progress, ready_to_generate')
    .single()) as {
    data: Pick<
      Tables<'essay_chats'>,
      'id' | 'messages' | 'progress' | 'ready_to_generate'
    > | null;
    error: { message: string } | null;
  };

  if (upErr || !updated) {
    return NextResponse.json(
      { error: upErr?.message ?? 'Failed to save chat' },
      { status: 500 }
    );
  }

  const { messages: out } = readEssayChatMessages(updated.messages);

  return NextResponse.json({
    chat_id: updated.id,
    messages: out,
    progress: clampProgress(
      updated.progress as unknown as Partial<ThemeProgress>
    ),
    ready_to_generate: updated.ready_to_generate
  });
}

export async function DELETE(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await ensureEssayMentorPlanAccess(supabase, user.id))) {
    return NextResponse.json(
      {
        error:
          'AI Essay Mentor is available on Quarterly and Yearly plans only.'
      },
      { status: 402 }
    );
  }

  let body: DeleteBody;
  try {
    body = (await request.json()) as DeleteBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const chatId = typeof body.chat_id === 'string' ? body.chat_id.trim() : '';
  const messageId =
    typeof body.message_id === 'string' ? body.message_id.trim() : '';

  if (!chatId || !CHAT_UUID_RE.test(chatId)) {
    return NextResponse.json({ error: 'Invalid chat_id' }, { status: 400 });
  }
  if (!messageId || !MESSAGE_ID_UUID_RE.test(messageId)) {
    return NextResponse.json({ error: 'Invalid message_id' }, { status: 400 });
  }

  const { data: chat, error: loadErr } = (await (supabase as Sb)
    .from('essay_chats')
    .select('id, user_id, messages, progress, ready_to_generate')
    .eq('id', chatId)
    .maybeSingle()) as {
    data: Pick<
      Tables<'essay_chats'>,
      'id' | 'user_id' | 'messages' | 'progress' | 'ready_to_generate'
    > | null;
    error: { message: string } | null;
  };

  if (loadErr) {
    return NextResponse.json({ error: loadErr.message }, { status: 500 });
  }
  if (!chat || chat.user_id !== user.id) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  const { messages: prior, backfilledIds } = readEssayChatMessages(chat.messages);
  if (backfilledIds) {
    await (supabase as Sb)
      .from('essay_chats')
      .update({
        messages: prior as unknown as Json,
        updated_at: new Date().toISOString()
      })
      .eq('id', chatId)
      .eq('user_id', user.id);
  }

  const idx = prior.findIndex(
    (m) => m.id === messageId && m.role === 'user'
  );
  if (idx < 0) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }

  const nextIsAssistant = prior[idx + 1]?.role === 'assistant';
  const indicesToDrop = new Set<number>([idx]);
  if (nextIsAssistant) indicesToDrop.add(idx + 1);

  const newMessages = prior.filter((_, i) => !indicesToDrop.has(i));
  const updatedAt = new Date().toISOString();

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

  const { data: updated, error: upErr } = (await (supabase as Sb)
    .from('essay_chats')
    .update({
      messages: newMessages as unknown as Json,
      progress: nextProgress as unknown as Json,
      ready_to_generate: nextReady,
      updated_at: updatedAt
    })
    .eq('id', chatId)
    .eq('user_id', user.id)
    .select('id, messages, progress, ready_to_generate')
    .single()) as {
    data: Pick<
      Tables<'essay_chats'>,
      'id' | 'messages' | 'progress' | 'ready_to_generate'
    > | null;
    error: { message: string } | null;
  };

  if (upErr || !updated) {
    return NextResponse.json(
      { error: upErr?.message ?? 'Failed to save chat' },
      { status: 500 }
    );
  }

  const { messages: out } = readEssayChatMessages(updated.messages);

  return NextResponse.json({
    chat_id: updated.id,
    messages: out,
    progress: clampProgress(
      updated.progress as unknown as Partial<ThemeProgress>
    ),
    ready_to_generate: updated.ready_to_generate
  });
}
