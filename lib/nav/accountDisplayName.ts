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
 * Navbar account link (desktop + mobile): keep the header stable and compact.
 * Names/emails belong inside the account page, not in the top nav.
 */
export function accountNavbarLabel(
  firstNameFromProfile: string | null | undefined,
  profileDisplayName: string | null | undefined,
  user: Pick<User, 'email'> | null
): string {
  return 'Account';
}

/** @deprecated Use `accountNavbarLabel` — same behavior. */
export function accountNavbarLabelMobile(
  firstNameFromProfile: string | null | undefined,
  profileDisplayName: string | null | undefined,
  user: Pick<User, 'email'> | null
): string {
  return accountNavbarLabel(firstNameFromProfile, profileDisplayName, user);
}
