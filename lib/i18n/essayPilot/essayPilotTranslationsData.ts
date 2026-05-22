import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import { buildEssaySourceHash } from '@/lib/i18n/essayPilot/buildEssaySourceHash';
import {
  ESSAY_PILOT_SLUGS,
  type EssayPilotSlug
} from '@/lib/i18n/essayPilot/essayPilotSlugs';

export type EssayPilotSeedRow = {
  source_type: 'essay_guide';
  source_id: string;
  source_slug: EssayPilotSlug;
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

const PUBLISHED_AT = '2026-05-22T20:00:00.000Z';
const QUALITY_SCORE = 90;

type LocaleBlock = {
  translated_title: string;
  translated_meta_title: string;
  translated_meta_description: string;
  translated_summary: string;
  translated_body: string;
  translated_faq_json: { question: string; answer: string }[];
  disclaimer: string;
};

const PILOT: Record<EssayPilotSlug, Record<ContentTranslationLocale, LocaleBlock>> = {
  'how-to-write-about-the-gap-between-expectation-and-reality-of-studying-in-america': {
    es: {
      translated_title:
        'Cómo escribir sobre la brecha entre expectativa y realidad al estudiar en EE. UU.',
      translated_meta_title:
        'Ensayo de beca: expectativa vs. realidad en EE. UU. | ScholarshipTop',
      translated_meta_description:
        'Guía para redactar con honestidad la diferencia entre lo que esperaba de estudiar en Estados Unidos y lo que vivió, sin exagerar ni inventar.',
      translated_summary:
        'Use ejemplos concretos y reflexión equilibrada para explicar cómo cambió su experiencia académica y personal en Estados Unidos.',
      translated_body: `Muchas becas piden que describa la brecha entre lo que esperaba de estudiar en Estados Unidos y lo que encontró. No necesita un drama extremo: necesita claridad, contexto y aprendizaje.

Empiece con una expectativa específica (idioma, carga académica, comunidad, costo de vida o apoyo en el campus). Luego describa qué fue distinto en la práctica, con un ejemplo breve y verificable. Evite generalizar sobre “todos los estadounidenses” o “todos los internacionales”.

Conecte la experiencia con su meta académica o profesional. Explique qué habilidad desarrolló (adaptación, gestión del tiempo, pedir ayuda, trabajar en equipo) y cómo eso le hace más fuerte como candidato, sin prometer resultados garantizados.

Cierre con un plan concreto: qué hará distinto el próximo semestre o cómo usará la beca para cerrar esa brecha. Mantenga un tono respetuoso hacia su institución y confirme fechas, requisitos y montos en la página oficial del proveedor.`,
      translated_faq_json: [
        {
          question: '¿Debo ser negativo sobre mi universidad?',
          answer:
            'No. Sea honesto pero equilibrado: describa retos sin atacar a la institución ni inventar problemas.'
        },
        {
          question: '¿Puedo inventar detalles para sonar más convincente?',
          answer:
            'No. Use hechos reales y verificables; los evaluadores detectan exageraciones.'
        },
        {
          question: '¿Cuánto debe medir el ensayo?',
          answer:
            'Siga el límite de la solicitud. Priorice un arco claro (expectativa → realidad → aprendizaje → plan).'
        }
      ],
      disclaimer:
        'Verifique siempre requisitos y plazos en la fuente oficial de la beca. ScholarshipTop no garantiza resultados.'
    },
    fr: {
      translated_title:
        'Comment écrire sur l’écart entre attentes et réalité des études aux États-Unis',
      translated_meta_title:
        'Essai de bourse : attentes vs réalité aux États-Unis | ScholarshipTop',
      translated_meta_description:
        'Guide pour décrire honnêtement l’écart entre vos attentes et votre expérience réelle d’études aux États-Unis, sans exagération.',
      translated_summary:
        'Utilisez des exemples concrets et une réflexion équilibrée pour expliquer comment votre expérience académique et personnelle a évolué aux États-Unis.',
      translated_body: `De nombreuses bourses demandent d’expliquer l’écart entre ce que vous attendiez des études aux États-Unis et ce que vous avez vécu. Pas besoin de drame : il faut de la clarté, du contexte et un apprentissage identifiable.

Commencez par une attente précise (langue, charge de cours, communauté, coût de la vie, soutien sur le campus). Décrivez ensuite ce qui a été différent en pratique, avec un exemple court et vérifiable. Évitez les généralisations sur « tous les Américains » ou « tous les internationaux ».

Reliez l’expérience à votre objectif académique ou professionnel. Expliquez quelle compétence vous avez développée (adaptation, gestion du temps, demander de l’aide, travail d’équipe) et en quoi cela vous renforce comme candidat·e, sans promettre un résultat garanti.

Concluez avec un plan concret : ce que vous ferez différemment le semestre prochain ou comment la bourse vous aidera à combler cet écart. Gardez un ton respectueux envers votre établissement et confirmez dates, critères et montants sur la page officielle du fournisseur.`,
      translated_faq_json: [
        {
          question: 'Dois-je être négatif·ve envers mon université ?',
          answer:
            'Non. Soyez honnête mais équilibré·e : décrivez des défis sans dénigrer l’établissement ni inventer des problèmes.'
        },
        {
          question: 'Puis-je inventer des détails pour paraître plus convaincant·e ?',
          answer:
            'Non. Utilisez des faits réels et vérifiables ; les jurys repèrent les exagérations.'
        },
        {
          question: 'Quelle longueur pour l’essai ?',
          answer:
            'Respectez la limite du dossier. Privilégiez un arc clair (attente → réalité → apprentissage → plan).'
        }
      ],
      disclaimer:
        'Vérifiez toujours les critères et dates sur la source officielle de la bourse. ScholarshipTop ne garantit aucun résultat.'
    }
  },
  'how-to-write-a-strong-public-policy-scholarship-essay-as-an-international-student': {
    es: {
      translated_title:
        'Ensayo de beca de políticas públicas para estudiantes internacionales',
      translated_meta_title:
        'Ensayo de políticas públicas (internacional) | ScholarshipTop',
      translated_meta_description:
        'Estructura y tono para un ensayo de beca en políticas públicas: problema, evidencia, plan y vínculo con su trayectoria internacional.',
      translated_summary:
        'Defina un problema público concreto, cite hechos verificables y muestre cómo su formación internacional aporta una perspectiva útil.',
      translated_body: `Las becas de políticas públicas buscan claridad analítica, no un manifiesto genérico. Elija un problema acotado (acceso educativo, movilidad, salud local, datos abiertos) y explique por qué le importa con un ejemplo real de su comunidad o país de origen.

Presente 2–3 hechos verificables (estadística, informe, experiencia directa) y evite afirmaciones absolutas. Conecte su trayectoria internacional con lo que aporta: idiomas, comparación entre sistemas, trabajo con datos o voluntariado. No invente cargos ni impactos medidos.

Proponga acciones realistas que podría ejecutar con la beca o durante el programa: investigación, pasantía, proyecto comunitario. Sea específico sobre plazos y resultados esperados, sin prometer cambio garantizado.

Revise tono institucional, ortografía y límites de palabras. Confirme elegibilidad, documentos y fecha límite en la página oficial del proveedor antes de enviar.`,
      translated_faq_json: [
        {
          question: '¿Debo citar leyes o políticas de EE. UU. si soy internacional?',
          answer:
            'Sí si son relevantes al programa, pero centre su experiencia y el problema que conoce; no finja experiencia local que no tiene.'
        },
        {
          question: '¿Puedo usar jerga académica?',
          answer:
            'Use términos precisos, pero defina conceptos clave para un lector general.'
        },
        {
          question: '¿Qué error descalifica más rápido?',
          answer:
            'Prometer impacto garantizado o copiar plantillas genéricas sin vínculo con su perfil.'
        }
      ],
      disclaimer:
        'Confirme requisitos y plazos en la fuente oficial. ScholarshipTop no concede becas.'
    },
    fr: {
      translated_title:
        'Essai de bourse en politiques publiques pour étudiant·e·s internationaux',
      translated_meta_title:
        'Essai politiques publiques (international) | ScholarshipTop',
      translated_meta_description:
        'Structure et ton pour un essai de bourse en politiques publiques : problème, preuves, plan et lien avec votre parcours international.',
      translated_summary:
        'Définissez un problème public précis, citez des faits vérifiables et montrez ce que votre parcours international apporte.',
      translated_body: `Les bourses en politiques publiques valorisent la clarté analytique, pas un manifeste générique. Choisissez un problème ciblé (accès à l’éducation, mobilité, santé locale, open data) et expliquez pourquoi il compte avec un exemple réel de votre communauté ou pays d’origine.

Présentez 2–3 faits vérifiables (statistique, rapport, expérience directe) et évitez les affirmations absolues. Reliez votre parcours international à votre apport : langues, comparaison de systèmes, travail sur données ou engagement associatif. N’inventez pas de titres ni d’impacts chiffrés.

Proposez des actions réalistes réalisables avec la bourse ou pendant le programme : recherche, stage, projet communautaire. Soyez précis·e sur les délais et résultats attendus, sans promettre un changement garanti.

Relisez le ton institutionnel, l’orthographe et la limite de mots. Confirmez éligibilité, pièces et date limite sur la page officielle du fournisseur avant envoi.`,
      translated_faq_json: [
        {
          question: 'Dois-je citer des lois américaines si je suis international·e ?',
          answer:
            'Oui si c’est pertinent au programme, mais ancrez votre expérience et le problème que vous connaissez ; ne simulez pas une expertise locale inexistante.'
        },
        {
          question: 'Puis-je utiliser du jargon académique ?',
          answer:
            'Soyez précis·e, mais définissez les concepts clés pour un lecteur généraliste.'
        },
        {
          question: 'Quelle erreur élimine le plus vite ?',
          answer:
            'Promettre un impact garanti ou recycler un modèle générique sans lien avec votre profil.'
        }
      ],
      disclaimer:
        'Vérifiez critères et dates sur la source officielle. ScholarshipTop n’accorde pas de bourses.'
    }
  },
  'how-to-write-richard-r-tufenkian-scholarship-details-scholarship-essay': {
    es: {
      translated_title: 'Cómo escribir el ensayo de la beca Richard R. Tufenkian',
      translated_meta_title:
        'Ensayo beca Richard R. Tufenkian | ScholarshipTop',
      translated_meta_description:
        'Guía para alinear su ensayo con los detalles publicados de la beca Richard R. Tufenkian sin inventar requisitos ni montos.',
      translated_summary:
        'Revise el listado oficial, refleje elegibilidad y motivación con hechos verificables y un plan académico claro.',
      translated_body: `Antes de escribir, abra la página oficial de la beca Richard R. Tufenkian y anote elegibilidad, documentos, fecha límite y criterios de evaluación. Su ensayo debe reflejar esos puntos, no suposiciones de terceros.

En la introducción, declare su programa o campo y por qué esta beca encaja con su trayectoria. Use un ejemplo breve de logro académico, servicio o proyecto que pueda verificarse. No invente cifras de impacto ni cargos.

En el desarrollo, conecte metas a corto plazo (curso, investigación, idioma) con metas a largo plazo (carrera, comunidad). Explique cómo el apoyo financiero reduce una barrera concreta (matrícula, materiales, desplazamiento) sin afirmar que la adjudicación está garantizada.

Cierre reforzando compromiso y agradecimiento profesional. Pida a un revisor que confirme nombres propios (Richard R. Tufenkian) y fechas en la fuente oficial. ScholarshipTop no concede esta beca.`,
      translated_faq_json: [
        {
          question: '¿Debo repetir el nombre completo de la beca?',
          answer:
            'Sí, de forma correcta y natural; evite errores ortográficos del patrocinador.'
        },
        {
          question: '¿Puedo copiar texto de ScholarshipTop como oficial?',
          answer:
            'Use ScholarshipTop para orientarse, pero confirme siempre en el sitio del proveedor.'
        },
        {
          question: '¿Qué pasa si falta información en el listado?',
          answer:
            'Indique la laguna y cite solo lo que está publicado; no rellene con suposiciones.'
        }
      ],
      disclaimer:
        'Verifique monto, plazo y elegibilidad en la página oficial del proveedor.'
    },
    fr: {
      translated_title: 'Rédiger l’essai de la bourse Richard R. Tufenkian',
      translated_meta_title:
        'Essai bourse Richard R. Tufenkian | ScholarshipTop',
      translated_meta_description:
        'Guide pour aligner votre essai sur les détails publiés de la bourse Richard R. Tufenkian sans inventer critères ni montants.',
      translated_summary:
        'Consultez l’annonce officielle, reflétez l’éligibilité et la motivation avec des faits vérifiables et un plan académique clair.',
      translated_body: `Avant d’écrire, ouvrez la page officielle de la bourse Richard R. Tufenkian et notez éligibilité, pièces, date limite et critères d’évaluation. Votre essai doit refléter ces éléments, pas des suppositions tierces.

Dans l’introduction, précisez votre programme ou domaine et pourquoi cette bourse correspond à votre parcours. Donnez un exemple court de réussite académique, d’engagement ou de projet vérifiable. N’inventez pas de chiffres d’impact ni de titres.

Dans le développement, reliez objectifs à court terme (cours, recherche, langue) et à long terme (carrière, communauté). Expliquez comment l’aide financière réduit un obstacle concret (frais, matériel, déplacement) sans affirmer que l’attribution est garantie.

Concluez avec engagement et remerciement professionnel. Faites relire l’orthographe du nom Richard R. Tufenkian et les dates sur la source officielle. ScholarshipTop n’accorde pas cette bourse.`,
      translated_faq_json: [
        {
          question: 'Dois-je répéter le nom complet de la bourse ?',
          answer:
            'Oui, correctement et naturellement ; évitez les fautes sur le nom du sponsor.'
        },
        {
          question: 'Puis-je copier ScholarshipTop comme source officielle ?',
          answer:
            'Utilisez ScholarshipTop pour vous orienter, mais confirmez toujours sur le site du fournisseur.'
        },
        {
          question: 'Que faire si l’annonce manque d’informations ?',
          answer:
            'Signalez le manque et ne citez que ce qui est publié ; ne comblez pas par des suppositions.'
        }
      ],
      disclaimer:
        'Vérifiez montant, date limite et éligibilité sur la page officielle du fournisseur.'
    }
  }
};

export function buildEssayPilotSeedRows(
  slugToMeta: Map<EssayPilotSlug, { id: string; updated_at: string | null }>
): EssayPilotSeedRow[] {
  const rows: EssayPilotSeedRow[] = [];
  for (const slug of ESSAY_PILOT_SLUGS) {
    const meta = slugToMeta.get(slug);
    if (!meta) continue;
    for (const locale of ['es', 'fr'] as const) {
      const block = PILOT[slug][locale];
      rows.push({
        source_type: 'essay_guide',
        source_id: meta.id,
        source_slug: slug,
        locale,
        status: 'published',
        source_hash: buildEssaySourceHash(meta.id, slug),
        source_updated_at: meta.updated_at,
        quality_score: QUALITY_SCORE,
        published_at: PUBLISHED_AT,
        translated_slug: null,
        translated_title: block.translated_title,
        translated_meta_title: block.translated_meta_title,
        translated_meta_description: block.translated_meta_description,
        translated_summary: block.translated_summary,
        translated_body: block.translated_body,
        translated_faq_json: block.translated_faq_json,
        translated_extra_json: { disclaimer: block.disclaimer }
      });
    }
  }
  return rows;
}
