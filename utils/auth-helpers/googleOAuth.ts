const GOOGLE_OAUTH_UNAVAILABLE_MESSAGE =
  'Google sign-in is not enabled right now. Please use email sign-in.';

type GoogleOAuthClient = {
  auth: {
    signInWithOAuth: (args: {
      provider: 'google';
      options: { redirectTo: string };
    }) => Promise<{ error: { message: string } | null }>;
  };
};

type AuthSettingsResponse = {
  external?: {
    google?: boolean;
  };
};

async function isGoogleProviderEnabled(): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
  if (!supabaseUrl) return true;

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      cache: 'no-store'
    });
    if (!res.ok) return true;

    const settings = (await res.json()) as AuthSettingsResponse;
    return settings.external?.google !== false;
  } catch {
    return true;
  }
}

export async function signInWithGoogleOAuth(
  supabase: GoogleOAuthClient,
  redirectTo: string
) {
  const googleEnabled = await isGoogleProviderEnabled();
  if (!googleEnabled) {
    return { error: new Error(GOOGLE_OAUTH_UNAVAILABLE_MESSAGE) };
  }

  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo
    }
  });
}
