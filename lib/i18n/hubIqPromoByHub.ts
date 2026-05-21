import type { HubIqPromoUiCopy } from '@/lib/i18n/hubUiCopy';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import { getHubIqPromoUiCopy } from '@/lib/i18n/hubUiCopy';

export type HubSpecificIqPromoCopy = HubIqPromoUiCopy & {
  title: string;
  body: string;
  intentAria: string;
};

const COMPARE_EXTRA: Record<
  'en' | 'es' | 'fr',
  Pick<HubSpecificIqPromoCopy, 'title' | 'body' | 'intentAria'>
> = {
  en: {
    title: 'Compare schools. Understand yourself first.',
    body: 'See how your logic, speed, and pattern recognition shape the way you evaluate scholarship options.',
    intentAria: 'Start IQ assessment for college fit'
  },
  es: {
    title: 'Compara universidades. Conócete primero.',
    body: 'Descubre cómo tu lógica, velocidad y reconocimiento de patrones moldean cómo evalúas opciones de becas.',
    intentAria: 'Iniciar evaluación IQ para encaje universitario'
  },
  fr: {
    title: 'Comparez les établissements. Comprenez-vous d’abord.',
    body: 'Voyez comment votre logique, vitesse et reconnaissance de motifs façonnent votre façon d’évaluer les bourses.',
    intentAria: 'Commencer l’évaluation IQ pour l’adéquation universitaire'
  }
};

const PROVIDERS_EXTRA: Record<
  'en' | 'es' | 'fr',
  Pick<HubSpecificIqPromoCopy, 'title' | 'body' | 'intentAria'>
> = {
  en: {
    title: 'Choose providers that fit your strategy',
    body: 'Use your Brain Archetype to understand how you evaluate awards, deadlines, and application complexity before prioritizing providers.',
    intentAria: 'Start IQ assessment for provider research'
  },
  es: {
    title: 'Elige proveedores que encajen con tu estrategia',
    body: 'Usa tu arquetipo cerebral para entender cómo evalúas premios, fechas y complejidad antes de priorizar proveedores.',
    intentAria: 'Iniciar evaluación IQ para investigar proveedores'
  },
  fr: {
    title: 'Choisissez des fournisseurs adaptés à votre stratégie',
    body: 'Utilisez votre archétype cognitif pour comprendre comment vous évaluez montants, dates et complexité avant de prioriser les fournisseurs.',
    intentAria: 'Commencer l’évaluation IQ pour la recherche de fournisseurs'
  }
};

function resolveLocale(locale: LocalizedUiLocale): 'en' | 'es' | 'fr' {
  if (locale === 'es') return 'es';
  if (locale === 'fr') return 'fr';
  return 'en';
}

export function getCompareHubIqPromoCopy(
  locale: LocalizedUiLocale
): HubSpecificIqPromoCopy {
  const key = resolveLocale(locale);
  return { ...getHubIqPromoUiCopy(locale), ...COMPARE_EXTRA[key] };
}

export function getProvidersHubIqPromoCopy(
  locale: LocalizedUiLocale
): HubSpecificIqPromoCopy {
  const key = resolveLocale(locale);
  return { ...getHubIqPromoUiCopy(locale), ...PROVIDERS_EXTRA[key] };
}
