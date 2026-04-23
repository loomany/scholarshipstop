import { NextResponse } from 'next/server';

import {
  newAssistantMessage,
  newUserMessage,
  readEssayChatMessages,
  type EssayChatMessageRow
} from '@/lib/essay/essayChatMessages';
import {
  buildProfileFollowUpMessage,
  buildProfileMentorSnapshot,
  buildMentorInterviewContextBlock,
  buildWelcomeAssistantMessage,
  profileHasMentorSignals,
  transcriptForContextBlock
} from '@/lib/essay/mentorOnboarding';
import {
  buildInterviewerSystemPrompt,
  clampProgress,
  EMPTY_PROGRESS,
  openAiInterviewerTurn,
  parseInterviewerJson,
  toOpenAiHistory,
  type ThemeProgress
} from '@/lib/essay/interviewerAi';
import {
  hasEssayMentorAccess,
  type SubscriptionWithPriceAndProduct
} from '@/lib/payments/subscriptionEntitlements';
import {
  shouldApplyTrialFeatureQuotas,
  trialReleaseQuota,
  trialReserveQuota
} from '@/lib/payments/trialFeatureQuotas';
import { pickCanonicalSubscription } from '@/lib/payments/subscriptionAccess';
import type { Json, Tables } from '@/types_db';
import { createClient } from '@/utils/supabase/server';

export const maxDuration = 90;
export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ChatMessageRow = EssayChatMessageRow;

export { type ThemeProgress };

type PostBody =
  | { action: 'init'; scholarship_title?: string | null }
  | { action: 'resume'; chat_id: string }
  | { chat_id: string; message: string };

function parseScholarshipTitleFromBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const s = (body as { scholarship_title?: unknown }).scholarship_title;
  if (typeof s !== 'string') return null;
  const t = s.trim();
  if (!t || t.length > 500) return null;
  return t;
}

