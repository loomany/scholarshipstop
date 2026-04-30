'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent
} from 'react';
import {
  ArrowRight,
  BrainCircuit,
  FileText,
  LineChart,
  Mail,
  Network,
  Save,
  ShieldCheck,
  Sparkles,
  Timer
} from 'lucide-react';

import AssessmentEngine from '@/components/iq/AssessmentEngine';
import ContextualStrategyPaywall from '@/components/iq/ContextualStrategyPaywall';
import PostAssessmentQuiz from '@/components/iq/PostAssessmentQuiz';
import StandardIqPaywall from '@/components/iq/StandardIqPaywall';
import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import {
  normalizeScholarshipsListRows,
  postScholarshipsList
} from '@/app/scholarships/scholarshipListFetch';
import {
  citizenshipLabelForValue,
  US_STATE_OPTIONS
} from '@/lib/constants/onboardingCitizenshipAndLocation';
import {
  fieldOfStudyLabelForValue,
  schoolLevelLabelForValue
} from '@/lib/constants/scholarshipProfileOptions';
import {
  gpaForProfile,
  resolveStoredProfileGpaChoice,
  SCHOLARSHIP_GPA_PREFER_NOT_TO_SAY,
  withProfileGpaSelectionSnapshot
} from '@/lib/constants/scholarshipGpaOptions';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import type { Database } from '@/types_db';
import type {
  AssessmentResult,
  QualificationData,
  UserIntent
} from '@/lib/iqAssessmentTypes';
import { parseUserIntent } from '@/lib/iqIntent';
import { syncOnboardingToProfiles } from '@/lib/onboarding/syncScholarshipProfile';
import type { UserProfile } from '@/lib/onboarding/userProfile';
import { scholarshipDeadlineHasPassed } from '@/lib/scholarships/scholarshipDeadlineState';
import { generateStrategy } from '@/lib/strategyRecommendationEngine';
import { createClient } from '@/utils/supabase/client';

type ContextualFunnelPhase =
  | 'intro'
  | 'assessment'
  | 'email_capture'
  | 'iq_ready'
  | 'iq_report_paywall'
  | 'qualification'
  | 'account'
  | 'strategy_paywall';

type ContextualAssessmentFunnelClientProps = {
  initialIntent: UserIntent;
};

type ProfileQualificationRow = Pick<
  Database['public']['Tables']['profiles']['Row'],
  | 'school_level'
  | 'field_of_study'
  | 'citizenship_status'
  | 'state_region'
  | 'gpa'
  | 'saved_filters_snapshot'
>;

const INTENT_STORAGE_KEY = 'iq_contextual_intent:v1';
const QUALIFICATION_STORAGE_KEY = 'iq_qualification_data:v1';
const ASSESSMENT_STORAGE_KEY = 'iq_contextual_assessment:v1';
const FUNNEL_PHASE_STORAGE_KEY = 'iq_contextual_funnel_phase:v1';
const RESULT_STORAGE_KEY = 'iq_contextual_result:v1';
const RECOMMENDED_GRANTS_STORAGE_KEY = 'iq_contextual_recommended_grants:v1';
const CONTEXTUAL_EMAIL_STORAGE_KEY = 'iq_contextual_email:v1';

const intentCopy: Record<
  UserIntent,
  { eyebrow: string; title: string; text: string; outcome: string }
