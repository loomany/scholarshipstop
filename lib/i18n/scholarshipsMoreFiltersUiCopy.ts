import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

type LabeledOption = { id: string; label: string };
type SlugOption = { value: string; label: string };

export type ScholarshipsMoreFiltersUiCopy = {
  closeFiltersAria: string;
  closeAria: string;
  title: string;
  studentProfile: string;
  studentProfileHint: string;
  clear: string;
  currentSchoolLevel: string;
  fieldOfStudy: string;
  citizenshipStatus: string;
  anySchoolLevel: string;
  anyFieldOfStudy: string;
  anyCitizenship: string;
  anyGpa: string;
  preferNotToSayGpa: string;
  filterByDeadline: string;
  locked: string;
  deadlineAny: string;
  deadlineLt1d: string;
  deadlineD1_7: string;
  deadlineW1_4: string;
  deadlineGt4w: string;
  citizenshipEligibility: string;
  citizenshipEligibilityHint: string;
  citizenshipAll: string;
  citizenshipInternational: string;
  filterByAmount: string;
  unlockAmountAria: string;
  applicationRequirements: string;
  applicationRequirementsHint: string;
  filterByApplicants: string;
  unlockApplicantsAria: string;
  eligibility: string;
  eligibilityHint: string;
  educationLevel: string;
  educationHint: string;
  gpa: string;
  gpaHint: string;
  location: string;
  locationHint: string;
  stateFilterAria: string;
  statePlaceholder: string;
  university: string;
  universityHint: string;
  unlockUniversityAria: string;
  universityTypeHint: string;
  easyApply: string;
  easyApplyHint: string;
  dataCompleteness: string;
  dataCompletenessHint: string;
  basicInfo: string;
  basicInfoBody: string;
  standardDetail: string;
  standardDetailBody: string;
  detailedListing: string;
  detailedListingBody: string;
  verifiedListing: string;
  verifiedListingBody: string;
  payoutMethod: string;
  payoutCollege: string;
  payoutCollegeBody: string;
  payoutStudent: string;
  payoutStudentBody: string;
  payoutNonMonetary: string;
  payoutNonMonetaryBody: string;
  payoutNotStated: string;
  payoutNotStatedBody: string;
  applyingFilters: string;
  calculating: string;
  calculatingWithCount: (count: number) => string;
  showResults: string;
  showResultsCount: (count: number) => string;
  saveFilter: string;
  saveFilterGuestTitle: string;
  requirementOptions: LabeledOption[];
  educationOptions: LabeledOption[];
  easyApplyOptions: LabeledOption[];
  eligibilityOptions: LabeledOption[];
  schoolLevelOptions: SlugOption[];
};

const EN_REQUIREMENTS: LabeledOption[] = [
  { id: 'essay', label: 'Essay' },
  { id: 'document', label: 'Document' },
  { id: 'photo', label: 'Photo' },
  { id: 'video', label: 'Video' },
  { id: 'personal_statement', label: 'Personal statement / career goals' },
  { id: 'link', label: 'Link' },
  { id: 'survey', label: 'Survey' },
  { id: 'question', label: 'Question' },
  { id: 'recommendation', label: 'Recommendation' },
  { id: 'transcript', label: 'Transcript' }
];

const EN_EDUCATION: LabeledOption[] = [
  { id: 'high_school', label: 'High School' },
  { id: 'high_school_senior', label: 'High School Senior' },
  { id: 'undergraduate', label: 'Undergraduate' },
  { id: 'graduate', label: 'Graduate' },
  { id: 'phd', label: 'PhD' },
  { id: 'community_college', label: 'Community College' },
  { id: 'trade_school', label: 'Trade School' }
];

const EN_EASY_APPLY: LabeledOption[] = [
  { id: 'no_essay', label: 'No Essay' },
  { id: 'easy_apply', label: 'Easy Apply' },
  { id: 'quick_apply', label: 'Quick Apply' },
  { id: 'few_requirements', label: 'Few Requirements' }
];

const EN_ELIGIBILITY: LabeledOption[] = [
  { id: 'women', label: 'Women' },
  { id: 'international_students', label: 'International Students' },
  { id: 'minority', label: 'Minority' },
  { id: 'hispanic', label: 'Hispanic' },
  { id: 'african_american', label: 'African American' },
  { id: 'first_generation', label: 'First-Generation' },
  { id: 'disability', label: 'Disability' },
  { id: 'veterans', label: 'Veterans' },
  { id: 'lgbtq', label: 'LGBTQ+' },
  { id: 'single_parent', label: 'Single Parent' },
  { id: 'foster_youth', label: 'Foster Youth' },
  { id: 'native_american', label: 'Native American' },
  { id: 'low_income', label: 'Low Income' },
  { id: 'financial_need', label: 'Financial Need' }
];

