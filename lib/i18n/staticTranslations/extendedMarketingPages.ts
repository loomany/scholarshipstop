import type { PageDraft } from '@/lib/i18n/staticTranslations/types';
import { ES_DISCLAIMER, FR_DISCLAIMER } from '@/lib/i18n/staticTranslations/common';

const marketingEs = (
  path: string,
  draft: Omit<PageDraft, 'bucket' | 'kind' | 'disclaimer'>
): [string, PageDraft] => [
  path,
  { bucket: 'core', kind: 'marketing', disclaimer: ES_DISCLAIMER, ...draft }
];

const marketingFr = (
  path: string,
  draft: Omit<PageDraft, 'bucket' | 'kind' | 'disclaimer'>
): [string, PageDraft] => [
  path,
  { bucket: 'core', kind: 'marketing', disclaimer: FR_DISCLAIMER, ...draft }
];

export const extendedMarketingEsPages: Partial<Record<string, PageDraft>> =
  Object.fromEntries([
    marketingEs('/international-students', {
      title: 'Becas para estudiantes internacionales en EE. UU. 2026 | ScholarshipTop',
      metaDescription:
        'Encuentra becas abiertas a estudiantes internacionales y titulares de visa F1 en EE. UU. Filtra por elegibilidad, país y nivel. Listados actualizados con enlaces oficiales.',
      h1: 'Encuentra becas a las que realmente puedes postular',
      eyebrow: 'Estudiantes internacionales',
      intro:
        'Deja de perder tiempo en becas para las que no calificas. Mostramos solo oportunidades abiertas a estudiantes internacionales.',
      sections: [
        {
          title: 'Por qué cuesta encontrar becas siendo internacional',
          body:
            'Muchas becas son solo para ciudadanos de EE. UU., los grandes sitios mezclan todo y las fechas se pierden mientras sigues buscando.',
          bullets: [
            'Reglas de elegibilidad al final del formulario',
            'Pocos filtros claros para visa F1',
            'Fechas que vencen durante la búsqueda'
          ]
        },
        {
          title: 'Hecho para estudiantes internacionales',
          body:
            'Resultados solo internacionales, coincidencias según tu perfil y alertas de fechas para no perder plazos.',
          bullets: [
            'Solo becas que aceptan internacionales',
            'Coincidencias según tu perfil',
            'Recordatorios de fechas'
          ]
        },
        {
          title: 'Qué obtienes con ScholarshipTop',
          body:
            'Menos tiempo leyendo reglas inútiles, solicitudes más rápidas y fechas más claras.',
          bullets: [
            'Solo becas para las que probablemente calificas',
            'Menos tiempo en reglas repetidas',
            'Solicitudes más rápidas',
            'Fechas claras'
          ]
        },
        {
          title: 'Becas reales a las que puedes postular',
          body:
            'Desde mérito universitario hasta fundaciones privadas, corporativas y becas sin ensayo para armar tu pipeline.',
          bullets: [
            'Becas por mérito universitario',
            'Fundaciones privadas sin requisito de ciudadanía',
            'Becas corporativas STEM',
            'Oportunidades sin ensayo de aplicación rápida'
          ]
        }
      ],
      cards: [
        {
          title: 'Becas por mérito universitario',
          body: 'Muchas universidades de EE. UU. ofrecen ayuda por mérito abierta a postulantes internacionales; suelen ser los premios más grandes.',
          href: '/scholarships/hub/international-friendly'
        },
        {
          title: 'Fundaciones privadas',
          body: 'Fundaciones independientes financian becas sin requisito de ciudadanía; seguimos cientos de estas oportunidades.',
          href: '/scholarships'
        },
        {
          title: 'Becas corporativas',
          body: 'Empresas como Google o Boeing ejecutan programas abiertos a estudiantes internacionales STEM.',
          href: '/scholarships/category/stem'
        },
        {
          title: 'Becas sin ensayo',
          body: 'Oportunidades de aplicación rápida con requisitos mínimos para complementar tu plan.',
          href: '/scholarships/no-essay'
        }
      ],
      links: [
        { href: '/get-scholarships', label: 'Encontrar mis becas' },
        { href: '/scholarships/hub/international-friendly', label: 'Becas amigables para internacionales' }
      ],
      faq: [
        {
          question: '¿Puedo postular a becas en EE. UU. con visa F1?',
          answer:
            'Sí. Muchas becas privadas, de fundaciones y programas universitarios abren a titulares F1. La clave es encontrar las que permiten explícitamente no ciudadanos, que es lo que hace nuestro filtro.'
        },
        {
          question: '¿Existen becas totalmente financiadas para internacionales?',
          answer:
            'Sí, aunque son competitivas. Programas como Fulbright u ofertas universitarias específicas pueden cubrir matrícula y manutención. Las listamos e indicamos cuando abren a tu país.'
        },
        {
          question: '¿En qué se diferencia ScholarshipTop de Fastweb o Scholarships.com?',
          answer:
            'Esas plataformas mezclan todo sin un filtro internacional limpio. Construimos un camino dedicado para que solo veas lo que realmente puedes solicitar.'
        }
      ]
    }),
    marketingEs('/for-organizations', {
      title: 'Para organizaciones | ScholarshipTop',
      metaDescription:
        'ScholarshipTop conecta universidades y fundaciones con estudiantes motivados en todo el mundo. Publica tus becas en un lugar de confianza.',
      h1: 'Llega a talento global',
      eyebrow: 'Universidades y fundaciones',
      intro:
        'ScholarshipTop es la mejor forma de poner tus programas frente a estudiantes que ya buscan financiamiento, para encontrar postulantes más fuertes sin ruido extra.',
      sections: [
        {
          title: 'Por qué nosotros',
          body: 'Construido para resultados: relevancia para estudiantes, visibilidad para tus programas.',
          bullets: [
            'Audiencia dirigida según criterios',
            'Alcance global en más de 50 países',
            'Gestión simple con flujo optimizado'
          ]
        },
        {
          title: 'Cómo funciona',
          body: 'Tres pasos simples del formulario al listado en vivo.',
          bullets: [
            'Completa el formulario con detalles del programa',
            'Moderación rápida para verificar legitimidad',
            'Los estudiantes descubren tu beca y aplican por tus canales'
          ]
        }
      ],
      cards: [
        {
          title: 'Audiencia dirigida',
          body: 'Tus programas llegan a estudiantes que coinciden con tus criterios para postulaciones más significativas.'
        },
        {
          title: 'Alcance global',
          body: 'Conecta con estudiantes de más de 50 países que usan ScholarshipTop para descubrir financiamiento.'
        },
        {
          title: 'Gestión simple',
          body: 'Flujo optimizado hoy, con panel para seguir interés y solicitudes próximamente.',
          href: '/submit-grant'
        }
      ],
      links: [
        { href: '/submit-grant', label: 'Publicar una beca' },
        { href: '/help', label: 'Ayuda' }
      ],
      faq: [
        {
          question: '¿Cuánto cuesta publicar una beca?',
          answer:
            'El precio puede variar según programa y volumen. Contáctanos por el flujo de envío de becas y compartiremos opciones actuales.'
        },
        {
          question: '¿Cuánto tarda la moderación?',
          answer:
            'La mayoría se revisa en pocos días hábiles. Listados complejos o con datos faltantes pueden tardar más; te contactaremos si necesitamos aclaración.'
        },
        {
          question: '¿Puedo editar una beca después de publicarla?',
          answer:
            'Sí. Las actualizaciones pasan por una revisión rápida para que los estudiantes vean fechas y requisitos correctos.'
        },
        {
          question: '¿Quién puede publicar becas?',
          answer:
            'Instituciones acreditadas, fundaciones de becas y otros financiadores legítimos de educación. Verificamos la identidad del publicador.'
        }
      ]
    }),
    marketingEs('/submit-grant', {
      title: 'Solicitar cuenta de organización | ScholarshipTop',
      metaDescription:
        'Solicita una cuenta verificada de organización en ScholarshipTop para publicar y gestionar programas de becas.',
      h1: 'Solicitar cuenta de organización',
      eyebrow: 'Socios',
      intro:
        'Únete a ScholarshipTop como socio verificado. Solicita una cuenta para acceder al panel de tu organización, donde puedes publicar, gestionar y actualizar tus programas de becas.',
      sections: [
        {
          title: 'Beneficios para socios',
          body:
            'Perfil verificado, gestión centralizada de becas, alcance dirigido y soporte prioritario del equipo de ScholarshipTop.'
        },
        {
          title: 'Siguiente paso',
          body:
            'Completa la solicitud de acceso de socio. También puedes empezar desde la página Para organizaciones si prefieres revisar el proceso primero.'
        }
      ],
      cards: [
        {
          title: 'Perfil verificado',
          body: 'Una página dedicada para tu universidad o fundación.'
        },
        {
          title: 'Gestión sencilla',
          body: 'Publica, edita y gestiona tus becas en un solo lugar.'
        },
        {
          title: 'Alcance dirigido',
          body: 'Tus becas llegan a los candidatos adecuados.'
        },
        {
          title: 'Soporte prioritario',
          body: 'Asistencia directa de nuestro equipo.',
          href: '/help'
        }
      ],
      links: [
        { href: '/for-organizations', label: 'Para organizaciones' },
        { href: '/help', label: 'Ayuda' }
      ],
      faq: [
        {
          question: '¿Quién puede solicitar una cuenta?',
          answer:
            'Universidades acreditadas, fundaciones y otros financiadores legítimos de educación que quieran publicar becas verificadas.'
        },
        {
          question: '¿Cuánto tarda la verificación?',
          answer:
            'La mayoría de solicitudes se revisan en pocos días hábiles. Te contactaremos si necesitamos más información.'
        }
      ]
    })
  ]);