> = {
  general_iq: {
    eyebrow: 'Cognitive profile',
    title: 'Take a research-informed IQ-style test before you choose your next move.',
    text: 'This short cognitive assessment measures how you solve problems across reasoning, speed, spatial thinking, verbal logic, and decision-making.',
    outcome:
      'Then we translate your profile into a practical scholarship strategy.'
  },
  essay_prep: {
    eyebrow: 'Essay prep path',
    title: 'Discover the thinking pattern behind stronger scholarship essays.',
    text: 'The test helps identify whether your advantage is structure, logic, verbal reasoning, or pattern recognition before you write.',
    outcome:
      'Your final strategy will point toward essay angles and awards where your profile can stand out.'
  },
  college_fit: {
    eyebrow: 'College fit path',
    title: 'Compare schools through the way your brain works.',
    text: 'Instead of guessing, use a five-domain cognitive profile to understand how you evaluate tradeoffs, deadlines, and application styles.',
    outcome:
      'Your final strategy will connect your profile to school and scholarship-fit decisions.'
  },
  scholarship_match: {
    eyebrow: 'Scholarship match path',
    title: 'Find scholarships that fit how your brain works.',
    text: 'Take the same 30-question cognitive assessment used for the general IQ flow, then add a few goals so the result becomes useful.',
    outcome:
      'Your final strategy will prioritize awards, reading, and next steps based on your strengths.'
  },
  provider_research: {
    eyebrow: 'Provider research path',
    title: 'Prioritize scholarship providers with a clearer strategy.',
    text: 'A cognitive profile can help you decide whether to focus on essay-heavy providers, fast applications, research awards, or logic-based opportunities.',
    outcome:
      'Your final strategy will help you choose which providers deserve attention first.'
  },
  deadline_strategy: {
    eyebrow: 'Deadline strategy path',
    title: 'Build an application plan around your execution style.',
    text: 'The assessment looks at speed, prioritization, and reasoning so your scholarship plan can match how you actually work under pressure.',
    outcome:
      'Your final strategy will separate quick wins from higher-effort deadlines.'
  }
};

const sciencePillars = [
  {
    name: 'ICAR',
    detail: 'short online cognitive battery',
    icon: LineChart
  },
  {
    name: 'Raven',
    detail: 'visual pattern reasoning',
    icon: Network
  },
  {
    name: 'Wechsler',
    detail: 'multi-index profile thinking',
    icon: BrainCircuit
  },
  {
    name: 'Cattell',
    detail: 'fluid intelligence tradition',
    icon: ShieldCheck
  }
];

const assessmentHighlights = [
  {
    title: '30 focused questions',
    text: 'Short enough to finish, structured enough to reveal a useful pattern.',
    icon: Timer
  },
  {
    title: '5 cognitive domains',
    text: 'Reasoning, spatial intelligence, verbal logic, numerical logic, and decision speed.',
    icon: BrainCircuit
  },
  {
    title: 'Strategy after score',
    text: 'Your result becomes a scholarship plan after matching details.',
    icon: FileText
  }
];

