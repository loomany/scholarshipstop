import {
  citizenshipLabelForValue
} from '@/lib/constants/onboardingCitizenshipAndLocation';
import { gpaForProfileDb } from '@/lib/constants/scholarshipGpaOptions';
import {
  fieldOfStudyLabelForValue,
  schoolLevelLabelForValue
} from '@/lib/constants/scholarshipProfileOptions';
import { normalizeUsStateToCanonical } from '@/lib/constants/usStates';
import {
  composeBirthDateValue,
  parseBirthDayValue,
  parseBirthMonthValue,
  parseBirthYearValue
} from '@/lib/validation/birthDateFields';
import type { Database } from '@/types_db';

type ProfilesRow = Database['public']['Tables']['profiles']['Row'];

function birthPartsFromProfile(p: ProfilesRow | null): {
  month: string;
  day: string;
  year: string;
} {
  if (!p) return { month: '', day: '', year: '' };
  if (p.date_of_birth && /^\d{4}-\d{2}-\d{2}/.test(p.date_of_birth)) {
    const [y, mo, da] = p.date_of_birth.split('-');
    return {
      month: String(Number(mo)),
      day: String(Number(da)),
      year: String(Number(y))
    };
  }
  if (
    p.birth_month != null &&
    p.birth_day != null &&
    p.birth_year != null
  ) {
    return {
      month: String(p.birth_month),
      day: String(p.birth_day),
      year: String(p.birth_year)
    };
  }
  return { month: '', day: '', year: '' };
}

function buildBirthDbFields(
  birthMonth: string,
  birthDay: string,
  birthYear: string
): {
  birth_month: string | null;
  birth_day: number | null;
  birth_year: number | null;
  date_of_birth: string | null;
} {
  const monthValue = parseBirthMonthValue(birthMonth);
  const dayValue = parseBirthDayValue(birthDay);
  const yearValue = parseBirthYearValue(birthYear);
  return {
    birth_month: monthValue != null ? String(monthValue) : null,
    birth_day: dayValue,
    birth_year: yearValue,
    date_of_birth: composeBirthDateValue(monthValue, dayValue, yearValue)
  };
}

function profileBirthDbFields(p: ProfilesRow | null) {
  const parts = birthPartsFromProfile(p);
  return buildBirthDbFields(parts.month, parts.day, parts.year);
}

function normName(s: string): string | null {
  const t = s.trim();
  return t ? t : null;
}

function profileGpaAsNumber(gpa: ProfilesRow['gpa'] | undefined): number | null {
  return gpaForProfileDb(
    gpa != null && gpa !== '' ? String(gpa) : ''
  );
}

function sameGpa(a: number | null, b: number | null): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(a - b) < 1e-9;
}

function birthEqual(
  a: ReturnType<typeof buildBirthDbFields>,
  b: ReturnType<typeof buildBirthDbFields>
): boolean {
  return (
    a.birth_month === b.birth_month &&
    a.birth_day === b.birth_day &&
    a.birth_year === b.birth_year &&
    a.date_of_birth === b.date_of_birth
  );
}

export type ScholarshipProfileFormValues = {
  firstName: string;
  lastName: string;
  birthMonth: string;
  birthDay: string;
  birthYear: string;
  schoolLevel: string;
  fieldOfStudy: string;
  citizenshipStatus: string;
  gpaChoice: string;
  stateRegionInput: string;
};

/**
 * Returns only columns that differ from `profile` (or from an empty baseline when `profile` is null).
 * Omits unchanged keys so `.upsert` / partial writes do not null out unrelated columns.
 */
export function buildScholarshipProfileFormPatch(
  profile: ProfilesRow | null,
  v: ScholarshipProfileFormValues
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  const fn = normName(v.firstName);
  const ln = normName(v.lastName);
  if (normName(profile?.first_name ?? '') !== fn) {
    patch.first_name = fn;
  }
  if (normName(profile?.last_name ?? '') !== ln) {
    patch.last_name = ln;
  }

  const formBirth = buildBirthDbFields(v.birthMonth, v.birthDay, v.birthYear);
  const profBirth = profileBirthDbFields(profile);
  if (!birthEqual(formBirth, profBirth)) {
    Object.assign(patch, formBirth);
  }

  const school_level = v.schoolLevel || null;
  const school_level_label = v.schoolLevel
    ? schoolLevelLabelForValue(v.schoolLevel) ?? null
    : null;
  if ((profile?.school_level ?? null) !== school_level) {
    patch.school_level = school_level;
    patch.school_level_label = school_level_label;
  }

  const field_of_study = v.fieldOfStudy || null;
  const field_of_study_label = v.fieldOfStudy
    ? fieldOfStudyLabelForValue(v.fieldOfStudy) ?? null
    : null;
  if ((profile?.field_of_study ?? null) !== field_of_study) {
    patch.field_of_study = field_of_study;
    patch.field_of_study_label = field_of_study_label;
  }

  const citizenship_status = v.citizenshipStatus.trim() || null;
  const citizenship_status_label = citizenship_status
    ? citizenshipLabelForValue(citizenship_status)
    : null;
  if ((profile?.citizenship_status ?? null) !== citizenship_status) {
    patch.citizenship_status = citizenship_status;
    patch.citizenship_status_label = citizenship_status_label;
  }

  const formGpa = gpaForProfileDb(v.gpaChoice);
  if (!sameGpa(formGpa, profileGpaAsNumber(profile?.gpa))) {
    patch.gpa = formGpa;
  }

  const formState =
    normalizeUsStateToCanonical(v.stateRegionInput) || null;
  const profState =
    normalizeUsStateToCanonical(profile?.state_region?.trim() ?? '') || null;
  if (formState !== profState) {
    patch.state_region = formState;
  }

  return patch;
}