const EN_SCHOOL_LEVELS: SlugOption[] = [
  { value: 'high_school_freshman', label: 'High school freshman' },
  { value: 'high_school_sophomore', label: 'High school sophomore' },
  { value: 'high_school_junior', label: 'High school junior' },
  { value: 'high_school_senior', label: 'High school senior' },
  { value: 'college_1', label: 'College 1st year' },
  { value: 'college_2', label: 'College 2nd year' },
  { value: 'college_3', label: 'College 3rd year' },
  { value: 'college_4', label: 'College 4th year' },
  { value: 'graduate_student', label: 'Graduate student' },
  { value: 'adult_non_traditional', label: 'Adult/Non-traditional Student' }
];

const EN: ScholarshipsMoreFiltersUiCopy = {
  closeFiltersAria: 'Close filters',
  closeAria: 'Close',
  title: 'More Filters',
  studentProfile: 'Student profile',
  studentProfileHint:
    'Add the quiz-style profile choices that are not covered by the advanced filters below.',
  clear: 'Clear',
  currentSchoolLevel: 'Current school level',
  fieldOfStudy: 'Field of study',
  citizenshipStatus: 'Citizenship status',
  anySchoolLevel: 'Any school level',
  anyFieldOfStudy: 'Any field of study',
  anyCitizenship: 'Any citizenship status',
  anyGpa: 'Any GPA',
  preferNotToSayGpa: 'Prefer not to say (optional)',
  filterByDeadline: 'Filter by time until deadline',
  locked: 'Locked',
  deadlineAny: 'Any',
  deadlineLt1d: 'Less than 1 day',
  deadlineD1_7: '1 - 7 days',
  deadlineW1_4: '1 - 4 weeks',
  deadlineGt4w: 'More than 4 weeks',
  citizenshipEligibility: 'Citizenship & eligibility',
  citizenshipEligibilityHint:
    'Narrow listings that explicitly mention international students, foreign nationals, or similar in our catalog fields. Always confirm rules on the official program page—this is not legal or visa advice.',
  citizenshipAll: 'All applicants (default)',
  citizenshipInternational: 'International Friendly (best effort)',
  filterByAmount: 'Filter by scholarship amount',
  unlockAmountAria: 'Start your free access to use amount filter',
  applicationRequirements: 'Application requirements',
  applicationRequirementsHint:
    'Show scholarships that require the selected items.',
  filterByApplicants: 'Filter by number of applicants',
  unlockApplicantsAria: 'Start your free access to use applicants filter',
  eligibility: 'Eligibility',
  eligibilityHint:
    'Show scholarships that mention any of these audiences (OR). Empty = no filter.',
  educationLevel: 'Education level',
  educationHint: 'Show listings that match any selected level (OR).',
  gpa: 'GPA',
  gpaHint:
    'Choose the GPA level you want scholarship requirements matched against.',
  location: 'Location',
  locationHint:
    'Search by U.S. state (matches each listing’s state data). Choose a suggestion — partial typing alone does not narrow results until the name is valid.',
  stateFilterAria: 'U.S. state filter',
  statePlaceholder: 'Type a state, e.g. Cal…',
  university: 'University',
  universityHint:
    'Start typing a university name and choose a suggestion from our indexed catalog to narrow results to that school.',
  unlockUniversityAria: 'Unlock Premium to filter by university',
  universityTypeHint:
    'Enter at least 2 characters. Filtering applies after you choose a suggestion.',
  easyApply: 'Easy apply',
  easyApplyHint:
    'Highlights no-essay and lighter applications when we can detect them (OR).',
  dataCompleteness: 'Data completeness',
  dataCompletenessHint:
    'How much key information we could extract for this listing (deadline, apply link, requirements, etc.). Not a score of legitimacy.',
  basicInfo: 'Basic info',
  basicInfoBody: 'Only a few core fields are filled in.',
  standardDetail: 'Standard detail',
  standardDetailBody:
    'A solid amount of information for comparing programs.',
  detailedListing: 'Detailed listing',
  detailedListingBody: 'Richer structured fields from the public listing.',
  verifiedListing: 'Verified listing',
  verifiedListingBody:
    'Marked verified — always confirm on the official site.',
  payoutMethod: 'Filter by payout method',
  payoutCollege: 'College',
  payoutCollegeBody:
    'Funds are paid to the Financial Aid Office on your behalf.',
  payoutStudent: 'Student',
  payoutStudentBody: 'Scholarship funds are paid directly to you.',
  payoutNonMonetary: 'Non-monetary awards',
  payoutNonMonetaryBody:
    'Prizes that support educational goals (courses, subscriptions, etc.)',
  payoutNotStated: 'Not Stated',
  payoutNotStatedBody:
    'Payment process details have not been specified by the provider.',
  applyingFilters: 'Applying filters...',
  calculating: 'Calculating...',
  calculatingWithCount: (count) => `Calculating... (${count})`,
  showResults: 'Show results',
  showResultsCount: (count) => `Show ${count} results`,
  saveFilter: 'Save filter',
  saveFilterGuestTitle: 'Save filter preset after you start your free trial',
  requirementOptions: EN_REQUIREMENTS,
  educationOptions: EN_EDUCATION,
  easyApplyOptions: EN_EASY_APPLY,
  eligibilityOptions: EN_ELIGIBILITY,
  schoolLevelOptions: EN_SCHOOL_LEVELS
};

