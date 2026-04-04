'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { DarkSelect } from '@/components/home/DarkSelect';
import { CITIZENSHIP_OPTIONS } from '@/lib/constants/onboardingCitizenshipAndLocation';
import {
  SCHOLARSHIP_GPA_OPTIONS,
  SCHOLARSHIP_GPA_PREFER_NOT_TO_SAY,
  normalizeGpaForSelect
} from '@/lib/constants/scholarshipGpaOptions';
import {
  FIELD_OF_STUDY_OPTIONS,
  SCHOOL_LEVEL_OPTIONS,
  buildBirthMonthSelectOptions
} from '@/lib/constants/scholarshipProfileOptions';
import { UsStateAutocomplete } from '@/components/onboarding/UsStateAutocomplete';
import {
  US_STATE_AUTOCOMPLETE_PLACEHOLDER,
  US_STATE_PROFILE_HELPER_TEXT
} from '@/lib/constants/usStates';
import { buildScholarshipProfileFormPatch } from '@/lib/account/scholarshipProfileFormPatch';
import { accountPagePrimaryButtonClass } from '@/lib/constants/scholarshipActionUi';
import { pickAllowedProfilesUpsertFields } from '@/lib/onboarding/profilesOnboardingSync';
import {
  sanitizeBirthDayInput,
  sanitizeBirthYearInput,
  validateBirthDateFields
} from '@/lib/validation/birthDateFields';
import type { Database } from '@/types_db';
import { createClient } from '@/utils/supabase/client';

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

const inputClass =
  'mt-2 w-full max-w-xl rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-zinc-900 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20';
const inputClassSaaS =
  'mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-500/20';
const birthDateInputBaseClass =
  'w-full rounded-xl border bg-white px-4 py-3.5 text-sm text-zinc-900 shadow-sm outline-none transition-all duration-200 placeholder:text-zinc-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/25 disabled:cursor-not-allowed disabled:opacity-50';
const labelClass = 'mt-4 block text-sm font-medium text-zinc-700 first:mt-0';
const labelClassSaaS =
  'mt-4 block text-xs font-semibold uppercase tracking-wide text-zinc-500 first:mt-0';

/** Same option sets as onboarding Step 1 / Step 3 (`DarkSelect`). */
const schoolLevelSelectOptions = [
  { value: '', label: 'Select your school level' },
  ...SCHOOL_LEVEL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
];

const fieldOfStudySelectOptions = [
  { value: '', label: 'Select your field of study' },
  ...FIELD_OF_STUDY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
];

const citizenshipSelectOptions = [
  { value: '', label: 'Select citizenship status' },
  ...CITIZENSHIP_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
];

const birthMonthOptions = buildBirthMonthSelectOptions();

const gpaProfileSelectOptions = [
  {
    value: SCHOLARSHIP_GPA_PREFER_NOT_TO_SAY,
    label: 'Prefer not to say (optional)'
  },
  ...SCHOLARSHIP_GPA_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
];

const EDUCATION_PATCH_KEYS = [
  'school_level',
  'school_level_label',
  'field_of_study',
  'field_of_study_label'
] as const;

const ELIGIBILITY_PATCH_KEYS = [
  'citizenship_status',
  'citizenship_status_label',
  'state_region',
  'gpa'
] as const;

/** Personal card: replaces the removed global bar for name + DOB (selects do not submit the form on Enter). */
const PERSONAL_PATCH_KEYS = [
  'first_name',
  'last_name',
  'birth_month',
  'birth_day',
  'birth_year',
  'date_of_birth'
] as const;

function pickPatchKeys(
  patch: Record<string, unknown>,
  keys: readonly string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      out[k] = patch[k];
    }
  }
  return out;
}

type ProfileSectionKey = 'personal' | 'education' | 'eligibility';

type SectionFeedback = { type: 'ok' | 'err'; text: string };

/** Save row: left-aligned like hero “Upgrade to Pro”; message sits beside the button on larger screens. */
const SAAS_SECTION_ACTION_ROW =
  'mt-6 border-t border-zinc-100 pt-5';

