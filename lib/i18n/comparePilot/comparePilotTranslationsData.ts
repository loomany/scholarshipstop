import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import { getTranslationSourceHash } from '@/lib/i18n/contentTranslationsServer';
import {
  COMPARE_STATE_PILOT_SLUGS,
  COMPARE_UNIVERSITY_PILOT_SLUGS,
  type CompareStatePilotSlug,
  type CompareUniversityPilotSlug
} from '@/lib/i18n/comparePilot/comparePilotSlugs';

export type ComparePilotSeedRow = {
  source_type: 'compare_university' | 'compare_state';
  source_id: string;
  source_slug: string;
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
  translated_faq_json: { question: string; answer: string }[];
  translated_extra_json: { disclaimer: string };
};

const PUBLISHED_AT = '2026-05-22T21:00:00.000Z';
const QUALITY = 90;

type Block = {
  source_type: 'compare_university' | 'compare_state';
  es: LocaleBlock;
  fr: LocaleBlock;
};

type LocaleBlock = {
  translated_title: string;
  translated_meta_title: string;
  translated_meta_description: string;
  translated_summary: string;
  translated_body: string;
  translated_faq_json: { question: string; answer: string }[];
  disclaimer: string;
};

const UNI: Record<CompareUniversityPilotSlug, Block> = {
  'austin-community-college-vs-midlands-technical-college': {
    source_type: 'compare_university',
    es: {
      translated_title: 'Austin Community College vs Midlands Technical College',
      translated_meta_title:
        'Comparar becas: Austin Community College vs Midlands Technical College | ScholarshipTop',
      translated_meta_description:
        'Resumen en español para comparar becas y contexto entre Austin Community College y Midlands Technical College; confirme cifras en fuentes oficiales.',
      translated_summary:
        'Compare enfoque de becas, coste y trayectoria entre dos instituciones comunitarias sin sustituir la página oficial de cada universidad.',
      translated_body: `Esta comparación resume cómo Austin Community College y Midlands Technical College aparecen en el catálogo de ScholarshipTop para ayudarle a orientar su búsqueda de becas. Los nombres oficiales de las instituciones se mantienen en inglés.

Use la comparación para identificar diferencias generales de contexto (tipo de institución, ubicación y enfoque de listados conectados), no como promesa de adjudicación. ScholarshipTop no garantiza becas ni montos.

Antes de postular, abra cada sitio oficial y confirme elegibilidad, documentos, plazos y renovación. Si un dato no está publicado, no lo invente en su solicitud.

Esta página en español ofrece el resumen revisado del piloto; amplíe su investigación en los sitios oficiales de cada institución.`,
      translated_faq_json: [
        {
          question: '¿ScholarshipTop elige un ganador entre los dos?',
          answer:
            'No. Mostramos contexto comparativo; la decisión de postulación es suya según sus metas.'
        },
        {
          question: '¿Los montos mostrados son definitivos?',
          answer: 'No. Confirme siempre en la fuente oficial de cada beca listada.'
        }
      ],
      disclaimer:
        'Verifique becas y requisitos en sitios oficiales. ScholarshipTop no garantiza resultados.'
    },
    fr: {
      translated_title: 'Austin Community College vs Midlands Technical College',
      translated_meta_title:
        'Comparer bourses : Austin Community College vs Midlands Technical College | ScholarshipTop',
      translated_meta_description:
        'Résumé en français pour comparer bourses et contexte entre Austin Community College et Midlands Technical College ; confirmez les chiffres sur les sources officielles.',
      translated_summary:
        'Comparez l’orientation bourses, le coût et le parcours entre deux établissements communautaires sans remplacer la page officielle de chaque université.',
      translated_body: `Cette comparaison résume comment Austin Community College et Midlands Technical College apparaissent dans le catalogue ScholarshipTop pour orienter votre recherche de bourses. Les noms officiels des établissements restent en anglais.

Utilisez la comparaison pour repérer des différences de contexte (type d’établissement, localisation, annonces reliées), pas comme promesse d’attribution. ScholarshipTop ne garantit ni bourses ni montants.

Avant de postuler, ouvrez chaque site officiel et confirmez éligibilité, pièces, dates et renouvellement. Si une donnée n’est pas publiée, ne l’inventez pas dans votre dossier.

Cette page française présente le résumé validé du pilote ; poursuivez vos vérifications sur les sites officiels de chaque établissement.`,
      translated_faq_json: [
        {
          question: 'ScholarshipTop désigne-t-il un gagnant ?',
          answer:
            'Non. Nous fournissons un contexte comparatif ; le choix de candidature vous appartient.'
        },
        {
          question: 'Les montants affichés sont-ils définitifs ?',
          answer:
            'Non. Vérifiez toujours sur la source officielle de chaque bourse listée.'
        }
      ],
      disclaimer:
        'Vérifiez bourses et critères sur les sites officiels. ScholarshipTop ne garantit aucun résultat.'
    }
  },
  'massachusetts-bay-community-college-massbay-vs-worcester-state-university': {
    source_type: 'compare_university',
    es: {
      translated_title:
        'Massachusetts Bay Community College (MassBay) vs Worcester State University',
      translated_meta_title:
        'Comparar becas: MassBay vs Worcester State University | ScholarshipTop',
      translated_meta_description:
        'Resumen piloto en español para comparar becas entre MassBay y Worcester State University.',
      translated_summary:
        'Contraste entre una comunidad (MassBay) y una universidad estatal (Worcester State) para priorizar becas alineadas con su etapa académica.',
      translated_body: `Massachusetts Bay Community College (MassBay) y Worcester State University cumplen funciones distintas en el ecosistema educativo de Massachusetts. En ScholarshipTop, la comparación ayuda a ver qué tipo de listados y proveedores aparecen conectados a cada institución.

No asuma que una ruta es “mejor” sin revisar su programa, transferencia y coste total. Confirme requisitos de beca en cada sitio oficial.

Use esta página para decidir dónde profundizar: becas de transferencia, becas de pregrado o ayudas locales. ScholarshipTop no publica garantías de adjudicación.

Verifique plazos y documentos en las páginas oficiales antes de enviar cualquier solicitud.`,
      translated_faq_json: [
        {
          question: '¿Puedo transferir de MassBay a Worcester State?',
          answer:
            'Muchos estudiantes planean transferencias, pero las reglas dependen del programa; confirme en sitios oficiales de admisión.'
        },
        {
          question: '¿Esta página incluye todas las tablas de datos?',
          answer:
            'No. Es un resumen localizado del piloto; confirme cifras en fuentes oficiales.'
        }
      ],
      disclaimer: 'Confirme elegibilidad y plazos en fuentes oficiales.'
    },
    fr: {
      translated_title:
        'Massachusetts Bay Community College (MassBay) vs Worcester State University',
      translated_meta_title:
        'Comparer bourses : MassBay vs Worcester State University | ScholarshipTop',
      translated_meta_description:
        'Résumé pilote en français pour comparer les bourses entre MassBay et Worcester State University.',
      translated_summary:
        'Contraste entre un collège communautaire (MassBay) et une université d’État (Worcester State) pour prioriser les bourses selon votre étape.',
      translated_body: `Massachusetts Bay Community College (MassBay) et Worcester State University ont des rôles différents dans l’écosystème éducatif du Massachusetts. Sur ScholarshipTop, la comparaison montre quels types d’annonces et de fournisseurs sont reliés à chaque établissement.

Ne présumez pas qu’une voie est « meilleure » sans examiner programme, transfert et coût total. Confirmez les critères de bourse sur chaque site officiel.

Utilisez cette page pour choisir où approfondir : bourses de transfert, de premier cycle ou aides locales. ScholarshipTop ne publie aucune garantie d’attribution.

Vérifiez dates et pièces sur les pages officielles avant tout envoi.`,
      translated_faq_json: [
        {
          question: 'Puis-je transférer de MassBay vers Worcester State ?',
          answer:
            'Beaucoup d’étudiant·e·s prévoient un transfert, mais les règles dépendent du programme ; confirmez sur les sites officiels d’admission.'
        },
        {
          question: 'Cette page inclut-elle tous les tableaux de données ?',
          answer:
            'Non. C’est un résumé localisé du pilote ; confirmez les chiffres sur les sources officielles.'
        }
      ],
      disclaimer: 'Confirmez éligibilité et dates sur les sources officielles.'
    }
  }
};

