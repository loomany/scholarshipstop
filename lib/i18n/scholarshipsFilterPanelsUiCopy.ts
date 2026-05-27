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
    'Choose your citizenship or home country for a targeted list, or browse grants where eligible countries are not explicitly recorded in our data for a wider shortlist.',
  loadingCountryFilters: 'Loading country filters...',
  citizenshipNotSpecified: 'Citizenship not specified',
  citizenshipNotSpecifiedBody:
    'Grants without explicit country eligibility in our database. Use eligibility signals and provider-path context to decide what belongs on your shortlist.',
  noDedicatedMatches:
    'No dedicated matches yet. Try International-friendly grants.',
  showScholarships: 'Show scholarships',
  filterByStudyDestinationAria: 'Filter by study destination',
  studyDestinationBody:
    'Choose the country where you want to study, or browse awards with unspecified locations.',
  loadingLocationFilters: 'Loading location filters…',
  anyUnspecifiedLocation: 'Any / Unspecified location',
  anyUnspecifiedLocationBody:
    'Grants with no explicit study country recorded. Use study-destination signals to compare fit before you apply.',
  noLocationData: 'No location data yet for this catalog.',
  selectAll: 'Select all'
};

const ES: ScholarshipsFilterPanelsUiCopy = {
  filterByCitizenshipAria: 'Filtrar por ciudadanía o país de origen',
  imFromPanelBody:
    'Elige tu ciudadania o pais de origen para una lista enfocada, o explora becas sin paises elegibles registrados en nuestros datos para una lista mas amplia.',
  loadingCountryFilters: 'Cargando filtros de país...',
  citizenshipNotSpecified: 'Ciudadanía sin especificar',
  citizenshipNotSpecifiedBody:
    'Becas sin elegibilidad por pais explicita en nuestra base de datos. Usa senales de elegibilidad y contexto de ruta del proveedor para decidir que guardar.',
  noDedicatedMatches:
    'Aún no hay coincidencias dedicadas. Prueba becas aptas para internacionales.',
  showScholarships: 'Mostrar becas',
  filterByStudyDestinationAria: 'Filtrar por destino de estudios',
  studyDestinationBody:
    'Elige el país donde quieres estudiar o explora becas con ubicaciones sin especificar.',
  loadingLocationFilters: 'Cargando filtros de ubicación…',
  anyUnspecifiedLocation: 'Cualquier / ubicación sin especificar',
  anyUnspecifiedLocationBody:
    'Becas sin pais de estudio explicito registrado. Usa senales de destino de estudio para comparar ajuste antes de solicitar.',
  noLocationData: 'Aún no hay datos de ubicación para este catálogo.',
  selectAll: 'Seleccionar todo'
};

const FR: ScholarshipsFilterPanelsUiCopy = {
  filterByCitizenshipAria: 'Filtrer par citoyenneté ou pays d’origine',
  imFromPanelBody:
    'Choisissez votre citoyennete ou pays d origine pour une liste ciblee, ou parcourez les bourses sans pays d admissibilite enregistres pour une shortlist plus large.',
  loadingCountryFilters: 'Chargement des filtres pays...',
  citizenshipNotSpecified: 'Citoyenneté non précisée',
  citizenshipNotSpecifiedBody:
    'Bourses sans admissibilite par pays explicite dans notre base. Utilisez les signaux d eligibilite et le contexte fournisseur pour decider quoi garder.',
  noDedicatedMatches:
    'Pas encore de correspondances dédiées. Essayez les bourses « international ».',
  showScholarships: 'Afficher les bourses',
  filterByStudyDestinationAria: 'Filtrer par destination d’études',
  studyDestinationBody:
    'Choisissez le pays où vous voulez étudier ou parcourez les bourses à lieu non précisé.',
  loadingLocationFilters: 'Chargement des filtres de lieu…',
  anyUnspecifiedLocation: 'Tout / lieu non précisé',
  anyUnspecifiedLocationBody:
    'Bourses sans pays d etudes explicite enregistre. Utilisez les signaux de destination pour comparer l adequation avant de postuler.',
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
