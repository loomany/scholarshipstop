import { NextResponse } from 'next/server';

import {
  isLikelyAutomatedUserAgent,
  normalizeClientUserAgent
} from '@/lib/analytics/clientBot';
import { deriveAttribution } from '@/lib/analytics/deriveAttribution';
import { normalizeFirstTouchLandingUrl } from '@/lib/analytics/firstTouchLandingNormalization';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VIEW_DEDUP_MS = 30_000;
const LEAVE_DEDUP_MS = 5_000;

type Body = {
  visitor_id?: unknown;
  landing_url?: unknown;
  full_url?: unknown;
  referrer?: unknown;
  utm_source?: unknown;
  utm_medium?: unknown;
  utm_campaign?: unknown;
  utm_content?: unknown;
  user_agent?: unknown;
  event_source?: unknown;
  kind?: unknown;
};

function normalizeKind(raw: unknown): 'view' | 'leave' {
  return raw === 'leave' ? 'leave' : 'view';
}

function normalizeEventSource(raw: unknown, kind: 'view' | 'leave') {
  if (kind === 'leave') return 'leave' as const;
  if (raw === 'heartbeat') return 'heartbeat' as const;
  if (raw === 'visibility') return 'visibility' as const;
  return 'navigation' as const;
}

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

  const kind = normalizeKind(body.kind);
  const eventSource = normalizeEventSource(body.event_source, kind);

  const landing_url_raw =
    typeof body.landing_url === 'string' ? body.landing_url.trim() : '';
  if (!landing_url_raw || landing_url_raw.length > 4000) {
    return NextResponse.json({ error: 'Invalid landing_url' }, { status: 400 });
  }
  const full_url_raw =
    typeof body.full_url === 'string' ? body.full_url.trim() : '';
  const full_url = (full_url_raw || landing_url_raw).slice(0, 4000);

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
  if (isLikelyAutomatedUserAgent(user_agent_snapshot)) {
    return NextResponse.json({ success: true, status: 'skipped', reason: 'likely_bot' });
  }

  const {
    normalizedUrl: landing_url,
    clickId: click_id,
    clickIdParam
  } = normalizeFirstTouchLandingUrl(landing_url_raw);

  const attribution = deriveAttribution({
    landingUrl: landing_url_raw,
    normalizedLandingUrl: landing_url,
    referrer,
    utm_source,
    utm_medium,
    utm_campaign,
    clickId: click_id,
    clickIdParam
  });

  const supabase = createServiceRoleSupabaseClient();
  if (!supabase) {
    return NextResponse.json({
      success: true,
      status: 'skipped',
      reason: 'service_role_unconfigured'
    });
  }

  const db = supabase as any;

  const { error: attributionError } = await db.rpc(
    'upsert_visitor_attribution',
    {
      p_visitor_id: visitorId,
      p_user_id: null,
      p_source: attribution.source,
      p_medium: attribution.medium,
      p_campaign: attribution.campaign,
      p_referrer: attribution.referrer,
      p_landing_path: attribution.landingPath,
      p_gclid: attribution.gclid,
      p_fbclid: attribution.fbclid,
      p_ttclid: attribution.ttclid
    }
  );
  if (attributionError) {
    console.error('[analytics/visitor-ping] visitor_attribution upsert error', attributionError);
  }

  const landingPath = attribution.landingPath.slice(0, 2048);

  if (kind === 'leave') {
    const { data: lastLeave } = await db
      .from('visitor_page_views')
      .select('seen_at, kind, event_source')
      .eq('visitor_id', visitorId)
      .eq('kind', 'leave')
      .eq('event_source', 'leave')
      .order('seen_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastLeave?.seen_at) {
      const delta = Date.now() - new Date(lastLeave.seen_at).getTime();
      if (delta >= 0 && delta < LEAVE_DEDUP_MS) {
        return NextResponse.json({ success: true, status: 'deduped_leave' });
      }
    }

    const { error: insErr } = await db.from('visitor_page_views').insert({
      visitor_id: visitorId,
      path: landingPath || '/',
      full_url,
      event_source: 'leave',
      kind: 'leave'
    });
    if (insErr) {
      console.error('[analytics/visitor-ping] leave insert error', insErr);
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 });
    }
    return NextResponse.json({ success: true, status: 'leave' });
  }

  const { data: lastRow } = await db
    .from('visitor_page_views')
    .select('path, kind, event_source, seen_at')
    .eq('visitor_id', visitorId)
    .eq('event_source', eventSource)
    .order('seen_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastRow?.kind === 'view' && lastRow.path === landingPath && lastRow.seen_at) {
    const delta = Date.now() - new Date(lastRow.seen_at).getTime();
    if (delta >= 0 && delta < VIEW_DEDUP_MS) {
      return NextResponse.json({ success: true, status: 'deduped_view' });
    }
  }

  const { error: viewErr } = await db.from('visitor_page_views').insert({
    visitor_id: visitorId,
    path: landingPath || '/',
    full_url,
    event_source: eventSource,
    kind: 'view'
  });
  if (viewErr) {
    console.error('[analytics/visitor-ping] view insert error', viewErr);
    return NextResponse.json({ error: 'Insert failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true, status: 'view' });
}