export const extendedMarketingFrPages: Partial<Record<string, PageDraft>> =
  Object.fromEntries([
    marketingFr('/international-students', {
      title: 'Bourses pour étudiants internationaux aux États-Unis 2026 | ScholarshipTop',
      metaDescription:
        'Trouvez des bourses ouvertes aux étudiants internationaux et titulaires de visa F1 aux États-Unis. Filtrez par admissibilité, pays et niveau.',
      h1: 'Trouvez des bourses auxquelles vous pouvez vraiment postuler',
      eyebrow: 'Étudiants internationaux',
      intro:
        'Arrêtez de perdre du temps sur des bourses pour lesquelles vous n’êtes pas admissible. Nous montrons seulement les opportunités ouvertes aux étudiants internationaux.',
      sections: [
        {
          title: 'Pourquoi il est difficile de trouver des bourses en tant qu’international',
          body:
            'Beaucoup de bourses sont réservées aux citoyens américains, les grands sites mélangent tout et les dates passent pendant la recherche.',
          bullets: [
            'Règles d’admissibilité lues trop tard',
            'Peu de filtres clairs pour visa F1',
            'Dates manquées pendant la recherche'
          ]
        },
        {
          title: 'Conçu pour les étudiants internationaux',
          body:
            'Résultats internationaux uniquement, correspondances selon votre profil et alertes de dates.',
          bullets: [
            'Seulement des bourses ouvertes aux internationaux',
            'Correspondances selon votre profil',
            'Rappels de dates'
          ]
        },
        {
          title: 'Ce que vous obtenez avec ScholarshipTop',
          body:
            'Moins de temps sur des règles inutiles, candidatures plus rapides et dates plus claires.',
          bullets: [
            'Seulement des bourses probablement adaptées',
            'Moins de temps sur les règles répétées',
            'Candidatures plus rapides',
            'Dates claires'
          ]
        },
        {
          title: 'De vraies bourses auxquelles postuler',
          body:
            'Du mérite universitaire aux fondations privées, bourses d’entreprises et bourses sans rédaction pour compléter votre plan.',
          bullets: [
            'Bourses au mérite universitaire',
            'Fondations privées sans exigence de citoyenneté',
            'Bourses d’entreprises STEM',
            'Opportunités sans rédaction à candidature rapide'
          ]
        }
      ],
      cards: [
        {
          title: 'Bourses au mérite universitaire',
          body: 'Beaucoup d’universités américaines offrent une aide au mérite ouverte aux internationaux ; ce sont souvent les plus gros prix.',
          href: '/scholarships/hub/international-friendly'
        },
        {
          title: 'Fondations privées',
          body: 'Des fondations indépendantes financent des bourses sans exigence de citoyenneté ; nous en suivons des centaines.',
          href: '/scholarships'
        },
        {
          title: 'Bourses d’entreprises',
          body: 'Des entreprises comme Google ou Boeing proposent des programmes ouverts aux internationaux STEM.',
          href: '/scholarships/category/stem'
        },
        {
          title: 'Bourses sans rédaction',
          body: 'Opportunités à candidature rapide avec peu d’exigences pour compléter votre plan.',
          href: '/scholarships/no-essay'
        }
      ],
      links: [
        { href: '/get-scholarships', label: 'Trouver mes bourses' },
        { href: '/scholarships/hub/international-friendly', label: 'Bourses international-friendly' }
      ],
      faq: [
        {
          question: 'Puis-je postuler aux bourses américaines avec un visa F1 ?',
          answer:
            'Oui. Beaucoup de bourses privées, de fondations et d’universités ouvrent aux titulaires F1. L’essentiel est de trouver celles qui autorisent explicitement les non-citoyens, ce que fait notre filtre.'
        },
        {
          question: 'Existe-t-il des bourses entièrement financées pour internationaux ?',
          answer:
            'Oui, mais elles sont compétitives. Des programmes comme Fulbright ou des offres universitaires peuvent couvrir frais et vie. Nous les listons et indiquons quand ils ouvrent à votre pays.'
        },
        {
          question: 'En quoi ScholarshipTop diffère-t-il de Fastweb ou Scholarships.com ?',
          answer:
            'Ces plateformes mélangent tout sans filtre international propre. Nous avons construit un parcours dédié pour ne montrer que ce que vous pouvez réellement postuler.'
        }
      ]
    }),
    marketingFr('/for-organizations', {
      title: 'Pour les organisations | ScholarshipTop',
      metaDescription:
        'ScholarshipTop relie universités et fondations à des étudiants motivés dans le monde. Publiez vos bourses en un lieu de confiance.',
      h1: 'Touchez des talents mondiaux',
      eyebrow: 'Universités et fondations',
      intro:
        'ScholarshipTop est le meilleur moyen de placer vos programmes devant des étudiants qui cherchent déjà du financement, pour des candidatures plus solides sans bruit inutile.',
      sections: [
        {
          title: 'Pourquoi nous',
          body: 'Conçu pour les résultats : pertinence pour les étudiants, visibilité pour vos programmes.',
          bullets: [
            'Audience ciblée selon vos critères',
            'Portée mondiale dans plus de 50 pays',
            'Gestion simple avec flux optimisé'
          ]
        },
        {
          title: 'Comment ça marche',
          body: 'Trois étapes simples du formulaire à la fiche en ligne.',
          bullets: [
            'Remplissez le formulaire avec les détails du programme',
            'Modération rapide pour vérifier la légitimité',
            'Les étudiants découvrent votre bourse et postulent via vos canaux'
          ]
        }
      ],
      cards: [
        {
          title: 'Audience ciblée',
          body: 'Vos programmes atteignent des étudiants qui correspondent à vos critères pour des candidatures plus pertinentes.'
        },
        {
          title: 'Portée mondiale',
          body: 'Connectez-vous à des étudiants de plus de 50 pays qui utilisent ScholarshipTop pour trouver du financement.'
        },
        {
          title: 'Gestion simple',
          body: 'Flux optimisé aujourd’hui, avec tableau de bord pour suivre l’intérêt et les candidatures bientôt.',
          href: '/submit-grant'
        }
      ],
      links: [
        { href: '/submit-grant', label: 'Publier une bourse' },
        { href: '/help', label: 'Aide' }
      ],
      faq: [
        {
          question: 'Combien coûte la publication d’une bourse ?',
          answer:
            'Le tarif peut varier selon le programme et le volume. Contactez-nous via le flux de soumission et nous partagerons les options actuelles.'
        },
        {
          question: 'Combien de temps prend la modération ?',
          answer:
            'La plupart sont revues en quelques jours ouvrables. Les fiches complexes ou incomplètes peuvent prendre plus ; nous vous contacterons si besoin.'
        },
        {
          question: 'Puis-je modifier une bourse après publication ?',
          answer:
            'Oui. Les mises à jour passent par une revue rapide pour que les étudiants voient dates et exigences correctes.'
        },
        {
          question: 'Qui peut publier des bourses ?',
          answer:
            'Établissements accrédités, fondations de bourses et autres financeurs légitimes de l’éducation. Nous vérifions l’identité du publieur.'
        }
      ]
    }),
    marketingFr('/submit-grant', {
      title: 'Demander un compte organisation | ScholarshipTop',
      metaDescription:
        'Demandez un compte organisation vérifié sur ScholarshipTop pour publier et gérer des programmes de bourses.',
      h1: 'Demander un compte organisation',
      eyebrow: 'Partenaires',
      intro:
        'Rejoignez ScholarshipTop en tant que partenaire vérifié. Demandez un compte pour accéder au tableau de bord de votre organisation afin de publier, gérer et mettre à jour vos programmes de bourses.',
      sections: [
        {
          title: 'Avantages partenaires',
          body:
            'Profil vérifié, gestion centralisée des bourses, portée ciblée et support prioritaire de l’équipe ScholarshipTop.'
        },
        {
          title: 'Étape suivante',
          body:
            'Complétez la demande d’accès partenaire. Vous pouvez aussi commencer depuis la page Pour les organisations pour revoir le processus.'
        }
      ],
      cards: [
        {
          title: 'Profil vérifié',
          body: 'Une page dédiée pour votre université ou fondation.'
        },
        {
          title: 'Gestion facile',
          body: 'Publiez, modifiez et gérez vos bourses au même endroit.'
        },
        {
          title: 'Portée ciblée',
          body: 'Vos bourses atteignent les bons candidats.'
        },
        {
          title: 'Support prioritaire',
          body: 'Assistance directe de notre équipe.',
          href: '/help'
        }
      ],
      links: [
        { href: '/for-organizations', label: 'Pour les organisations' },
        { href: '/help', label: 'Aide' }
      ],
      faq: [
        {
          question: 'Qui peut demander un compte ?',
          answer:
            'Universités accréditées, fondations et autres financeurs légitimes de l’éducation souhaitant publier des bourses vérifiées.'
        },
        {
          question: 'Combien de temps prend la vérification ?',
          answer:
            'La plupart des demandes sont revues en quelques jours ouvrables. Nous vous contacterons si nous avons besoin d’informations supplémentaires.'
        }
      ]
    })
  ]);
