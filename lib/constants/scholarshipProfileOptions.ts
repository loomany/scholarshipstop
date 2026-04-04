/** Options for scholarship matching onboarding (labels + stable DB slugs). */

export type LabeledSlugOption = { label: string; value: string };

export {
  SCHOLARSHIP_FIELD_OF_STUDY_OPTIONS as FIELD_OF_STUDY_OPTIONS,
  fieldOfStudySlug,
  fieldOfStudyLabelForValue
} from '@/lib/constants/scholarshipFieldOfStudyOptions';

export const SCHOOL_LEVEL_OPTIONS: LabeledSlugOption[] = [
  { label: 'High school freshman', value: 'high_school_freshman' },
  { label: 'High school sophomore', value: 'high_school_sophomore' },
  { label: 'High school junior', value: 'high_school_junior' },
  { label: 'High school senior', value: 'high_school_senior' },
  { label: 'College 1st year', value: 'college_1' },
  { label: 'College 2nd year', value: 'college_2' },
  { label: 'College 3rd year', value: 'college_3' },
  { label: 'College 4th year', value: 'college_4' },
  { label: 'Graduate student', value: 'graduate_student' },
  { label: 'Adult/Non-traditional Student', value: 'adult_non_traditional' }
];

export const BIRTH_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
] as const;

export function buildBirthMonthSelectOptions(): { value: string; label: string }[] {
  return [
    { value: '', label: 'Month' },
    ...BIRTH_MONTH_NAMES.map((name, i) => ({
      value: String(i + 1),
      label: name
    }))
  ];
}

export function buildBirthDaySelectOptions(): { value: string; label: string }[] {
  return [
    { value: '', label: 'Day' },
    ...Array.from({ length: 31 }, (_, i) => {
      const d = i + 1;
      return { value: String(d), label: String(d) };
    })
  ];
}

export function buildBirthYearSelectOptions(): { value: string; label: string }[] {
  const current = new Date().getFullYear();
  const opts: { value: string; label: string }[] = [
    { value: '', label: 'Year' }
  ];
  for (let y = current; y >= current - 100; y--) {
    opts.push({ value: String(y), label: String(y) });
  }
  return opts;
}

export function schoolLevelLabelForValue(value: string): string | null {
  const hit = SCHOOL_LEVEL_OPTIONS.find((o) => o.value === value);
  return hit?.label ?? null;
}
