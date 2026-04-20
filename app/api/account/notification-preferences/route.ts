import { NextResponse } from 'next/server';

import type { Database } from '@/types_db';
import { createClient } from '@/utils/supabase/server';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type NotifyCols = Pick<
  ProfileRow,
  | 'email_notify_best_matches'
  | 'email_notify_saved_filters'
  | 'email_notify_easy_apply'
  | 'email_notify_hot_deadlines'
>;

const NOTIFY_KEYS: (keyof NotifyCols)[] = [
  'email_notify_best_matches',
  'email_notify_saved_filters',
  'email_notify_easy_apply',
  'email_notify_hot_deadlines'
];

type PatchBody = Partial<Record<keyof NotifyCols, boolean>>;

export async function GET() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .schema('public')
    .from('profiles')
    .select(
      'email_notify_best_matches, email_notify_saved_filters, email_notify_easy_apply, email_notify_hot_deadlines'
    )
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = profile as NotifyCols | null;

  return NextResponse.json({
    email_notify_best_matches: row?.email_notify_best_matches ?? true,
    email_notify_saved_filters: row?.email_notify_saved_filters ?? true,
    email_notify_easy_apply: row?.email_notify_easy_apply ?? true,
    email_notify_hot_deadlines: row?.email_notify_hot_deadlines ?? true
  });
}

export async function PATCH(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const patch: Partial<NotifyCols> = {};
  for (const key of NOTIFY_KEYS) {
    const v = body[key];
    if (typeof v === 'boolean') {
      patch[key] = v;
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  }

  const { data, error } = await supabase
    .schema('public')
    .from('profiles')
    .update(patch)
    .eq('id', user.id)
    .select(
      'email_notify_best_matches, email_notify_saved_filters, email_notify_easy_apply, email_notify_hot_deadlines'
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = data as NotifyCols | null;

  return NextResponse.json({
    email_notify_best_matches: row?.email_notify_best_matches ?? true,
    email_notify_saved_filters: row?.email_notify_saved_filters ?? true,
    email_notify_easy_apply: row?.email_notify_easy_apply ?? true,
    email_notify_hot_deadlines: row?.email_notify_hot_deadlines ?? true
  });
}
