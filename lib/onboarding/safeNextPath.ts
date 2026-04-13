/**
 * Parses `next` query values for post-auth redirects. Only same-site paths are allowed
 * (prevents open redirects like `next=https://evil.com`).
 */
const DUMMY_ORIGIN = 'https://__path_only.invalid';

export function parseSafeNextPath(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== 'string') return null;
  const t = raw.trim();
  if (!t || t.length > 512) return null;

  let u: URL;
  try {
    u = new URL(t, DUMMY_ORIGIN);
  } catch {
    return null;
  }

  if (u.origin !== DUMMY_ORIGIN) {
    return null;
  }

  const path = u.pathname || '/';
  if (!path.startsWith('/')) return null;

  return `${path}${u.search}${u.hash}`;
}
