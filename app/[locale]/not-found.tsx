import { NotFoundPageContent } from '@/components/i18n/NotFoundPageContent';
import {
  isStage2PilotLocale,
  type Stage2PilotLocale
} from '@/lib/i18n/pilotRoutes';

type Props = { params: { locale: string } };

/** ES/FR segment 404 — server-rendered copy from route param (not client pathname). */
export default function LocaleNotFound({ params }: Props) {
  const locale = isStage2PilotLocale(params.locale)
    ? (params.locale as Stage2PilotLocale)
    : 'en';
  return <NotFoundPageContent locale={locale} />;
}
