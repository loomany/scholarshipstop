import { NotFoundPageContent } from '@/components/i18n/NotFoundPageContent';
import { getNotFoundLocaleFromHeaders } from '@/lib/i18n/getNotFoundLocaleFromHeaders';

/** ES/FR segment 404 — locale from middleware header (not `params`, unreliable on not-found). */
export default function LocaleNotFound() {
  const locale = getNotFoundLocaleFromHeaders();
  return <NotFoundPageContent locale={locale} />;
}
