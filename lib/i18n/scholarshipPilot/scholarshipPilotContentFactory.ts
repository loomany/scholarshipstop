import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import type { ScholarshipDetailFaqTranslationItem } from '@/lib/i18n/scholarshipPilot/scholarshipPilotTranslationsData';

export type ScholarshipPilotFacts = {
  officialTitle: string;
  provider: string;
  amount: string;
  deadline: string;
};

export type ScholarshipPilotLocaleContent = {
  translated_meta_title: string;
  translated_meta_description: string;
  translated_summary: string;
  translated_body: string;
  translated_faq_json: ScholarshipDetailFaqTranslationItem[];
  disclaimer: string;
};

function faqPack(
  locale: ContentTranslationLocale,
  officialTitle: string,
  provider: string,
  amount: string,
  deadline: string
): ScholarshipDetailFaqTranslationItem[] {
  if (locale === 'es') {
    return [
      {
        question: '¿ScholarshipTop concede esta beca?',
        answer:
          'No. ScholarshipTop es un directorio informativo. La beca la administra el proveedor indicado. Confirme siempre los detalles en su sitio oficial.'
      },
      {
        question: `¿Qué monto y plazo figuran para ${officialTitle}?`,
        answer: `En este listado aparecen ${amount} como premio y ${deadline} como fecha límite indicada. Verifique ambos en la fuente oficial de ${provider} antes de postular.`
      },
      {
        question: '¿Debo confiar solo en esta página?',
        answer:
          'No. Use esta página como guía inicial y valide elegibilidad, requisitos y calendario en la página oficial del proveedor antes de postular.'
      }
    ];
  }
  return [
    {
      question: 'ScholarshipTop accorde-t-il cette bourse ?',
      answer:
        'Non. ScholarshipTop est un annuaire informatif. La bourse est gérée par le financeur indiqué. Vérifiez toujours les détails sur son site officiel.'
    },
    {
      question: `Quel montant et quelle date limite sont indiqués pour ${officialTitle} ?`,
      answer: `Ce listage indique ${amount} et une date limite au ${deadline}. Vérifiez ces éléments sur la source officielle de ${provider} avant toute candidature.`
    },
    {
      question: 'Puis-je me fier uniquement à cette page ?',
      answer:
        'Non. Utilisez cette page comme point de départ, puis validez éligibilité, exigences et calendrier sur la page officielle du financeur.'
    }
  ];
}

export function buildScholarshipPilotLocaleContent(
  facts: ScholarshipPilotFacts,
  locale: ContentTranslationLocale
): ScholarshipPilotLocaleContent {
  const { officialTitle, provider, amount, deadline } = facts;
  if (locale === 'es') {
    return {
      translated_meta_title: `${officialTitle} | Beca | ScholarshipTop`,
      translated_meta_description: `Resumen de ${officialTitle} (${provider}): premio ${amount}, plazo ${deadline}. Verifique requisitos en la página oficial del proveedor.`,
      translated_summary: `${provider} ofrece esta beca según el listado de ScholarshipTop. Premio indicado: ${amount}. Planifique postular antes del ${deadline}.`,
      translated_body: `Esta página resume ${officialTitle} tal como aparece en el catálogo de ScholarshipTop. El nombre oficial de la beca, el proveedor (${provider}), el monto (${amount}) y la fecha límite indicada (${deadline}) se mantienen sin cambios.

ScholarshipTop no concede esta beca ni garantiza resultados. Antes de postular, confirme en la página oficial del proveedor: requisitos completos, documentos, plazo exacto, forma de pago del premio y enlace de solicitud vigente.`,
      translated_faq_json: faqPack(locale, officialTitle, provider, amount, deadline),
      disclaimer:
        'Verifique siempre los detalles en la página oficial del proveedor. ScholarshipTop no garantiza becas ni resultados.'
    };
  }
  return {
    translated_meta_title: `${officialTitle} | Bourse | ScholarshipTop`,
    translated_meta_description: `Aperçu de ${officialTitle} (${provider}) : ${amount}, date limite ${deadline}. Vérifiez les critères sur la page officielle du financeur.`,
    translated_summary: `${provider} propose cette bourse selon le catalogue ScholarshipTop. Montant indiqué : ${amount}. Prévoyez de postuler avant le ${deadline}.`,
    translated_body: `Cette page résume ${officialTitle} telle qu’elle figure dans le catalogue ScholarshipTop. Le nom officiel, le financeur (${provider}), le montant (${amount}) et la date limite indiquée (${deadline}) restent inchangés.

ScholarshipTop n’accorde pas cette bourse et ne garantit aucun résultat. Avant de postuler, confirmez sur la page officielle : exigences, pièces, date limite exacte, versement et lien de candidature à jour.`,
    translated_faq_json: faqPack(locale, officialTitle, provider, amount, deadline),
    disclaimer:
      'Vérifiez toujours les détails sur la page officielle du financeur. ScholarshipTop ne garantit ni bourse ni résultat.'
  };
}
