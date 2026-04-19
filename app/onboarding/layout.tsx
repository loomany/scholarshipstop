import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SCHOLARSHIPS_HUB_BEST_RECOMMENDATION_HREF } from '@/app/scholarships/scholarshipListUrl';
import { createClient } from '@/utils/supabase/server';

export const metadata: Metadata = {
  title: 'Onboarding',
  robots: {
    index: false,
    follow: true
  }
};

export default async function OnboardingLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect(SCHOLARSHIPS_HUB_BEST_RECOMMENDATION_HREF);
  }

  return children;
}
