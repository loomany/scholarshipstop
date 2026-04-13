import { NextResponse } from 'next/server';

import type { TablesInsert } from '@/types_db';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Dev-only stub essay (courier in Karaganda narrative). */
const DEV_BYPASS_ESSAY = `The winter wind in Karaganda does not ask for your resume. It finds the gaps in your jacket and reminds you why punctuality is not an abstract virtue but a contract with strangers who are waiting for a hot meal or a document that cannot be late.

I started as a courier because the math was simple: kilometers, orders, ratings. The work was not. I learned to read apartment blocks where the elevator stops between floors, to negotiate with security guards who see a hundred riders a day, and to keep calm when a route collapses because a street is closed or a customer typed the wrong building number. On my best days, I delivered on time despite snow and bad maps; on my worst days, I still finished the shift with every package accounted for.

What changed in me was not "passion for logistics," but respect for invisible labor. A city runs on people who show up. I began tracking small improvements: fewer failed deliveries, clearer handoffs, faster recovery after mistakes. Those habits spilled into my studies. I stopped treating deadlines as suggestions and started treating them like delivery windows—someone on the other side is counting on you.

Studying abroad is my next route. I am not chasing a brand; I am chasing tools. I want coursework and mentorship that turn scattered effort into systems: better planning, clearer communication, and work that scales beyond one rider on one bike in one city. Karaganda taught me endurance in the cold; I want to bring that discipline into rooms where problems are harder than traffic—but no less real.

This essay is a [DEV] placeholder generated for local debugging.`;

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: { user_id?: string };
  try {
    body = (await request.json()) as { user_id?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const userIdRaw = typeof body.user_id === 'string' ? body.user_id.trim() : '';
  if (!userIdRaw || !UUID_RE.test(userIdRaw)) {
    return NextResponse.json({ error: 'Invalid user_id' }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.id !== userIdRaw) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: qr, error: qrErr } = (await (supabase as Sb)
    .from('questionnaire_responses')
    .insert({
      user_id: user.id,
      stage1_data: {},
      stage2_data: {},
      stage3_data: {},
      stage4_data: {}
    })
    .select('id')
    .single()) as {
    data: { id: string } | null;
    error: { message: string } | null;
  };

  if (qrErr || !qr?.id) {
    return NextResponse.json(
      { error: qrErr?.message ?? 'Failed to create questionnaire row' },
      { status: 500 }
    );
  }

  const insertPayload: TablesInsert<'essay_results'> = {
    user_id: user.id,
    response_id: qr.id,
    essay_chat_id: null,
    content: DEV_BYPASS_ESSAY,
    version: 1,
    grinder_notes: '[DEV] Stub essay for local bypass; not AI-generated.'
  };

  const { data: essay, error: essayErr } = (await (supabase as Sb)
    .from('essay_results')
    .insert(insertPayload)
    .select('id')
    .single()) as {
    data: { id: string } | null;
    error: { message: string } | null;
  };

  if (essayErr || !essay?.id) {
    return NextResponse.json(
      { error: essayErr?.message ?? 'Failed to insert essay' },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: essay.id });
}