export default function ScholarshipProfileForm({
  profile,
  variant = 'default'
}: {
  profile: ProfilesRow | null;
  /** `account`: compact card on /account (page supplies section heading). `saas`: split profile cards, no outer Card. */
  variant?: 'default' | 'account' | 'saas';
}) {
  const router = useRouter();
  const birth0 = useMemo(() => birthPartsFromProfile(profile), [profile]);

  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [birthMonth, setBirthMonth] = useState(birth0.month);
  const [birthDay, setBirthDay] = useState(birth0.day);
  const [birthYear, setBirthYear] = useState(birth0.year);
  const [schoolLevel, setSchoolLevel] = useState(profile?.school_level ?? '');
  const [fieldOfStudy, setFieldOfStudy] = useState(profile?.field_of_study ?? '');
  const [citizenshipStatus, setCitizenshipStatus] = useState(
    profile?.citizenship_status ?? ''
  );
  const [gpaChoice, setGpaChoice] = useState(() =>
    normalizeGpaForSelect(
      profile?.gpa != null && profile.gpa !== '' ? String(profile.gpa) : ''
    )
  );
  const [stateRegionInput, setStateRegionInput] = useState(
    () => profile?.state_region?.trim() ?? ''
  );

  const profileSnapshot = useMemo(
    () =>
      profile
        ? JSON.stringify({
            fn: profile.first_name,
            ln: profile.last_name,
            gpa: profile.gpa,
            sl: profile.school_level,
            fos: profile.field_of_study,
            cit: profile.citizenship_status,
            st: profile.state_region,
            dob: profile.date_of_birth,
            bm: profile.birth_month,
            bd: profile.birth_day,
            by: profile.birth_year
          })
        : '',
    [profile]
  );

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name ?? '');
    setLastName(profile.last_name ?? '');
    const b = birthPartsFromProfile(profile);
    setBirthMonth(b.month);
    setBirthDay(b.day);
    setBirthYear(b.year);
    setSchoolLevel(profile.school_level ?? '');
    setFieldOfStudy(profile.field_of_study ?? '');
    setCitizenshipStatus(profile.citizenship_status ?? '');
    setGpaChoice(
      normalizeGpaForSelect(
        profile.gpa != null && profile.gpa !== '' ? String(profile.gpa) : ''
      )
    );
    setStateRegionInput(profile.state_region?.trim() ?? '');
  }, [profile, profileSnapshot]);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );
  const [sectionFeedback, setSectionFeedback] = useState<
    Partial<Record<ProfileSectionKey, SectionFeedback>>
  >({});

  useEffect(() => {
    const keys = (['personal', 'education', 'eligibility'] as const).filter(
      (k) => sectionFeedback[k]?.type === 'ok'
    );
    if (keys.length === 0) return;
    const t = window.setTimeout(() => {
      setSectionFeedback((prev) => {
        const next = { ...prev };
        for (const k of keys) {
          if (next[k]?.type === 'ok') delete next[k];
        }
        return next;
      });
    }, 5000);
    return () => window.clearTimeout(t);
  }, [sectionFeedback]);

  const formValues = useMemo(
    () => ({
      firstName,
      lastName,
      birthMonth,
      birthDay,
      birthYear,
      schoolLevel,
      fieldOfStudy,
      citizenshipStatus,
      gpaChoice,
      stateRegionInput
    }),
    [
      birthDay,
      birthMonth,
      birthYear,
      citizenshipStatus,
      fieldOfStudy,
      firstName,
      lastName,
      gpaChoice,
      stateRegionInput,
      schoolLevel
    ]
  );
  const liveBirthErrors = useMemo(
    () =>
      validateBirthDateFields(
        {
          birthMonth,
          birthDay,
          birthYear
        },
        { requireAll: false }
      ),
    [birthDay, birthMonth, birthYear]
  );
  const birthMonthError = liveBirthErrors.birthMonth;
  const birthDayError = liveBirthErrors.birthDay;
  const birthYearError = liveBirthErrors.birthYear;
  const birthDateError = liveBirthErrors.birthDate;
  const birthAgeError = liveBirthErrors.age;

  const performProfilePatch = useCallback(
    async (
      patch: Record<string, unknown>,
      opts?: { section?: ProfileSectionKey }
    ) => {
      const section = opts?.section;
      if (section) {
        setSectionFeedback((prev) => {
          const next = { ...prev };
          delete next[section];
          return next;
        });
      } else {
        setMessage(null);
      }

      setSubmitting(true);
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        setSubmitting(false);
        const errText = 'Not signed in.';
        if (section) {
          setSectionFeedback((f) => ({ ...f, [section]: { type: 'err', text: errText } }));
        } else {
          setMessage({ type: 'err', text: errText });
        }
        return;
      }

      if (Object.keys(patch).length === 0) {
        setSubmitting(false);
        const okText = 'No changes to save.';
        if (section) {
          setSectionFeedback((f) => ({ ...f, [section]: { type: 'ok', text: okText } }));
        } else {
          setMessage({ type: 'ok', text: okText });
        }
        return;
      }

      const payload = pickAllowedProfilesUpsertFields({
        id: user.id,
        updated_at: new Date().toISOString(),
        ...patch
      }) as Database['public']['Tables']['profiles']['Insert'];

      console.info('[account:profile] upsert payload (partial)', payload);

      const { data: saved, error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .maybeSingle();

      setSubmitting(false);
      if (error) {
        console.error('[account:profile] Supabase error', error.message, error);
        if (section) {
          setSectionFeedback((f) => ({
            ...f,
            [section]: { type: 'err', text: error.message }
          }));
        } else {
          setMessage({ type: 'err', text: error.message });
        }
        return;
      }
      console.info('[account:profile] saved row', saved);
      const savedOk =
        'Saved. Your profile was updated — refresh the page anytime to confirm.';
      if (section) {
        setSectionFeedback((f) => ({ ...f, [section]: { type: 'ok', text: savedOk } }));
      } else {
        setMessage({ type: 'ok', text: 'Changes saved.' });
      }
      router.refresh();
    },
    [router]
  );

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const birthErrors = validateBirthDateFields(
        {
          birthMonth,
          birthDay,
          birthYear
        },
        { requireAll: false }
      );
      if (Object.keys(birthErrors).length > 0) {
        setMessage({ type: 'err', text: 'Please correct your date of birth before saving.' });
        return;
      }
      const patch = buildScholarshipProfileFormPatch(profile, formValues);
      await performProfilePatch(patch);
    },
    [birthDay, birthMonth, birthYear, formValues, performProfilePatch, profile]
  );

  const onSavePersonal = useCallback(async () => {
    const birthErrors = validateBirthDateFields(
      {
        birthMonth,
        birthDay,
        birthYear
      },
      { requireAll: false }
    );
    if (Object.keys(birthErrors).length > 0) {
      setSectionFeedback((prev) => ({
        ...prev,
        personal: { type: 'err', text: 'Please correct your date of birth before saving.' }
      }));
      return;
    }
    const patch = buildScholarshipProfileFormPatch(profile, formValues);
    await performProfilePatch(pickPatchKeys(patch, PERSONAL_PATCH_KEYS), {
      section: 'personal'
    });
  }, [birthDay, birthMonth, birthYear, formValues, performProfilePatch, profile]);

  const onSaveEducation = useCallback(async () => {
    const patch = buildScholarshipProfileFormPatch(profile, formValues);
    await performProfilePatch(pickPatchKeys(patch, EDUCATION_PATCH_KEYS), {
      section: 'education'
    });
  }, [formValues, performProfilePatch, profile]);

  const onSaveEligibility = useCallback(async () => {
    const patch = buildScholarshipProfileFormPatch(profile, formValues);
    await performProfilePatch(pickPatchKeys(patch, ELIGIBILITY_PATCH_KEYS), {
      section: 'eligibility'
    });
  }, [formValues, performProfilePatch, profile]);

  const isAccount = variant === 'account';
  const isSaas = variant === 'saas';
  const ic = isSaas ? inputClassSaaS : inputClass;
  const lc = isSaas ? labelClassSaaS : labelClass;
  const selectWrapClass = isSaas ? 'mt-2 w-full' : 'mt-2 w-full max-w-xl';
  const birthGridClass = `mt-2 grid w-full grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-3${
    isSaas ? '' : ' max-w-xl'
  }`;
  const birthDateInputClass = (hasError: boolean) =>
    `${birthDateInputBaseClass} ${
      hasError
        ? 'border-amber-400/80 hover:border-amber-500/70'
        : 'border-zinc-200 hover:border-zinc-300'
    }`;
  const birthDateFields = (
    <>
      <span className={lc}>Date of birth</span>
      <div className={birthGridClass}>
        <DarkSelect
          ariaLabel="Birth month"
          options={birthMonthOptions}
          value={birthMonth}
          onChange={setBirthMonth}
          disabled={submitting}
          hasError={Boolean(birthMonthError)}
        />
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label="Birth day"
          placeholder="Day"
          maxLength={2}
          value={birthDay}
          onChange={(e) => setBirthDay(sanitizeBirthDayInput(e.target.value))}
          disabled={submitting}
          className={birthDateInputClass(Boolean(birthDayError))}
          aria-invalid={Boolean(birthDayError)}
        />
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label="Birth year"
          placeholder="Year"
          maxLength={4}
          value={birthYear}
          onChange={(e) => setBirthYear(sanitizeBirthYearInput(e.target.value))}
          disabled={submitting}
          className={birthDateInputClass(Boolean(birthYearError))}
          aria-invalid={Boolean(birthYearError)}
        />
      </div>
      {birthMonthError ? <p className="mt-2 text-sm text-zinc-500">{birthMonthError}</p> : null}
      {birthDayError ? <p className="mt-2 text-sm text-zinc-500">{birthDayError}</p> : null}
      {birthYearError ? <p className="mt-2 text-sm text-zinc-500">{birthYearError}</p> : null}
      {birthDateError ? <p className="mt-2 text-sm text-zinc-500">{birthDateError}</p> : null}
      {birthAgeError ? <p className="mt-2 text-sm text-zinc-500">{birthAgeError}</p> : null}
    </>
  );

  const formBody = (
    <>
      <label className={lc} htmlFor="spf-first_name">
        First name
      </label>
      <input
        id="spf-first_name"
        className={ic}
        maxLength={80}
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        autoComplete="given-name"
      />
      <label className={lc} htmlFor="spf-last_name">
        Last name
      </label>
      <input
        id="spf-last_name"
        className={ic}
        maxLength={80}
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        autoComplete="family-name"
      />
      {birthDateFields}

      <label className={lc} htmlFor="spf-school">
        School level
      </label>
      <div className={selectWrapClass}>
        <DarkSelect
          id="spf-school"
          options={schoolLevelSelectOptions}
          value={schoolLevel}
          onChange={setSchoolLevel}
          disabled={submitting}
        />
      </div>

      <label className={lc} htmlFor="spf-major">
        Field of study
      </label>
      <div className={selectWrapClass}>
        <DarkSelect
          id="spf-major"
          options={fieldOfStudySelectOptions}
          value={fieldOfStudy}
          onChange={setFieldOfStudy}
          menuClassName="max-h-72"
          disabled={submitting}
        />
      </div>

      <label className={lc} htmlFor="spf-citizenship">
        Citizenship
      </label>
      <div className={selectWrapClass}>
        <DarkSelect
          id="spf-citizenship"
          ariaLabel="Citizenship"
          options={citizenshipSelectOptions}
          value={citizenshipStatus}
          onChange={setCitizenshipStatus}
          disabled={submitting}
        />
      </div>

      <label className={lc} htmlFor="spf-state" id="spf-state-label">
        State (optional)
      </label>
      <UsStateAutocomplete
        id="spf-state"
        labelId="spf-state-label"
        value={stateRegionInput}
        onChange={setStateRegionInput}
        inputClassName={ic}
        placeholder={US_STATE_AUTOCOMPLETE_PLACEHOLDER}
        suggestionListZIndexClass="z-[60]"
        disabled={submitting}
      />

      <label className={lc} htmlFor="spf-gpa">
        GPA
      </label>
      <div className={selectWrapClass}>
        <DarkSelect
          id="spf-gpa"
          ariaLabel="GPA"
          options={gpaProfileSelectOptions}
          value={gpaChoice}
          onChange={setGpaChoice}
          menuClassName="max-h-72"
          disabled={submitting}
        />
      </div>
    </>
  );

  const saveFooter = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {message ? (
        <p
          className={
            message.type === 'ok' ? 'text-sm text-teal-700' : 'text-sm text-red-600'
          }
        >
          {message.text}
        </p>
      ) : (
        <span className="text-sm text-zinc-500">
          {isAccount ? 'Save to update your profile.' : 'Changes apply after you save.'}
        </span>
      )}
      <Button
        variant="slim"
        type="submit"
        form="scholarshipProfileForm"
        loading={submitting}
      >
        Save
      </Button>
    </div>
  );

  if (isSaas) {
    const sectionSaveRow = (
      section: ProfileSectionKey,
      onSave: () => void
    ) => {
      const fb = sectionFeedback[section];
      return (
        <div className={SAAS_SECTION_ACTION_ROW}>
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <button
              type="button"
              onClick={onSave}
              disabled={submitting}
              className={accountPagePrimaryButtonClass}
            >
              {submitting ? 'Saving…' : 'Save'}
            </button>
            {fb ? (
              <p
                role="status"
                aria-live="polite"
                className={`max-w-xl text-sm font-medium leading-snug ${
                  fb.type === 'ok' ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                {fb.text}
              </p>
            ) : null}
          </div>
        </div>
      );
    };

    return (
      <form
        id="scholarshipProfileForm"
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <div className="grid gap-6">
          <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-[0_2px_24px_-8px_rgba(15,23,42,0.08)]">
            <h3 className="text-base font-semibold text-zinc-900">Personal info</h3>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500">
              Keep these details up to date so we can show scholarship cards that better match
              you.
            </p>
            <div className="mt-4 space-y-1">
              <label className={lc} htmlFor="spf-first_name">
                First name
              </label>
              <input
                id="spf-first_name"
                className={ic}
                maxLength={80}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
              <label className={lc} htmlFor="spf-last_name">
                Last name
              </label>
              <input
                id="spf-last_name"
                className={ic}
                maxLength={80}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
              />
              {birthDateFields}
            </div>
            {sectionSaveRow('personal', onSavePersonal)}
          </div>

          <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-[0_2px_24px_-8px_rgba(15,23,42,0.08)]">
            <h3 className="text-base font-semibold text-zinc-900">Education</h3>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500">
              We recommend filling this in so we can show scholarship cards that better match
              your academic background.
            </p>
            <div className="mt-4 space-y-1">
              <label className={lc} htmlFor="spf-school">
                School level
              </label>
              <div className={selectWrapClass}>
                <DarkSelect
                  id="spf-school"
                  options={schoolLevelSelectOptions}
                  value={schoolLevel}
                  onChange={setSchoolLevel}
                  disabled={submitting}
                />
              </div>
              <label className={lc} htmlFor="spf-major">
                Field of study
              </label>
              <div className={selectWrapClass}>
                <DarkSelect
                  id="spf-major"
                  options={fieldOfStudySelectOptions}
                  value={fieldOfStudy}
                  onChange={setFieldOfStudy}
                  menuClassName="max-h-72"
                  disabled={submitting}
                />
              </div>
            </div>
            {sectionSaveRow('education', onSaveEducation)}
          </div>

          <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-[0_2px_24px_-8px_rgba(15,23,42,0.08)]">
            <h3 className="text-base font-semibold text-zinc-900">Eligibility</h3>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500">
              We recommend filling this in so we can surface scholarship cards that better fit
              your eligibility profile.
            </p>
            <div className="mt-4 space-y-1">
              <label className={lc} htmlFor="spf-citizenship">
                Citizenship
              </label>
              <div className={selectWrapClass}>
                <DarkSelect
                  id="spf-citizenship"
                  ariaLabel="Citizenship"
                  options={citizenshipSelectOptions}
                  value={citizenshipStatus}
                  onChange={setCitizenshipStatus}
                  disabled={submitting}
                />
              </div>
              <label className={lc} htmlFor="spf-state-saas" id="spf-state-saas-label">
                U.S. state (optional)
              </label>
              <UsStateAutocomplete
                id="spf-state-saas"
                labelId="spf-state-saas-label"
                value={stateRegionInput}
                onChange={setStateRegionInput}
                inputClassName={ic}
                placeholder={US_STATE_AUTOCOMPLETE_PLACEHOLDER}
                suggestionListZIndexClass="z-[60]"
                disabled={submitting}
              />
              <p className="mt-2 text-sm text-zinc-500">{US_STATE_PROFILE_HELPER_TEXT}</p>
              <label className={lc} htmlFor="spf-gpa">
                GPA
              </label>
              <div className={selectWrapClass}>
                <DarkSelect
                  id="spf-gpa"
                  ariaLabel="GPA"
                  options={gpaProfileSelectOptions}
                  value={gpaChoice}
                  onChange={setGpaChoice}
                  menuClassName="max-h-72"
                  disabled={submitting}
                />
              </div>
            </div>
            {sectionSaveRow('eligibility', onSaveEligibility)}
          </div>
        </div>
      </form>
    );
  }

  return (
    <Card
      title={isAccount ? undefined : 'Scholarship profile'}
      description={
        isAccount
          ? 'Saved to your account. We use this for scholarship matching.'
          : 'Stored in your account (public.profiles). Update these fields anytime — they power scholarship matching.'
      }
      footer={saveFooter}
    >
      <form id="scholarshipProfileForm" className="mt-6 space-y-1" onSubmit={onSubmit}>
        {formBody}
      </form>
    </Card>
  );
}
