'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';

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
import { US_STATE_AUTOCOMPLETE_PLACEHOLDER } from '@/lib/constants/usStates';
import { buildScholarshipProfileFormPatch } from '@/lib/account/scholarshipProfileFormPatch';
import { accountPagePrimaryButtonClass } from '@/lib/constants/scholarshipActionUi';
import { pickAllowedProfilesUpsertFields } from '@/lib/onboarding/profilesOnboardingSync';
import {
  sanitizeBirthDayInput,
  sanitizeBirthYearInput,
  validateBirthDateFields
} from '@/lib/validation/birthDateFields';
import {
  deriveSubscriptionPresentation,
  type SubscriptionWithPriceAndProduct
} from '@/lib/payments/subscriptionEntitlements';
import type { Database, Tables } from '@/types_db';
import { updateEmail } from '@/utils/auth-helpers/server';
import { createClient } from '@/utils/supabase/client';

type ProfilesRow = Database['public']['Tables']['profiles']['Row'];
type Subscription = Tables<'subscriptions'>;
type SubscriptionType = 'none' | 'trial' | 'monthly' | 'quarterly' | 'yearly';

function getLemonManageSubscriptionUrl(subscription: Subscription | null): string | null {
  if (!subscription || subscription.provider !== 'lemon_squeezy') return null;

  const rawPayload = subscription.raw_payload as
    | {
        data?: {
          attributes?: {
            urls?: {
              customer_portal_update_subscription?: string | null;
              customer_portal?: string | null;
            } | null;
          } | null;
        } | null;
      }
    | null;

  const urls = rawPayload?.data?.attributes?.urls;
  const manageUrl =
    urls?.customer_portal_update_subscription?.trim() || urls?.customer_portal?.trim() || null;

  return manageUrl || null;
}

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
/** SaaS email field: full width inside a relative wrapper; extra right padding when status chip is shown. */
const emailInputSaaSClass =
  'w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50 read-only:cursor-default read-only:bg-zinc-50 read-only:focus:border-zinc-200 read-only:focus:bg-zinc-50 read-only:focus:ring-0';
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

function sanitizeProfilesPatch(
  patch: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...patch };

  if (
    Object.prototype.hasOwnProperty.call(out, 'school_level') &&
    (out.school_level == null || out.school_level === '')
  ) {
    out.school_level = null;
    out.school_level_label = null;
  }

  if (
    Object.prototype.hasOwnProperty.call(out, 'field_of_study') &&
    (out.field_of_study == null || out.field_of_study === '')
  ) {
    out.field_of_study = null;
    out.field_of_study_label = null;
  }

  if (Object.prototype.hasOwnProperty.call(out, 'gpa')) {
    const gpaRaw = out.gpa;
    if (
      gpaRaw == null ||
      gpaRaw === '' ||
      (typeof gpaRaw === 'number' && !Number.isFinite(gpaRaw))
    ) {
      out.gpa = null;
    }
  }

  return out;
}

type ProfileSectionKey = 'personal' | 'education' | 'eligibility';

type SectionFeedback = { type: 'ok' | 'err'; text: string };

/** Save row: left-aligned like hero “Upgrade to Pro”; message sits beside the button on larger screens. */
const SAAS_SECTION_ACTION_ROW =
  'mt-6 border-t border-zinc-100 pt-5';

const subscriptionButtonBaseClass =
  'group w-full md:w-auto px-8 py-3 rounded-xl transition-all hover:scale-105 active:scale-95 inline-flex items-center justify-center gap-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60';

const compactUpgradeButtonBaseClass =
  'rounded-xl px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60';

const compactUpgradeRowClass =
  'flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4';

const premiumPerks = [
  'Unlimited Scholarship Matches',
  'AI-Powered Application Assistant',
  'Early Access to New Grants'
] as const;

const freePlanPrecisionPerks = [
  'AI-Precision Matching: We filter out the noise. See only grants you actually qualify for.',
  'Precision Filters: Field of study, nationality, intent—sort instantly without the headache.',
  'Time-Saver: Stop wasting 20+ hours on manual research every single week.'
] as const;

function formatPlanDate(dateValue: string | null | undefined) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

function getDaysRemaining(dateValue: string | null | undefined) {
  if (!dateValue) return null;
  const now = Date.now();
  const target = new Date(dateValue).getTime();
  if (Number.isNaN(target)) return null;
  return Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
}

