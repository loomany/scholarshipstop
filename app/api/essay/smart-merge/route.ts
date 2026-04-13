import { NextResponse } from 'next/server';

import { FULL_DRAFT_HUMANIZE_GRINDER_LINE } from '@/lib/essay/essayMergeMarkers';
import type { GptZeroSentenceScore } from '@/lib/essay/parseGptZeroRichResponse';
import { runGptZeroPredict } from '@/lib/essay/runGptZeroPredict';
import type { Tables, TablesInsert } from '@/types_db';
import { createClient } from '@/utils/supabase/server';

export const maxDuration = 240;
export const dynamic = 'force-dynamic';
export const preferredRegion = ['iad1', 'fra1', 'cdg1'];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** ~80k words upper bound */
const MAX_MERGED_CHARS = 600_000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any;

export async function POST(request: Request) {
  let body: {
    essay_id?: string;
    mergedText?: string;
    skipGptZero?: boolean;
    merge_kind?: 'full_humanize' | 'sentence_edits';
  };
  try {
    body = (await request.json()) as {
      essay_id?: string;
      mergedText?: string;
      skipGptZero?: boolean;
      merge_kind?: 'full_humanize' | 'sentence_edits';
    };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const essayId = body.essay_id?.trim();
  const mergedText = typeof body.mergedText === 'string' ? body.mergedText : '';
  /** Не вызывать GPTZero на сервере (например после Humanize entire — проверку запускает пользователь). */
  const skipGptZero = Boolean(body.skipGptZero);
  const mergeKind =
    body.merge_kind === 'full_humanize' ? 'full_humanize' : 'sentence_edits';

  if (!essayId || !UUID_RE.test(essayId)) {
    return NextResponse.json({ error: 'Invalid essay_id' }, { status: 400 });
  }
  if (!mergedText.trim()) {
    return NextResponse.json({ error: 'mergedText is empty' }, { status: 400 });
  }
  if (mergedText.length > MAX_MERGED_CHARS) {
    return NextResponse.json({ error: 'mergedText is too long' }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: row, error } = (await (supabase as Sb)
    .from('essay_results')
    .select('id, content, response_id, essay_chat_id, grinder_notes')
    .eq('id', essayId)
    .eq('user_id', user.id)
    .maybeSingle()) as {
    data: Pick<
      Tables<'essay_results'>,
      'id' | 'content' | 'response_id' | 'essay_chat_id' | 'grinder_notes'
    > | null;
    error: { message: string } | null;
  };

  if (error || !row) {
    return NextResponse.json(
      { error: error?.message ?? 'Essay not found' },
      { status: 404 }
    );
  }

  if (!row.response_id && !row.essay_chat_id) {
    return NextResponse.json(
      { error: 'Essay is missing response_id and essay_chat_id' },
      { status: 400 }
    );
  }

  /** Сохраняем ровно то, что прислал клиент после ручных правок — без доработки через OpenAI. */
  const contentToSave = mergedText;

  let versionQuery = (supabase as Sb)
    .from('essay_results')
    .select('version')
    .eq('user_id', user.id);
  if (row.response_id) {
    versionQuery = versionQuery.eq('response_id', row.response_id);
  } else {
    versionQuery = versionQuery.eq('essay_chat_id', row.essay_chat_id);
  }

  const { data: versionRow } = (await versionQuery
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()) as {
    data: Pick<Tables<'essay_results'>, 'version'> | null;
  };

  const nextVersion =
    typeof versionRow?.version === 'number' ? versionRow.version + 1 : 1;

  const grinderNoteLine =
    mergeKind === 'full_humanize'
      ? FULL_DRAFT_HUMANIZE_GRINDER_LINE
      : '[Manual Smart Merge] Text saved as-is after manual sentence edits (no AI rebuild).';
  const grinder_notes = row.grinder_notes?.trim()
    ? `${row.grinder_notes.trim()}\n\n${grinderNoteLine}`
    : grinderNoteLine;

  const insertPayload: TablesInsert<'essay_results'> = {
    user_id: user.id,
    response_id: row.response_id,
    essay_chat_id: row.essay_chat_id,
    content: contentToSave,
    version: nextVersion,
    grinder_notes
  };

  const { data: inserted, error: insErr } = (await (supabase as Sb)
    .from('essay_results')
    .insert(insertPayload)
    .select('id, version, created_at')
    .single()) as {
    data: Pick<Tables<'essay_results'>, 'id' | 'version' | 'created_at'> | null;
    error: { message: string } | null;
  };

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }
  if (!inserted) {
    return NextResponse.json({ error: 'Insert returned no row' }, { status: 500 });
  }

  let humanScore: number | null = null;
  let sentences: GptZeroSentenceScore[] = [];
  let gptZeroError: string | null = null;

  if (!skipGptZero) {
    if (process.env.GPTZERO_API_KEY?.trim()) {
      try {
        const gpt = await runGptZeroPredict(contentToSave);
        humanScore = gpt.humanScore;
        sentences = gpt.sentences;
      } catch (e) {
        gptZeroError = e instanceof Error ? e.message : 'GPTZero failed';
        console.error('[essay:smart-merge] GPTZero after save', gptZeroError);
      }
    } else {
      gptZeroError =
        'GPTZERO_API_KEY not set — trigger an AI check manually in the UI.';
    }
  }

  return NextResponse.json({
    id: inserted.id,
    version: inserted.version,
    content: contentToSave,
    created_at: inserted.created_at,
    grinder_notes,
    humanScore,
    sentences,
    gptZeroError
  });
}
