/**
 * Maps Supabase GoTrue errors to short, non-technical copy for UI (toasts, redirects).
 * Avoid exposing raw codes, HTTP status, or internal wording.
 */
export type SupabaseLikeAuthError = {
  message: string;
  code?: string;
  status?: number;
};

export function userFacingAuthError(
  err: SupabaseLikeAuthError
): { title: string; description?: string } {
  const code = err.code?.toLowerCase() ?? '';
  const msg = (err.message ?? '').trim();

  if (
    code === 'user_already_exists' ||
    /already\s+registered|already\s+exists|user\s+already/i.test(msg)
  ) {
    return {
      title: 'This email is already registered',
      description:
        'Sign in with your password, or use Forgot password if you need a new one.'
    };
  }

  if (code === 'weak_password') {
    return {
      title: 'Password does not meet requirements',
      description: msg || undefined
    };
  }

  if (
    code === 'email_address_invalid' ||
    code === 'invalid_email' ||
    code === 'validation_failed'
  ) {
    return {
      title: 'Invalid email',
      description: 'Check the address and try again.'
    };
  }

  if (code === 'signup_disabled') {
    return {
      title: 'Sign up is unavailable',
      description: 'Please try again later or contact support.'
    };
  }

  const cleaned = msg
    .replace(/\bCode:\s*[\w_]+\.?\s*/gi, '')
    .replace(/\bHTTP\s*\d+\.?\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    title: 'Could not create your account',
    description: cleaned || 'Please try again in a moment.'
  };
}
