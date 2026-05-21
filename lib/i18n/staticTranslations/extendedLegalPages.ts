import type { PageDraft } from '@/lib/i18n/staticTranslations/types';
import { ES_DISCLAIMER, FR_DISCLAIMER } from '@/lib/i18n/staticTranslations/common';

const legalEs = (
  path: string,
  draft: Omit<PageDraft, 'bucket' | 'kind' | 'disclaimer' | 'lastUpdatedLabel' | 'links'>
): [string, PageDraft] => [
  path,
  {
    ...draft,
    bucket: 'core',
    kind: 'legal',
    lastUpdatedLabel: 'Última actualización: 9 de abril de 2026',
    disclaimer: ES_DISCLAIMER,
    links: [{ href: '/', label: 'Volver al inicio' }]
  }
];

const legalFr = (
  path: string,
  draft: Omit<PageDraft, 'bucket' | 'kind' | 'disclaimer' | 'lastUpdatedLabel' | 'links'>
): [string, PageDraft] => [
  path,
  {
    ...draft,
    bucket: 'core',
    kind: 'legal',
    lastUpdatedLabel: 'Dernière mise à jour : 9 avril 2026',
    disclaimer: FR_DISCLAIMER,
    links: [{ href: '/', label: 'Retour à l’accueil' }]
  }
];

