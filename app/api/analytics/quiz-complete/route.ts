import { NextResponse } from 'next/server';

import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';
import { formatTrafficChannelLabel, type TrafficChannel } from '@/lib/analytics/resolveTrafficChannel';
import {
  buildUsersOpenCallbackData,
  notifyEnvTelegramAdminsPlainText
} from '@/lib/telegram/bot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Body = {
  flow?: unknown;
  landing_path?: unknown;
  visitor_id?: unknown;
  auth_state?: unknown;
};

function normalizeFlow(raw: unknown): string {
  const v = typeof raw === 'string' ? raw.trim().slice(0, 80) : '';
  return v || 'unknown';
}

function normalizePath(raw: unknown): string {
  const v = typeof raw === 'string' ? raw.trim().slice(0, 400) : '';
  return v || '/';
}

function normalizeAuthState(raw: unknown): string {
  const v = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (v === 'authenticated') return 'authenticated';
  if (v === 'guest') return 'guest';
  return 'unknown';
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const flow = normalizeFlow(body.flow);
  const landingPath = normalizePath(body.landing_path);
  const authState = normalizeAuthState(body.auth_state);
  const visitorId =
    typeof body.visitor_id === 'string' && UUID_V4_RE.test(body.visitor_id.trim())
      ? body.visitor_id.trim()
      : null;

  let sourceLabel = 'Unknown';
  let firstReferrer = '-';
  if (visitorId) {
    const supabase = createServiceRoleSupabaseClient();
    if (supabase) {
      const { data: row } = await supabase
        .from('anonymous_visitor_first_touch')
        .select('traffic_channel, referrer')
        .eq('visitor_id', visitorId)
        .maybeSingle();
      if (row?.traffic_channel) {
        sourceLabel = formatTrafficChannelLabel(row.traffic_channel as TrafficChannel);
      }
      if (row?.referrer?.trim()) {
        firstReferrer = row.referrer.trim().slice(0, 300);
      }
    }
  }

  const lines = [
    '✅ Quiz completed',
    `Flow: ${flow}`,
    `Auth: ${authState}`,
    `Source: ${sourceLabel}`,
    `Landing: ${landingPath}`,
    `Referrer: ${firstReferrer}`,
    `Visitor: ${visitorId ?? '-'}`,
    `Time: ${new Date().toISOString()}`
  ];

  const replyMarkup = visitorId
    ? {
        inline_keyboard: [[{ text: '👤 Открыть пользователя', callback_data: buildUsersOpenCallbackData(visitorId) }]]
      }
    : undefined;
  await notifyEnvTelegramAdminsPlainText(lines.join('\n'), 'traffic', replyMarkup);
  return NextResponse.json({ ok: true });
}

