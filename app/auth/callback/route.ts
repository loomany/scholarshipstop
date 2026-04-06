import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getErrorRedirect, getStatusRedirect } from '@/utils/helpers';
import { syncOnboardingFromMetadataIfPresent } from '@/lib/onboarding/profilesOnboardingSync';

function safeAppPath(next: string | null): string | null {
  if (!next) return null;
  let path: string;
  try {
    path = decodeURIComponent(next);
  } catch {
    return null;
  }
  if (!path.startsWith('/') || path.startsWith('//')) return null;
  if (path.includes('://')) return null;
  return path;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextPath = safeAppPath(requestUrl.searchParams.get('next'));

  if (code) {
    const supabase = createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        getErrorRedirect(
          `${requestUrl.origin}/signin`,
          error.name,
          "Sorry, we weren't able to log you in. Please try again."
        )
      );
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user?.user_metadata && typeof user.user_metadata === 'object') {
      await syncOnboardingFromMetadataIfPresent(
        supabase,
        user.id,
        user.user_metadata as Record<string, unknown>
      );
    }

    if (nextPath) {
      return NextResponse.redirect(`${requestUrl.origin}${nextPath}`);
    }

    return NextResponse.redirect(
      getStatusRedirect(
        `${requestUrl.origin}/scholarships`,
        'Success!',
        'You are now signed in.'
      )
    );
  }

  return NextResponse.redirect(
    getStatusRedirect(
      `${requestUrl.origin}/scholarships`,
      'Success!',
      'You are now signed in.'
    )
  );
}
