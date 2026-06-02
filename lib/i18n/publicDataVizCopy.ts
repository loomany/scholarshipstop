import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

type DataSourceVariant =
  | 'default'
  | 'college'
  | 'state'
  | 'mixed'
  | 'nonprofit'
  | 'research'
  | 'social'
  | 'city';

export type PublicDataVizCopy = {
  publicReferenceData: string;
  planningContext: string;
  collegeCostOutcomes: string;
  collegeCostOutcomesBody: string;
  costLivingWages: string;
  stateAffordabilityBody: string;
  visualComparison: string;
  researchActivityComparison: string;
  researchActivityBody: string;
  cityRentWageComparison: string;
  cityRentWageBody: string;
  publicPlanningContext: string;
  publicPlanningBody: string;
  cityRentWageContext: string;
  researchInstitutionContext: string;
  statePlanningCalloutTitle: string;
  statePlanningCalloutBody: string;
  schoolFitCalloutTitle: string;
  schoolFitCalloutBody: string;
  schoolNoMatch: string;
  stateNoDataSuffix: string;
  stateSafetyNote: (rate: string) => string;
  publicSafetyFooter: string;
  referenceOnly: string;
  dataAvailability: string;
  sources: Record<DataSourceVariant, string>;
  labels: Record<string, string>;
  hints: Record<string, string>;
};

