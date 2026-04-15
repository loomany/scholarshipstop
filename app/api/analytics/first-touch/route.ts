import { NextResponse } from 'next/server';

import {
  isLikelyAutomatedUserAgent,
  normalizeClientUserAgent
} from '@/lib/analytics/clientBot';
import { resolveTrafficChannel } from '@/lib/analytics/resolveTrafficChannel';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';
import { notifyTelegramAdminsVisitorFirstTouch } from '@/lib/telegram/bot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Body = {
  visitor_id?: unknown;
  landing_url?: unknown;
  referrer?: unknown;
  utm_source?: unknown;
  utm_medium?: unknown;
  utm_campaign?: unknown;
  utm_content?: unknown;
  user_agent?: unknown;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const visitorId =
    typeof body.visitor_id === 'string' ? body.visitor_id.trim() : '';
  if (!visitorId || !UUID_V4_RE.test(visitorId)) {
    return NextResponse.json({ error: 'Invalid visitor_id' }, { status: 400 });
  }

  const landing_url =
    typeof body.landing_url === 'string' ? body.landing_url.trim() : '';
  if (!landing_url || landing_url.length > 4000) {
    return NextResponse.json({ error: 'Invalid landing_url' }, { status: 400 });
  }

  const referrer =
    typeof body.referrer === 'string' ? body.referrer.trim().slice(0, 4000) : '';
  const utm_source =
    typeof body.utm_source === 'string' ? body.utm_source.trim().slice(0, 500) : '';
  const utm_medium =
    typeof body.utm_medium === 'string' ? body.utm_medium.trim().slice(0, 500) : '';
  const utm_campaign =
    typeof body.utm_campaign === 'string'
      ? body.utm_campaign.trim().slice(0, 500)
      : '';
  const utm_content =
    typeof body.utm_content === 'string' ? body.utm_content.trim().slice(0, 500) : '';

  const uaFromBody =
    typeof body.user_agent === 'string' ? body.user_agent.trim() : '';
  const uaHeader = request.headers.get('user-agent')?.trim() ?? '';
  const user_agent_snapshot = normalizeClientUserAgent(uaFromBody || uaHeader);
  const is_likely_bot = isLikelyAutomatedUserAgent(user_agent_snapshot);

  const traffic_channel = resolveTrafficChannel({
    landingUrl: landing_url,
    referrer,
    utm_source,
    utm_medium,
    utm_campaign
  });

  const supabase = createServiceRoleSupabaseClient();
  if (!supabase) {
    /**
     * Local / misconfigured deploy: no service role key. Not a client fault — avoid 500
     * noise in DevTools; first-touch rows are optional attribution.
     */
    return NextResponse.json({
      success: true,
      status: 'skipped',
      reason: 'service_role_unconfigured'
    });
  }

  const { data, error } = await supabase
    .from('anonymous_visitor_first_touch')
    .insert({
      visitor_id: visitorId,
      landing_url,
      referrer: referrer || null,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      utm_content: utm_content || null,
      traffic_channel,
      is_likely_bot,
      user_agent_snapshot: user_agent_snapshot || null
    })
    .select('id')
    .maybeSingle();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ success: true, status: 'duplicate' });
    }
    console.error('[analytics/first-touch] insert error', error);
    return NextResponse.json({ error: 'Insert failed' }, { status: 500 });
  }

  if (!data?.id) {
    return NextResponse.json({ success: true, status: 'duplicate' });
  }

  if (!is_likely_bot) {
    void notifyTelegramAdminsVisitorFirstTouch({
      trafficChannel: traffic_channel,
      landingUrl: landing_url,
      referrer: referrer || null,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null
    }).catch((e) => {
      console.error('[analytics/first-touch] telegram async error', e);
    });
  }

  return NextResponse.json({
    success: true,
    status: 'new',
    ...(is_likely_bot ? { visitor_kind: 'likely_bot' as const } : { visitor_kind: 'human' as const })
  });
}
