import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound, redirect } from 'next/navigation';

import { SCHOLARSHIPS_HUB_BEST_RECOMMENDATION_HREF } from '@/app/scholarships/scholarshipListUrl';
import { localizedScholarshipHubTabHref } from '@/lib/i18n/localizedHref';
import { localizedPath } from '@/lib/i18n/paths';
import {
  isStage2PilotLocale,
  type Stage2PilotLocale
} from '@/lib/i18n/pilotRoutes';
import { createClient } from '@/utils/supabase/server';

const TITLE: Record<Stage2PilotLocale, string> = {
  es: 'Registro',
  fr: 'Inscription'
};

export function generateMetadata({
  params
}: {
  params: { locale: string };
}): Metadata {
  if (!isStage2PilotLocale(params.locale)) {
    return { title: 'Page not found', robots: { index: false, follow: false } };
  }
  const locale = params.locale;
  return {
    title: TITLE[locale],
    robots: { index: false, follow: true },
    alternates: {
      canonical: localizedPath(locale, '/onboarding')
    }
  };
}

export default async function LocalizedOnboardingLayout({
  children,
  params
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  if (!isStage2PilotLocale(params.locale)) notFound();
  const locale = params.locale;

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect(
      localizedScholarshipHubTabHref(locale, 'best-recommendation') ??
        SCHOLARSHIPS_HUB_BEST_RECOMMENDATION_HREF
    );
  }

  return children;
}
