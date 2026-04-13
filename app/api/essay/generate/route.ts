import { NextResponse } from 'next/server';

import { resolveOpenAiModel } from '@/lib/ai/resolveOpenAiModel';
import {
  INTERVIEW_DRAFT_MIN_THEME_PERCENT,
  interviewThemesMeetDraftThreshold,
  interviewThemesMeetStrongDraftThreshold,
  parseInterviewProgressFromJson
} from '@/lib/essay/interviewDraftProgressGate';
import type { Json, Tables, TablesInsert } from '@/types_db';
import { createClient } from '@/utils/supabase/server';

/** `from()` для новых таблиц иногда выводится как `never` до полной синхронизации типов с PostgREST. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any;

export const runtime = 'edge';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PostBody = {
  /** Классический опросник (4 блока). */
  response_id?: string;
  /** Диалог с AI-интервьюером (`essay_chats`). */
  chat_id?: string;
};

type StageMap = Record<string, unknown>;

function asRecord(j: Json | null): StageMap {
  if (!j || typeof j !== 'object' || Array.isArray(j)) return {};
  return j as StageMap;
}

function formatQuestionnaireBlock(
  stage1: StageMap,
  stage2: StageMap,
  stage3: StageMap,
  stage4: StageMap
): string {
  const lines: string[] = [];
  lines.push('### Stage 1 — Background');
  lines.push(
    `- Hardships overcome: ${String(stage1.hardships ?? '').trim() || '(not provided)'}`
  );
  lines.push(
    `- First in family to pursue higher education: ${stage1.firstInFamilyHigherEd === true ? 'yes' : stage1.firstInFamilyHigherEd === false ? 'no' : 'not specified'}`
  );
  lines.push('');
  lines.push('### Stage 2 — Achievements');
  lines.push(
    `- Project outcomes in numbers / metrics: ${String(stage2.projectResultsNumbers ?? '').trim() || '(not provided)'}`
  );
  lines.push(
    `- Response to difficult feedback: ${String(stage2.difficultFeedbackReaction ?? '').trim() || '(not provided)'}`
  );
  lines.push('');
  lines.push('### Stage 3 — The gap');
  lines.push(
    `- What is missing at home / why study abroad: ${String(stage3.homelandGap ?? '').trim() || '(not provided)'}`
  );
  lines.push(
    `- Target professors / courses (names): ${String(stage3.professorsOrCourses ?? '').trim() || '(not provided)'}`
  );
  lines.push('');
  lines.push('### Stage 4 — Human touch');
  lines.push(
    `- Unusual hobby: ${String(stage4.unusualHobby ?? '').trim() || '(not provided)'}`
  );
  lines.push(
    `- A city problem that matters to the applicant: ${String(stage4.cityProblem ?? '').trim() || '(not provided)'}`
  );
  return lines.join('\n');
}

const SYSTEM_STYLE_QUESTIONNAIRE = `You write admissions and scholarship essays in English at the level expected for competitive programs (Ivy League tone: precise, reflective, humane; Chevening tone: leadership, global outlook, policy relevance where fitting).

Frameworks to structure the narrative (do not name the frameworks in the essay):
- STAR: Situation → Task → Action → Result (for achievement and obstacle moments).
- Hero's Journey: ordinary world → call/challenge → trials → insight → return / commitment to impact.

Voice: active, specific, forward-looking. Avoid hype adjectives without evidence.`;

/** Same quality bar as English essays, but output language follows the applicant's interview (see user message). */
const SYSTEM_STYLE_INTERVIEW = `You write admissions and scholarship essays **in the same language as the applicant's own messages** in the interview transcript supplied in the user message. Do not translate into English unless the applicant wrote primarily in English.

Match the tone expected for competitive programs in that language: precise, reflective, humane; where fitting, leadership and forward-looking impact.

Frameworks to structure the narrative (do not name the frameworks in the essay):
- STAR: Situation → Task → Action → Result (for achievement and obstacle moments).
- Hero's Journey: ordinary world → call/challenge → trials → insight → return / commitment to impact.

Voice: active, specific, forward-looking. Avoid hype adjectives without evidence.`;

function systemStyleForSource(
  source: 'questionnaire' | 'interview'
): string {
  return source === 'interview'
    ? SYSTEM_STYLE_INTERVIEW
    : SYSTEM_STYLE_QUESTIONNAIRE;
}

