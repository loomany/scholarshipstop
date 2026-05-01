'use client';

const VISITOR_COOKIE = 'st_visitor_id';

function readCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const escaped = name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1');
  const m = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : '';
}

type NotifyQuizCompletionPayload = {
  flow: 'get_scholarships_quiz' | 'best_recommendation_wizard';
  landingPath: string;
  authState: 'guest' | 'authenticated';
  onceKey: string;
  country?: string;
  email?: string;
};

export async function notifyQuizCompletionClient(
  payload: NotifyQuizCompletionPayload
): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    if (sessionStorage.getItem(payload.onceKey) === '1') return;
  } catch {
    // ignore
  }

  const visitorId = readCookie(VISITOR_COOKIE) || null;
  try {
    await fetch('/api/analytics/quiz-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flow: payload.flow,
        landing_path: payload.landingPath,
        auth_state: payload.authState,
        country: payload.country,
        email: payload.email,
        visitor_id: visitorId
      }),
      keepalive: true
    });
    try {
      sessionStorage.setItem(payload.onceKey, '1');
    } catch {
      // ignore
    }
  } catch {
    // non-fatal telemetry
  }
}

