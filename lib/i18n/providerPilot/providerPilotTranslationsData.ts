import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import { buildProviderSourceHash } from '@/lib/i18n/providerPilot/buildProviderSourceHash';
import {
  PROVIDER_PILOT_SLUGS,
  type ProviderPilotSlug
} from '@/lib/i18n/providerPilot/providerPilotSlugs';
import type { ProviderProfileFaqTranslationItem } from '@/lib/i18n/providerPilot/providerProfileTranslationPayload';

export type ProviderPilotSeedRow = {
  source_type: 'provider_profile';
  source_id: string;
  source_slug: ProviderPilotSlug;
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
  translated_faq_json: ProviderProfileFaqTranslationItem[];
  translated_extra_json: null;
};

const PUBLISHED_AT = '2026-05-22T14:00:00.000Z';
const QUALITY_SCORE = 90;

type LocaleContent = {
  translated_title: string;
  translated_meta_title: string;
  translated_meta_description: string;
  translated_summary: string;
  translated_body: string;
  translated_faq_json: ProviderProfileFaqTranslationItem[];
};

const PILOT_CONTENT: Record<ProviderPilotSlug, Record<ContentTranslationLocale, LocaleContent>> =
  {
    'loyola-university-chicago': {
      es: {
        translated_title: 'Becas Loyola University Chicago',
        translated_meta_title:
          'Loyola University Chicago | Proveedor de becas | ScholarshipTop',
        translated_meta_description:
          'Explore becas y ayuda financiera vinculadas a Loyola University Chicago en ScholarshipTop. Confirme elegibilidad y plazos en la fuente oficial.',
        translated_summary:
          'Perfil de becas de Loyola University Chicago basado en listados de ScholarshipTop; verifique detalles en luc.edu.',
        translated_body: `Loyola University Chicago apoya a estudiantes del Departamento de Bellas Artes y Artes Escénicas con itinerarios académicos, orientación de admisiones y ayuda financiera orientada al estudio de las artes. El área de Bellas Artes incluye especializaciones en Historia del Arte, Escultura y Cerámica, Dibujo, Pintura y Grabado, Fotografía y Comunicación Visual, además de prácticas, asesoría, exposiciones y recursos de carrera. Sus operaciones de Bellas Artes están en 1032 W. Sheridan Road, Mundelein Center, Suite 1200, Chicago, Illinois 60660.

En este contexto, Loyola University Chicago utiliza becas y premios para hacer más asequible la universidad para estudiantes de Bellas Artes en distintas etapas. Entre ellas figuran la Ralph Arnold Scholarship (2.800 USD para estudiantes de últimos cursos con necesidad económica y GPA mínimo 3,0) y la Louise Gonska Scholarship (1.300 USD anuales para estudiantes reconocidos de Bellas Artes con GPA mínimo 3,0). ScholarshipTop no concede estas becas; confirme requisitos y plazos en la página oficial del proveedor.`,
        translated_faq_json: [
          {
            question:
              '¿Dónde está ubicado el Departamento de Bellas Artes y Artes Escénicas de Loyola University Chicago?',
            answer:
              'El departamento está en 1032 W. Sheridan Road, Mundelein Center, Suite 1200, Chicago, IL 60660.'
          },
          {
            question: '¿Quién puede recibir la Ralph Arnold Scholarship?',
            answer:
              'Apoya a estudiantes de pregrado de último año (tiempo completo o parcial) con necesidad económica y GPA mínimo de 3,0. El monto indicado es de 2.800 USD.'
          },
          {
            question: '¿Qué cubre la Louise Gonska Scholarship?',
            answer:
              'Ofrece apoyo de matrícula para estudiantes reconocidos de Bellas Artes en segundo, tercer o cuarto año, con estatus de tiempo completo y GPA mínimo de 3,0. El monto indicado es de 1.300 USD.'
          },
          {
            question: '¿ScholarshipTop es el proveedor de la beca?',
            answer:
              'No. ScholarshipTop no es Loyola University Chicago y no concede becas directamente. Use este perfil para revisar listados conectados y confirme las reglas finales en la página oficial del proveedor cuando esté disponible.'
          },
          {
            question: '¿Qué debo verificar antes de postular?',
            answer:
              'Confirme la fuente oficial, elegibilidad, fecha límite, documentos requeridos, monto del premio, forma de pago, reglas de renovación y ruta de solicitud antes de enviar.'
          },
          {
            question: '¿Por qué un perfil puede tener datos incompletos?',
            answer:
              'Los perfiles se basan en los datos de listados disponibles en ScholarshipTop. Algunos listados no muestran URL oficial, plazo actual o elegibilidad completa; ScholarshipTop señala lo que falta en lugar de inventarlo.'
          }
        ]
      },
      fr: {
        translated_title: 'Bourses Loyola University Chicago',
        translated_meta_title:
          'Loyola University Chicago | Fournisseur de bourses | ScholarshipTop',
        translated_meta_description:
          'Consultez les bourses et l’aide financière liées à Loyola University Chicago sur ScholarshipTop. Vérifiez l’éligibilité et les dates sur la source officielle.',
        translated_summary:
          'Profil bourses de Loyola University Chicago d’après les annonces ScholarshipTop ; confirmez les détails sur luc.edu.',
        translated_body: `Loyola University Chicago accompagne les étudiant·e·s du Département des beaux-arts et des arts de la scène avec des parcours académiques, des conseils d’admission et une aide financière ciblée pour les études artistiques. Le pôle Beaux-arts comprend notamment l’histoire de l’art, la sculpture et la céramique, le dessin, la peinture et l’estampe, la photographie et la communication visuelle, ainsi que des stages, du conseil, des expositions et des ressources carrière. Les activités Beaux-arts sont situées au 1032 W. Sheridan Road, Mundelein Center, suite 1200, Chicago (Illinois) 60660.

Dans ce cadre, Loyola University Chicago utilise des bourses et prix pour rendre les études plus accessibles aux étudiant·e·s en beaux-arts à différents niveaux. Parmi elles : la Ralph Arnold Scholarship (2 800 USD pour étudiant·e·s de dernière année en situation de besoin financier et GPA minimal 3,0) et la Louise Gonska Scholarship (1 300 USD de soutien annuel pour majeures reconnues en beaux-arts avec GPA minimal 3,0). ScholarshipTop n’accorde pas ces bourses ; confirmez critères et calendrier sur le site officiel du fournisseur.`,
        translated_faq_json: [
          {
            question:
              'Où se trouve le Département des beaux-arts et des arts de la scène de Loyola University Chicago ?',
            answer:
              'Le département est au 1032 W. Sheridan Road, Mundelein Center, suite 1200, Chicago, IL 60660.'
          },
          {
            question: 'Qui peut recevoir la Ralph Arnold Scholarship ?',
            answer:
              'Elle soutient des étudiant·e·s de licence en dernière année (temps plein ou partiel) en situation de besoin financier avec un GPA minimal de 3,0. Le montant indiqué est de 2 800 USD.'
          },
          {
            question: 'Que couvre la Louise Gonska Scholarship ?',
            answer:
              'Elle offre un soutien aux frais de scolarité pour des majeures reconnues en beaux-arts en 2e, 3e ou 4e année, à temps plein, avec un GPA minimal de 3,0. Le montant indiqué est de 1 300 USD.'
          },
          {
            question: 'ScholarshipTop est-il le fournisseur de la bourse ?',
            answer:
              'Non. ScholarshipTop n’est pas Loyola University Chicago et n’accorde pas de bourses directement. Utilisez ce profil pour parcourir les annonces reliées, puis confirmez les règles finales sur la page officielle du fournisseur lorsqu’elle est disponible.'
          },
          {
            question: 'Que dois-je vérifier avant de postuler ?',
            answer:
              'Confirmez la source officielle, l’éligibilité, la date limite, les pièces requises, le montant, le mode de versement, les règles de renouvellement et la procédure de candidature.'
          },
          {
            question: 'Pourquoi un profil peut-il être incomplet ?',
            answer:
              'Les profils reposent sur les données d’annonces disponibles sur ScholarshipTop. Certaines annonces n’affichent pas d’URL officielle, d’échéance actuelle ou d’éligibilité complète ; ScholarshipTop signale ce qui manque au lieu de l’inventer.'
          }
        ]
      }
    },
    'harvard-university': {
      es: {
        translated_title: 'Becas Harvard University',
        translated_meta_title: 'Harvard University | Proveedor de becas | ScholarshipTop',
        translated_meta_description:
          'Perfil de becas y ayuda financiera de Harvard University en ScholarshipTop. Revise listados y confirme requisitos en fuentes oficiales.',
        translated_summary:
          'Universidad privada de investigación en Cambridge (Massachusetts); confirme ayuda y plazos en fuentes oficiales.',
        translated_body: `Harvard University es una universidad privada de investigación en Cambridge, Massachusetts, fundada en 1636 e incorporada en 1650. Es la institución de educación superior más antigua de Estados Unidos e incluye Harvard College para pregrado y escuelas de posgrado y profesionales en negocios, derecho, medicina, salud pública, educación, diseño, gobierno, ingeniería y teología, entre otras.

Su trabajo abarca educación liberal, formación profesional avanzada e investigación a gran escala. Harvard indica que más de 20.000 candidatos a título estudian en la universidad y su sistema de bibliotecas es el mayor académico del mundo. Un ejemplo concreto de apoyo es la Harvard Financial Aid Initiative, según la cual familias con ingresos anuales de 85.000 USD o menos no pagan el costo de asistencia en Harvard College. ScholarshipTop no concede becas de Harvard; use este perfil para revisar listados y verifique plazos y elegibilidad en fuentes oficiales.`,
        translated_faq_json: [
          {
            question: '¿Dónde está ubicada Harvard University?',
            answer:
              'Tiene su sede principal en Cambridge, Massachusetts, con instalaciones adicionales en el área de Boston (Allston, Boston y Longwood).'
          },
          {
            question: '¿Cuándo se fundó Harvard University?',
            answer: 'Se fundó en 1636 y se incorporó en 1650.'
          },
          {
            question: '¿Qué programas ofrece Harvard University?',
            answer:
              'Ofrece pregrado en Harvard College y estudios de posgrado y profesionales en escuelas de negocios, derecho, medicina, salud pública, educación, diseño, gobierno, ingeniería y teología, entre otras.'
          },
          {
            question: '¿Qué es la Harvard Financial Aid Initiative?',
            answer:
              'Es una política de ayuda de Harvard College según la cual familias con ingresos anuales de 85.000 USD o menos no pagan el costo de asistencia.'
          },
          {
            question: '¿ScholarshipTop es el proveedor de la beca?',
            answer:
              'No. ScholarshipTop no es Harvard University y no concede becas directamente. Use este perfil para revisar listados conectados y confirme las reglas finales en la página oficial del proveedor cuando esté disponible.'
          },
          {
            question: '¿Qué debo verificar antes de postular?',
            answer:
              'Confirme la fuente oficial, elegibilidad, fecha límite, documentos, monto, forma de pago, renovación y ruta de solicitud antes de enviar.'
          }
        ]
      },
      fr: {
        translated_title: 'Bourses Harvard University',
        translated_meta_title:
          'Harvard University | Fournisseur de bourses | ScholarshipTop',
        translated_meta_description:
          'Profil bourses et aide financière de Harvard University sur ScholarshipTop. Parcourez les annonces et vérifiez les critères sur les sources officielles.',
        translated_summary:
          'Université privée de recherche à Cambridge (Massachusetts) ; confirmez l’aide et les dates sur les sources officielles.',
        translated_body: `Harvard University est une université privée de recherche à Cambridge, Massachusetts, fondée en 1636 et constituée en corporation en 1650. C’est la plus ancienne institution d’enseignement supérieur des États-Unis. Elle comprend Harvard College pour le premier cycle et des écoles de cycles supérieur et professionnel en management, droit, médecine, santé publique, éducation, design, gouvernement, ingénierie et théologie, entre autres.

Son activité couvre les arts libéraux, la formation professionnelle avancée et la recherche à grande échelle. Harvard indique que plus de 20 000 candidat·e·s à un diplôme y étudient et que son réseau de bibliothèques est le plus grand au monde dans le secteur académique. À titre d’exemple, la Harvard Financial Aid Initiative prévoit que les familles dont le revenu annuel est de 85 000 USD ou moins ne paient pas le coût de scolarité à Harvard College. ScholarshipTop n’accorde pas de bourses Harvard ; utilisez ce profil pour consulter les annonces reliées et vérifiez échéances et éligibilité sur les sources officielles.`,
        translated_faq_json: [
          {
            question: 'Où se trouve Harvard University ?',
            answer:
              'Le campus principal est à Cambridge, Massachusetts, avec des sites supplémentaires dans la région de Boston (Allston, Boston et Longwood).'
          },
          {
            question: 'Quand Harvard University a-t-elle été fondée ?',
            answer: 'Elle a été fondée en 1636 et constituée en 1650.'
          },
          {
            question: 'Quels types de programmes Harvard University propose-t-elle ?',
            answer:
              'Premier cycle via Harvard College et cycles supérieur/professionnel via des écoles de management, droit, médecine, santé publique, éducation, design, gouvernement, ingénierie et théologie, entre autres.'
          },
          {
            question: 'Qu’est-ce que la Harvard Financial Aid Initiative ?',
            answer:
              'Politique d’aide de Harvard College selon laquelle les familles avec un revenu annuel de 85 000 USD ou moins ne paient pas le coût de scolarité.'
          },
          {
            question: 'ScholarshipTop est-il le fournisseur de la bourse ?',
            answer:
              'Non. ScholarshipTop n’est pas Harvard University et n’accorde pas de bourses directement. Utilisez ce profil pour parcourir les annonces reliées, puis confirmez les règles finales sur la page officielle du fournisseur lorsqu’elle est disponible.'
          },
          {
            question: 'Que dois-je vérifier avant de postuler ?',
            answer:
              'Confirmez la source officielle, l’éligibilité, la date limite, les pièces, le montant, le versement, le renouvellement et la procédure de candidature.'
          }
        ]
      }
    },
    'university-of-michigan': {
      es: {
        translated_title: 'Becas University of Michigan',
        translated_meta_title:
          'University of Michigan | Proveedor de becas | ScholarshipTop',
        translated_meta_description:
          'Perfil de becas de University of Michigan en ScholarshipTop. Revise listados y confirme elegibilidad en fuentes oficiales.',
        translated_summary:
          'Universidad pública de investigación en Ann Arbor con campus en Dearborn y Flint; verifique ayuda en fuentes oficiales.',
        translated_body: `University of Michigan es una universidad pública de investigación con sede en Ann Arbor, Michigan, campus adicionales en Dearborn y Flint, y un sistema de salud que incluye Michigan Medicine. Fundada en 1817, es una de las universidades públicas más antiguas de Estados Unidos y atiende estudiantes de pregrado, posgrado y programas profesionales. Su estructura académica en Ann Arbor abarca 19 escuelas y facultades, entre ellas ingeniería, negocios, derecho, medicina, salud pública, educación, enfermería, información y artes.

La institución matricula decenas de miles de estudiantes cada año; solo en Ann Arbor supera los 50.000. Otorga títulos de licenciatura, maestría, doctorado y profesionales y mantiene un volumen de investigación entre los más altos del país. Su alcance incluye bibliotecas, museos, atención clínica, alianzas comunitarias y extensión en todo el estado de Michigan. ScholarshipTop no concede estas becas; confirme requisitos en fuentes oficiales.`,
        translated_faq_json: [
          {
            question: '¿Dónde está University of Michigan?',
            answer:
              'El campus principal está en Ann Arbor, Michigan, con campus también en Dearborn y Flint.'
          },
          {
            question: '¿Cuándo se fundó University of Michigan?',
            answer: 'Se fundó en 1817.'
          },
          {
            question: '¿Qué es el Go Blue Guarantee?',
            answer:
              'Cubre la matrícula completa para estudiantes de pregrado elegibles residentes en el estado con ingresos familiares anuales de 125.000 USD o menos y activos por debajo de 125.000 USD.'
          },
          {
            question:
              '¿Qué funciones cumple University of Michigan además de la enseñanza?',
            answer:
              'Combina educación con investigación, atención al paciente vía Michigan Medicine, bibliotecas y museos, y participación comunitaria en Michigan.'
          },
          {
            question: '¿ScholarshipTop es el proveedor de la beca?',
            answer:
              'No. ScholarshipTop no es University of Michigan y no concede becas directamente. Use este perfil para revisar listados conectados y confirme las reglas finales en la página oficial del proveedor cuando esté disponible.'
          },
          {
            question: '¿Qué debo verificar antes de postular?',
            answer:
              'Confirme la fuente oficial, elegibilidad, fecha límite, documentos, monto, forma de pago, renovación y ruta de solicitud antes de enviar.'
          }
        ]
      },
      fr: {
        translated_title: 'Bourses University of Michigan',
        translated_meta_title:
          'University of Michigan | Fournisseur de bourses | ScholarshipTop',
        translated_meta_description:
          'Profil bourses de University of Michigan sur ScholarshipTop. Parcourez les annonces et vérifiez l’éligibilité sur les sources officielles.',
        translated_summary:
          'Université publique de recherche à Ann Arbor avec campus à Dearborn et Flint ; vérifiez l’aide sur les sources officielles.',
        translated_body: `University of Michigan est une université publique de recherche basée à Ann Arbor, Michigan, avec des campus à Dearborn et Flint et un système de santé incluant Michigan Medicine. Fondée en 1817, elle compte parmi les plus anciennes universités publiques des États-Unis et accueille des étudiant·e·s en premier cycle, cycles supérieurs et formations professionnelles. Sur le campus d’Ann Arbor, 19 écoles et facultés couvrent notamment l’ingénierie, le management, le droit, la médecine, la santé publique, l’éducation, les soins infirmiers, l’information et les arts.

L’établissement inscrit des dizaines de milliers d’étudiant·e·s chaque année — plus de 50 000 à Ann Arbor seul. Il délivre licences, masters, doctorats et diplômes professionnels et soutient un volume de recherche parmi les plus élevés du pays. Son rayonnement inclut bibliothèques, musées, soins cliniques, partenariats locaux et engagement dans tout l’État du Michigan. ScholarshipTop n’accorde pas ces bourses ; confirmez les critères sur les sources officielles.`,
        translated_faq_json: [
          {
            question: 'Où se trouve University of Michigan ?',
            answer:
              'Le campus principal est à Ann Arbor, Michigan, avec des campus à Dearborn et Flint.'
          },
          {
            question: 'Quand University of Michigan a-t-elle été fondée ?',
            answer: 'Elle a été fondée en 1817.'
          },
          {
            question: 'Qu’est-ce que le Go Blue Guarantee ?',
            answer:
              'Il couvre les frais de scolarité pour les étudiant·e·s de premier cycle résident·e·s admissibles dont le revenu familial annuel est de 125 000 USD ou moins et dont les actifs sont inférieurs à 125 000 USD.'
          },
          {
            question:
              'Quelles missions University of Michigan assume-t-elle au-delà des cours ?',
            answer:
              'Elle combine enseignement, recherche, soins via Michigan Medicine, bibliothèques et musées, et engagement communautaire dans tout le Michigan.'
          },
          {
            question: 'ScholarshipTop est-il le fournisseur de la bourse ?',
            answer:
              'Non. ScholarshipTop n’est pas University of Michigan et n’accorde pas de bourses directement. Utilisez ce profil pour parcourir les annonces reliées, puis confirmez les règles finales sur la page officielle du fournisseur lorsqu’elle est disponible.'
          },
          {
            question: 'Que dois-je vérifier avant de postuler ?',
            answer:
              'Confirmez la source officielle, l’éligibilité, la date limite, les pièces, le montant, le versement, le renouvellement et la procédure de candidature.'
          }
        ]
      }
    }
  };