const NEGATIVE_CONSTRAINTS_QUESTIONNAIRE = `Hard bans (do not violate):
- Cliché openers and filler such as: "From a young age", "I have always been passionate about", "Since childhood", "Ever since I can remember".
- Empty superlatives and vague "passion" without proof.
- Passive voice when an active subject exists (prefer "I designed…" over "It was designed…").
- Soviet-style bureaucratic phrasing in English (abstract nouns stacked without actors; "realization of the importance of…", "carries a significant meaning", etc.).
- Inventing facts, institutions, awards, or numbers not present in the questionnaire.`;

const NEGATIVE_CONSTRAINTS_INTERVIEW = `Hard bans (do not violate):
- Cliché openers and filler (in the essay's output language), e.g. direct equivalents of "From a young age", "I have always been passionate about", "Since childhood", "Ever since I can remember".
- Empty superlatives and vague "passion" without proof.
- Passive voice when an active subject exists.
- Heavy bureaucratic or stacked abstract phrasing without clear actors.
- Inventing facts, institutions, awards, or numbers not present in the interview transcript.`;

function negativeConstraintsForSource(
  source: 'questionnaire' | 'interview'
): string {
  return source === 'interview'
    ? NEGATIVE_CONSTRAINTS_INTERVIEW
    : NEGATIVE_CONSTRAINTS_QUESTIONNAIRE;
}

function buildDraftUserPrompt(questionnaireBlock: string): string {
  return `${NEGATIVE_CONSTRAINTS_QUESTIONNAIRE}

## Applicant questionnaire (only source of biographical facts; weave names, numbers, hobbies, and city issue where they fit naturally)

${questionnaireBlock}

## Task
Write a **draft** personal statement / statement of purpose in **English** (first person). Target roughly **550–700 words** unless the material clearly needs a shorter arc.

Requirements:
- Ground every major claim in the questionnaire; add **no** fabricated metrics or affiliations.
- Use at least **two** concrete quantitative or countable details from Stage 2 when available.
- Integrate the hobby and city problem as humanizing texture (not as a list tacked at the end).
- Show reflection: what changed in you, and what you will do next (answer "So what?").
- Do **not** include meta-commentary ("In this essay I will…"). Start in-scene or with a concrete moment.

Output: **essay draft only** (no title line unless essential).`;
}

function formatInterviewTranscript(messagesJson: Json): string {
  if (!Array.isArray(messagesJson)) return '(empty interview)';
  const lines: string[] = [];
  for (const item of messagesJson) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    const who =
      o.role === 'user'
        ? 'Student'
        : o.role === 'assistant'
          ? 'Mentor'
          : 'Speaker';
    lines.push(`${who}: ${String(o.content ?? '')}`);
  }
  return lines.join('\n\n').trim() || '(empty interview)';
}

function buildDraftUserPromptFromInterview(transcriptBlock: string): string {
  return `${NEGATIVE_CONSTRAINTS_INTERVIEW}

## Interview transcript (only facts stated here; do not invent details)

${transcriptBlock}

## Task
Write a **draft** personal statement / statement of purpose **in the same language as the Student's messages** in the transcript above (first person). If the student mixed languages, follow their **most recent** substantive user messages. **Do not** translate into English unless the student's own words were primarily English. Target roughly **550–700 words** (or a natural length for that language if different).

Requirements:
- Ground every claim in the dialogue only; add **no** fabricated metrics, employers, or programs.
- Pull in concrete numbers, timeframes, and emotional beats that appear in the transcript.
- Show reflection and forward momentum (answer "So what?" / next step).
- Do **not** include meta-commentary ("In this essay I will…"). Start in-scene or with a concrete moment.

Output: **essay draft only** (no title line unless essential).`;
}

function buildDraftUserPromptFromInterviewPreview(transcriptBlock: string): string {
  return `${NEGATIVE_CONSTRAINTS_INTERVIEW}

## Interview transcript (only facts stated here; do not invent details)

${transcriptBlock}

## Task — SHORT PREVIEW ONLY (not a finished application essay)
Theme-completion scores are still **below** the "strong draft" threshold. Produce a **brief sketch**, not a full long-form essay.

**Length: about 220–320 words** in the same language as the Student's messages. **Do not** write 500+ words.

**Structure:** (1) opening hook grounded in the transcript; (2) one body paragraph with concrete detail from the dialogue; (3) a short closing that points toward what is still open / to develop next.

**Do not** invent programs, employers, awards, or metrics. Do not paper over gaps — stay faithful to what was actually said.

Output: **essay draft only** (no title line unless essential).`;
}