const EN: PublicDataVizCopy = {
  publicReferenceData: 'Public reference data',
  planningContext: 'Planning context',
  collegeCostOutcomes: 'College cost & outcomes',
  collegeCostOutcomesBody:
    'Official-style college facts matched by school name and state. These figures are separate from ScholarshipTop scholarship totals in the comparison table above.',
  costLivingWages: 'Cost of living & wages',
  stateAffordabilityBody:
    'State-level affordability context to complement scholarship climate above - not ScholarshipTop grant totals.',
  visualComparison: 'Visual comparison',
  researchActivityComparison: 'Research activity comparison',
  researchActivityBody:
    'Public research indicators can help compare academic activity; they do not imply scholarship eligibility.',
  cityRentWageComparison: 'City rent and wage comparison',
  cityRentWageBody:
    'Public rent and wage estimates can help compare cost of attendance and relocation planning.',
  publicPlanningContext: 'Public planning context',
  publicPlanningBody:
    'Community indicators vary by county and are included only as public planning context. Use this alongside scholarship amount, school cost, and living expenses - not as an eligibility rule.',
  cityRentWageContext: 'City rent and wage context',
  researchInstitutionContext: 'Research and institution context',
  statePlanningCalloutTitle: 'Why this matters for scholarship planning',
  statePlanningCalloutBody:
    'Use these numbers to compare scholarship value, relocation costs, and likely out-of-pocket living expenses. A larger award in a higher-cost state may cover less than a smaller award elsewhere.',
  schoolFitCalloutTitle: 'Cost, outcomes, and scholarship fit',
  schoolFitCalloutBody:
    'Compare tuition, net price, and earnings alongside scholarship totals above. A higher sticker price may still fit if aid and outcomes align with your goals.',
  schoolNoMatch:
    'No public College Scorecard match for this school name and state.',
  stateNoDataSuffix: 'for this state.',
  stateSafetyNote: (rate) =>
    `Reported violent crime rate (state aggregate): ${rate}. Public safety context is based on aggregate state-level public data - not a safety rating.`,
  publicSafetyFooter:
    'Public safety context uses aggregate public data and is included only as planning context.',
  referenceOnly:
    'Reference only - not ScholarshipTop eligibility rules or guarantees.',
  dataAvailability:
    'Data availability varies by school, city, state, and source year.',
  sources: {
    default:
      'Sources: public education, workforce, affordability, and institution datasets where available.',
    college:
      'Sources: College Scorecard, OpenAlex, and ROR where matched. Figures may lag the current academic year; verify on the institution site.',
    state:
      'Sources: Census ACS, HUD FMR, MIT Living Wage, BLS OEWS, and public reference datasets where available. Rent figures may reflect metro or state averages.',
    nonprofit:
      'Sources: ProPublica Nonprofit Explorer and USAspending where strict public-organization matches are available.',
    research:
      'Sources: College Scorecard, OpenAlex, ROR, and NIH RePORTER aggregate public data where matched.',
    social:
      'Sources: CDC SVI, ADI, and County Health public data aggregated to state-level planning context.',
    city: 'Sources: location crosswalk, HUD FMR, Zillow ZORI, and BLS OEWS metro data where strict city or metro matches are available.',
    mixed:
      'Sources: public education, workforce, affordability, and institution datasets where available.'
  },
  labels: {
    median_household_income: 'Median household income',
    fair_market_rent_2br: 'Fair market rent (2BR)',
    living_wage: 'Living wage',
    bls_median_wage: 'BLS median wage',
    in_state_tuition: 'In-state tuition',
    out_state_tuition: 'Out-of-state tuition',
    admission_rate: 'Admission rate',
    completion_rate: 'Completion rate',
    median_earnings: 'Median earnings',
    enrollment: 'Enrollment',
    works_count: 'Works count',
    citation_count: 'Citation count',
    nih_projects: 'NIH projects',
    nih_funding_band: 'NIH funding band',
    latest_nih_year: 'Latest NIH year',
    ror_identity: 'ROR identity',
    openalex_identity: 'OpenAlex identity',
    latest_rent_estimate: 'Latest rent estimate',
    rent_change_12mo: '12-mo rent change',
    hud_1br_fmr: 'HUD 1BR FMR',
    hud_2br_fmr: 'HUD 2BR FMR',
    median_wage: 'Median wage',
    mean_wage: 'Mean wage',
    metro_employment: 'Metro employment',
    cdc_svi_band: 'CDC SVI band',
    adi_band: 'ADI band',
    svi_counties: 'SVI counties',
    adi_counties: 'ADI counties',
    county_health_data: 'County health data',
    monthly_income_vs_rent: 'Monthly income vs rent',
    income_est_monthly: 'Income (est. monthly)',
    living_wage_vs_bls: 'Living wage vs BLS median',
    living_wage_annual_est: 'Living wage (annual est.)'
  },
  hints: {
    census_acs: 'Census ACS',
    hud_monthly: 'HUD monthly estimate',
    single_adult_mit: 'Single adult, MIT model',
    state_occupational: 'State occupational estimate',
    annual_before_aid: 'Annual, before aid',
    ten_years_after_entry: '10 years after entry',
    completion_within_time: 'Share completing within time',
    share_admitted: 'Share admitted',
    undergraduate_headcount: 'Undergraduate headcount',
    planning_estimate: 'Planning estimate',
    all_occupations: 'All occupations'
  }
};