const ES: ScholarshipsMoreFiltersUiCopy = {
  ...EN,
  closeFiltersAria: 'Cerrar filtros',
  closeAria: 'Cerrar',
  title: 'Más filtros',
  studentProfile: 'Perfil del estudiante',
  studentProfileHint:
    'Añade las opciones de perfil del cuestionario que no cubren los filtros avanzados siguientes.',
  clear: 'Limpiar',
  currentSchoolLevel: 'Nivel escolar actual',
  fieldOfStudy: 'Campo de estudio',
  citizenshipStatus: 'Estado de ciudadanía',
  anySchoolLevel: 'Cualquier nivel escolar',
  anyFieldOfStudy: 'Cualquier campo de estudio',
  anyCitizenship: 'Cualquier estado de ciudadanía',
  anyGpa: 'Cualquier GPA',
  preferNotToSayGpa: 'Prefiero no decir (opcional)',
  filterByDeadline: 'Filtrar por tiempo hasta la fecha',
  locked: 'Bloqueado',
  deadlineAny: 'Cualquiera',
  deadlineLt1d: 'Menos de 1 día',
  deadlineD1_7: '1 - 7 días',
  deadlineW1_4: '1 - 4 semanas',
  deadlineGt4w: 'Más de 4 semanas',
  citizenshipEligibility: 'Ciudadanía y elegibilidad',
  citizenshipEligibilityHint:
    'Reduce las listas que mencionan estudiantes internacionales o similares en nuestros campos. Confirma siempre en la página oficial: no es asesoría legal ni de visado.',
  citizenshipAll: 'Todos los solicitantes (predeterminado)',
  citizenshipInternational: 'Apto para internacionales (mejor esfuerzo)',
  filterByAmount: 'Filtrar por monto de beca',
  unlockAmountAria: 'Inicia acceso gratuito para usar filtro de monto',
  applicationRequirements: 'Requisitos de solicitud',
  applicationRequirementsHint: 'Muestra becas que requieren los elementos seleccionados.',
  filterByApplicants: 'Filtrar por número de solicitantes',
  unlockApplicantsAria: 'Inicia acceso gratuito para usar filtro de solicitantes',
  eligibility: 'Elegibilidad',
  eligibilityHint:
    'Muestra becas que mencionan cualquiera de estas audiencias (O). Vacío = sin filtro.',
  educationLevel: 'Nivel educativo',
  educationHint: 'Muestra listados que coinciden con cualquier nivel seleccionado (O).',
  gpa: 'GPA',
  gpaHint: 'Elige el nivel de GPA contra el que quieres comparar requisitos.',
  location: 'Ubicación',
  locationHint:
    'Busca por estado de EE. UU. Elige una sugerencia: escribir parcialmente no filtra hasta que el nombre sea válido.',
  stateFilterAria: 'Filtro de estado de EE. UU.',
  statePlaceholder: 'Escribe un estado, p. ej. Cal…',
  university: 'Universidad',
  universityHint:
    'Escribe un nombre de universidad y elige una sugerencia del catálogo indexado.',
  unlockUniversityAria: 'Desbloquea Premium para filtrar por universidad',
  universityTypeHint:
    'Escribe al menos 2 caracteres. El filtro se aplica al elegir una sugerencia.',
  easyApply: 'Solicitud fácil',
  easyApplyHint:
    'Destaca solicitudes sin ensayo o más ligeras cuando podemos detectarlas (O).',
  dataCompleteness: 'Completitud de datos',
  dataCompletenessHint:
    'Cuánta información clave extrajimos (fecha, enlace, requisitos, etc.). No es una puntuación de legitimidad.',
  basicInfo: 'Información básica',
  basicInfoBody: 'Solo unos pocos campos principales están completos.',
  standardDetail: 'Detalle estándar',
  standardDetailBody: 'Cantidad sólida de información para comparar programas.',
  detailedListing: 'Listado detallado',
  detailedListingBody: 'Campos estructurados más ricos del listado público.',
  verifiedListing: 'Listado verificado',
  verifiedListingBody: 'Marcado como verificado: confirma siempre en el sitio oficial.',
  payoutMethod: 'Filtrar por método de pago',
  payoutCollege: 'Universidad',
  payoutCollegeBody: 'Los fondos se pagan a la oficina de ayuda financiera en tu nombre.',
  payoutStudent: 'Estudiante',
  payoutStudentBody: 'Los fondos de la beca se pagan directamente a ti.',
  payoutNonMonetary: 'Premios no monetarios',
  payoutNonMonetaryBody:
    'Premios que apoyan metas educativas (cursos, suscripciones, etc.)',
  payoutNotStated: 'No indicado',
  payoutNotStatedBody:
    'El proveedor no especificó los detalles del proceso de pago.',
  applyingFilters: 'Aplicando filtros...',
  calculating: 'Calculando...',
  calculatingWithCount: (count) => `Calculando... (${count})`,
  showResults: 'Mostrar resultados',
  showResultsCount: (count) => `Mostrar ${count} resultados`,
  saveFilter: 'Guardar filtro',
  saveFilterGuestTitle: 'Guarda el preset después de iniciar tu prueba gratuita',
  requirementOptions: [
    { id: 'essay', label: 'Ensayo' },
    { id: 'document', label: 'Documento' },
    { id: 'photo', label: 'Foto' },
    { id: 'video', label: 'Video' },
    { id: 'personal_statement', label: 'Declaración personal / metas' },
    { id: 'link', label: 'Enlace' },
    { id: 'survey', label: 'Encuesta' },
    { id: 'question', label: 'Pregunta' },
    { id: 'recommendation', label: 'Recomendación' },
    { id: 'transcript', label: 'Expediente académico' }
  ],
  educationOptions: [
    { id: 'high_school', label: 'Bachillerato' },
    { id: 'high_school_senior', label: 'Último año de bachillerato' },
    { id: 'undergraduate', label: 'Pregrado' },
    { id: 'graduate', label: 'Posgrado' },
    { id: 'phd', label: 'Doctorado' },
    { id: 'community_college', label: 'Colegio comunitario' },
    { id: 'trade_school', label: 'Escuela técnica' }
  ],
  easyApplyOptions: [
    { id: 'no_essay', label: 'Sin ensayo' },
    { id: 'easy_apply', label: 'Solicitud fácil' },
    { id: 'quick_apply', label: 'Solicitud rápida' },
    { id: 'few_requirements', label: 'Pocos requisitos' }
  ],
  eligibilityOptions: [
    { id: 'women', label: 'Mujeres' },
    { id: 'international_students', label: 'Estudiantes internacionales' },
    { id: 'minority', label: 'Minorías' },
    { id: 'hispanic', label: 'Hispanos' },
    { id: 'african_american', label: 'Afroamericanos' },
    { id: 'first_generation', label: 'Primera generación' },
    { id: 'disability', label: 'Discapacidad' },
    { id: 'veterans', label: 'Veteranos' },
    { id: 'lgbtq', label: 'LGBTQ+' },
    { id: 'single_parent', label: 'Madre/padre soltero' },
    { id: 'foster_youth', label: 'Jóvenes en acogida' },
    { id: 'native_american', label: 'Nativos americanos' },
    { id: 'low_income', label: 'Bajos ingresos' },
    { id: 'financial_need', label: 'Necesidad económica' }
  ],
  schoolLevelOptions: [
    { value: 'high_school_freshman', label: '1.º de bachillerato' },
    { value: 'high_school_sophomore', label: '2.º de bachillerato' },
    { value: 'high_school_junior', label: '3.º de bachillerato' },
    { value: 'high_school_senior', label: '4.º de bachillerato' },
    { value: 'college_1', label: '1.er año universitario' },
    { value: 'college_2', label: '2.º año universitario' },
    { value: 'college_3', label: '3.er año universitario' },
    { value: 'college_4', label: '4.º año universitario' },
    { value: 'graduate_student', label: 'Estudiante de posgrado' },
    { value: 'adult_non_traditional', label: 'Estudiante adulto/no tradicional' }
  ]
};

