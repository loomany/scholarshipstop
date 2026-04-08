import type { User } from '@supabase/supabase-js';

/** Display name from `profiles.first_name` / `profiles.last_name`. */
export function profileDisplayNameFromRow(p: {
  first_name?: string | null;
  last_name?: string | null;
} | null): string | null {
  if (!p) return null;
  const joined = [p.first_name, p.last_name]
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)
    .join(' ')
    .trim();
  return joined || null;
}

/** First name only for compact mobile header. */
export function profileFirstNameFromRow(p: {
  first_name?: string | null;
} | null): string | null {
  if (!p?.first_name || typeof p.first_name !== 'string') return null;
  const t = p.first_name.trim();
  return t || null;
}

/**
 * Mobile navbar: first name → first token of full display name → email → fallback.
 */
export function accountNavbarLabelMobile(
  firstNameFromProfile: string | null | undefined,
  profileDisplayName: string | null | undefined,
  user: Pick<User, 'email'> | null
): string {
  if (!user) return 'Account';
  const fn = firstNameFromProfile?.trim();
  if (fn) return fn;
  const full = profileDisplayName?.trim();
  if (full) {
    const firstToken = full.split(/\s+/)[0];
    if (firstToken) return firstToken;
  }
  const em = user.email?.trim();
  if (em) return em;
  return 'Account';
}

/**
 * Navbar / account entry label: profiles display name → email → fallback.
 */
export function accountNavbarLabel(
  profileDisplayName: string | null | undefined,
  user: Pick<User, 'email'> | null
): string {
  if (!user) return 'Account';
  const fromProfile = profileDisplayName?.trim();
  if (fromProfile) return fromProfile;
  const em = user.email?.trim();
  if (em) return em;
  return 'Account';
}