const ES: PublicDataVizCopy = {
  ...EN,
  publicReferenceData: 'Datos públicos de referencia',
  planningContext: 'Contexto de planificación',
  collegeCostOutcomes: 'Costos universitarios y resultados',
  collegeCostOutcomesBody:
    'Datos universitarios públicos emparejados por nombre de institución y estado. Estas cifras están separadas de los totales de becas de ScholarshipTop en la tabla anterior.',
  costLivingWages: 'Costo de vida y salarios',
  stateAffordabilityBody:
    'Contexto estatal de asequibilidad para complementar el clima de becas anterior; no son totales de becas de ScholarshipTop.',
  visualComparison: 'Comparación visual',
  researchActivityComparison: 'Comparación de actividad investigadora',
  researchActivityBody:
    'Los indicadores públicos de investigación ayudan a comparar actividad académica; no implican elegibilidad para becas.',
  cityRentWageComparison: 'Comparación de alquiler urbano y salarios',
  cityRentWageBody:
    'Las estimaciones públicas de alquiler y salarios ayudan a comparar costo de asistencia y planificación de reubicación.',
  publicPlanningContext: 'Contexto público de planificación',
  publicPlanningBody:
    'Los indicadores comunitarios varían por condado y se incluyen solo como contexto público de planificación. Úsalos junto con monto de beca, costo escolar y gastos de vida; no como regla de elegibilidad.',
  cityRentWageContext: 'Contexto de alquiler urbano y salarios',
  researchInstitutionContext: 'Contexto de investigación e institución',
  statePlanningCalloutTitle: 'Por qué importa para planificar becas',
  statePlanningCalloutBody:
    'Usa estas cifras para comparar valor de beca, costos de reubicación y gastos probables de bolsillo. Una beca mayor en un estado más caro puede cubrir menos que una beca menor en otro lugar.',
  schoolFitCalloutTitle: 'Costo, resultados y encaje de beca',
  schoolFitCalloutBody:
    'Compara matrícula, precio neto e ingresos junto con los totales de becas anteriores. Un precio oficial más alto aún puede encajar si la ayuda y los resultados se alinean con tus metas.',
  schoolNoMatch:
    'No hay coincidencia pública de College Scorecard para este nombre de institución y estado.',
  stateNoDataSuffix: 'para este estado.',
  stateSafetyNote: (rate) =>
    `Tasa de delitos violentos reportada (agregado estatal): ${rate}. El contexto de seguridad pública usa datos públicos agregados; no es una calificación de seguridad.`,
  publicSafetyFooter:
    'El contexto de seguridad pública usa datos públicos agregados y se incluye solo como contexto de planificación.',
  referenceOnly:
    'Solo referencia: no son reglas de elegibilidad ni garantías de ScholarshipTop.',
  dataAvailability:
    'La disponibilidad de datos varía por institución, ciudad, estado y año de fuente.',
  sources: {
    default:
      'Fuentes: datos públicos de educación, empleo, asequibilidad e instituciones cuando están disponibles.',
    college:
      'Fuentes: College Scorecard, OpenAlex y ROR cuando hay coincidencia. Las cifras pueden retrasarse respecto al año académico actual; verifica en el sitio de la institución.',
    state:
      'Fuentes: Census ACS, HUD FMR, MIT Living Wage, BLS OEWS y datasets públicos de referencia cuando están disponibles. Las cifras de alquiler pueden reflejar promedios metropolitanos o estatales.',
    nonprofit:
      'Fuentes: ProPublica Nonprofit Explorer y USAspending cuando hay coincidencias públicas estrictas de organización.',
    research:
      'Fuentes: College Scorecard, OpenAlex, ROR y datos públicos agregados de NIH RePORTER cuando hay coincidencia.',
    social:
      'Fuentes: CDC SVI, ADI y datos públicos de County Health agregados a contexto estatal de planificación.',
    city: 'Fuentes: cruces de ubicación, HUD FMR, Zillow ZORI y datos metropolitanos BLS OEWS cuando hay coincidencias estrictas de ciudad o metro.',
    mixed:
      'Fuentes: datos públicos de educación, empleo, asequibilidad e instituciones cuando están disponibles.'
  },
  labels: {
    ...EN.labels,
    median_household_income: 'Ingreso familiar mediano',
    fair_market_rent_2br: 'Renta justa de mercado (2 hab.)',
    living_wage: 'Salario digno',
    bls_median_wage: 'Salario mediano BLS',
    in_state_tuition: 'Matrícula estatal',
    out_state_tuition: 'Matrícula fuera del estado',
    admission_rate: 'Tasa de admisión',
    completion_rate: 'Tasa de finalización',
    median_earnings: 'Ingresos medianos',
    enrollment: 'Matrícula',
    works_count: 'Publicaciones',
    citation_count: 'Citas',
    nih_projects: 'Proyectos NIH',
    nih_funding_band: 'Banda de financiación NIH',
    latest_nih_year: 'Último año NIH',
    latest_rent_estimate: 'Estimación reciente de alquiler',
    rent_change_12mo: 'Cambio de alquiler 12 meses',
    median_wage: 'Salario mediano',
    mean_wage: 'Salario medio',
    metro_employment: 'Empleo metropolitano',
    cdc_svi_band: 'Banda CDC SVI',
    adi_band: 'Banda ADI',
    svi_counties: 'Condados SVI',
    adi_counties: 'Condados ADI',
    county_health_data: 'Datos de salud por condado',
    monthly_income_vs_rent: 'Ingreso mensual vs alquiler',
    income_est_monthly: 'Ingreso (estimación mensual)',
    living_wage_vs_bls: 'Salario digno vs mediana BLS',
    living_wage_annual_est: 'Salario digno (estimación anual)'
  },
  hints: {
    ...EN.hints,
    hud_monthly: 'Estimación mensual HUD',
    single_adult_mit: 'Adulto soltero, modelo MIT',
    state_occupational: 'Estimación ocupacional estatal',
    annual_before_aid: 'Anual, antes de ayuda',
    ten_years_after_entry: '10 años tras entrar',
    completion_within_time: 'Porcentaje que completa a tiempo',
    share_admitted: 'Porcentaje admitido',
    undergraduate_headcount: 'Estudiantes de pregrado',
    planning_estimate: 'Estimación de planificación',
    all_occupations: 'Todas las ocupaciones'
  }
};

