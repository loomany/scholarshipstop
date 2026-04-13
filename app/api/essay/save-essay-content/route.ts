import { NextResponse } from 'next/server';

import type { Tables } from '@/types_db';
import { createClient } from '@/utils/supabase/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_CHARS = 600_000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any;

/**
 * Обновление `content` у существующей строки `essay_results` без новой версии.
 * Разрешено только для **первой** версии в цепочке (исходник), чтобы не ломать историю «Исправлений».
 */
export async function POST(request: Request) {
  let body: { essay_id?: string; content?: string };
  try {
    body = (await request.json()) as { essay_id?: string; content?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const essayId = body.essay_id?.trim();
  const content = typeof body.content === 'string' ? body.content : '';

  if (!essayId || !UUID_RE.test(essayId)) {
    return NextResponse.json({ error: 'Invalid essay_id' }, { status: 400 });
  }
  if (!content.trim()) {
    return NextResponse.json({ error: 'content is empty' }, { status: 400 });
  }
  if (content.length > MAX_CHARS) {
    return NextResponse.json({ error: 'content is too long' }, { status: 400 });
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
    .select('id, response_id, essay_chat_id, version')
    .eq('id', essayId)
    .eq('user_id', user.id)
    .maybeSingle()) as {
    data: Pick<
      Tables<'essay_results'>,
      'id' | 'response_id' | 'essay_chat_id' | 'version'
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

  let firstQuery = (supabase as Sb)
    .from('essay_results')
    .select('id, version')
    .eq('user_id', user.id)
    .order('version', { ascending: true })
    .limit(1);
  if (row.response_id) {
    firstQuery = firstQuery.eq('response_id', row.response_id);
  } else {
    firstQuery = firstQuery.eq('essay_chat_id', row.essay_chat_id!);
  }

  const { data: firstRow, error: firstErr } = (await firstQuery.maybeSingle()) as {
    data: Pick<Tables<'essay_results'>, 'id' | 'version'> | null;
    error: { message: string } | null;
  };

  if (firstErr || !firstRow?.id) {
    return NextResponse.json(
      { error: firstErr?.message ?? 'Could not resolve version chain' },
      { status: 500 }
    );
  }

  if (firstRow.id !== essayId) {
    return NextResponse.json(
      {
        error:
          'In-place save is only allowed for the first version (source). Use corrections tab or merge for newer versions.'
      },
      { status: 400 }
    );
  }

  const { error: upErr } = await (supabase as Sb)
    .from('essay_results')
    .update({ content })
    .eq('id', essayId)
    .eq('user_id', user.id);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: essayId });
}
