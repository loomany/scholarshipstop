import {
  getStage2LocaleFromPathname,
  type Stage2PilotLocale
} from '@/lib/i18n/pilotRoutes';

/** Active UI locale from the URL path only (never stale SSR `initialLocale`). */
export function resolveNavLocaleFromPathname(
  pathname: string
): Stage2PilotLocale | 'en' {
  return getStage2LocaleFromPathname(pathname) ?? 'en';
}
