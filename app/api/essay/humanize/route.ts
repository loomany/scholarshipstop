import { NextResponse } from 'next/server';

import { humanizeEssayText } from '@/lib/essay/humanizeOpenAi';
import type { GptZeroSentenceScore } from '@/lib/essay/parseGptZeroRichResponse';
import { runGptZeroPredict } from '@/lib/essay/runGptZeroPredict';
import type { Tables, TablesInsert } from '@/types_db';
import { createClient } from '@/utils/supabase/server';

export const maxDuration = 240;
export const dynamic = 'force-dynamic';
export const preferredRegion = ['iad1', 'fra1', 'cdg1'];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any;

export async function POST(request: Request) {
  let body: { essay_id?: string };
  try {
    body = (await request.json()) as { essay_id?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const essayId = body.essay_id?.trim();
  if (!essayId || !UUID_RE.test(essayId)) {
    return NextResponse.json({ error: 'Invalid essay_id' }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured' },
      { status: 503 }
    );
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

  if (error || !row?.content?.trim()) {
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

  let humanized: string;
  try {
    humanized = await humanizeEssayText(row.content);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Humanize failed';
    return NextResponse.json({ error: msg }, { status: 502 });
  }

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
    '[Magic Humanize] Text revised for a more natural rhythm and human voice (same facts).';
  const grinder_notes = row.grinder_notes?.trim()
    ? `${row.grinder_notes.trim()}\n\n${grinderNoteLine}`
    : grinderNoteLine;

  const insertPayload: TablesInsert<'essay_results'> = {
    user_id: user.id,
    response_id: row.response_id,
    essay_chat_id: row.essay_chat_id,
    content: humanized,
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

  if (process.env.GPTZERO_API_KEY?.trim()) {
    try {
      const gpt = await runGptZeroPredict(humanized);
      humanScore = gpt.humanScore;
      sentences = gpt.sentences;
    } catch (e) {
      gptZeroError = e instanceof Error ? e.message : 'GPTZero failed';
      console.error('[essay:humanize] GPTZero after save', gptZeroError);
    }
  } else {
    gptZeroError =
      'GPTZERO_API_KEY not set — trigger an AI check manually in the UI.';
  }

  return NextResponse.json({
    id: inserted.id,
    version: inserted.version,
    content: humanized,
    created_at: inserted.created_at,
    grinder_notes,
    humanScore,
    sentences,
    gptZeroError
  });
}
