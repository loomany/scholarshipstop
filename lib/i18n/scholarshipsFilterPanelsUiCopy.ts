import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

export type ScholarshipsFilterPanelsUiCopy = {
  filterByCitizenshipAria: string;
  imFromPanelBody: string;
  loadingCountryFilters: string;
  citizenshipNotSpecified: string;
  citizenshipNotSpecifiedBody: string;
  noDedicatedMatches: string;
  showScholarships: string;
  filterByStudyDestinationAria: string;
  studyDestinationBody: string;
  loadingLocationFilters: string;
  anyUnspecifiedLocation: string;
  anyUnspecifiedLocationBody: string;
  noLocationData: string;
  selectAll: string;
};

const EN: ScholarshipsFilterPanelsUiCopy = {
  filterByCitizenshipAria: 'Filter by citizenship or home country',
  imFromPanelBody:
    'Choose your citizenship or home country for a targeted list, or browse grants where eligible countries are not explicitly recorded in our data (wider search—always verify eligibility).',
  loadingCountryFilters: 'Loading country filters...',
  citizenshipNotSpecified: 'Citizenship not specified',
  citizenshipNotSpecifiedBody:
    'Grants without explicit country eligibility in our database. Local or other restrictions may still apply—please verify before you apply.',
  noDedicatedMatches:
    'No dedicated matches yet. Try International-friendly grants.',
  showScholarships: 'Show scholarships',
  filterByStudyDestinationAria: 'Filter by study destination',
  studyDestinationBody:
    'Choose the country where you want to study, or browse awards with unspecified locations.',
  loadingLocationFilters: 'Loading location filters…',
  anyUnspecifiedLocation: 'Any / Unspecified location',
  anyUnspecifiedLocationBody:
    'Grants with no explicit study country recorded. Please verify the official location before you apply.',
  noLocationData: 'No location data yet for this catalog.',
  selectAll: 'Select all'
};

const ES: ScholarshipsFilterPanelsUiCopy = {
  filterByCitizenshipAria: 'Filtrar por ciudadanía o país de origen',
  imFromPanelBody:
    'Elige tu ciudadanía o país de origen para una lista enfocada, o explora becas sin países elegibles registrados en nuestros datos (búsqueda más amplia: verifica siempre la elegibilidad).',
  loadingCountryFilters: 'Cargando filtros de país...',
  citizenshipNotSpecified: 'Ciudadanía sin especificar',
  citizenshipNotSpecifiedBody:
    'Becas sin elegibilidad por país explícita en nuestra base de datos. Pueden aplicar otras restricciones locales: verifica antes de solicitar.',
  noDedicatedMatches:
    'Aún no hay coincidencias dedicadas. Prueba becas aptas para internacionales.',
  showScholarships: 'Mostrar becas',
  filterByStudyDestinationAria: 'Filtrar por destino de estudios',
  studyDestinationBody:
    'Elige el país donde quieres estudiar o explora becas con ubicaciones sin especificar.',
  loadingLocationFilters: 'Cargando filtros de ubicación…',
  anyUnspecifiedLocation: 'Cualquier / ubicación sin especificar',
  anyUnspecifiedLocationBody:
    'Becas sin país de estudio explícito registrado. Verifica la ubicación oficial antes de solicitar.',
  noLocationData: 'Aún no hay datos de ubicación para este catálogo.',
  selectAll: 'Seleccionar todo'
};

const FR: ScholarshipsFilterPanelsUiCopy = {
  filterByCitizenshipAria: 'Filtrer par citoyenneté ou pays d’origine',
  imFromPanelBody:
    'Choisissez votre citoyenneté ou pays d’origine pour une liste ciblée, ou parcourez les bourses sans pays d’admissibilité enregistrés (recherche plus large — vérifiez toujours l’admissibilité).',
  loadingCountryFilters: 'Chargement des filtres pays...',
  citizenshipNotSpecified: 'Citoyenneté non précisée',
  citizenshipNotSpecifiedBody:
    'Bourses sans admissibilité par pays explicite dans notre base. D’autres restrictions locales peuvent s’appliquer — vérifiez avant de postuler.',
  noDedicatedMatches:
    'Pas encore de correspondances dédiées. Essayez les bourses « international ».',
  showScholarships: 'Afficher les bourses',
  filterByStudyDestinationAria: 'Filtrer par destination d’études',
  studyDestinationBody:
    'Choisissez le pays où vous voulez étudier ou parcourez les bourses à lieu non précisé.',
  loadingLocationFilters: 'Chargement des filtres de lieu…',
  anyUnspecifiedLocation: 'Tout / lieu non précisé',
  anyUnspecifiedLocationBody:
    'Bourses sans pays d’études explicite enregistré. Vérifiez le lieu officiel avant de postuler.',
  noLocationData: 'Pas encore de données de lieu pour ce catalogue.',
  selectAll: 'Tout sélectionner'
};

export function getScholarshipsFilterPanelsUiCopy(
  locale: LocalizedUiLocale
): ScholarshipsFilterPanelsUiCopy {
  if (locale === 'es') return ES;
  if (locale === 'fr') return FR;
  return EN;
}