export const extendedLegalEsPages: Partial<Record<string, PageDraft>> = Object.fromEntries([
  legalEs('/terms', {
    title: 'Términos de servicio | ScholarshipTop',
    metaDescription: 'Términos de uso de ScholarshipTop.',
    h1: 'Términos de servicio',
    eyebrow: 'Legal',
    intro:
      'Estos Términos de servicio rigen tu acceso y uso de ScholarshipTop, un servicio operado por Daur M. (Freebee KZ). Al usar ScholarshipTop, aceptas estos Términos.',
    sections: [
      {
        title: '1. Uso del servicio',
        body:
          'ScholarshipTop ofrece listados de becas, filtros, recomendaciones basadas en perfil y herramientas relacionadas. Puedes usar el servicio solo para fines legales y personales.'
      },
      {
        title: '2. Sin garantía de resultados',
        body:
          'ScholarshipTop no garantiza elegibilidad, aceptación por un proveedor, decisiones de financiamiento ni resultados de premios. Todas las decisiones las toman los proveedores de becas.'
      },
      {
        title: '3. Información del usuario',
        body:
          'Eres responsable de proporcionar información precisa en tu cuenta y perfil. Datos incorrectos o incompletos pueden afectar recomendaciones y coincidencias.'
      },
      {
        title: '4. Cuentas',
        body:
          'Si creas una cuenta, eres responsable de mantener la confidencialidad de tus credenciales y de la actividad bajo tu cuenta.'
      },
      {
        title: '5. Listados de becas',
        body:
          'ScholarshipTop puede mostrar información de diversas fuentes. Buscamos mantener listados útiles y actuales, pero no garantizamos que toda la información esté completa o actualizada en todo momento. Revisa los detalles antes de aplicar.'
      },
      {
        title: '6. Uso aceptable',
        body:
          'Aceptas no hacer un uso indebido de la plataforma, intentar acceso no autorizado, copiar o explotar el servicio de forma dañina ni interferir con su seguridad u operación.'
      },
      {
        title: '7. Funciones de pago y facturación',
        body:
          'ScholarshipTop ofrece suscripciones y funciones premium a través de Daur M. (Freebee KZ). Los pagos los procesa LemonSqueezy como comerciante registrado. Cancelaciones, disputas y reembolsos se rigen por nuestra Política de reembolsos.'
      },
      {
        title: '8. Propiedad intelectual',
        body:
          'El sitio, diseño, textos, marca y contenido relacionado pertenecen a Daur M. (Freebee KZ) o se usan con permiso. No puedes reproducir ni distribuir contenido protegido sin autorización.'
      },
      {
        title: '9. Descargo de responsabilidad',
        body:
          'ScholarshipTop se proporciona «tal cual» y «según disponibilidad». No garantizamos acceso ininterrumpido, rendimiento sin errores ni resultados específicos del uso del servicio.'
      },
      {
        title: '10. Limitación de responsabilidad',
        body:
          'En la máxima medida permitida por la ley, Daur M. (Freebee KZ) no será responsable por daños indirectos, incidentales, especiales, consecuentes o basados en confianza derivados del uso del servicio.'
      },
      {
        title: '11. Cambios a estos Términos',
        body:
          'Podemos actualizar estos Términos periódicamente. Publicaremos la versión revisada en esta página y actualizaremos la fecha de última actualización.'
      },
      {
        title: '12. Contacto',
        body: 'Correo: support@scholarshiptop.com'
      }
    ],
    faq: [
      {
        question: '¿ScholarshipTop concede becas?',
        answer:
          'No. ScholarshipTop ayuda a descubrir y organizar oportunidades; los proveedores oficiales toman las decisiones finales.'
      },
      {
        question: '¿Dónde están las reglas de reembolso?',
        answer: 'Consulta nuestra Política de reembolsos en /refund-policy para suscripciones y pagos.'
      }
    ]
  }),
  legalEs('/privacy-policy', {
    title: 'Política de privacidad | ScholarshipTop',
    metaDescription: 'Política de privacidad de ScholarshipTop.',
    h1: 'Política de privacidad',
    eyebrow: 'Legal',
    intro:
      'ScholarshipTop, operado por Daur M. (Freebee KZ), valora tu privacidad. Esta política explica qué información recopilamos, cómo la usamos y cómo la protegemos.',
    sections: [
      {
        title: '1. Información que recopilamos',
        body:
          'Podemos recopilar información que nos proporcionas directamente, como nombre, correo, detalles de perfil académico, información de cuenta y mensajes de contacto. También podemos recopilar datos técnicos limitados automáticamente, como tipo de navegador, dispositivo, dirección IP, páginas visitadas y actividad de uso.'
      },
      {
        title: '2. Cómo usamos tu información',
        body:
          'Podemos usar tu información para crear y administrar tu cuenta, personalizar recomendaciones, mejorar búsqueda y experiencia, comunicarnos contigo, mantener seguridad y analizar el uso del producto.'
      },
      {
        title: '3. Datos de becas y recomendaciones',
        body:
          'ScholarshipTop puede mostrar listados, filtros y recomendaciones según tu perfil. Buscamos mejorar relevancia y precisión, pero no garantizamos elegibilidad, decisiones de premios ni resultados de aceptación.'
      },
      {
        title: '4. Cookies y analítica',
        body:
          'Podemos usar cookies o tecnologías similares para mejorar el rendimiento, recordar preferencias y entender cómo los usuarios interactúan con el servicio.'
      },
      {
        title: '5. Cómo compartimos información',
        body:
          'No vendemos tu información personal. Podemos compartir datos limitados con proveedores que nos ayudan a operar el sitio (alojamiento, analítica, autenticación, base de datos, pagos) según sea necesario. Los pagos los procesa LemonSqueezy; no almacenamos datos de tarjeta. También podemos divulgar información si la ley lo exige o para proteger derechos, usuarios o la plataforma.'
      },
      {
        title: '6. Almacenamiento y seguridad',
        body:
          'Tomamos medidas razonables para proteger tu información, pero ningún método de transmisión o almacenamiento es completamente seguro y no podemos garantizar seguridad absoluta.'
      },
      {
        title: '7. Tus opciones',
        body:
          'Puedes actualizar o corregir tu perfil, dejar de usar el servicio en cualquier momento y contactarnos sobre tu cuenta o datos personales.'
      },
      {
        title: '8. Privacidad de menores',
        body:
          'ScholarshipTop está pensado para estudiantes que investigan becas. Si crees que se envió información personal de forma inapropiada, contáctanos para revisarlo.'
      },
      {
        title: '9. Cambios a esta política',
        body:
          'Podemos actualizar esta Política de privacidad. Publicaremos la versión actualizada en esta página y actualizaremos la fecha de última actualización.'
      },
      {
        title: '10. Contáctanos',
        body: 'Correo: support@scholarshiptop.com'
      }
    ],
    faq: [
      {
        question: '¿Venden mis datos?',
        answer: 'No vendemos tu información personal.'
      },
      {
        question: '¿Quién procesa los pagos?',
        answer:
          'LemonSqueezy procesa los pagos. No almacenamos los datos de tu tarjeta en ScholarshipTop.'
      }
    ]
  }),
  legalEs('/refund-policy', {
    title: 'Política de reembolsos | ScholarshipTop',
    metaDescription: 'Política de reembolsos de Daur M. (Freebee KZ) y ScholarshipTop.',
    h1: 'Política de reembolsos',
    eyebrow: 'Legal',
    intro:
      'En ScholarshipTop, operado por Daur M. (Freebee KZ), queremos que estés satisfecho con nuestro servicio.',
    sections: [
      {
        title: '1. Ventana de reembolso',
        body:
          'Puedes solicitar un reembolso completo dentro de los 14 días posteriores a tu compra inicial si no has usado extensivamente la base de datos.'
      },
      {
        title: '2. Prueba gratuita',
        body:
          'Si estás en una prueba gratuita de 3 días, puedes cancelar en cualquier momento antes de que termine para evitar cargos.'
      },
      {
        title: '3. Cómo solicitar',
        body:
          'Para solicitar un reembolso o cancelar tu suscripción, escríbenos a support@scholarshiptop.com.'
      },
      {
        title: '4. Procesamiento',
        body: 'Los reembolsos se procesan a través de nuestro proveedor de pagos, LemonSqueezy.'
      }
    ],
    faq: [
      {
        question: '¿Cuánto tarda un reembolso?',
        answer:
          'Los tiempos dependen de LemonSqueezy y de tu banco. Contáctanos si necesitas seguimiento.'
      },
      {
        question: '¿Los reembolsos aplican a becas?',
        answer:
          'No. Esta política cubre suscripciones y funciones de pago de ScholarshipTop, no premios de proveedores externos.'
      }
    ]
  }),
  legalEs('/help', {
    title: 'Ayuda | ScholarshipTop',
    metaDescription: 'Ayuda y soporte para usuarios de ScholarshipTop.',
    h1: 'Ayuda',
    eyebrow: 'Soporte',
    intro:
      '¿Necesitas ayuda con ScholarshipTop? Esta página explica lo básico del funcionamiento de la plataforma y dónde obtener soporte.',
    sections: [
      {
        title: 'Usar ScholarshipTop',
        body:
          'ScholarshipTop te ayuda a descubrir becas, explorar listados y ver recomendaciones según tu perfil. Puedes navegar becas, revisar fechas y guardar oportunidades para volver después.'
      },
      {
        title: 'Perfil y coincidencias',
        body:
          'Tu perfil ayuda a mostrar recomendaciones más relevantes. Cuanto más precisa sea tu información, mejores pueden ser las coincidencias.'
      },
      {
        title: 'Becas guardadas',
        body:
          'Puedes guardar becas para seguir las oportunidades que más importan y mantenerte organizado mientras exploras opciones.'
      },
      {
        title: 'Elegibilidad y resultados',
        body:
          'ScholarshipTop ayuda a encontrar oportunidades, pero no garantiza elegibilidad, aceptación ni resultados de financiamiento. Las decisiones finales las toman los proveedores de becas.'
      },
      {
        title: '¿Necesitas soporte?',
        body: 'Si necesitas ayuda con tu cuenta, escríbenos a support@scholarshiptop.com.'
      }
    ],
    faq: [
      {
        question: '¿Cómo mejoro mis coincidencias?',
        answer: 'Completa y actualiza tu perfil con información precisa sobre nivel, intereses y contexto.'
      },
      {
        question: '¿ScholarshipTop envía solicitudes por mí?',
        answer:
          'No. Te ayudamos a descubrir y planificar; las solicitudes se envían por la ruta oficial del proveedor.'
      }
    ]
  }),
  legalEs('/faq', {
    title: 'Preguntas frecuentes | ScholarshipTop',
    metaDescription:
      'Respuestas sobre becas, cómo funciona ScholarshipTop, perfil, becas guardadas, elegibilidad y soporte.',
    h1: 'Preguntas frecuentes',
    eyebrow: 'Ayuda',
    intro:
      'Respuestas a preguntas comunes sobre becas, el funcionamiento de ScholarshipTop, coincidencias de perfil, becas guardadas, elegibilidad y soporte.',
    sections: [
      {
        title: 'Sobre ScholarshipTop',
        body:
          'ScholarshipTop ayuda a los estudiantes a encontrar becas con más eficiencia mediante listados, filtros y coincidencias basadas en perfil.'
      },
      {
        title: 'Cuentas y planes',
        body:
          'Puedes explorar parte del catálogo sin cuenta, pero crear un perfil permite coincidencias personalizadas, guardar oportunidades y mejorar la experiencia. También ofrecemos planes de pago con herramientas adicionales.'
      }
    ],
    faq: [
      {
        question: '¿Qué es ScholarshipTop y cómo ayuda a encontrar becas?',
        answer:
          'Es una plataforma para explorar becas, filtrar oportunidades y descubrir coincidencias según tu perfil y preferencias, en lugar de buscar manualmente en cientos de sitios.'
      },
      {
        question: '¿Cómo encuentro becas que encajen conmigo?',
        answer:
          'Crea un perfil con tu nivel educativo, intereses y contexto. ScholarshipTop usa esa información para mostrar becas más relevantes.'
      },
      {
        question: '¿Necesito cuenta para buscar becas?',
        answer:
          'Puedes explorar algunos listados sin cuenta, pero el perfil desbloquea coincidencias personalizadas y guardado.'
      },
      {
        question: '¿ScholarshipTop garantiza que obtendré una beca?',
        answer:
          'No. Ayudamos a encontrar y organizar oportunidades; los proveedores toman las decisiones finales.'
      },
      {
        question: '¿Qué significan las «mejores recomendaciones»?',
        answer:
          'Son becas alineadas con tu perfil y filtros según la información que proporcionas.'
      },
      {
        question: '¿Qué son las becas fáciles de solicitar?',
        answer:
          'Suelen ser oportunidades con menos requisitos o un proceso más simple, a veces sin ensayo.'
      },
      {
        question: '¿Puedo guardar becas y hacer seguimiento?',
        answer: 'Sí. Puedes guardar becas para revisarlas y organizarte durante tu búsqueda.'
      },
      {
        question: '¿Por qué veo pocas coincidencias?',
        answer:
          'Tu perfil puede estar incompleto. Añadir información precisa suele mejorar la calidad de las recomendaciones.'
      },
      {
        question: '¿Las becas en ScholarshipTop son reales?',
        answer:
          'Buscamos ofrecer listados útiles y reales, pero siempre debes verificar detalles y requisitos con el proveedor oficial antes de aplicar.'
      },
      {
        question: '¿Puedo aplicar directamente en la plataforma?',
        answer:
          'En la mayoría de los casos, ScholarshipTop ayuda a descubrir becas y la solicitud se hace en el sitio o sistema oficial del proveedor.'
      },
      {
        question: '¿ScholarshipTop es gratuito?',
        answer:
          'Ofrecemos acceso gratuito a parte del catálogo y funciones básicas, además de planes de pago con herramientas adicionales. Revisa la página de precios para detalles actuales.'
      },
      {
        question: '¿Cómo aumento mis probabilidades?',
        answer:
          'Postula a oportunidades relevantes, completa tu perfil con precisión, cumple requisitos y aplica temprano cuando sea posible.'
      },
      {
        question: '¿Dónde obtengo ayuda con mi cuenta?',
        answer: 'Escribe a support@scholarshiptop.com para soporte o preguntas sobre tu cuenta.'
      }
    ]
  })
]);