export async function POST(request: Request) {
  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [{ data: profile }, { data: subRows }] = await Promise.all([
    (supabase as Sb).from('profiles').select('*').eq('id', user.id).maybeSingle(),
    (supabase as Sb)
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created', { ascending: false })
      .limit(20)
  ]);
  const subscription = pickCanonicalSubscription(
    subRows ?? []
  ) as SubscriptionWithPriceAndProduct | null;
  const mentorAccess = hasEssayMentorAccess(profile ?? null, subscription);
  if (!mentorAccess) {
    return NextResponse.json(
      {
        error:
          'AI Essay Mentor is available on Quarterly and Yearly plans only.',
        code: 'essay_plan_required'
      },
      { status: 402 }
    );
  }

  const now = new Date().toISOString();

  if ('action' in body && body.action === 'init') {
    const scholarshipTitle = parseScholarshipTitleFromBody(body);
    const applyTrialQuotas = shouldApplyTrialFeatureQuotas(profile, subscription);

    let chatQuotaReserved = false;
    if (applyTrialQuotas) {
      const r = await trialReserveQuota(supabase, 'chat');
      if (!r.ok) {
        return NextResponse.json(
          {
            error:
              'Trial mentor dialogue limit reached. Subscribe to start a new conversation.',
            code: 'trial_quota_exceeded',
            kind: 'chat'
          },
          { status: 402 }
        );
      }
      chatQuotaReserved = true;
    }

    const welcomeText = buildWelcomeAssistantMessage(scholarshipTitle);
    const seed: EssayChatMessageRow[] = [newAssistantMessage(welcomeText, now)];
    const { data: row, error } = (await (supabase as Sb)
      .from('essay_chats')
      .insert({
        user_id: user.id,
        messages: seed as unknown as Json,
        progress: EMPTY_PROGRESS as unknown as Json,
        ready_to_generate: false,
        scholarship_title: scholarshipTitle,
        mentor_interview_started: false,
        mentor_profile_prompt_sent: false,
        updated_at: now
      })
      .select('id, messages, progress, ready_to_generate, created_at')
      .single()) as {
      data: Pick<
        Tables<'essay_chats'>,
        'id' | 'messages' | 'progress' | 'ready_to_generate' | 'created_at'
      > | null;
      error: { message: string } | null;
    };
    if (error || !row) {
      if (chatQuotaReserved) {
        await trialReleaseQuota(supabase, 'chat');
      }
      return NextResponse.json(
        { error: error?.message ?? 'Failed to create chat' },
        { status: 500 }
      );
    }
    return NextResponse.json({
      chat_id: row.id,
      messages: seed,
      progress: EMPTY_PROGRESS,
      ready_to_generate: false
    });
  }

  if ('action' in body && body.action === 'resume') {
    const resumeId =
      typeof (body as { chat_id?: string }).chat_id === 'string'
        ? (body as { chat_id: string }).chat_id.trim()
        : '';
    if (!resumeId || !UUID_RE.test(resumeId)) {
      return NextResponse.json({ error: 'Invalid chat_id' }, { status: 400 });
    }
    const { data: resumeRow, error: resumeErr } = (await (supabase as Sb)
      .from('essay_chats')
      .select('id, user_id, messages, progress, ready_to_generate')
      .eq('id', resumeId)
      .maybeSingle()) as {
      data: Pick<
        Tables<'essay_chats'>,
        'id' | 'user_id' | 'messages' | 'progress' | 'ready_to_generate'
      > | null;
      error: { message: string } | null;
    };
    if (resumeErr) {
      return NextResponse.json({ error: resumeErr.message }, { status: 500 });
    }
    if (!resumeRow || resumeRow.user_id !== user.id) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const { messages: normalized, backfilledIds } = readEssayChatMessages(
      resumeRow.messages
    );
    if (backfilledIds) {
      const { error: bfErr } = await (supabase as Sb)
        .from('essay_chats')
        .update({
          messages: normalized as unknown as Json,
          updated_at: new Date().toISOString()
        })
        .eq('id', resumeId)
        .eq('user_id', user.id);
      if (bfErr) {
        return NextResponse.json({ error: bfErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      chat_id: resumeRow.id,
      messages: normalized,
      progress: clampProgress(
        resumeRow.progress as unknown as Partial<ThemeProgress>
      ),
      ready_to_generate: Boolean(resumeRow.ready_to_generate)
    });
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured' },
      { status: 503 }
    );
  }

  if (!('chat_id' in body) || 'action' in body) {
    return NextResponse.json(
      {
        error:
          'Expected { action: "init" }, { action: "resume", chat_id }, or { chat_id, message }'
      },
      { status: 400 }
    );
  }

  const chatId = body.chat_id?.trim();
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!chatId || !UUID_RE.test(chatId)) {
    return NextResponse.json({ error: 'Invalid chat_id' }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: 'Empty message' }, { status: 400 });
  }

  const { data: chat, error: loadErr } = (await (supabase as Sb)
    .from('essay_chats')
    .select(
      'id, user_id, messages, progress, ready_to_generate, scholarship_title, mentor_interview_started, mentor_profile_prompt_sent'
    )
    .eq('id', chatId)
    .maybeSingle()) as {
    data: (Pick<
      Tables<'essay_chats'>,
      | 'id'
      | 'user_id'
      | 'messages'
      | 'progress'
      | 'ready_to_generate'
      | 'scholarship_title'
      | 'mentor_interview_started'
      | 'mentor_profile_prompt_sent'
    > & {
      scholarship_title?: string | null;
      mentor_interview_started?: boolean;
      mentor_profile_prompt_sent?: boolean;
    }) | null;
    error: { message: string } | null;
  };

  if (loadErr) {
    return NextResponse.json({ error: loadErr.message }, { status: 500 });
  }
  if (!chat || chat.user_id !== user.id) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  const { messages: prior } = readEssayChatMessages(chat.messages);
  let history: EssayChatMessageRow[] = [
    ...prior,
    newUserMessage(message, now)
  ];

  const scholarshipTitle =
    typeof chat.scholarship_title === 'string' && chat.scholarship_title.trim()
      ? chat.scholarship_title.trim()
      : null;
  const mentorInterviewStarted = Boolean(chat.mentor_interview_started);
  const mentorProfilePromptSent = Boolean(chat.mentor_profile_prompt_sent);
  const userTurns = history.filter((m) => m.role === 'user').length;

  /** Optional second assistant bubble (profile snapshot) before any LLM turn. */
  if (!mentorInterviewStarted && userTurns === 1 && !mentorProfilePromptSent) {
    const { data: profileRow } = await (supabase as Sb)
      .from('profiles')
      .select(
        'citizenship_status_label, country_code, field_of_study, field_of_study_label, gpa'
      )
      .eq('id', user.id)
      .maybeSingle();

    if (profileHasMentorSignals(profileRow ?? {})) {
      const snap = buildProfileMentorSnapshot(profileRow ?? {});
      if (snap) {
        const profileLine = buildProfileFollowUpMessage(snap);
        const assistantAt = new Date().toISOString();
        const historyWithProfile: EssayChatMessageRow[] = [
          ...history,
          newAssistantMessage(profileLine, assistantAt)
        ];
        const { data: updatedProfile, error: upProfErr } = await (supabase as Sb)
          .from('essay_chats')
          .update({
            messages: historyWithProfile as unknown as Json,
            mentor_profile_prompt_sent: true,
            updated_at: assistantAt
          })
          .eq('id', chatId)
          .eq('user_id', user.id)
          .select('id, messages, progress, ready_to_generate')
          .single();
        if (upProfErr || !updatedProfile) {
          return NextResponse.json(
            { error: upProfErr?.message ?? 'Failed to save chat' },
            { status: 500 }
          );
        }
        const { messages: outProf } = readEssayChatMessages(
          updatedProfile.messages
        );
        return NextResponse.json({
          chat_id: updatedProfile.id,
          messages: outProf,
          progress: clampProgress(
            updatedProfile.progress as unknown as Partial<ThemeProgress>
          ),
          ready_to_generate: Boolean(updatedProfile.ready_to_generate)
        });
      }
    }
  }

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
          history.map((m) => ({
            role: m.role,
            content: m.content
          }))
        )
      });
      const systemPrompt = buildInterviewerSystemPrompt(appendix);
      const raw = await openAiInterviewerTurn(toOpenAiHistory(history), {
        systemPrompt
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

  const { data: updated, error: upErr } = (await (supabase as Sb)
    .from('essay_chats')
    .update({
      messages: history as unknown as Json,
      progress: assistantPayload.progress as unknown as Json,
      ready_to_generate: assistantPayload.ready_to_generate,
      mentor_interview_started: true,
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
