/**
 * OAuth-style errors embedded in the URL hash after Supabase redirects
 * (e.g. expired recovery link). The hash is not sent to the server and is
 * invisible to Next.js `searchParams`.
 */
export function parseOAuthStyleHash(hash: string): Record<string, string> {
  const raw = hash.replace(/^#/, '').trim();
  if (!raw) return {};
  const params = new URLSearchParams(raw);
  const out: Record<string, string> = {};
  params.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

function decodeParam(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '));
  } catch {
    return s;
  }
}

/**
 * User-facing copy for #error= / #error_code= from recovery / magic-link redirects.
 */
export function userFacingRecoveryHashError(params: Record<string, string>): {
  title: string;
  description: string;
} {
  const code = (params.error_code ?? '').toLowerCase();
  const err = (params.error ?? '').toLowerCase();
  const descRaw = params.error_description
    ? decodeParam(params.error_description)
    : '';

  if (code === 'otp_expired' || /expired|invalid/i.test(descRaw)) {
    return {
      title: 'This reset link has expired',
      description:
        'Request a new password reset email. Links from older emails no longer work.'
    };
  }

  if (err === 'access_denied') {
    return {
      title: 'This link could not be used',
      description:
        descRaw ||
        'It may have expired or already been used. Request a new reset email.'
    };
  }

  return {
    title: 'Password reset link issue',
    description:
      descRaw || 'Try requesting a new reset email from the sign-in page.'
  };
}

export function hasOAuthStyleHashError(params: Record<string, string>): boolean {
  return Boolean(params.error || params.error_code);
}

/**
 * Implicit grant fragment (`#access_token=…&refresh_token=…`) after Supabase redirects.
 * The browser client uses `flowType: 'pkce'` by default, so auto URL detection often skips
 * these tokens — callers must call `auth.setSession` explicitly.
 */
export function getImplicitGrantTokensFromHash(hash: string): {
  access_token: string | null;
  refresh_token: string | null;
} {
  const p = parseOAuthStyleHash(hash);
  const at = p.access_token?.trim();
  const rt = p.refresh_token?.trim();
  if (!at) {
    return { access_token: null, refresh_token: null };
  }
  return {
    access_token: at,
    refresh_token: rt && rt.length > 0 ? rt : null
  };
}
