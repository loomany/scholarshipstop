import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { GetScholarshipsQuizWizard } from '@/components/get-scholarships/GetScholarshipsQuizWizard';
import { isStage2PilotLocale } from '@/lib/i18n/pilotRoutes';

type Props = {
  params: { locale: string };
};

const META_BY_LOCALE: Record<'es' | 'fr', Metadata> = {
  es: {
    title: 'Encuentra becas que encajen contigo',
    description:
      'Responde unas preguntas rápidas y descubre becas a las que puedes aplicar hoy.',
    robots: { index: false, follow: true },
    alternates: {
      canonical: '/es/get-scholarships'
    }
  },
  fr: {
    title: 'Trouver des bourses adaptées',
    description:
      'Répondez à quelques questions rapides et découvrez des bourses auxquelles vous pouvez postuler aujourd’hui.',
    robots: { index: false, follow: true },
    alternates: {
      canonical: '/fr/get-scholarships'
    }
  }
};

export function generateMetadata({ params }: Props): Metadata {
  if (!isStage2PilotLocale(params.locale)) {
    return {
      title: 'Page not found',
      robots: { index: false, follow: false }
    };
  }
  return META_BY_LOCALE[params.locale];
}

export default function LocalizedGetScholarshipsPage({ params }: Props) {
  if (!isStage2PilotLocale(params.locale)) notFound();
  return <GetScholarshipsQuizWizard locale={params.locale} />;
}