function getRemainingProgressPercent(
  startValue: string | null | undefined,
  endValue: string | null | undefined
) {
  if (!startValue || !endValue) return null;
  const start = new Date(startValue).getTime();
  const end = new Date(endValue).getTime();
  const now = Date.now();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
  const total = end - start;
  const remaining = Math.min(Math.max(end - now, 0), total);
  return Math.max(6, Math.min(100, (remaining / total) * 100));
}

export default function ScholarshipProfileForm({
  profile,
  subscription = null,
  userEmail,
  emailConfirmed,
  variant = 'default'
}: {
  profile: ProfilesRow | null;
  subscription?: SubscriptionWithPriceAndProduct | null;
  /** Session email for /account personal block; change triggers verification flow on Save. */
  userEmail?: string | null;
  /**
   * SaaS email badge: `true` / `false` from `profiles.email_verified` (via parent); `undefined` if no profile row yet.
   */
  emailConfirmed?: boolean;
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
  const [emailInput, setEmailInput] = useState(() => userEmail?.trim() ?? '');

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

  useEffect(() => {
    setEmailInput(userEmail?.trim() ?? '');
  }, [userEmail]);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );
  const [sectionFeedback, setSectionFeedback] = useState<
    Partial<Record<ProfileSectionKey, SectionFeedback>>
  >({});
  const [trialEmailGateMessage, setTrialEmailGateMessage] = useState<string | null>(null);

  useEffect(() => {
    if (emailConfirmed === true) {
      setTrialEmailGateMessage(null);
    }
  }, [emailConfirmed]);

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

  const upsertProfilesRow = useCallback(
    async (
      userId: string,
      patch: Record<string, unknown>
    ): Promise<{ ok: true } | { ok: false; message: string }> => {
      const sanitizedPatch = sanitizeProfilesPatch(patch);
      if (Object.keys(sanitizedPatch).length === 0) return { ok: true };
      const supabase = createClient();
      const payload = pickAllowedProfilesUpsertFields({
        id: userId,
        updated_at: new Date().toISOString(),
        ...sanitizedPatch
      }) as Database['public']['Tables']['profiles']['Insert'];

      console.info('[account:profile] upsert payload (partial)', payload);

      const { data: saved, error } = await supabase
        .schema('public')
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .maybeSingle();

      if (error) {
        console.error('[account:profile] Supabase error', error.message, error);
        return { ok: false, message: error.message };
      }
      console.info('[account:profile] saved row', saved);
      return { ok: true };
    },
    []
  );

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

      const result = await upsertProfilesRow(user.id, patch);
      setSubmitting(false);
      if (!result.ok) {
        if (section) {
          setSectionFeedback((f) => ({
            ...f,
            [section]: { type: 'err', text: result.message }
          }));
        } else {
          setMessage({ type: 'err', text: result.message });
        }
        return;
      }
      const savedOk = 'Saved.';
      if (section) {
        setSectionFeedback((f) => ({ ...f, [section]: { type: 'ok', text: savedOk } }));
      } else {
        setMessage({ type: 'ok', text: savedOk });
      }
      router.refresh();
    },
    [router, upsertProfilesRow]
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
    const personalPatch = pickPatchKeys(patch, PERSONAL_PATCH_KEYS);
    const emailTrimmed = emailInput.trim();
    const currentEmail = (userEmail ?? '').trim();
    const emailChanged = emailTrimmed !== currentEmail;

    if (emailChanged && emailTrimmed === '') {
      setSectionFeedback((prev) => ({
        ...prev,
        personal: { type: 'err', text: 'Email is required.' }
      }));
      return;
    }

    if (Object.keys(personalPatch).length === 0 && !emailChanged) {
      setSectionFeedback((prev) => ({
        ...prev,
        personal: { type: 'ok', text: 'No changes to save.' }
      }));
      return;
    }

    setSectionFeedback((prev) => {
      const next = { ...prev };
      delete next.personal;
      return next;
    });

    setSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        setSectionFeedback((f) => ({
          ...f,
          personal: { type: 'err', text: 'Not signed in.' }
        }));
        return;
      }

      if (Object.keys(personalPatch).length > 0) {
        const result = await upsertProfilesRow(user.id, personalPatch);
        if (!result.ok) {
          setSectionFeedback((f) => ({
            ...f,
            personal: { type: 'err', text: result.message }
          }));
          return;
        }
      }

      if (emailChanged) {
        const fd = new FormData();
        fd.append('newEmail', emailTrimmed);
        const redirectUrl = await updateEmail(fd);
        router.push(redirectUrl);
        return;
      }

      setSectionFeedback((f) => ({
        ...f,
        personal: { type: 'ok', text: 'Saved.' }
      }));
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }, [
    birthDay,
    birthMonth,
    birthYear,
    emailInput,
    formValues,
    profile,
    router,
    upsertProfilesRow,
    userEmail
  ]);

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

  const onStartTrial = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setTrialEmailGateMessage(null);
      router.push('/signin');
      return;
    }

    // Must match UI / parent: only `emailConfirmed === true` (see AccountDashboardClient).
    // Do not OR with `user.email_confirmed_at` here — that bypassed profile.email_verified === false.
    if (emailConfirmed !== true) {
      setTrialEmailGateMessage(
        'Please confirm your email before starting your free trial. Check your inbox for the confirmation link, then return here.'
      );
      return;
    }

    setTrialEmailGateMessage(null);

    router.push('/subscription');
  }, [emailConfirmed, router]);

  const onSwitchPlan = useCallback(() => {
    router.push('/subscription');
  }, [router]);

  const onManageSubscription = useCallback(() => {
    router.push('/subscription');
  }, [router]);

  const isAccount = variant === 'account';
  const isSaas = variant === 'saas';
  const subscriptionPresentation = useMemo(
    () => deriveSubscriptionPresentation(profile, subscription),
    [profile, subscription]
  );
  const subscriptionType = useMemo<SubscriptionType>(() => {
    switch (subscriptionPresentation.plan) {
      case 'trial':
        return 'trial';
      case 'monthly_pro':
        return 'monthly';
      case 'quarterly_pro':
        return 'quarterly';
      case 'yearly_pro':
        return 'yearly';
      default:
        return 'none';
    }
  }, [subscriptionPresentation.plan]);
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
    const showSaasEmailStatus =
      userEmail != null && emailConfirmed !== undefined;
    const subscriptionStatusUi = (() => {
      switch (subscriptionType) {
        case 'trial':
          return {
            badgeLabel: subscriptionPresentation.label,
            badgeClass: 'bg-orange-100 text-orange-700 font-medium ring-1 ring-orange-200',
            title: 'Keep Premium Access Active',
            subtitle: null,
            buttonLabel: 'View Your Plan',
            buttonClass:
              'bg-slate-900 text-white shadow-sm hover:bg-slate-800 hover:shadow-md',
            showTrialProgress: true
          };
        case 'monthly':
          return {
            badgeLabel: subscriptionPresentation.label,
            badgeClass: 'bg-emerald-100 text-emerald-700 font-medium ring-1 ring-emerald-200',
            title: 'Premium Precision Active',
            subtitle: 'You are saving 20+ hours of manual research this month.',
            hidePrimaryAction: true
          };
        case 'quarterly':
          return {
            badgeLabel: subscriptionPresentation.label,
            badgeClass: 'bg-blue-100 text-blue-700 font-medium ring-1 ring-blue-200',
            title: 'Smart Searching, Better Results',
            subtitle: '',
            hidePrimaryAction: true
          };
        case 'yearly':
          return {
            badgeLabel: subscriptionPresentation.label,
            badgeClass:
              'border border-amber-300 bg-violet-100 text-violet-800 font-medium ring-1 ring-violet-200',
            title: 'Elite Access Unlocked',
            subtitle: 'You have top-tier priority for all AI-curated matches.',
            hidePrimaryAction: true
          };
        case 'none':
        default:
          return {
            badgeLabel: 'Free Plan',
            badgeClass: 'bg-slate-100 text-slate-600 font-medium',
            title: 'Unlock Premium Access',
            subtitle: 'Start 3-Day Free Trial, then as low as $12/mo.',
            buttonLabel: 'Start 3-Day Free Trial',
            buttonClass:
              'bg-orange-500 text-white shadow-lg shadow-orange-200 hover:bg-orange-600 hover:shadow-orange-200',
            buttonSubtext: 'Full access. No commitment. Cancel anytime.'
          };
      }
    })();

    const compactSubscriptionCardLayout =
      subscriptionType === 'quarterly' ||
      subscriptionType === 'trial' ||
      subscriptionType === 'none';

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
          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
            {subscriptionType === 'monthly' ? (
              <div>
                <div className="border-b border-slate-100 px-5 py-2.5 md:px-7 md:py-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
                    <div className="min-w-0 w-full md:w-auto">
                      <div className="flex flex-row items-center justify-between gap-2 md:flex-col md:items-center md:justify-start md:gap-2">
                        <p className="min-w-0 text-sm font-semibold text-slate-900 md:text-center md:whitespace-nowrap">
                          Subscription status
                        </p>
                        <div
                          id="subscription-status"
                          className={`inline-flex shrink-0 items-center justify-center rounded-full px-3 py-1 text-center text-xs uppercase leading-none tracking-wider md:whitespace-nowrap md:px-2.5 md:text-[11px] md:tracking-wide ${subscriptionStatusUi.badgeClass}`}
                        >
                          {subscriptionStatusUi.badgeLabel}
                        </div>
                      </div>
                    </div>
                    <div className="max-w-xl text-center md:text-left">
                      <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                        {subscriptionStatusUi.title}
                      </h3>
                      <p className="mt-1.5 text-sm text-slate-500">
                        {subscriptionStatusUi.subtitle}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid items-stretch gap-2 px-5 py-2.5 md:grid-cols-2 md:px-7 md:py-3">
                  <div className="flex min-h-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">Quarterly</p>
                      <p className="mt-1 text-sm text-slate-500">$19/mo</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          void onSwitchPlan();
                        }}
                        className={`inline-flex items-center justify-center ${compactUpgradeButtonBaseClass} bg-orange-500 text-white hover:bg-orange-600`}
                      >
                        Upgrade
                      </button>
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                        Save 24%
                      </span>
                    </div>
                  </div>

                  <div className="flex min-h-0 items-center justify-between gap-3 rounded-xl border-2 border-slate-300 bg-white p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">Yearly</p>
                      <p className="mt-1 text-sm text-slate-500">$12/mo</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          void onSwitchPlan();
                        }}
                        className={`inline-flex items-center justify-center ${compactUpgradeButtonBaseClass} bg-orange-500 text-white hover:bg-orange-600`}
                      >
                        Upgrade
                      </button>
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                        Save 52%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
            <div
              className={`grid grid-cols-1 gap-0 md:grid-cols-2 ${
                compactSubscriptionCardLayout
                  ? 'md:items-center'
                  : subscriptionType === 'yearly'
                    ? 'md:items-start'
                    : ''
              }`}
            >
              <div
                className={`${
                  compactSubscriptionCardLayout
                    ? 'px-5 py-4 md:px-7 md:py-2'
                    : subscriptionType === 'yearly'
                      ? 'px-6 py-2.5 md:px-8 md:py-3'
                      : 'p-6 md:p-8'
                }`}
              >
                <div
                  className={`flex w-full min-w-0 flex-row items-center justify-between gap-3 ${
                    compactSubscriptionCardLayout || subscriptionType === 'yearly'
                      ? 'md:flex-col md:items-start md:justify-start md:gap-1.5'
                      : 'md:items-center md:gap-8'
                  }`}
                >
                  <p
                    className={`min-w-0 text-sm font-semibold leading-snug text-slate-900 ${
                      compactSubscriptionCardLayout || subscriptionType === 'yearly'
                        ? 'md:whitespace-nowrap'
                        : 'md:shrink-0 md:whitespace-nowrap'
                    }`}
                  >
                    Subscription status
                  </p>
                  <div
                    id="subscription-status"
                    className={`inline-flex shrink-0 items-center justify-center rounded-full px-3 py-1 text-center text-xs uppercase leading-none tracking-wider md:self-start md:px-2.5 md:py-1 md:text-[11px] md:leading-none md:tracking-wide md:whitespace-nowrap ${subscriptionStatusUi.badgeClass}`}
                  >
                    {subscriptionStatusUi.badgeLabel}
                  </div>
                </div>
                <h3
                  className={`${
                    compactSubscriptionCardLayout
                      ? 'mt-4 md:mt-2.5'
                      : subscriptionType === 'yearly'
                        ? 'mt-2'
                        : 'mt-4'
                  } text-center font-bold tracking-tight text-slate-900 md:text-left ${
                    subscriptionType === 'yearly'
                      ? 'text-2xl md:text-lg md:whitespace-nowrap md:leading-tight'
                      : 'text-2xl'
                  }`}
                >
                  {subscriptionStatusUi.title}
                </h3>
                {subscriptionStatusUi.subtitle ? (
                  <p
                    className={`${
                      subscriptionType === 'yearly' || compactSubscriptionCardLayout
                        ? 'mt-2.5 md:mt-1.5'
                        : 'mt-2'
                    } text-center text-sm text-slate-500 md:text-left`}
                  >
                    {subscriptionStatusUi.subtitle}
                  </p>
                ) : null}
                {subscriptionType === 'none' && trialEmailGateMessage ? (
                  <div
                    role="alert"
                    className="mt-4 max-w-md rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2.5 text-sm font-medium leading-snug text-amber-950 shadow-sm md:mt-3"
                  >
                    {trialEmailGateMessage}
                  </div>
                ) : null}
                {subscriptionStatusUi.showTrialProgress ? (
                  <div
                    className={`max-w-md ${
                      subscriptionType === 'trial' ? 'mt-2.5' : 'mt-4'
                    }`}
                  >
                    <div
                      className={`flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-orange-700 ${
                        subscriptionType === 'trial' ? 'mb-1.5' : 'mb-2'
                      }`}
                    >
                      <span>Trial countdown</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-orange-100">
                      <div
                        className="h-full rounded-full bg-orange-500 transition-all"
                        style={{ width: `${subscriptionPresentation.progressPercent ?? 0}%` }}
                      />
                    </div>
                  </div>
                ) : null}
                {!subscriptionStatusUi.hidePrimaryAction ? (
                  <div
                    className={`flex flex-col items-center gap-4 sm:flex-row sm:items-center md:gap-3 ${
                      subscriptionType === 'trial'
                        ? 'md:items-center'
                        : 'md:items-start'
                    } ${
                      subscriptionType === 'none' || subscriptionType === 'trial'
                        ? 'mt-5 md:mt-3'
                        : 'mt-5'
                    }`}
                  >
                    <div
                      className={
                        subscriptionType === 'trial'
                          ? 'relative w-full max-w-md md:mx-auto'
                          : 'relative inline-flex w-full max-w-md justify-center sm:w-auto sm:max-w-none sm:justify-start'
                      }
                    >
                      <button
                        type="button"
                        onClick={
                          subscriptionType === 'none'
                            ? () => {
                                void onStartTrial();
                              }
                            : () => onManageSubscription()
                        }
                        className={
                          subscriptionType === 'trial'
                            ? `group relative w-full px-8 py-3 rounded-xl transition-all hover:scale-105 active:scale-95 inline-flex items-center justify-center text-center text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${subscriptionStatusUi.buttonClass}`
                            : `${subscriptionButtonBaseClass} ${subscriptionStatusUi.buttonClass}${
                                subscriptionType === 'none'
                                  ? ' md:whitespace-nowrap md:px-6 md:py-2.5 md:text-[0.8125rem] md:leading-tight'
                                  : ''
                              }`
                        }
                      >
                        <span>{subscriptionStatusUi.buttonLabel}</span>
                        {subscriptionType === 'trial' ? (
                          <ArrowRight
                            className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                            strokeWidth={2}
                            aria-hidden
                          />
                        ) : (
                          <ArrowRight
                            className={`h-4 w-4 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100${
                              subscriptionType === 'none' ? ' md:h-3.5 md:w-3.5' : ''
                            }`}
                            strokeWidth={2}
                            aria-hidden
                          />
                        )}
                      </button>
                    </div>
                  </div>
                ) : subscriptionType === 'yearly' || subscriptionType === 'quarterly' ? null : (
                  <div className="mt-8" />
                )}
                {subscriptionStatusUi.buttonSubtext ? (
                  <p
                    className={`text-center text-sm text-slate-400 md:text-left ${
                      subscriptionType === 'none' || subscriptionType === 'trial'
                        ? 'mt-3.5 md:mt-2'
                        : 'mt-3'
                    }`}
                  >
                    {subscriptionStatusUi.buttonSubtext}
                  </p>
                ) : null}
              </div>
              <div
                className={`flex flex-col border-t border-slate-100 bg-gradient-to-br from-slate-50 to-white md:border-l md:border-t-0 ${
                  compactSubscriptionCardLayout
                    ? 'justify-center px-5 pb-6 pt-5 md:px-6 md:py-2 md:pb-2 md:pt-2'
                    : subscriptionType === 'yearly'
                      ? 'justify-start px-6 py-2.5 md:px-7 md:py-3'
                      : 'h-full justify-center px-8 py-6'
                }`}
              >
                {subscriptionType === 'none' || subscriptionType === 'trial' ? (
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-700 text-center md:text-left">
                    Stop Searching. Start Winning.
                  </p>
                ) : null}
                {subscriptionType === 'quarterly' ? (
                  <div>
                    <div className="flex min-h-[108px] flex-col rounded-xl border-2 border-slate-300 bg-white px-2 pt-1.5 pb-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1 self-center">
                          <p className="text-sm font-medium text-slate-900">Yearly</p>
                          <p className="mt-1 text-sm text-slate-500">$12/mo</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              void onSwitchPlan();
                            }}
                            className={`${compactUpgradeButtonBaseClass} bg-orange-500 text-white hover:bg-orange-600`}
                          >
                            Upgrade
                          </button>
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                            Save 52%
                          </span>
                        </div>
                      </div>
                      <p className="mt-auto pt-0.5 text-[13px] leading-snug text-slate-500">
                        Best long-term value for consistent access all year.
                      </p>
                    </div>
                  </div>
                ) : subscriptionType === 'yearly' ? (
                  <div className="mt-0 space-y-2 md:mt-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex flex-col gap-3 md:items-center">
                        <p className="text-sm leading-snug md:text-center md:whitespace-nowrap">
                          <span className="font-semibold text-slate-900">Current plan</span>
                          <span className="mx-2 text-slate-300" aria-hidden>
                            ·
                          </span>
                          <span className="font-medium text-slate-500">Best Value</span>
                        </p>
                        <button
                          type="button"
                          onClick={() => router.push('/subscription')}
                          className={`inline-flex w-full items-center justify-center md:w-auto md:self-center ${compactUpgradeButtonBaseClass} bg-slate-900 text-white hover:bg-slate-800 md:whitespace-nowrap`}
                        >
                          Manage Subscription
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4 text-center md:mt-3 md:space-y-3 md:text-left">
                    {(subscriptionType === 'none' || subscriptionType === 'trial'
                      ? freePlanPrecisionPerks
                      : premiumPerks
                    ).map((perk) => (
                      <div key={perk} className="text-sm leading-relaxed text-slate-500">
                        <span>{perk}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-[0_2px_24px_-8px_rgba(15,23,42,0.08)]">
            <h3 className="text-base font-semibold text-zinc-900">Personal info</h3>
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
              <label className={lc} htmlFor="spf-email">
                Email
              </label>
              <div className="relative mt-2 max-w-lg">
                <input
                  id="spf-email"
                  type="email"
                  className={`${emailInputSaaSClass} ${
                    showSaasEmailStatus
                      ? emailConfirmed
                        ? 'pr-[6.75rem]'
                        : 'pr-[8.25rem]'
                      : ''
                  }`}
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  autoComplete="email"
                  maxLength={320}
                  disabled={submitting}
                  readOnly={emailConfirmed === true}
                  aria-describedby={
                    showSaasEmailStatus ? 'spf-email-status' : undefined
                  }
                />
                {showSaasEmailStatus ? (
                  <div
                    id="spf-email-status"
                    className={`pointer-events-none absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-full border px-2 py-0.5 ${
                      emailConfirmed
                        ? 'border-emerald-100 bg-[rgba(16,185,129,0.1)]'
                        : 'border-amber-100 bg-amber-50/90'
                    }`}
                    role="status"
                  >
                    {emailConfirmed ? (
                      <>
                        <Check
                          className="h-3.5 w-3.5 shrink-0 text-emerald-600"
                          strokeWidth={3}
                          aria-hidden
                        />
                        <span className="text-[11px] font-bold uppercase tracking-tight text-emerald-700">
                          Confirmed
                        </span>
                      </>
                    ) : (
                      <span className="text-[11px] font-semibold uppercase tracking-tight text-amber-900">
                        Not confirmed
                      </span>
                    )}
                  </div>
                ) : null}
              </div>
              {emailConfirmed === false && userEmail ? (
                <p className="mt-2 max-w-lg text-xs text-zinc-500">
                  Check your inbox for the confirmation link. You can still browse; some actions may
                  stay limited until you confirm.
                </p>
              ) : null}
            </div>
            {sectionSaveRow('personal', onSavePersonal)}
          </div>

          <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-[0_2px_24px_-8px_rgba(15,23,42,0.08)]">
            <h3 className="text-base font-semibold text-zinc-900">Education</h3>
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