function readStoredIntent() {
  try {
    return parseUserIntent(window.localStorage.getItem(INTENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

function isContextualFunnelPhase(value: unknown): value is ContextualFunnelPhase {
  return (
    value === 'intro' ||
    value === 'assessment' ||
    value === 'email_capture' ||
    value === 'iq_ready' ||
    value === 'iq_report_paywall' ||
    value === 'qualification' ||
    value === 'account' ||
    value === 'strategy_paywall'
  );
}

function readJsonStorage<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJsonStorage(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures.
  }
}

function writePhaseStorage(phase: ContextualFunnelPhase) {
  try {
    window.localStorage.setItem(FUNNEL_PHASE_STORAGE_KEY, phase);
  } catch {
    // Ignore storage failures.
  }
}

function isStoredQualificationData(value: unknown): value is QualificationData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<Record<keyof QualificationData, unknown>>;

  return (
    typeof data.schoolLevel === 'string' &&
    data.schoolLevel.trim().length > 0 &&
    typeof data.fieldOfStudy === 'string' &&
    data.fieldOfStudy.trim().length > 0 &&
    typeof data.citizenship === 'string' &&
    data.citizenship.trim().length > 0 &&
    typeof data.gpa === 'string' &&
    data.gpa.trim().length > 0 &&
    (typeof data.state === 'string' || typeof data.state === 'undefined')
  );
}

function normalizeStoredQualificationData(
  value: unknown
): QualificationData | null {
  if (!isStoredQualificationData(value)) return null;

  return {
    schoolLevel: value.schoolLevel,
    fieldOfStudy: value.fieldOfStudy,
    citizenship: value.citizenship,
    state: value.state ?? '',
    gpa: value.gpa
  };
}

function stateProfileValueToQualificationState(value: string | null): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '';

  const byValue = US_STATE_OPTIONS.find((option) => option.value === trimmed);
  if (byValue) return byValue.value;

  const byLabel = US_STATE_OPTIONS.find(
    (option) => option.label.toLowerCase() === trimmed.toLowerCase()
  );
  return byLabel?.value ?? '';
}

function qualificationDataFromProfileRow(
  profile: ProfileQualificationRow | null
): QualificationData | null {
  if (!profile) return null;

  const schoolLevel = profile.school_level?.trim() ?? '';
  const fieldOfStudy = profile.field_of_study?.trim() ?? '';
  const citizenship = profile.citizenship_status?.trim() ?? '';
  const gpa = resolveStoredProfileGpaChoice(
    profile.gpa,
    profile.saved_filters_snapshot
  );

  if (
    !schoolLevel ||
    !fieldOfStudy ||
    !citizenship ||
    !gpa ||
    gpa === SCHOLARSHIP_GPA_PREFER_NOT_TO_SAY
  ) {
    return null;
  }

  return {
    schoolLevel,
    fieldOfStudy,
    citizenship,
    state: stateProfileValueToQualificationState(profile.state_region),
    gpa
  };
}

function qualificationDataToProfile(data: QualificationData): UserProfile {
  const schoolLevel = data.schoolLevel.trim() || null;
  const fieldOfStudy = data.fieldOfStudy.trim() || null;
  const citizenship = data.citizenship.trim() || null;
  const gpa = data.gpa.trim();
  const state = data.state.trim();

  return {
    firstName: null,
    lastName: null,
    birthMonth: null,
    birthDay: null,
    birthYear: null,
    dateOfBirth: null,
    schoolLevel,
    schoolLevelLabel: schoolLevel ? schoolLevelLabelForValue(schoolLevel) : null,
    fieldOfStudy,
    fieldOfStudyLabel: fieldOfStudy
      ? fieldOfStudyLabelForValue(fieldOfStudy)
      : null,
    citizenshipStatus: citizenship,
    citizenshipStatusLabel: citizenship
      ? citizenshipLabelForValue(citizenship)
      : null,
    countryCode: null,
    stateRegion:
      US_STATE_OPTIONS.some((option) => option.value === state) ? state : null,
    city: null,
    gpa: gpaForProfile(gpa),
    savedFiltersSnapshot: withProfileGpaSelectionSnapshot(null, gpa),
    onboardingCompleted: true,
    emailVerified: false
  };
}

async function fetchRecommendedGrants() {
  const grantsResponse = await postScholarshipsList({
    searchParams: 'tab=best-recommendation&limit=10',
    guestBestRecommendationPreviewEnabled: true
  });

  return normalizeScholarshipsListRows(grantsResponse)
    .filter((grant) => !scholarshipDeadlineHasPassed(grant))
    .slice(0, 4);
}

async function readProfileQualificationData(userId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('profiles')
    .select(
      'school_level,field_of_study,citizenship_status,state_region,gpa,saved_filters_snapshot'
    )
    .eq('id', userId)
    .maybeSingle<ProfileQualificationRow>();

  return qualificationDataFromProfileRow(data ?? null);
}

function clearFunnelProgressStorage() {
  try {
    [
      ASSESSMENT_STORAGE_KEY,
      FUNNEL_PHASE_STORAGE_KEY,
      RESULT_STORAGE_KEY,
      QUALIFICATION_STORAGE_KEY,
      RECOMMENDED_GRANTS_STORAGE_KEY,
      CONTEXTUAL_EMAIL_STORAGE_KEY
    ].forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Ignore storage failures.
  }
}

export default function ContextualAssessmentFunnelClient({
  initialIntent
}: ContextualAssessmentFunnelClientProps) {
  const [intent, setIntent] = useState<UserIntent>(initialIntent);
  const [phase, setPhase] = useState<ContextualFunnelPhase>('intro');
  const [hydrated, setHydrated] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [qualificationData, setQualificationData] =
    useState<QualificationData | null>(null);
  const [contextualEmail, setContextualEmail] = useState('');
  const [recommendedGrants, setRecommendedGrants] = useState<Scholarship[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authResolved, setAuthResolved] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileSkipUnavailable, setProfileSkipUnavailable] = useState(false);
  const { hasSubscription, subscriptionReady } = useSubscriptionAccess(userId);
  const autoProfileSkipStartedRef = useRef(false);

  useEffect(() => {
    const stored = readStoredIntent();
    const nextIntent = initialIntent ?? stored ?? 'scholarship_match';
    setIntent(nextIntent);
    try {
      window.localStorage.setItem(INTENT_STORAGE_KEY, nextIntent);
    } catch {
      // Ignore storage failures.
    }
  }, [initialIntent]);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const nextUserId = data.session?.user.id ?? null;
      const nextEmail = data.session?.user.email?.trim().toLowerCase() ?? '';
      setUserId(nextUserId);
      setIsAuthenticated(Boolean(nextUserId));
      if (nextEmail) {
        setContextualEmail(nextEmail);
      }
      setAuthResolved(true);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const storedPhaseRaw = window.localStorage.getItem(FUNNEL_PHASE_STORAGE_KEY);
    const storedPhase = isContextualFunnelPhase(storedPhaseRaw)
      ? storedPhaseRaw
      : null;
    const storedResult = readJsonStorage<AssessmentResult>(RESULT_STORAGE_KEY);
    const storedQualification = normalizeStoredQualificationData(
      readJsonStorage<unknown>(QUALIFICATION_STORAGE_KEY)
    );
    const storedGrants = readJsonStorage<Scholarship[]>(
      RECOMMENDED_GRANTS_STORAGE_KEY
    );
    const storedEmail = window.localStorage.getItem(CONTEXTUAL_EMAIL_STORAGE_KEY);
    const hasAssessmentDraft = Boolean(
      readJsonStorage<unknown>(ASSESSMENT_STORAGE_KEY)
    );

    if (storedResult) setResult(storedResult);
    if (storedEmail) setContextualEmail(storedEmail);
    if (storedQualification) {
      setQualificationData(storedQualification);
    }
    if (Array.isArray(storedGrants)) setRecommendedGrants(storedGrants);

    if (storedPhase === 'iq_report_paywall' && storedResult) {
      setPhase(storedEmail ? 'iq_report_paywall' : 'iq_ready');
    } else if (storedPhase === 'iq_ready' && storedResult) {
      setPhase('iq_ready');
    } else if (storedPhase === 'email_capture' && storedResult) {
      setPhase('email_capture');
    } else if (storedPhase === 'strategy_paywall' && storedResult && storedQualification) {
      setPhase('strategy_paywall');
    } else if (storedPhase === 'account' && storedResult && storedQualification) {
      setPhase('account');
    } else if (storedPhase === 'qualification' && storedResult) {
      setPhase('qualification');
    } else if (
      (storedPhase === 'strategy_paywall' || storedPhase === 'account') &&
      storedResult
    ) {
      setPhase('qualification');
    } else if (storedPhase === 'assessment' || hasAssessmentDraft) {
      setPhase('assessment');
    }

    setHydrated(true);
  }, []);

  const transitionPhase = useCallback((nextPhase: ContextualFunnelPhase) => {
    setPhase(nextPhase);
    writePhaseStorage(nextPhase);
  }, []);

  const restartAssessment = () => {
    clearFunnelProgressStorage();
    autoProfileSkipStartedRef.current = false;
    setProfileSkipUnavailable(false);
    setResult(null);
    setQualificationData(null);
    setRecommendedGrants([]);
    transitionPhase('assessment');
  };

  const completeWithExistingProfile = useCallback(
    async (currentUserId: string) => {
      const profileQualification = await readProfileQualificationData(currentUserId);
      if (!profileQualification) return false;

      setQualificationData(profileQualification);
      writeJsonStorage(QUALIFICATION_STORAGE_KEY, profileQualification);

      const grants = await fetchRecommendedGrants();
      setRecommendedGrants(grants);
      writeJsonStorage(RECOMMENDED_GRANTS_STORAGE_KEY, grants);
      setIsAuthenticated(true);
      setUserId(currentUserId);
      transitionPhase('strategy_paywall');
      return true;
    },
    [transitionPhase]
  );

  useEffect(() => {
    if (!hydrated || phase !== 'strategy_paywall') return;
    if (recommendedGrants.length >= 4) return;

    let cancelled = false;

    const refreshStoredGrants = async () => {
      try {
        const grants = await fetchRecommendedGrants();
        if (cancelled || grants.length <= recommendedGrants.length) return;
        setRecommendedGrants(grants);
        writeJsonStorage(RECOMMENDED_GRANTS_STORAGE_KEY, grants);
      } catch {
        // Keep the already saved recommendations if refresh fails.
      }
    };

    void refreshStoredGrants();

    return () => {
      cancelled = true;
    };
  }, [hydrated, phase, recommendedGrants.length]);

  useEffect(() => {
    if (!hydrated || phase !== 'qualification' || !result || !userId) return;
    if (qualificationData) return;
    if (autoProfileSkipStartedRef.current) return;
    autoProfileSkipStartedRef.current = true;

    const skipIfProfileComplete = async () => {
      try {
        const skipped = await completeWithExistingProfile(userId);
        if (!skipped) {
          setProfileSkipUnavailable(true);
          autoProfileSkipStartedRef.current = false;
        }
      } catch {
        setProfileSkipUnavailable(true);
        autoProfileSkipStartedRef.current = false;
      }
    };

    void skipIfProfileComplete();
  }, [
    completeWithExistingProfile,
    hydrated,
    phase,
    qualificationData,
    result,
    userId
  ]);

  const strategy = useMemo(() => {
    if (!result || !qualificationData) return null;
    return generateStrategy(result.archetype, intent, qualificationData, result);
  }, [intent, qualificationData, result]);

  if (!hydrated) {
    return (
      <main className="fixed inset-0 z-[200] grid place-items-center bg-[#F8FAFC] px-4 text-slate-950">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm">
          Loading your progress...
        </div>
      </main>
    );
  }

  if (phase === 'assessment') {
    return (
      <AssessmentEngine
        storageKey={ASSESSMENT_STORAGE_KEY}
        startImmediately
        onComplete={async (assessmentResult) => {
          setResult(assessmentResult);
          setProfileSkipUnavailable(false);
          writeJsonStorage(RESULT_STORAGE_KEY, assessmentResult);

          const supabase = createClient();
          const {
            data: { session }
          } = await supabase.auth.getSession();
          const activeUserId = session?.user.id ?? null;
          if (activeUserId) {
            const activeEmail = session?.user.email?.trim().toLowerCase() ?? '';
            if (activeEmail) {
              setContextualEmail(activeEmail);
              try {
                window.localStorage.setItem(CONTEXTUAL_EMAIL_STORAGE_KEY, activeEmail);
              } catch {
                // Ignore storage failures.
              }
            }

            try {
              const skipped = await completeWithExistingProfile(
                activeUserId
              );
              if (skipped) return;
            } catch {
              // If profile lookup fails, continue with the manual matching steps.
            }

            transitionPhase('iq_ready');
            return;
          }

          transitionPhase('email_capture');
        }}
      />
    );
  }

  if (phase === 'email_capture' && result) {
    return (
      <ContextualIqEmailGate
        result={result}
        intent={intent}
        onComplete={(email, completedUserId) => {
          setContextualEmail(email);
          setIsAuthenticated(true);
          setUserId(completedUserId);
          try {
            window.localStorage.setItem(CONTEXTUAL_EMAIL_STORAGE_KEY, email);
          } catch {
            // Ignore storage failures.
          }
          transitionPhase('iq_ready');
        }}
      />
    );
  }

  if (phase === 'iq_ready' && result) {
    return (
      <ContextualIqReadyChoice
        onRevealMatches={() => {
          setProfileSkipUnavailable(true);
          transitionPhase('qualification');
        }}
        onUnlockIqReport={() => transitionPhase('iq_report_paywall')}
      />
    );
  }

  if (phase === 'iq_report_paywall' && result && contextualEmail) {
    return (
      <StandardIqPaywall
        result={result}
        email={contextualEmail}
        funnel="contextual_iq_assessment"
      />
    );
  }

  if (phase === 'qualification') {
    if (
      result &&
      !qualificationData &&
      (!authResolved || (userId && !profileSkipUnavailable))
    ) {
      return (
        <main className="fixed inset-0 z-[200] grid place-items-center bg-[#F8FAFC] px-4 text-slate-950">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm">
            Checking your saved scholarship profile...
          </div>
        </main>
      );
    }

    return (
      <PostAssessmentQuiz
        storageKey={QUALIFICATION_STORAGE_KEY}
        onComplete={(data) => {
          setQualificationData(data);
          writeJsonStorage(QUALIFICATION_STORAGE_KEY, data);
          transitionPhase('account');
        }}
      />
    );
  }

  if (phase === 'account' && result && qualificationData) {
    return (
      <StrategyAccountGate
        result={result}
        qualificationData={qualificationData}
        intent={intent}
        onComplete={(grants, authenticated, completedUserId) => {
          setRecommendedGrants(grants);
          writeJsonStorage(RECOMMENDED_GRANTS_STORAGE_KEY, grants);
          if (authenticated) {
            setIsAuthenticated(true);
            setUserId(completedUserId ?? null);
          }
          transitionPhase('strategy_paywall');
        }}
      />
    );
  }

  if (phase === 'strategy_paywall' && result && strategy) {
    if (isAuthenticated && !subscriptionReady) {
      return (
        <main className="fixed inset-0 z-[200] grid place-items-center bg-[#F8FAFC] px-4 text-slate-950">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm">
            Preparing your report access...
          </div>
        </main>
      );
    }

    return (
      <ContextualStrategyPaywall
        result={result}
        strategy={strategy}
        recommendedGrants={recommendedGrants}
        onRestart={isAuthenticated ? restartAssessment : undefined}
        premiumLocked={isAuthenticated && !hasSubscription}
      />
    );
  }

  return (
    <ContextualIntro
      intent={intent}
      onStart={() => {
        transitionPhase('assessment');
      }}
    />
  );
}