export const extendedLegalFrPages: Partial<Record<string, PageDraft>> = Object.fromEntries([
  legalFr('/terms', {
    title: 'Conditions d’utilisation | ScholarshipTop',
    metaDescription: 'Conditions d’utilisation de ScholarshipTop.',
    h1: 'Conditions d’utilisation',
    eyebrow: 'Juridique',
    intro:
      'Ces conditions régissent votre accès et utilisation de ScholarshipTop, un service exploité par Daur M. (Freebee KZ). En utilisant ScholarshipTop, vous acceptez ces conditions.',
    sections: [
      {
        title: '1. Utilisation du service',
        body:
          'ScholarshipTop propose des fiches de bourses, des filtres, des recommandations basées sur le profil et des outils associés. Vous ne pouvez utiliser le service qu’à des fins légales et personnelles.'
      },
      {
        title: '2. Aucune garantie de résultat',
        body:
          'ScholarshipTop ne garantit ni admissibilité, ni acceptation par un fournisseur, ni décisions de financement, ni attribution de prix. Les fournisseurs de bourses prennent toutes les décisions.'
      },
      {
        title: '3. Informations utilisateur',
        body:
          'Vous êtes responsable des informations exactes dans votre compte et profil. Des données incorrectes ou incomplètes peuvent affecter recommandations et correspondances.'
      },
      {
        title: '4. Comptes',
        body:
          'Si vous créez un compte, vous êtes responsable de la confidentialité de vos identifiants et de l’activité sous votre compte.'
      },
      {
        title: '5. Fiches de bourses',
        body:
          'ScholarshipTop peut afficher des informations de diverses sources. Nous visons des fiches utiles et à jour, mais ne garantissons pas que toutes les informations soient complètes ou actualisées en permanence. Vérifiez les détails avant de postuler.'
      },
      {
        title: '6. Utilisation acceptable',
        body:
          'Vous acceptez de ne pas détourner la plateforme, tenter un accès non autorisé, copier ou exploiter le service de manière nuisible, ni perturber sa sécurité ou son fonctionnement.'
      },
      {
        title: '7. Fonctions payantes et facturation',
        body:
          'ScholarshipTop propose abonnements et fonctions premium via Daur M. (Freebee KZ). Les paiements sont traités par LemonSqueezy en tant que marchand enregistré. Annulations, litiges et remboursements sont régis par notre Politique de remboursement.'
      },
      {
        title: '8. Propriété intellectuelle',
        body:
          'Le site, le design, les textes, la marque et le contenu associé appartiennent à Daur M. (Freebee KZ) ou sont utilisés avec autorisation. Vous ne pouvez pas reproduire ou distribuer du contenu protégé sans autorisation.'
      },
      {
        title: '9. Avertissement',
        body:
          'ScholarshipTop est fourni « tel quel » et « selon disponibilité ». Nous ne garantissons ni accès ininterrompu, ni performance sans erreur, ni résultats spécifiques.'
      },
      {
        title: '10. Limitation de responsabilité',
        body:
          'Dans la mesure maximale permise par la loi, Daur M. (Freebee KZ) ne sera pas responsable des dommages indirects, accessoires, spéciaux, consécutifs ou fondés sur la confiance liés à l’utilisation du service.'
      },
      {
        title: '11. Modifications des conditions',
        body:
          'Nous pouvons mettre à jour ces conditions. La version révisée sera publiée sur cette page avec la date de dernière mise à jour.'
      },
      {
        title: '12. Contact',
        body: 'E-mail : support@scholarshiptop.com'
      }
    ],
    faq: [
      {
        question: 'ScholarshipTop attribue-t-il des bourses ?',
        answer:
          'Non. ScholarshipTop aide à découvrir et organiser des opportunités ; les fournisseurs officiels prennent les décisions finales.'
      },
      {
        question: 'Où sont les règles de remboursement ?',
        answer: 'Consultez notre Politique de remboursement sur /refund-policy pour abonnements et paiements.'
      }
    ]
  }),
  legalFr('/privacy-policy', {
    title: 'Politique de confidentialité | ScholarshipTop',
    metaDescription: 'Politique de confidentialité de ScholarshipTop.',
    h1: 'Politique de confidentialité',
    eyebrow: 'Juridique',
    intro:
      'ScholarshipTop, exploité par Daur M. (Freebee KZ), respecte votre vie privée. Cette politique explique quelles informations nous collectons, comment nous les utilisons et comment nous les protégeons.',
    sections: [
      {
        title: '1. Informations collectées',
        body:
          'Nous pouvons collecter les informations que vous fournissez directement : nom, e-mail, détails de profil académique, informations de compte et messages de contact. Nous pouvons aussi collecter des données techniques limitées automatiquement : navigateur, appareil, adresse IP, pages visitées et activité.'
      },
      {
        title: '2. Utilisation de vos informations',
        body:
          'Nous pouvons utiliser vos informations pour créer et gérer votre compte, personnaliser les recommandations, améliorer recherche et expérience, communiquer avec vous, maintenir la sécurité et analyser l’usage du produit.'
      },
      {
        title: '3. Données de bourses et recommandations',
        body:
          'ScholarshipTop peut afficher fiches, filtres et recommandations selon votre profil. Nous visons pertinence et précision, mais ne garantissons ni admissibilité, ni décisions de prix, ni résultats d’acceptation.'
      },
      {
        title: '4. Cookies et analytique',
        body:
          'Nous pouvons utiliser des cookies ou technologies similaires pour améliorer les performances, mémoriser les préférences et comprendre l’interaction avec le service.'
      },
      {
        title: '5. Partage d’informations',
        body:
          'Nous ne vendons pas vos informations personnelles. Nous pouvons partager des données limitées avec des prestataires (hébergement, analytique, authentification, base de données, paiements) si nécessaire. Les paiements sont traités par LemonSqueezy ; nous ne stockons pas les données de carte. Nous pouvons aussi divulguer des informations si la loi l’exige ou pour protéger droits, utilisateurs ou plateforme.'
      },
      {
        title: '6. Stockage et sécurité',
        body:
          'Nous prenons des mesures raisonnables pour protéger vos informations, mais aucune méthode de transmission ou stockage n’est totalement sécurisée.'
      },
      {
        title: '7. Vos choix',
        body:
          'Vous pouvez mettre à jour votre profil, cesser d’utiliser le service et nous contacter concernant votre compte ou vos données personnelles.'
      },
      {
        title: '8. Confidentialité des mineurs',
        body:
          'ScholarshipTop s’adresse aux étudiants qui recherchent des bourses. Si vous pensez qu’une information personnelle a été soumise de manière inappropriée, contactez-nous.'
      },
      {
        title: '9. Modifications de cette politique',
        body:
          'Nous pouvons mettre à jour cette politique. La version révisée sera publiée sur cette page avec la date de dernière mise à jour.'
      },
      {
        title: '10. Nous contacter',
        body: 'E-mail : support@scholarshiptop.com'
      }
    ],
    faq: [
      {
        question: 'Vendez-vous mes données ?',
        answer: 'Nous ne vendons pas vos informations personnelles.'
      },
      {
        question: 'Qui traite les paiements ?',
        answer:
          'LemonSqueezy traite les paiements. Nous ne stockons pas les données de votre carte sur ScholarshipTop.'
      }
    ]
  }),
  legalFr('/refund-policy', {
    title: 'Politique de remboursement | ScholarshipTop',
    metaDescription: 'Politique de remboursement de Daur M. (Freebee KZ) et ScholarshipTop.',
    h1: 'Politique de remboursement',
    eyebrow: 'Juridique',
    intro:
      'Chez ScholarshipTop, exploité par Daur M. (Freebee KZ), nous voulons que vous soyez satisfait de notre service.',
    sections: [
      {
        title: '1. Délai de remboursement',
        body:
          'Vous pouvez demander un remboursement complet dans les 14 jours suivant votre achat initial si vous n’avez pas largement utilisé la base de données.'
      },
      {
        title: '2. Essai gratuit',
        body:
          'Si vous êtes en essai gratuit de 3 jours, vous pouvez annuler avant la fin pour éviter d’être facturé.'
      },
      {
        title: '3. Comment demander',
        body:
          'Pour demander un remboursement ou annuler votre abonnement, écrivez à support@scholarshiptop.com.'
      },
      {
        title: '4. Traitement',
        body: 'Les remboursements sont traités via notre prestataire de paiement, LemonSqueezy.'
      }
    ],
    faq: [
      {
        question: 'Combien de temps prend un remboursement ?',
        answer:
          'Les délais dépendent de LemonSqueezy et de votre banque. Contactez-nous pour un suivi.'
      },
      {
        question: 'Les remboursements concernent-ils les bourses ?',
        answer:
          'Non. Cette politique couvre abonnements et fonctions payantes de ScholarshipTop, pas les prix des fournisseurs externes.'
      }
    ]
  }),
  legalFr('/help', {
    title: 'Aide | ScholarshipTop',
    metaDescription: 'Aide et support pour les utilisateurs de ScholarshipTop.',
    h1: 'Aide',
    eyebrow: 'Support',
    intro:
      'Besoin d’aide avec ScholarshipTop ? Cette page explique le fonctionnement de base de la plateforme et où obtenir du support.',
    sections: [
      {
        title: 'Utiliser ScholarshipTop',
        body:
          'ScholarshipTop aide à découvrir des bourses, explorer des fiches et voir des recommandations selon votre profil. Vous pouvez parcourir des bourses, vérifier les dates et enregistrer des opportunités.'
      },
      {
        title: 'Profil et correspondances',
        body:
          'Votre profil aide à afficher des recommandations plus pertinentes. Plus vos informations sont précises, meilleures peuvent être les correspondances.'
      },
      {
        title: 'Bourses enregistrées',
        body:
          'Vous pouvez enregistrer des bourses pour suivre les opportunités importantes et rester organisé pendant votre recherche.'
      },
      {
        title: 'Admissibilité et résultats',
        body:
          'ScholarshipTop aide à trouver des opportunités, mais ne garantit ni admissibilité, ni acceptation, ni financement. Les fournisseurs prennent les décisions finales.'
      },
      {
        title: 'Besoin de support ?',
        body: 'Pour de l’aide avec votre compte, écrivez à support@scholarshiptop.com.'
      }
    ],
    faq: [
      {
        question: 'Comment améliorer mes correspondances ?',
        answer:
          'Complétez et mettez à jour votre profil avec des informations précises sur niveau, intérêts et contexte.'
      },
      {
        question: 'ScholarshipTop envoie-t-il mes candidatures ?',
        answer:
          'Non. Nous aidons à découvrir et planifier ; les candidatures passent par la voie officielle du fournisseur.'
      }
    ]
  }),
  legalFr('/faq', {
    title: 'Questions fréquentes | ScholarshipTop',
    metaDescription:
      'Réponses sur les bourses, le fonctionnement de ScholarshipTop, profil, bourses enregistrées, admissibilité et support.',
    h1: 'Questions fréquentes',
    eyebrow: 'Aide',
    intro:
      'Réponses aux questions courantes sur les bourses, le fonctionnement de ScholarshipTop, correspondances de profil, bourses enregistrées, admissibilité et support.',
    sections: [
      {
        title: 'À propos de ScholarshipTop',
        body:
          'ScholarshipTop aide les étudiants à trouver des bourses plus efficacement grâce à des fiches, filtres et correspondances basées sur le profil.'
      },
      {
        title: 'Comptes et offres',
        body:
          'Vous pouvez explorer une partie du catalogue sans compte, mais un profil permet des correspondances personnalisées, l’enregistrement d’opportunités et une meilleure expérience. Des offres payantes existent aussi.'
      }
    ],
    faq: [
      {
        question: 'Qu’est-ce que ScholarshipTop et comment aide-t-il à trouver des bourses ?',
        answer:
          'C’est une plateforme pour explorer des bourses, filtrer des opportunités et découvrir des correspondances selon votre profil, au lieu de chercher manuellement sur des centaines de sites.'
      },
      {
        question: 'Comment trouver des bourses qui me correspondent ?',
        answer:
          'Créez un profil avec votre niveau, intérêts et parcours. ScholarshipTop utilise ces informations pour afficher des bourses plus pertinentes.'
      },
      {
        question: 'Faut-il un compte pour chercher ?',
        answer:
          'Vous pouvez parcourir certaines fiches sans compte, mais le profil débloque correspondances personnalisées et enregistrement.'
      },
      {
        question: 'ScholarshipTop garantit-il une bourse ?',
        answer:
          'Non. Nous aidons à trouver et organiser des opportunités ; les fournisseurs prennent les décisions finales.'
      },
      {
        question: 'Que signifient les « meilleures recommandations » ?',
        answer:
          'Ce sont des bourses alignées sur votre profil et vos filtres selon les informations fournies.'
      },
      {
        question: 'Que sont les bourses faciles à postuler ?',
        answer:
          'Ce sont souvent des opportunités avec moins d’exigences ou un processus plus simple, parfois sans rédaction.'
      },
      {
        question: 'Puis-je enregistrer des bourses et les suivre ?',
        answer:
          'Oui. Vous pouvez enregistrer des bourses pour les revoir et rester organisé pendant votre recherche.'
      },
      {
        question: 'Pourquoi vois-je peu de correspondances ?',
        answer:
          'Votre profil peut être incomplet. Ajouter des informations précises améliore généralement la qualité des recommandations.'
      },
      {
        question: 'Les bourses sur ScholarshipTop sont-elles réelles ?',
        answer:
          'Nous visons des fiches utiles et réelles, mais vérifiez toujours détails et exigences sur la page officielle du fournisseur avant de postuler.'
      },
      {
        question: 'Puis-je postuler directement sur la plateforme ?',
        answer:
          'Dans la plupart des cas, ScholarshipTop aide à découvrir des bourses et la candidature se fait sur le site ou système officiel du fournisseur.'
      },
      {
        question: 'ScholarshipTop est-il gratuit ?',
        answer:
          'Nous offrons un accès gratuit à une partie du catalogue et des fonctions de base, plus des offres payantes avec outils supplémentaires. Consultez la page tarifs pour les détails actuels.'
      },
      {
        question: 'Comment augmenter mes chances ?',
        answer:
          'Postulez à des opportunités pertinentes, complétez votre profil avec précision, respectez les exigences et postulez tôt quand c’est possible.'
      },
      {
        question: 'Où obtenir de l’aide pour mon compte ?',
        answer: 'Écrivez à support@scholarshiptop.com pour le support ou des questions sur votre compte.'
      }
    ]
  })
]);