const STATE: Record<CompareStatePilotSlug, Block> = {
  'california-vs-texas': {
    source_type: 'compare_state',
    es: {
      translated_title: 'California vs Texas (becas)',
      translated_meta_title: 'Comparar becas: California vs Texas | ScholarshipTop',
      translated_meta_description:
        'Resumen piloto en español sobre becas y contexto entre California y Texas.',
      translated_summary:
        'Orientación para comparar oportunidades de beca por estado sin inventar estadísticas no publicadas.',
      translated_body: `California y Texas aparecen a menudo en búsquedas de becas por su tamaño y diversidad de programas. ScholarshipTop agrupa listados y contexto para ayudarle a comparar rutas, no para declarar un “estado ganador”.

Compare según su residencia, campo de estudio y tipo de institución objetivo. Las reglas de residencia y impuestos pueden cambiar la elegibilidad; confirme en cada anuncio oficial.

Use esta guía para acotar proveedores y plazos, luego verifique montos y documentos en la fuente oficial. No prometemos becas ni resultados.

Los nombres de estado se mantienen en inglés (California, Texas) como en los datos de catálogo.`,
      translated_faq_json: [
        {
          question: '¿Un estado ofrece siempre más becas?',
          answer:
            'No necesariamente; depende de su perfil y de becas activas en el momento de su búsqueda.'
        },
        {
          question: '¿Puedo postular a becas de ambos estados?',
          answer:
            'Solo si cumple residencia y criterios de cada programa; lea cada anuncio oficial.'
        }
      ],
      disclaimer: 'Verifique requisitos en fuentes oficiales.'
    },
    fr: {
      translated_title: 'California vs Texas (bourses)',
      translated_meta_title: 'Comparer bourses : California vs Texas | ScholarshipTop',
      translated_meta_description:
        'Résumé pilote en français sur les bourses et le contexte entre California et Texas.',
      translated_summary:
        'Orientation pour comparer les opportunités de bourses par État sans inventer de statistiques non publiées.',
      translated_body: `La California et le Texas figurent souvent dans les recherches de bourses pour leur taille et la diversité des programmes. ScholarshipTop regroupe annonces et contexte pour comparer des pistes, pas pour désigner un « État gagnant ».

Comparez selon votre résidence, domaine d’études et type d’établissement visé. Les règles de résidence peuvent changer l’éligibilité ; confirmez sur chaque annonce officielle.

Utilisez ce guide pour cibler fournisseurs et dates, puis vérifiez montants et pièces sur la source officielle. Nous ne promettons ni bourses ni résultats.

Les noms d’État restent en anglais (California, Texas) comme dans les données du catalogue.`,
      translated_faq_json: [
        {
          question: 'Un État offre-t-il toujours plus de bourses ?',
          answer:
            'Pas forcément ; cela dépend de votre profil et des bourses actives au moment de la recherche.'
        },
        {
          question: 'Puis-je postuler dans les deux États ?',
          answer:
            'Uniquement si vous remplissez résidence et critères de chaque programme ; lisez chaque annonce officielle.'
        }
      ],
      disclaimer: 'Vérifiez les critères sur les sources officielles.'
    }
  },
  'florida-vs-new-york': {
    source_type: 'compare_state',
    es: {
      translated_title: 'Florida vs New York (becas)',
      translated_meta_title: 'Comparar becas: Florida vs New York | ScholarshipTop',
      translated_meta_description:
        'Resumen piloto en español para comparar becas entre Florida y New York.',
      translated_summary:
        'Compare contexto de becas entre Florida y New York según sus metas, no según suposiciones.',
      translated_body: `Florida y New York atraen estudiantes por universidades, colegios comunitarios y programas profesionales distintos. ScholarshipTop ofrece esta comparación como mapa de listados conectados, no como asesoría legal o financiera.

Priorice becas donde cumpla residencia, nivel académico y campo. Costo de vida y requisitos varían; no extrapole de un solo listado.

Confirme cada beca en su proveedor oficial. ScholarshipTop no garantiza adjudicación ni montos publicados en terceros.

Mantenga nombres de estado en inglés (Florida, New York) tal como en el catálogo.`,
      translated_faq_json: [
        {
          question: '¿Debo mudarme para optimizar becas?',
          answer:
            'No lo recomendamos como estrategia por sí sola; verifique residencia exigida en cada programa.'
        },
        {
          question: '¿Los datos cambian con el tiempo?',
          answer: 'Sí. Revise fechas de actualización y plazos en fuentes oficiales.'
        }
      ],
      disclaimer: 'Confirme plazos y elegibilidad en fuentes oficiales.'
    },
    fr: {
      translated_title: 'Florida vs New York (bourses)',
      translated_meta_title: 'Comparer bourses : Florida vs New York | ScholarshipTop',
      translated_meta_description:
        'Résumé pilote en français pour comparer les bourses entre Florida et New York.',
      translated_summary:
        'Comparez le contexte bourses entre Florida et New York selon vos objectifs, pas des suppositions.',
      translated_body: `La Florida et New York attirent des profils variés (universités, collèges communautaires, formations professionnelles). ScholarshipTop propose cette comparaison comme carte des annonces reliées, pas comme conseil juridique ou financier.

Priorisez les bourses où vous respectez résidence, niveau et domaine. Coût de la vie et critères diffèrent ; n’extrapolez pas d’une seule annonce.

Confirmez chaque bourse chez le fournisseur officiel. ScholarshipTop ne garantit ni attribution ni montants tiers.

Conservez les noms d’État en anglais (Florida, New York) comme dans le catalogue.`,
      translated_faq_json: [
        {
          question: 'Dois-je déménager pour optimiser les bourses ?',
          answer:
            'Ce n’est pas une stratégie recommandée seule ; vérifiez la résidence exigée pour chaque programme.'
        },
        {
          question: 'Les données évoluent-elles ?',
          answer: 'Oui. Revoyez dates de mise à jour et échéances sur les sources officielles.'
        }
      ],
      disclaimer: 'Confirmez dates et éligibilité sur les sources officielles.'
    }
  }
};

