export const IQ_LOCALES = ['en', 'es', 'fr'] as const;
export type IqLocale = (typeof IQ_LOCALES)[number];

export const IQ_PILOT_LOCALES = ['es', 'fr'] as const;
export type IqPilotLocale = (typeof IQ_PILOT_LOCALES)[number];

export const IQ_DEFAULT_LOCALE: IqLocale = 'en';

export const IQ_SUBDOMAIN_HOST = 'iq.scholarshiptop.com';

export function isIqPilotLocale(value: string | null | undefined): value is IqPilotLocale {
  return value === 'es' || value === 'fr';
}

export function isIqLocale(value: string | null | undefined): value is IqLocale {
  return value === 'en' || isIqPilotLocale(value);
}

/** IQ product never exposes `/en` in public URLs. */
export const IQ_FORBIDDEN_PUBLIC_LOCALE_SEGMENT = 'en';
