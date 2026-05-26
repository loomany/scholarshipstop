import { NotFoundPageContent } from '@/components/i18n/NotFoundPageContent';
import { getNotFoundLocaleFromHeaders } from '@/lib/i18n/getNotFoundLocaleFromHeaders';

/** Root/global 404 — same header-based locale as `app/[locale]/not-found`. */
export default function NotFound() {
  const locale = getNotFoundLocaleFromHeaders();
  return <NotFoundPageContent locale={locale} />;
}