const FR: ScholarshipsMoreFiltersUiCopy = {
  ...EN,
  closeFiltersAria: 'Fermer les filtres',
  closeAria: 'Fermer',
  title: 'Plus de filtres',
  studentProfile: 'Profil étudiant',
  studentProfileHint:
    'Ajoutez les choix de profil du questionnaire non couverts par les filtres avancés ci-dessous.',
  clear: 'Effacer',
  currentSchoolLevel: 'Niveau scolaire actuel',
  fieldOfStudy: 'Domaine d’études',
  citizenshipStatus: 'Statut de citoyenneté',
  anySchoolLevel: 'Tout niveau scolaire',
  anyFieldOfStudy: 'Tout domaine d’études',
  anyCitizenship: 'Tout statut de citoyenneté',
  anyGpa: 'Toute mention de GPA',
  preferNotToSayGpa: 'Je préfère ne pas répondre (facultatif)',
  filterByDeadline: 'Filtrer par délai restant',
  locked: 'Verrouillé',
  deadlineAny: 'Tous',
  deadlineLt1d: 'Moins d’1 jour',
  deadlineD1_7: '1 - 7 jours',
  deadlineW1_4: '1 - 4 semaines',
  deadlineGt4w: 'Plus de 4 semaines',
  citizenshipEligibility: 'Citoyenneté et admissibilité',
  citizenshipEligibilityHint:
    'Affinez les listes mentionnant explicitement les étudiants internationaux dans nos champs. Confirmez toujours sur la page officielle — ce n’est pas un conseil juridique ou visa.',
  citizenshipAll: 'Tous les candidats (par défaut)',
  citizenshipInternational: 'International (meilleur effort)',
  filterByAmount: 'Filtrer par montant de bourse',
  unlockAmountAria: 'Commencez l’accès gratuit pour le filtre montant',
  applicationRequirements: 'Exigences de candidature',
  applicationRequirementsHint:
    'Afficher les bourses exigeant les éléments sélectionnés.',
  filterByApplicants: 'Filtrer par nombre de candidats',
  unlockApplicantsAria: 'Commencez l’accès gratuit pour le filtre candidats',
  eligibility: 'Admissibilité',
  eligibilityHint:
    'Afficher les bourses mentionnant l’une de ces audiences (OU). Vide = pas de filtre.',
  educationLevel: 'Niveau d’études',
  educationHint: 'Afficher les listes correspondant à tout niveau sélectionné (OU).',
  gpa: 'GPA',
  gpaHint: 'Choisissez le niveau de GPA pour comparer les exigences.',
  location: 'Lieu',
  locationHint:
    'Recherchez par État américain. Choisissez une suggestion — la saisie partielle ne filtre pas tant que le nom n’est pas valide.',
  stateFilterAria: 'Filtre État américain',
  statePlaceholder: 'Tapez un État, ex. Cal…',
  university: 'Université',
  universityHint:
    'Tapez un nom d’université et choisissez une suggestion du catalogue indexé.',
  unlockUniversityAria: 'Débloquez Premium pour filtrer par université',
  universityTypeHint:
    'Tapez au moins 2 caractères. Le filtre s’applique après avoir choisi une suggestion.',
  easyApply: 'Candidature facile',
  easyApplyHint:
    'Met en avant les candidatures sans essai ou plus légères quand nous pouvons les détecter (OU).',
  dataCompleteness: 'Complétude des données',
  dataCompletenessHint:
    'Quantité d’informations clés extraites (date, lien, exigences, etc.). Ce n’est pas un score de légitimité.',
  basicInfo: 'Infos de base',
  basicInfoBody: 'Seuls quelques champs principaux sont remplis.',
  standardDetail: 'Détail standard',
  standardDetailBody: 'Quantité solide d’informations pour comparer les programmes.',
  detailedListing: 'Fiche détaillée',
  detailedListingBody: 'Champs structurés plus riches issus de la fiche publique.',
  verifiedListing: 'Fiche vérifiée',
  verifiedListingBody: 'Marquée vérifiée — confirmez toujours sur le site officiel.',
  payoutMethod: 'Filtrer par mode de versement',
  payoutCollege: 'Établissement',
  payoutCollegeBody: 'Les fonds sont versés au bureau d’aide financière pour vous.',
  payoutStudent: 'Étudiant',
  payoutStudentBody: 'Les fonds de la bourse vous sont versés directement.',
  payoutNonMonetary: 'Prix non monétaires',
  payoutNonMonetaryBody:
    'Prix soutenant des objectifs éducatifs (cours, abonnements, etc.)',
  payoutNotStated: 'Non précisé',
  payoutNotStatedBody: 'Le fournisseur n’a pas précisé le processus de paiement.',
  applyingFilters: 'Application des filtres...',
  calculating: 'Calcul...',
  calculatingWithCount: (count) => `Calcul... (${count})`,
  showResults: 'Afficher les résultats',
  showResultsCount: (count) => `Afficher ${count} résultats`,
  saveFilter: 'Enregistrer le filtre',
  saveFilterGuestTitle: 'Enregistrez le préréglage après votre essai gratuit',
  requirementOptions: [
    { id: 'essay', label: 'Essai' },
    { id: 'document', label: 'Document' },
    { id: 'photo', label: 'Photo' },
    { id: 'video', label: 'Vidéo' },
    { id: 'personal_statement', label: 'Déclaration personnelle / objectifs' },
    { id: 'link', label: 'Lien' },
    { id: 'survey', label: 'Sondage' },
    { id: 'question', label: 'Question' },
    { id: 'recommendation', label: 'Recommandation' },
    { id: 'transcript', label: 'Relevé de notes' }
  ],
  educationOptions: [
    { id: 'high_school', label: 'Lycée' },
    { id: 'high_school_senior', label: 'Dernière année de lycée' },
    { id: 'undergraduate', label: 'Premier cycle' },
    { id: 'graduate', label: 'Cycle supérieur' },
    { id: 'phd', label: 'Doctorat' },
    { id: 'community_college', label: 'Collège communautaire' },
    { id: 'trade_school', label: 'École professionnelle' }
  ],
  easyApplyOptions: [
    { id: 'no_essay', label: 'Sans essai' },
    { id: 'easy_apply', label: 'Candidature facile' },
    { id: 'quick_apply', label: 'Candidature rapide' },
    { id: 'few_requirements', label: 'Peu d’exigences' }
  ],
  eligibilityOptions: [
    { id: 'women', label: 'Femmes' },
    { id: 'international_students', label: 'Étudiants internationaux' },
    { id: 'minority', label: 'Minorités' },
    { id: 'hispanic', label: 'Hispaniques' },
    { id: 'african_american', label: 'Afro-Américains' },
    { id: 'first_generation', label: 'Première génération' },
    { id: 'disability', label: 'Handicap' },
    { id: 'veterans', label: 'Vétérans' },
    { id: 'lgbtq', label: 'LGBTQ+' },
    { id: 'single_parent', label: 'Parent seul' },
    { id: 'foster_youth', label: 'Jeunes en famille d’accueil' },
    { id: 'native_american', label: 'Autochtones' },
    { id: 'low_income', label: 'Faibles revenus' },
    { id: 'financial_need', label: 'Besoin financier' }
  ],
  schoolLevelOptions: [
    { value: 'high_school_freshman', label: '1re année lycée' },
    { value: 'high_school_sophomore', label: '2e année lycée' },
    { value: 'high_school_junior', label: '3e année lycée' },
    { value: 'high_school_senior', label: 'Dernière année lycée' },
    { value: 'college_1', label: '1re année université' },
    { value: 'college_2', label: '2e année université' },
    { value: 'college_3', label: '3e année université' },
    { value: 'college_4', label: '4e année université' },
    { value: 'graduate_student', label: 'Étudiant diplômé' },
    { value: 'adult_non_traditional', label: 'Étudiant adulte/non traditionnel' }
  ]
};

export function getScholarshipsMoreFiltersUiCopy(
  locale: LocalizedUiLocale
): ScholarshipsMoreFiltersUiCopy {
  if (locale === 'es') return ES;
  if (locale === 'fr') return FR;
  return EN;
}