function buildGrinderUserPrompt(
  draft: string,
  source: 'questionnaire' | 'interview',
  grinderOpts?: { previewInterview?: boolean }
): string {
  const langLine =
    source === 'interview'
      ? `The draft is already in the applicant's chosen language (from the interview). **Keep that language** in the final essay — polish only; do not translate unless the draft itself mixed languages intentionally.`
      : `The draft is in English.`;

  const toneLine =
    source === 'interview'
      ? `5. Tone: confident, reflective, not boastful — appropriate for competitive admissions in the essay's language.`
      : `5. Tone: Ivy League / Chevening — confident, reflective, not boastful.`;

  const finalLang =
    source === 'interview'
      ? 'the same language as the draft (the applicant\'s interview language)'
      : 'English';

  const previewBlock =
    grinderOpts?.previewInterview && source === 'interview'
      ? `

**Preview draft constraints (mandatory):**
- Keep **final_essay** at or under **380 words** in ${finalLang}.
- Polish only: **do not** add new biographical facts, institutions, or numbers not already present in the draft.
- Do **not** expand into a long submission essay — stay in "short preview" territory.`
      : '';

  const finalEssayKeyLine =
    grinderOpts?.previewInterview && source === 'interview'
      ? `- "final_essay": string — polished preview in ${finalLang}, **at most 380 words**; no new invented facts.`
      : `- "final_essay": string — the full polished essay in ${finalLang}.`;

  return `Here is a draft admissions essay:

---
${draft}
---

${langLine}

You are in **Grinder** mode: ruthlessly revise for clarity, specificity, and tone.${previewBlock}

Checklist (address in your grinder_notes, then fix the essay):
1. Any banned clichés or stock phrases? Remove or rewrite.
2. Does every paragraph earn its place toward a coherent "So what?" / next step?
3. Are there enough **numbers** or countable outcomes where the draft references impact?
4. Passive voice or bureaucratic abstraction? Convert to active, concrete language.
${toneLine}

Return **only** a JSON object with exactly two keys:
${finalEssayKeyLine}
- "grinder_notes": string — concise bullet-style self-critique (what was wrong in the draft and what you changed). Plain text inside the string is fine.`;
}

type LlmProvider = 'openai' | 'anthropic';

function detectProvider(): LlmProvider | null {
  if (process.env.OPENAI_API_KEY?.trim()) return 'openai';
  if (process.env.ANTHROPIC_API_KEY?.trim()) return 'anthropic';
  return null;
}

async function openAiChat(params: {
  system: string;
  user: string;
  jsonObject?: boolean;
}): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error('OPENAI_API_KEY missing');
  const model = resolveOpenAiModel(
    'gpt-4o-mini',
    process.env.OPENAI_ESSAY_MODEL
  );
  const body: Record<string, unknown> = {
    model,
    temperature: 0.65,
    messages: [
      { role: 'system', content: params.system },
      { role: 'user', content: params.user }
    ]
  };
  if (params.jsonObject) {
    body.response_format = { type: 'json_object' };
  }
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify(body)
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI HTTP ${res.status}: ${raw.slice(0, 500)}`);
  }
  const parsed = JSON.parse(raw) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = parsed.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Empty OpenAI response');
  return text;
}

async function anthropicComplete(params: {
  system: string;
  user: string;
}): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) throw new Error('ANTHROPIC_API_KEY missing');
  const model =
    process.env.ANTHROPIC_ESSAY_MODEL?.trim() || 'claude-3-5-sonnet-20241022';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system: params.system,
      messages: [{ role: 'user', content: params.user }]
    })
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Anthropic HTTP ${res.status}: ${raw.slice(0, 500)}`);
  }
  const parsed = JSON.parse(raw) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = parsed.content
    ?.map((b) => (b.type === 'text' ? b.text ?? '' : ''))
    .join('')
    .trim();
  if (!text) throw new Error('Empty Anthropic response');
  return text;
}

