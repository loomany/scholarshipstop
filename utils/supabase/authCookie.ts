type CookieNameValue = {
  name: string;
  value?: string;
};

const SUPABASE_AUTH_COOKIE = /^sb-.+-auth-token(?:\.\d+)?$/;

export function isSupabaseAuthCookieName(name: string): boolean {
  return (
    SUPABASE_AUTH_COOKIE.test(name) ||
    name === 'sb-access-token' ||
    name === 'sb-refresh-token'
  );
}

/** Avoid a remote auth lookup when the request cannot contain a Supabase session. */
export function hasSupabaseAuthCookie(
  cookies: readonly CookieNameValue[]
): boolean {
  return cookies.some(
    (cookie) =>
      isSupabaseAuthCookieName(cookie.name) && Boolean(cookie.value?.trim())
  );
}
