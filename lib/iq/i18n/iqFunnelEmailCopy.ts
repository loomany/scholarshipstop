import type { IqLocale } from '@/lib/iq/i18n/iqLocales';

export type IqFunnelEmailCopy = {
  progressEyebrow: string;
  title: string;
  description: string;
  submitLabel: string;
  errors: {
    invalidEmail: string;
    googleFailed: string;
    googleRetry: string;
  };
};

const COPY: Record<IqLocale, IqFunnelEmailCopy> = {
  en: {
    progressEyebrow: 'Step 1 · Email',
    title: 'Where should we save your IQ profile?',
    description:
      'Enter your email to continue to the IQ test. You can use the same email again anytime; after payment we will send your full report and private result link.',
    submitLabel: 'Continue to IQ test',
    errors: {
      invalidEmail: 'Enter a valid email address.',
      googleFailed: 'Google sign-in failed.',
      googleRetry: 'Google sign-in failed. Try again in a moment.'
    }
  },
  es: {
    progressEyebrow: 'Paso 1 · Correo',
    title: '¿Dónde guardamos tu perfil de CI?',
    description:
      'Introduce tu correo para continuar al test de CI. Puedes usar el mismo correo cuando quieras; tras el pago enviaremos tu informe completo y el enlace privado de resultados.',
    submitLabel: 'Continuar al test de CI',
    errors: {
      invalidEmail: 'Introduce una dirección de correo válida.',
      googleFailed: 'Error al iniciar sesión con Google.',
      googleRetry: 'Error con Google. Inténtalo de nuevo en un momento.'
    }
  },
  fr: {
    progressEyebrow: 'Étape 1 · E-mail',
    title: 'Où enregistrer votre profil de QI ?',
    description:
      'Saisissez votre e-mail pour continuer le test de QI. Vous pouvez réutiliser le même e-mail ; après paiement nous enverrons le rapport complet et le lien privé des résultats.',
    submitLabel: 'Continuer vers le test de QI',
    errors: {
      invalidEmail: 'Saisissez une adresse e-mail valide.',
      googleFailed: 'Échec de la connexion Google.',
      googleRetry: 'Échec Google. Réessayez dans un instant.'
    }
  }
};

export function getIqFunnelEmailCopy(locale: IqLocale): IqFunnelEmailCopy {
  return COPY[locale];
}
