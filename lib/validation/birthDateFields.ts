export type BirthDateFieldErrors = Partial<
  Record<'birthMonth' | 'birthDay' | 'birthYear' | 'birthDate' | 'age', string>
>;

const MIN_AGE = 13;
const MAX_AGE = 100;

function currentYear(): number {
  return new Date().getFullYear();
}

export function sanitizeBirthDayInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 2);
}

export function sanitizeBirthYearInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 4);
}

export function parseBirthMonthValue(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 12) return null;
  return parsed;
}

export function parseBirthDayValue(value: string): number | null {
  if (!value.trim()) return null;
  if (!/^\d{1,2}$/.test(value)) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 31) return null;
  return parsed;
}

export function parseBirthYearValue(value: string): number | null {
  if (!value.trim()) return null;
  if (!/^\d{4}$/.test(value)) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return null;
  const maxYear = currentYear();
  const minYear = maxYear - MAX_AGE;
  if (parsed < minYear || parsed > maxYear) return null;
  return parsed;
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const dt = new Date(year, month - 1, day);
  return (
    dt.getFullYear() === year &&
    dt.getMonth() === month - 1 &&
    dt.getDate() === day
  );
}

function ageYears(year: number, month: number, day: number): number {
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDelta = today.getMonth() + 1 - month;
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < day)) age -= 1;
  return age;
}

export function composeBirthDateValue(
  month: number | null,
  day: number | null,
  year: number | null
): string | null {
  if (month == null || day == null || year == null) return null;
  if (!isValidCalendarDate(year, month, day)) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function validateBirthDateFields(
  values: {
    birthMonth: string;
    birthDay: string;
    birthYear: string;
  },
  options?: {
    requireAll?: boolean;
  }
): BirthDateFieldErrors {
  const errors: BirthDateFieldErrors = {};
  const birthMonth = values.birthMonth.trim();
  const birthDay = values.birthDay.trim();
  const birthYear = values.birthYear.trim();
  const requireAll = options?.requireAll ?? false;
  const hasAnyValue = Boolean(birthMonth || birthDay || birthYear);
  const mustComplete = requireAll || hasAnyValue;

  if (mustComplete && !birthMonth) {
    errors.birthMonth = 'Please select your birth month';
  }

  if (!birthDay) {
    if (mustComplete) errors.birthDay = 'Please enter your birth day';
  } else if (!/^\d+$/.test(birthDay) || parseBirthDayValue(birthDay) == null) {
    errors.birthDay = 'Day must be between 1 and 31';
  }

  if (!birthYear) {
    if (mustComplete) errors.birthYear = 'Please enter your birth year';
  } else if (!/^\d+$/.test(birthYear)) {
    errors.birthYear = 'Year must contain numbers only';
  } else if (!/^\d{4}$/.test(birthYear)) {
    errors.birthYear = 'Enter a 4-digit year';
  } else if (parseBirthYearValue(birthYear) == null) {
    errors.birthYear = 'Please enter a realistic birth year';
  }

  const monthValue = parseBirthMonthValue(birthMonth);
  const dayValue = parseBirthDayValue(birthDay);
  const yearValue = parseBirthYearValue(birthYear);

  if (
    birthMonth &&
    birthDay &&
    birthYear &&
    monthValue != null &&
    dayValue != null &&
    yearValue != null
  ) {
    if (!isValidCalendarDate(yearValue, monthValue, dayValue)) {
      errors.birthDate = 'Please enter a valid date of birth';
    } else {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const birthDate = new Date(yearValue, monthValue - 1, dayValue);
      if (birthDate > today) {
        errors.birthDate = 'Birth date cannot be in the future';
      } else {
        const age = ageYears(yearValue, monthValue, dayValue);
        if (age < MIN_AGE) {
          errors.age = 'You must be at least 13 years old';
        } else if (age > MAX_AGE) {
          errors.age = 'Please enter a realistic birth year';
        }
      }
    }
  }

  return errors;
}