async function anthropicJsonGrinder(
  draft: string,
  source: 'questionnaire' | 'interview',
  grinderOpts?: { previewInterview?: boolean }
): Promise<{
  final_essay: string;
  grinder_notes: string;
}> {
  const user = buildGrinderUserPrompt(draft, source, grinderOpts);
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) throw new Error('ANTHROPIC_API_KEY missing');
  const model =
    process.env.ANTHROPIC_ESSAY_MODEL?.trim() || 'claude-3-5-sonnet-20241022';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system:
        'You output only valid JSON objects, no markdown fences. ' +
        systemStyleForSource(source),
      messages: [{ role: 'user', content: user }]
    })
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Anthropic HTTP ${res.status}: ${raw.slice(0, 500)}`);
  }
  const parsed = JSON.parse(raw) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = parsed.content
    ?.map((b) => (b.type === 'text' ? b.text ?? '' : ''))
    .join('')
    .trim();
  if (!text) throw new Error('Empty Anthropic grinder response');
  return parseGrinderJson(text);
}

function parseGrinderJson(text: string): {
  final_essay: string;
  grinder_notes: string;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Grinder JSON parse failed');
    parsed = JSON.parse(m[0]) as unknown;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Grinder JSON invalid shape');
  }
  const o = parsed as Record<string, unknown>;
  const finalEssay = o.final_essay;
  const grinderNotes = o.grinder_notes;
  if (typeof finalEssay !== 'string' || typeof grinderNotes !== 'string') {
    throw new Error('Grinder JSON missing final_essay or grinder_notes');
  }
  if (!finalEssay.trim()) throw new Error('Empty final_essay');
  return { final_essay: finalEssay.trim(), grinder_notes: grinderNotes.trim() };
}

export async function POST(request: Request) {
  const provider = detectProvider();
  if (!provider) {
    return NextResponse.json(
      {
        error:
          'No LLM configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in the server environment.'
      },
      { status: 503 }
    );
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const responseIdRaw = body.response_id?.trim();
  const chatIdRaw = body.chat_id?.trim();
  const hasResponse = Boolean(responseIdRaw && UUID_RE.test(responseIdRaw));
  const hasChat = Boolean(chatIdRaw && UUID_RE.test(chatIdRaw));
  if (hasResponse === hasChat) {
    return NextResponse.json(
      {
        error:
          'Provide exactly one of: response_id (questionnaire) or chat_id (interview)'
      },
      { status: 400 }
    );
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let draftUser: string;
  let versionScope: { responseId: string | null; chatId: string | null };
  /** Интервью: темы ≥50% но не все ≥85% — короткий preview-текст. */
  let isPreviewInterviewDraft = false;

  if (hasResponse) {
    const responseId = responseIdRaw as string;
    const { data: row, error: qErr } = (await (supabase as Sb)
      .from('questionnaire_responses')
      .select(
        'id, user_id, stage1_data, stage2_data, stage3_data, stage4_data'
      )
      .eq('id', responseId)
      .maybeSingle()) as {
      data: Pick<
        Tables<'questionnaire_responses'>,
        | 'id'
        | 'user_id'
        | 'stage1_data'
        | 'stage2_data'
        | 'stage3_data'
        | 'stage4_data'
      > | null;
      error: { message: string } | null;
    };

    if (qErr) {
      return NextResponse.json({ error: qErr.message }, { status: 500 });
    }
    if (!row || row.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Questionnaire not found or access denied' },
        { status: 404 }
      );
    }

    const stage1 = asRecord(row.stage1_data);
    const stage2 = asRecord(row.stage2_data);
    const stage3 = asRecord(row.stage3_data);
    const stage4 = asRecord(row.stage4_data);
    const questionnaireBlock = formatQuestionnaireBlock(
      stage1,
      stage2,
      stage3,
      stage4
    );
    draftUser = buildDraftUserPrompt(questionnaireBlock);
    versionScope = { responseId, chatId: null };
  } else {
    const chatId = chatIdRaw as string;
    const { data: chat, error: cErr } = (await (supabase as Sb)
      .from('essay_chats')
      .select('id, user_id, messages, progress')
      .eq('id', chatId)
      .maybeSingle()) as {
      data: Pick<
        Tables<'essay_chats'>,
        'id' | 'user_id' | 'messages' | 'progress'
      > | null;
      error: { message: string } | null;
    };
    if (cErr) {
      return NextResponse.json({ error: cErr.message }, { status: 500 });
    }
    if (!chat || chat.user_id !== user.id) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }
    const progressParsed = parseInterviewProgressFromJson(
      chat.progress as Json
    );
    if (!interviewThemesMeetDraftThreshold(progressParsed)) {
      return NextResponse.json(
        {
          error: `A draft is available when each of the four topics is at least ${INTERVIEW_DRAFT_MIN_THEME_PERCENT}%. Keep answering in the chat.`
        },
        { status: 400 }
      );
    }
    const transcript = formatInterviewTranscript(chat.messages);
    isPreviewInterviewDraft =
      !interviewThemesMeetStrongDraftThreshold(progressParsed);
    draftUser = isPreviewInterviewDraft
      ? buildDraftUserPromptFromInterviewPreview(transcript)
      : buildDraftUserPromptFromInterview(transcript);
    versionScope = { responseId: null, chatId };
  }

  const essaySource: 'questionnaire' | 'interview' = hasChat
    ? 'interview'
    : 'questionnaire';
  const systemStyle = systemStyleForSource(essaySource);

  const grinderOpts =
    essaySource === 'interview' && isPreviewInterviewDraft
      ? { previewInterview: true as const }
      : undefined;

  let draft: string;
  try {
    if (provider === 'openai') {
      draft = await openAiChat({
        system: systemStyle,
        user: draftUser
      });
    } else {
      draft = await anthropicComplete({
        system: systemStyle,
        user: draftUser
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Draft generation failed';
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  let finalEssay: string;
  let grinderNotes: string;
  try {
    if (provider === 'openai') {
      const raw = await openAiChat({
        system: systemStyle,
        user: buildGrinderUserPrompt(draft, essaySource, grinderOpts),
        jsonObject: true
      });
      const parsed = parseGrinderJson(raw);
      finalEssay = parsed.final_essay;
      grinderNotes = parsed.grinder_notes;
    } else {
      const parsed = await anthropicJsonGrinder(
        draft,
        essaySource,
        grinderOpts
      );
      finalEssay = parsed.final_essay;
      grinderNotes = parsed.grinder_notes;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Grinder step failed';
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  let versionQuery = (supabase as Sb).from('essay_results').select('version');
  if (versionScope.responseId) {
    versionQuery = versionQuery.eq('response_id', versionScope.responseId);
  } else {
    versionQuery = versionQuery.eq('essay_chat_id', versionScope.chatId);
  }
  const { data: versionRow } = (await versionQuery
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()) as {
    data: Pick<Tables<'essay_results'>, 'version'> | null;
  };

  const nextVersion =
    typeof versionRow?.version === 'number' ? versionRow.version + 1 : 1;

  const draftQualityTierValue: 'preview' | 'standard' =
    essaySource === 'interview'
      ? isPreviewInterviewDraft
        ? 'preview'
        : 'standard'
      : 'standard';

  const insertPayload: TablesInsert<'essay_results'> = {
    user_id: user.id,
    response_id: versionScope.responseId,
    essay_chat_id: versionScope.chatId,
    content: finalEssay,
    version: nextVersion,
    grinder_notes: grinderNotes,
    draft_quality_tier: draftQualityTierValue
  };

  let inserted: Pick<
    Tables<'essay_results'>,
    'id' | 'version' | 'created_at'
  > | null = null;
  let insErr: { message: string } | null = null;

  const runInsert = async (payload: TablesInsert<'essay_results'>) =>
    (await (supabase as Sb)
      .from('essay_results')
      .insert(payload)
      .select('id, version, created_at')
      .single()) as {
      data: Pick<Tables<'essay_results'>, 'id' | 'version' | 'created_at'> | null;
      error: { message: string } | null;
    };

  let ins = await runInsert(insertPayload);
  inserted = ins.data;
  insErr = ins.error;

  if (
    insErr?.message &&
    /draft_quality_tier|schema cache/i.test(insErr.message)
  ) {
    const { draft_quality_tier: _omit, ...withoutTier } = insertPayload;
    ins = await runInsert(withoutTier);
    inserted = ins.data;
    insErr = ins.error;
  }

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }
  if (!inserted) {
    return NextResponse.json({ error: 'Insert returned no row' }, { status: 500 });
  }

  return NextResponse.json({
    id: inserted.id,
    response_id: versionScope.responseId,
    chat_id: versionScope.chatId,
    version: inserted.version,
    created_at: inserted.created_at,
    grinder_notes: grinderNotes,
    essay: finalEssay,
    draft_quality_tier: draftQualityTierValue
  });
}