function ContextualIqEmailGate({
  result,
  intent,
  onComplete
}: {
  result: AssessmentResult;
  intent: UserIntent;
  onComplete: (email: string, userId: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const generatedPassword =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? `${crypto.randomUUID()}A1!`
          : `${Date.now()}-${Math.random()}A1!`;
      const emailRedirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/scholarships/hub/best-recommendation`
          : undefined;
      const { error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: generatedPassword,
        options: {
          emailRedirectTo,
          data: {
            iq_contextual_strategy: JSON.stringify({
              intent,
              iqScore: result.iqScore,
              percentile: result.percentile,
              archetype: result.archetype
            })
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message || 'Could not create your account.');
        setSubmitting(false);
        return;
      }

      const {
        data: { session: existingSession }
      } = await supabase.auth.getSession();

      const activeSession =
        existingSession ??
        (
          await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: generatedPassword
          })
        ).data.session;

      const userId = activeSession?.user.id;
      if (!userId) {
        setError(
          'Account was created, but we could not start your session. Check your email to continue.'
        );
        setSubmitting(false);
        return;
      }

      try {
        await fetch('/api/internal/telegram/iq-registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            email: normalizedEmail,
            archetype: result.archetype,
            iqScore: result.iqScore
          }),
          keepalive: true
        });
      } catch (notifyError) {
        console.warn('[iq:telegram] iq registration notify failed', notifyError);
      }

      onComplete(normalizedEmail, userId);
    } catch {
      setError('Something went wrong. Check your connection and try again.');
      setSubmitting(false);
    }
  };

  return (
    <main className="fixed inset-0 z-[200] overflow-y-auto bg-[#F8FAFC] px-4 py-8 text-slate-950 sm:px-6">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center">
        <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-6 text-center shadow-[0_24px_70px_-34px_rgba(15,23,42,0.42)] sm:p-8">
          <form onSubmit={submit} className="mx-auto max-w-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <BrainCircuit className="h-7 w-7" aria-hidden />
            </div>
            <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">
              Your report is ready
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Where should we save your IQ profile?
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600">
              Enter your email so your IQ profile is saved before you choose whether
              to unlock the full IQ report or continue to matched grants.
            </p>

            <label className="mx-auto mt-8 block max-w-md text-left">
              <span className="text-sm font-semibold text-slate-700">Email</span>
              <span className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 ring-1 ring-transparent transition focus-within:border-slate-400 focus-within:bg-white focus-within:ring-slate-200">
                <Mail className="h-5 w-5 text-slate-400" aria-hidden />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="min-w-0 flex-1 bg-transparent text-base font-medium text-slate-950 outline-none placeholder:text-slate-400"
                />
              </span>
            </label>

            {error ? (
              <p className="mx-auto mt-3 max-w-md rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="group mt-7 inline-flex w-full max-w-md items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Saving your IQ profile...' : 'Continue'}
              <ArrowRight
                className="h-4 w-4 transition group-hover:translate-x-0.5"
                aria-hidden
              />
            </button>

            <p className="mx-auto mt-4 max-w-md text-xs leading-5 text-slate-500">
              No password needed now. Your account keeps the IQ result available if
              you continue to scholarship matching.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}

function ContextualIqReadyChoice({
  onRevealMatches,
  onUnlockIqReport
}: {
  onRevealMatches: () => void;
  onUnlockIqReport: () => void;
}) {
  return (
    <main className="fixed inset-0 z-[200] overflow-y-auto bg-[radial-gradient(circle_at_15%_8%,#dbeafe_0,transparent_30%),radial-gradient(circle_at_85%_12%,#ffedd5_0,transparent_30%),#F8FAFC] px-4 py-8 text-slate-950 sm:px-6">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center">
        <div className="w-full overflow-hidden rounded-[2.25rem] border border-slate-200 bg-white p-6 text-center shadow-[0_30px_100px_-50px_rgba(15,23,42,0.5)] sm:p-8 lg:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <BrainCircuit className="h-7 w-7" aria-hidden />
          </div>
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">
            IQ profile generated
          </p>
          <h1 className="mx-auto mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Your IQ profile is ready.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
            You can unlock the full IQ-style report now, or add scholarship details
            to turn this cognitive profile into matched grants and next steps.
          </p>

          <div className="mx-auto mt-7 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
            {[
              'IQ-style score context saved',
              'Brain Archetype prepared',
              'Matched grants can be revealed next'
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                {item}
              </div>
            ))}
          </div>

          <div className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onUnlockIqReport}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Get my IQ report now
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={onRevealMatches}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-4 text-base font-semibold text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
            >
              Reveal matched grants
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function StrategyAccountGate({
  result,
  qualificationData,
  intent,
  onComplete
}: {
  result: AssessmentResult;
  qualificationData: QualificationData;
  intent: UserIntent;
  onComplete: (
    recommendedGrants: Scholarship[],
    authenticated: boolean,
    userId?: string
  ) => void;
}) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const autoSaveStartedRef = useRef(false);

  useEffect(() => {
    if (autoSaveStartedRef.current) return;
    autoSaveStartedRef.current = true;

    const saveForExistingSession = async () => {
      const supabase = createClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();

      const userId = session?.user.id;
      if (!userId) {
        setCheckingSession(false);
        return;
      }

      setSubmitting(true);
      setError(null);

      try {
        const sync = await syncOnboardingToProfiles(
          supabase,
          userId,
          qualificationDataToProfile(qualificationData)
        );
        if (!sync.ok) {
          setError(sync.error ?? 'Could not update your scholarship profile.');
          setCheckingSession(false);
          setSubmitting(false);
          return;
        }

        const grants = await fetchRecommendedGrants();
        onComplete(grants, true, userId);
      } catch {
        setError('Something went wrong while updating your profile. Try again.');
        setCheckingSession(false);
        setSubmitting(false);
      }
    };

    void saveForExistingSession();
  }, [onComplete, qualificationData]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const generatedPassword =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? `${crypto.randomUUID()}A1!`
          : `${Date.now()}-${Math.random()}A1!`;
      const emailRedirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/scholarships/hub/best-recommendation`
          : undefined;
      const { error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: generatedPassword,
        options: {
          emailRedirectTo,
          data: {
            iq_contextual_strategy: JSON.stringify({
              intent,
              qualificationData,
              iqScore: result.iqScore,
              percentile: result.percentile,
              archetype: result.archetype
            })
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message || 'Could not create your account.');
        setSubmitting(false);
        return;
      }

      const {
        data: { session: existingSession }
      } = await supabase.auth.getSession();

      const activeSession =
        existingSession ??
        (
          await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: generatedPassword
          })
        ).data.session;

      const userId = activeSession?.user.id;
      if (!userId) {
        setError(
          'Account was created, but we could not start your session. Check your email to continue.'
        );
        setSubmitting(false);
        return;
      }

      const sync = await syncOnboardingToProfiles(
        supabase,
        userId,
        qualificationDataToProfile(qualificationData)
      );
      if (!sync.ok) {
        setError(sync.error ?? 'Could not save your scholarship profile.');
        setSubmitting(false);
        return;
      }

      const grants = await fetchRecommendedGrants();

      try {
        await fetch('/api/internal/telegram/iq-registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            email: normalizedEmail,
            archetype: result.archetype,
            iqScore: result.iqScore
          }),
          keepalive: true
        });
      } catch (notifyError) {
        console.warn('[iq:telegram] iq registration notify failed', notifyError);
      }

      onComplete(grants, true, userId);
    } catch {
      setError('Something went wrong. Check your connection and try again.');
      setSubmitting(false);
    }
  };

  if (checkingSession || (submitting && !email.trim())) {
    return (
      <main className="fixed inset-0 z-[200] overflow-y-auto bg-[#F8FAFC] px-4 py-8 text-slate-950 sm:px-6">
        <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center">
          <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-6 text-center shadow-[0_24px_70px_-34px_rgba(15,23,42,0.42)] sm:p-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
              <Save className="h-5 w-5" aria-hidden />
            </div>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Saving your strategy
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Updating your scholarship profile...
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-500">
              We found your account, so there is no need to enter email again.
              Your new IQ result and scholarship answers are being saved.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 z-[200] overflow-y-auto bg-[#F8FAFC] px-4 py-8 text-slate-950 sm:px-6">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center">
        <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.42)] sm:p-8">
          <form onSubmit={submit}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  <Save className="h-4 w-4" aria-hidden />
                  Matches found
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  Save them before unlocking your report.
                </h2>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600">
                Final step
              </div>
            </div>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">
              We found your matched grants from your IQ profile and scholarship
              details. Enter your email so your grants, award amounts, deadlines,
              and reading path stay attached to your account.
            </p>

            <div className="mt-8">
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  <Mail className="h-4 w-4" aria-hidden />
                  Email
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>
            </div>

            {error ? (
              <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                {error}
              </p>
            ) : (
              <p className="mt-4 text-xs font-medium leading-5 text-slate-500">
                No password needed now. If you ever want one, you can set it
                later through forgot password.
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Saving matches...' : 'Save and unlock report'}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function ContextualIntro({
  intent,
  onStart
}: {
  intent: UserIntent;
  onStart: () => void;
}) {
  const copy = intentCopy[intent];

  return (
    <main className="iq-assessment-compact-page bg-[radial-gradient(circle_at_12%_8%,#ffedd5_0,transparent_30%),radial-gradient(circle_at_86%_10%,#dbeafe_0,transparent_28%),#F8FAFC] text-slate-950">
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-10 sm:py-14 lg:grid-cols-[1.04fr_0.96fr] lg:px-8">
        <div>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-orange-700">
              <Sparkles className="h-4 w-4" aria-hidden />
              {copy.eyebrow}
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              {copy.text}
            </p>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-700">
              {copy.outcome}
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {assessmentHighlights.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-white/75 p-4 shadow-sm backdrop-blur"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-950 shadow-sm ring-1 ring-slate-200">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-950">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onStart}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-800 sm:w-auto"
            >
              Start IQ test
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
              <BrainCircuit className="h-4 w-4" aria-hidden />
              30 questions, then scholarship matching details.
            </p>
          </div>
        </div>

        <aside className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 p-6 text-white shadow-[0_28px_90px_-42px_rgba(15,23,42,0.65)] sm:p-8 lg:p-10">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-indigo-100 ring-1 ring-white/15">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Research-informed
          </p>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight">
            Inspired by modern online psychometrics, not positioned as a clinical
            exam.
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            The research brief points to ICAR as the closest online-battery
            reference, with Raven, Wechsler, and Cattell as the historical
            backbone. The result is an interpretive cognitive profile, not a
            medical diagnosis.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {sciencePillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.name}
                  className="rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10"
                >
                  <Icon className="h-5 w-5 text-indigo-200" aria-hidden />
                  <p className="mt-3 text-sm font-semibold text-white">
                    {pillar.name}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    {pillar.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </aside>
      </section>

    </main>
  );
}