function hashFor(
  sourceType: 'compare_university' | 'compare_state',
  id: string,
  slug: string
): string {
  return getTranslationSourceHash({ pilot: 'stage5g-compare-manual', sourceType, id, slug });
}

export function buildComparePilotSeedRows(
  uniMeta: Map<CompareUniversityPilotSlug, { id: string; updated_at: string | null }>,
  stateMeta: Map<CompareStatePilotSlug, { id: string; updated_at: string | null }>
): ComparePilotSeedRow[] {
  const rows: ComparePilotSeedRow[] = [];
  for (const slug of COMPARE_UNIVERSITY_PILOT_SLUGS) {
    const meta = uniMeta.get(slug);
    const block = UNI[slug];
    if (!meta) continue;
    for (const locale of ['es', 'fr'] as const) {
      const l = block[locale];
      rows.push({
        source_type: 'compare_university',
        source_id: meta.id,
        source_slug: slug,
        locale,
        status: 'published',
        source_hash: hashFor('compare_university', meta.id, slug),
        source_updated_at: meta.updated_at,
        quality_score: QUALITY,
        published_at: PUBLISHED_AT,
        translated_slug: null,
        translated_title: l.translated_title,
        translated_meta_title: l.translated_meta_title,
        translated_meta_description: l.translated_meta_description,
        translated_summary: l.translated_summary,
        translated_body: l.translated_body,
        translated_faq_json: l.translated_faq_json,
        translated_extra_json: { disclaimer: l.disclaimer }
      });
    }
  }
  for (const slug of COMPARE_STATE_PILOT_SLUGS) {
    const meta = stateMeta.get(slug);
    const block = STATE[slug];
    if (!meta) continue;
    for (const locale of ['es', 'fr'] as const) {
      const l = block[locale];
      rows.push({
        source_type: 'compare_state',
        source_id: meta.id,
        source_slug: slug,
        locale,
        status: 'published',
        source_hash: hashFor('compare_state', meta.id, slug),
        source_updated_at: meta.updated_at,
        quality_score: QUALITY,
        published_at: PUBLISHED_AT,
        translated_slug: null,
        translated_title: l.translated_title,
        translated_meta_title: l.translated_meta_title,
        translated_meta_description: l.translated_meta_description,
        translated_summary: l.translated_summary,
        translated_body: l.translated_body,
        translated_faq_json: l.translated_faq_json,
        translated_extra_json: { disclaimer: l.disclaimer }
      });
    }
  }
  return rows;
}
