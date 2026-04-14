import { isbot } from 'isbot';

const UA_MAX = 800;

/** Truncate for DB / logs. */
export function normalizeClientUserAgent(raw: string | null | undefined): string {
  return (raw ?? '').trim().slice(0, UA_MAX);
}

/**
 * Heuristic bot/crawler detection from User-Agent (`isbot`).
 * Empty UA → not treated as bot (privacy / in-app browsers).
 */
export function isLikelyAutomatedUserAgent(ua: string): boolean {
  const s = ua.trim();
  if (!s) return false;
  return isbot(s);
}