const FR: PublicDataVizCopy = {
  ...EN,
  publicReferenceData: 'Données publiques de référence',
  planningContext: 'Contexte de planification',
  collegeCostOutcomes: 'Coûts universitaires et résultats',
  collegeCostOutcomesBody:
    'Données publiques universitaires associées par nom d’établissement et État. Ces chiffres sont distincts des totaux de bourses ScholarshipTop dans le tableau ci-dessus.',
  costLivingWages: 'Coût de la vie et salaires',
  stateAffordabilityBody:
    'Contexte d’accessibilité financière au niveau de l’État pour compléter le climat des bourses ci-dessus; ce ne sont pas des totaux de bourses ScholarshipTop.',
  visualComparison: 'Comparaison visuelle',
  researchActivityComparison: 'Comparaison de l’activité de recherche',
  researchActivityBody:
    'Les indicateurs publics de recherche aident à comparer l’activité académique; ils n’impliquent pas l’éligibilité aux bourses.',
  cityRentWageComparison: 'Comparaison des loyers urbains et salaires',
  cityRentWageBody:
    'Les estimations publiques de loyer et de salaire aident à comparer le coût des études et la planification d’un déménagement.',
  publicPlanningContext: 'Contexte public de planification',
  publicPlanningBody:
    'Les indicateurs communautaires varient par comté et sont inclus seulement comme contexte public de planification. Utilisez-les avec le montant de la bourse, les coûts d’études et les dépenses de vie; pas comme règle d’éligibilité.',
  cityRentWageContext: 'Contexte loyers urbains et salaires',
  researchInstitutionContext: 'Contexte recherche et établissement',
  statePlanningCalloutTitle: 'Pourquoi cela compte pour planifier les bourses',
  statePlanningCalloutBody:
    'Utilisez ces chiffres pour comparer la valeur des bourses, les coûts de déménagement et les dépenses probables à payer. Une bourse plus élevée dans un État plus cher peut couvrir moins qu’une bourse plus petite ailleurs.',
  schoolFitCalloutTitle: 'Coûts, résultats et adéquation bourse',
  schoolFitCalloutBody:
    'Comparez frais de scolarité, coût net et revenus avec les totaux de bourses ci-dessus. Un prix affiché plus élevé peut rester cohérent si l’aide et les résultats correspondent à vos objectifs.',
  schoolNoMatch:
    'Aucune correspondance publique College Scorecard pour ce nom d’établissement et cet État.',
  stateNoDataSuffix: 'pour cet État.',
  stateSafetyNote: (rate) =>
    `Taux de criminalité violente déclaré (agrégat État): ${rate}. Le contexte de sécurité publique repose sur des données publiques agrégées; ce n’est pas une note de sécurité.`,
  publicSafetyFooter:
    'Le contexte de sécurité publique utilise des données publiques agrégées et sert seulement de contexte de planification.',
  referenceOnly:
    'Référence seulement: pas des règles d’éligibilité ScholarshipTop ni des garanties.',
  dataAvailability:
    'La disponibilité des données varie selon l’établissement, la ville, l’État et l’année de source.',
  sources: {
    default:
      'Sources: données publiques sur l’éducation, l’emploi, l’accessibilité financière et les établissements lorsque disponibles.',
    college:
      'Sources: College Scorecard, OpenAlex et ROR lorsque la correspondance existe. Les chiffres peuvent être décalés par rapport à l’année académique actuelle; vérifiez sur le site de l’établissement.',
    state:
      'Sources: Census ACS, HUD FMR, MIT Living Wage, BLS OEWS et jeux de données publics de référence lorsque disponibles. Les loyers peuvent refléter des moyennes métropolitaines ou étatiques.',
    nonprofit:
      'Sources: ProPublica Nonprofit Explorer et USAspending lorsque des correspondances publiques strictes d’organisation existent.',
    research:
      'Sources: College Scorecard, OpenAlex, ROR et données publiques agrégées NIH RePORTER lorsque la correspondance existe.',
    social:
      'Sources: CDC SVI, ADI et données publiques County Health agrégées au contexte de planification de l’État.',
    city: 'Sources: tables de correspondance géographique, HUD FMR, Zillow ZORI et données métro BLS OEWS lorsque des correspondances strictes ville ou métro existent.',
    mixed:
      'Sources: données publiques sur l’éducation, l’emploi, l’accessibilité financière et les établissements lorsque disponibles.'
  },
  labels: {
    ...EN.labels,
    median_household_income: 'Revenu médian des ménages',
    fair_market_rent_2br: 'Loyer équitable (2 ch.)',
    living_wage: 'Salaire vital',
    bls_median_wage: 'Salaire médian BLS',
    in_state_tuition: 'Frais résidents',
    out_state_tuition: 'Frais hors État',
    admission_rate: 'Taux d’admission',
    completion_rate: 'Taux d’achèvement',
    median_earnings: 'Revenus médians',
    enrollment: 'Effectif inscrit',
    works_count: 'Travaux publiés',
    citation_count: 'Citations',
    nih_projects: 'Projets NIH',
    nih_funding_band: 'Bande de financement NIH',
    latest_nih_year: 'Dernière année NIH',
    latest_rent_estimate: 'Dernière estimation de loyer',
    rent_change_12mo: 'Variation loyer 12 mois',
    median_wage: 'Salaire médian',
    mean_wage: 'Salaire moyen',
    metro_employment: 'Emploi métropolitain',
    cdc_svi_band: 'Bande CDC SVI',
    adi_band: 'Bande ADI',
    svi_counties: 'Comtés SVI',
    adi_counties: 'Comtés ADI',
    county_health_data: 'Données santé par comté',
    monthly_income_vs_rent: 'Revenu mensuel vs loyer',
    income_est_monthly: 'Revenu (est. mensuel)',
    living_wage_vs_bls: 'Salaire vital vs médiane BLS',
    living_wage_annual_est: 'Salaire vital (est. annuelle)'
  },
  hints: {
    ...EN.hints,
    hud_monthly: 'Estimation mensuelle HUD',
    single_adult_mit: 'Adulte seul, modèle MIT',
    state_occupational: 'Estimation professionnelle État',
    annual_before_aid: 'Annuel, avant aide',
    ten_years_after_entry: '10 ans après entrée',
    completion_within_time: 'Part terminant dans les délais',
    share_admitted: 'Part admise',
    undergraduate_headcount: 'Effectif premier cycle',
    planning_estimate: 'Estimation de planification',
    all_occupations: 'Toutes professions'
  }
};

export function getPublicDataVizCopy(
  locale: LocalizedUiLocale = 'en'
): PublicDataVizCopy {
  if (locale === 'es') return ES;
  if (locale === 'fr') return FR;
  return EN;
}
