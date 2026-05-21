import { type IqLocale } from '@/lib/iq/i18n/iqLocales';
import { IQ_SUBDOMAIN_HOST } from '@/lib/iq/i18n/iqLocales';
import {
  normalizeIqPathname,
  parseIqPublicPathname,
  stripIqLocalePrefix
} from '@/lib/iq/i18n/iqPaths';

const IQ_SUBDOMAIN_ORIGIN = `https://${IQ_SUBDOMAIN_HOST}`;

/**
 * Build a public href for the IQ product preserving the current subpath.
 *
 * @param productPath - `/` or `/assessment` on subdomain; `/iq` or `/iq/assessment` on www.
 */
export function getIqLocalizedHref(
  productPath: string,
  locale: IqLocale,
  options: { onIqSubdomain: boolean }
): string {
  const normalized = normalizeIqPathname(productPath);

  let publicPath = normalized;
  if (!options.onIqSubdomain) {
    if (normalized === '/iq') publicPath = '/';
    else if (normalized.startsWith('/iq/')) {
      publicPath = normalized.slice(3) || '/';
    } else if (!normalized.startsWith('/iq')) {
      publicPath = normalized === '/' ? '/' : normalized;
    }
  }

  if (locale === 'en') {
    return options.onIqSubdomain
      ? publicPath === '/'
        ? '/'
        : publicPath
      : normalized.startsWith('/iq')
        ? normalized
        : `/iq${publicPath === '/' ? '' : publicPath}`;
  }

  const suffix =
    publicPath === '/'
      ? ''
      : publicPath.startsWith('/')
        ? publicPath
        : `/${publicPath}`;

  if (!options.onIqSubdomain) {
    return `${IQ_SUBDOMAIN_ORIGIN}/${locale}${suffix}`;
  }

  return `/${locale}${suffix}`;
}

export function getIqLanguageSwitcherItems(options: {
  pathname: string;
  onIqSubdomain: boolean;
}): Array<{ locale: IqLocale; href: string; label: string; current: boolean }> {
  const { locale: currentLocale } = parseIqPublicPathname(options.pathname);
  const productPath = options.onIqSubdomain
    ? stripIqLocalePrefix(options.pathname)
    : options.pathname.startsWith('/iq')
      ? normalizeIqPathname(options.pathname)
      : `/iq${stripIqLocalePrefix(options.pathname) === '/' ? '' : stripIqLocalePrefix(options.pathname)}`;

  const labels: Record<IqLocale, string> = {
    en: 'English',
    es: 'Español',
    fr: 'Français'
  };

  return (['en', 'es', 'fr'] as const).map((locale) => ({
    locale,
    href: getIqLocalizedHref(
      options.onIqSubdomain ? stripIqLocalePrefix(options.pathname) : productPath,
      locale,
      { onIqSubdomain: options.onIqSubdomain }
    ),
    label: labels[locale],
    current: locale === currentLocale
  }));
}
