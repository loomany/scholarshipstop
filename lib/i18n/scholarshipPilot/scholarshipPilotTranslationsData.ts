import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import { getTranslationSourceHash } from '@/lib/i18n/contentTranslationsServer';
import {
  SCHOLARSHIP_DETAIL_PILOT_SLUGS,
  type ScholarshipDetailPilotSlug
} from '@/lib/i18n/scholarshipPilot/scholarshipPilotSlugs';

export type ScholarshipDetailFaqTranslationItem = {
  question: string;
  answer: string;
};

export type ScholarshipDetailPilotSeedRow = {
  source_type: 'scholarship_detail';
  source_id: string;
  source_slug: ScholarshipDetailPilotSlug;
  locale: ContentTranslationLocale;
  status: 'published';
  source_hash: string;
  source_updated_at: string | null;
  quality_score: number;
  published_at: string;
  translated_slug: null;
  translated_title: string;
  translated_meta_title: string;
  translated_meta_description: string;
  translated_summary: string;
  translated_body: string;
  translated_faq_json: ScholarshipDetailFaqTranslationItem[];
  translated_extra_json: { disclaimer: string };
};

const PUBLISHED_AT = '2026-05-22T16:00:00.000Z';
const QUALITY_SCORE = 90;
const OFFICIAL_TITLE = 'Climate Stripes Scholarship';

type LocaleContent = {
  translated_meta_title: string;
  translated_meta_description: string;
  translated_summary: string;
  translated_body: string;
  translated_faq_json: ScholarshipDetailFaqTranslationItem[];
  disclaimer: string;
};

const PILOT_CONTENT: Record<
  ScholarshipDetailPilotSlug,
  Record<ContentTranslationLocale, LocaleContent>
> = {
  'climate-stripes-scholarship-14487': {
    es: {
      translated_meta_title:
        'Climate Stripes Scholarship | Beca en EE. UU. 2026 | ScholarshipTop',
      translated_meta_description:
        'Resumen de la Climate Stripes Scholarship de University of Reading: premio de 10 000 GBP, plazo 29 may 2026. Verifique requisitos en la página oficial del proveedor.',
      translated_summary:
        'University of Reading ofrece esta beca para ayudar con costos de estudio. El premio indicado es 10 000 GBP. Planifique postular antes del 29 may 2026.',
      translated_body: `Esta página resume la Climate Stripes Scholarship tal como aparece en el catálogo de ScholarshipTop. El nombre oficial de la beca y los datos del proveedor (University of Reading) se mantienen sin cambios.

El monto publicado es 10 000 GBP y la fecha límite indicada es el 29 may 2026. La elegibilidad publicada incluye criterios basados en mérito y ubicación vinculada a Reading, Reino Unido. ScholarshipTop no concede esta beca ni garantiza resultados.

Antes de postular, confirme en la página oficial del proveedor: requisitos completos, documentos, plazo exacto, forma de pago del premio y enlace de solicitud vigente.`,
      translated_faq_json: [
        {
          question: '¿ScholarshipTop concede esta beca?',
          answer:
            'No. ScholarshipTop es un directorio informativo. La beca la administra el proveedor indicado (University of Reading). Confirme siempre los detalles en su sitio oficial.'
        },
        {
          question: '¿Qué monto y plazo figuran en este listado?',
          answer:
            'En el listado actual aparecen 10 000 GBP como premio y 29 may 2026 como fecha límite. Verifique ambos en la fuente oficial antes de enviar una solicitud.'
        },
        {
          question: '¿Debo confiar solo en esta página?',
          answer:
            'No. Use esta página como guía inicial y valide elegibilidad, requisitos y calendario en la página oficial del proveedor antes de postular.'
        }
      ],
      disclaimer:
        'Verifique siempre los detalles en la página oficial del proveedor. ScholarshipTop no garantiza becas ni resultados.'
    },
    fr: {
      translated_meta_title:
        'Climate Stripes Scholarship | Bourse aux États-Unis 2026 | ScholarshipTop',
      translated_meta_description:
        'Aperçu de la Climate Stripes Scholarship (University of Reading) : 10 000 GBP, date limite 29 mai 2026. Vérifiez les critères sur la page officielle du financeur.',
      translated_summary:
        'University of Reading propose cette bourse pour aider à financer les études. Le montant indiqué est de 10 000 GBP. Prévoyez de postuler avant le 29 mai 2026.',
      translated_body: `Cette page résume la Climate Stripes Scholarship telle qu’elle figure dans le catalogue ScholarshipTop. Le nom officiel de la bourse et les informations du financeur (University of Reading) restent inchangés.

Le montant publié est de 10 000 GBP et la date limite indiquée est le 29 mai 2026. L’éligibilité publiée mentionne des critères liés au mérite et à Reading, Royaume-Uni. ScholarshipTop n’accorde pas cette bourse et ne garantit aucun résultat.

Avant de postuler, confirmez sur la page officielle du financeur : exigences complètes, pièces à fournir, date limite exacte, mode de versement et lien de candidature à jour.`,
      translated_faq_json: [
        {
          question: 'ScholarshipTop accorde-t-il cette bourse ?',
          answer:
            'Non. ScholarshipTop est un annuaire informatif. La bourse est gérée par le financeur indiqué (University of Reading). Vérifiez toujours les détails sur son site officiel.'
        },
        {
          question: 'Quel montant et quelle date limite sont indiqués ?',
          answer:
            'Le listage actuel indique 10 000 GBP et une date limite au 29 mai 2026. Vérifiez ces éléments sur la source officielle avant toute candidature.'
        },
        {
          question: 'Puis-je me fier uniquement à cette page ?',
          answer:
            'Non. Utilisez cette page comme point de départ, puis validez éligibilité, exigences et calendrier sur la page officielle du financeur.'
        }
      ],
      disclaimer:
        'Vérifiez toujours les détails sur la page officielle du financeur. ScholarshipTop ne garantit ni bourse ni résultat.'
    }
  }
};

function buildSourceHash(
  slug: ScholarshipDetailPilotSlug,
  updatedAt: string | null
): string {
  return getTranslationSourceHash({
    slug,
    title: OFFICIAL_TITLE,
    updated_at: updatedAt
  });
}

export function buildScholarshipDetailPilotSeedRows(
  slugToMeta: Map<
    ScholarshipDetailPilotSlug,
    { id: string; updated_at: string | null }
  >
): ScholarshipDetailPilotSeedRow[] {
  const rows: ScholarshipDetailPilotSeedRow[] = [];
  for (const slug of SCHOLARSHIP_DETAIL_PILOT_SLUGS) {
    const meta = slugToMeta.get(slug);
    if (!meta) continue;
    for (const locale of ['es', 'fr'] as const) {
      const content = PILOT_CONTENT[slug][locale];
      rows.push({
        source_type: 'scholarship_detail',
        source_id: meta.id,
        source_slug: slug,
        locale,
        status: 'published',
        source_hash: buildSourceHash(slug, meta.updated_at),
        source_updated_at: meta.updated_at,
        quality_score: QUALITY_SCORE,
        published_at: PUBLISHED_AT,
        translated_slug: null,
        translated_title: OFFICIAL_TITLE,
        translated_meta_title: content.translated_meta_title,
        translated_meta_description: content.translated_meta_description,
        translated_summary: content.translated_summary,
        translated_body: content.translated_body,
        translated_faq_json: content.translated_faq_json,
        translated_extra_json: { disclaimer: content.disclaimer }
      });
    }
  }
  return rows;
}