export function buildProviderPilotSeedRows(
  slugToMeta: Map<
    ProviderPilotSlug,
    { id: string; updated_at: string | null }
  >
): ProviderPilotSeedRow[] {
  const rows: ProviderPilotSeedRow[] = [];

  for (const slug of PROVIDER_PILOT_SLUGS) {
    const meta = slugToMeta.get(slug);
    if (!meta) {
      throw new Error(`Missing providers row for pilot slug: ${slug}`);
    }
    const sourceHash = buildProviderSourceHash(meta.id, slug);

    for (const locale of ['es', 'fr'] as const) {
      const content = PILOT_CONTENT[slug][locale];
      rows.push({
        source_type: 'provider_profile',
        source_id: meta.id,
        source_slug: slug,
        locale,
        status: 'published',
        source_hash: sourceHash,
        source_updated_at: meta.updated_at,
        quality_score: QUALITY_SCORE,
        published_at: PUBLISHED_AT,
        translated_slug: null,
        translated_title: content.translated_title,
        translated_meta_title: content.translated_meta_title,
        translated_meta_description: content.translated_meta_description,
        translated_summary: content.translated_summary,
        translated_body: content.translated_body,
        translated_faq_json: content.translated_faq_json,
        translated_extra_json: null
      });
    }
  }

  return rows;
}
