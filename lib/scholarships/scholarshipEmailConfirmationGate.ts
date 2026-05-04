import type { User } from '@supabase/supabase-js';

/**
 * Same rules as resend flows (`ScholarshipEmailConfirmRequiredModal`, account):
 * user must confirm email (app or Supabase path) before scholarship detail previews count.
 */
export function scholarshipNeedsEmailConfirmation(
  user: Pick<User, 'email' | 'email_confirmed_at'> | null,
  profileEmailVerified: boolean | null | undefined
): boolean {
  if (!user?.email) return false;
  if (profileEmailVerified === false) return true;
  if (user.email_confirmed_at == null || user.email_confirmed_at === '') return true;
  return false;
}
