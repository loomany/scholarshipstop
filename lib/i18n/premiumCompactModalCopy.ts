import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

export type PremiumCompactModalCopy = {
  closeOverlayAria: string;
  closeAria: string;
  title: string;
  intro: string;
  features: ReadonlyArray<{ id: string; title: string; body: string }>;
  cta: string;
  footer: string;
};

const EN: PremiumCompactModalCopy = {
  closeOverlayAria: 'Close premium paywall',
  closeAria: 'Close',
  title: 'Unlock Premium Access',
  intro:
    'This is a premium-only feature. Upgrade now to see all grants, access advanced tools, and use our powerful AI Essay Mentor.',
  features: [
    {
      id: 'ai-essay-mentor',
      title: '🤖 AI Essay Mentor:',
      body: 'Craft winning applications in minutes (on select plans).'
    },
    {
      id: 'full-grant-visibility',
      title: '🔑 Full Grant Visibility:',
      body: 'Unblur all grant names, external links, and deadlines.'
    },
    {
      id: 'exclusive-matches',
      title: '🎯 Exclusive Matches:',
      body: 'Lock in your criteria and get notified about matching opportunities.'
    }
  ],
  cta: '🚀 View Premium Plans',
  footer: 'Secure payment • Cancel anytime'
};

const ES: PremiumCompactModalCopy = {
  closeOverlayAria: 'Cerrar ventana de acceso premium',
  closeAria: 'Cerrar',
  title: 'Desbloquear acceso Premium',
  intro:
    'Esta función es solo para usuarios premium. Mejora tu plan para ver todas las becas, acceder a herramientas avanzadas y usar nuestro mentor de ensayos con IA.',
  features: [
    {
      id: 'ai-essay-mentor',
      title: '🤖 Mentor de ensayos con IA:',
      body: 'Redacta solicitudes ganadoras en minutos (en planes seleccionados).'
    },
    {
      id: 'full-grant-visibility',
      title: '🔑 Visibilidad total de becas:',
      body: 'Desbloquea todos los nombres de becas, enlaces externos y fechas límite.'
    },
    {
      id: 'exclusive-matches',
      title: '🎯 Coincidencias exclusivas:',
      body: 'Guarda tus criterios y recibe avisos sobre oportunidades coincidentes.'
    }
  ],
  cta: '🚀 Ver planes Premium',
  footer: 'Pago seguro • Cancela cuando quieras'
};

const FR: PremiumCompactModalCopy = {
  closeOverlayAria: 'Fermer la fenêtre d’accès premium',
  closeAria: 'Fermer',
  title: 'Débloquer l’accès Premium',
  intro:
    'Cette fonctionnalité est réservée aux abonnés premium. Passez à un forfait supérieur pour voir toutes les bourses, accéder aux outils avancés et utiliser notre mentor de rédaction IA.',
  features: [
    {
      id: 'ai-essay-mentor',
      title: '🤖 Mentor de rédaction IA :',
      body: 'Rédigez des candidatures convaincantes en quelques minutes (sur certains forfaits).'
    },
    {
      id: 'full-grant-visibility',
      title: '🔑 Visibilité complète des bourses :',
      body: 'Affichez tous les noms de bourses, liens externes et dates limites.'
    },
    {
      id: 'exclusive-matches',
      title: '🎯 Correspondances exclusives :',
      body: 'Enregistrez vos critères et recevez des alertes pour les opportunités correspondantes.'
    }
  ],
  cta: '🚀 Voir les forfaits Premium',
  footer: 'Paiement sécurisé • Annulation à tout moment'
};

export function getPremiumCompactModalCopy(
  locale: LocalizedUiLocale
): PremiumCompactModalCopy {
  if (locale === 'es') return ES;
  if (locale === 'fr') return FR;
  return EN;
}
