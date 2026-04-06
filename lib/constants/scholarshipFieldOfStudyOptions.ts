/**
 * Canonical field-of-study (major) options for onboarding Step 1 and matching.
 * Labels + stable slugs for public.profiles.field_of_study / field_of_study_label.
 */

export type FieldOfStudyOption = { label: string; value: string };

const LABELS = [
  'Agriculture and Related Sciences',
  'Architecture and Related Services',
  'Area, Ethnic, Cultural and Gender Studies',
  'Biological and Biomedical Sciences',
  'Business, Management and Marketing',
  'Communication and Journalism',
  'Computer and Information Sciences',
  'Construction Trades',
  'Education',
  'Engineering',
  'English Language and Literature',
  'Family and Consumer Sciences',
  'Foreign Languages, Literature and Linguistics',
  'Health Professions and Clinical Sciences',
  'History',
  'Legal Professions and Law Studies',
  'Liberal Arts / General Studies',
  'Library Science',
  'Mathematics and Statistics',
  'Mechanic and Repair Tech / Technicians',
  'Military Technologies',
  'Multi / Interdisciplinary Studies',
  'Natural Resources and Conservation',
  'Parks, Recreation, and Fitness Studies',
  'Personal and Culinary Services',
  'Philosophy and Religious Studies',
  'Physical Sciences',
  'Precision Production',
  'Psychology',
  'Public Administration and Social Service',
  'Security and Protective Services',
  'Social Sciences',
  'Technology Education / Industrial Arts',
  'Theology and Religious Vocations',
  'Transportation and Materials Moving',
  'Visual and Performing Arts',
  'Not Listed / Other'
] as const;

export function fieldOfStudySlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export const SCHOLARSHIP_FIELD_OF_STUDY_OPTIONS: FieldOfStudyOption[] =
  LABELS.map((label) => ({
    label,
    value: fieldOfStudySlug(label)
  }));

const BY_VALUE = new Map(
  SCHOLARSHIP_FIELD_OF_STUDY_OPTIONS.map((o) => [o.value, o])
);

export function fieldOfStudyLabelForValue(value: string): string | null {
  return BY_VALUE.get(value)?.label ?? null;
}

export function isValidFieldOfStudyValue(value: string): boolean {
  return BY_VALUE.has(value);
}
