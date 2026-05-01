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
import { createCountryFirstScholarshipAccount } from '@/lib/onboarding/countryFirstSignupClient';
import type { UserProfile } from '@/lib/onboarding/userProfile';
import { scholarshipDeadlineHasPassed } from '@/lib/scholarships/scholarshipDeadlineState';
import { normalizeCountryCode } from '@/lib/scholarships/countryEligibility/countries';
import { generateStrategy } from '@/lib/strategyRecommendationEngine';
import { createClient } from '@/utils/supabase/client';
import { getOAuthCallbackUrlWithNext } from '@/utils/helpers';

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
  | 'country_code'
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

type ContextualPreview = {
  label: string;
  archetype: string;
  topDomain: string;
  iqRange: string;
  summary: string;
  grants: Array<{ title: string; reason: string; amount: string; match: string }>;
  reading: string[];
  essays: string[];
};

const contextualPreviews: Record<UserIntent, ContextualPreview> = {
  general_iq: {
    label: 'Personalized strategy report',
    archetype: 'Pattern Strategist',
    topDomain: 'Abstract Reasoning',
    iqRange: '114-122',
    summary:
      'Your profile turns a cognitive score into a practical scholarship plan: which grants to prioritize, what to read next, and how to explain your strengths without sounding generic.',
    grants: [
      { title: 'Future Scholars Merit Award', reason: 'Strong fit for high-achieving students with clear goals.', amount: '$10.000', match: '94% match' },
      { title: 'Student Opportunity Grant', reason: 'Broad eligibility and fast application path.', amount: '$5.000', match: '91% match' },
      { title: 'Leadership Essay Scholarship', reason: 'Best when your story connects reasoning style to impact.', amount: '$2.500', match: '89% match' },
      { title: 'Community Achievement Fund', reason: 'Matches focused students with consistent progress.', amount: '$1.000', match: '87% match' }
    ],
    reading: ['How to compare scholarship fit fast', 'Scholarship deadlines explained'],
    essays: ['Build a stronger scholarship story', 'Turn strengths into essay angles']
  },
  essay_prep: {
    label: 'Essay prep strategy report',
    archetype: 'Narrative Strategist',
    topDomain: 'Verbal Reasoning',
    iqRange: '112-120',
    summary:
      'Your report points toward essay-heavy awards where structure, clarity, and original framing can outperform generic applications.',
    grants: [
      { title: 'Personal Story Scholarship', reason: 'Strong match for a clear personal narrative.', amount: '$5.000', match: '94% match' },
      { title: 'Future Leaders Essay Award', reason: 'Good fit for structured goals and reflection.', amount: '$2.500', match: '91% match' },
      { title: 'Community Voice Grant', reason: 'Connect service, growth, and impact.', amount: '$1.500', match: '89% match' },
      { title: 'Creative Problem Solver Scholarship', reason: 'Explain how you think through hard problems.', amount: '$3.000', match: '87% match' }
    ],
    reading: ['Scholarship essays that stand out', 'Choose your strongest essay angle'],
    essays: ['Open essay improvement tools', 'Start a scholarship essay draft']
  },
  college_fit: {
    label: 'College fit strategy report',
    archetype: 'Systems Planner',
    topDomain: 'Verbal Reasoning',
    iqRange: '108-116',
    summary:
      'Your profile supports a fit-first plan: compare schools by scholarship opportunity, support systems, and application effort instead of brand names alone.',
    grants: [
      { title: 'College Fit Merit Scholarship', reason: 'Align academic goals with school-specific awards.', amount: '$8.000', match: '92% match' },
      { title: 'Transfer Pathway Grant', reason: 'Compare affordability and completion path.', amount: '$3.000', match: '89% match' },
      { title: 'Campus Leadership Award', reason: 'Clear communication and planning fit well here.', amount: '$2.500', match: '87% match' },
      { title: 'First-Year Student Success Fund', reason: 'Practical school and scholarship plan match.', amount: '$1.500', match: '85% match' }
    ],
    reading: ['Compare colleges by scholarships', 'Build an affordability shortlist'],
    essays: ['Explain why this school fits', 'Write a focused college-fit essay']
  },
  scholarship_match: {
    label: 'Scholarship match strategy report',
    archetype: 'Pattern Strategist',
    topDomain: 'Abstract Reasoning',
    iqRange: '114-122',
    summary:
      'Your strongest signals prioritize grants that match your profile first, then show what to read and write next.',
    grants: [
      { title: 'Future Scholars Merit Award', reason: 'Strong academic direction and profile fit.', amount: '$10.000', match: '94% match' },
      { title: 'Student Opportunity Grant', reason: 'Broad eligibility and fast application path.', amount: '$5.000', match: '91% match' },
      { title: 'Leadership Essay Scholarship', reason: 'Connect reasoning style to impact.', amount: '$2.500', match: '89% match' },
      { title: 'Community Achievement Fund', reason: 'Focused goals and consistent progress.', amount: '$1.000', match: '87% match' }
    ],
    reading: ['How to compare scholarship fit fast', 'Scholarship deadlines explained'],
    essays: ['Build a stronger scholarship story', 'Turn strengths into essay angles']
  },
  provider_research: {
    label: 'Provider research strategy report',
    archetype: 'Quantitative Analyst / Spatial Architect',
    topDomain: 'Numerical Logic',
    iqRange: '110-118',
    summary:
      'Your profile fits a research-first provider strategy: compare sponsors by eligibility density, award size, repeatability, and deadline effort before writing.',
    grants: [
      { title: 'STEM Provider Research Award', reason: 'Strong fit for comparing eligibility and award history.', amount: '$7.500', match: '93% match' },
      { title: 'Foundation Opportunity Grant', reason: 'Broad provider criteria and repeatable applications.', amount: '$4.000', match: '90% match' },
      { title: 'Regional Sponsor Scholarship', reason: 'Provider research with state and community filters.', amount: '$2.000', match: '88% match' },
      { title: 'Industry Partner Tuition Fund', reason: 'Provider mission overlaps with study direction.', amount: '$3.500', match: '86% match' }
    ],
    reading: ['How to research scholarship providers', 'Spot repeatable scholarship awards'],
    essays: ['Write to a provider mission', 'Turn provider research into an essay']
  },
  deadline_strategy: {
    label: 'Deadline strategy report',
    archetype: 'Execution Planner',
    topDomain: 'Decision Speed',
    iqRange: '106-114',
    summary:
      'Your profile supports a deadline-first plan: split quick wins from high-effort essays and avoid low-match applications.',
    grants: [
      { title: 'Fast Application Grant', reason: 'High priority because effort is low and eligibility broad.', amount: '$1.000', match: '93% match' },
      { title: 'Monthly Student Award', reason: 'Recurring deadlines and quick submission cycles.', amount: '$2.000', match: '90% match' },
      { title: 'Priority Deadline Scholarship', reason: 'High match and fixed deadline.', amount: '$4.000', match: '88% match' },
      { title: 'Short Essay Tuition Fund', reason: 'Move quickly without losing quality.', amount: '$1.500', match: '86% match' }
    ],
    reading: ['Plan scholarship deadlines', 'Quick wins vs high-effort applications'],
    essays: ['Draft faster without sounding generic', 'Reuse essay ideas across deadlines']
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
  const countryCode =
    typeof data.countryCode === 'string' ? normalizeCountryCode(data.countryCode) : '';

  if (countryCode && countryCode !== 'US') {
    return true;
  }

  return (
    countryCode === 'US' &&
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
    countryCode: normalizeCountryCode(value.countryCode) || 'US',
    schoolLevel: value.schoolLevel ?? '',
    fieldOfStudy: value.fieldOfStudy ?? '',
    citizenship: value.citizenship ?? '',
    state: value.state ?? '',
    gpa: value.gpa ?? ''
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
  const countryCode = normalizeCountryCode(profile.country_code);
  if (countryCode && countryCode !== 'US') {
    return {
      countryCode,
      schoolLevel: '',
      fieldOfStudy: '',
      citizenship: '',
      state: '',
      gpa: ''
    };
  }

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
    countryCode: countryCode || 'US',
    schoolLevel,
    fieldOfStudy,
    citizenship,
    state: stateProfileValueToQualificationState(profile.state_region),
    gpa
  };
}

function qualificationDataToProfile(data: QualificationData): UserProfile {
  const countryCode = normalizeCountryCode(data.countryCode) || 'US';
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
    countryCode,
    stateRegion:
      countryCode === 'US' && US_STATE_OPTIONS.some((option) => option.value === state)
        ? state
        : null,
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
      'school_level,field_of_study,citizenship_status,country_code,state_region,gpa,saved_filters_snapshot'
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
    } else if (storedPhase === 'email_capture') {
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

  const startContextualAssessment = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const activeUserId = session?.user.id ?? null;
    const activeEmail = session?.user.email?.trim().toLowerCase() ?? '';

    if (activeEmail) {
      setContextualEmail(activeEmail);
      try {
        window.localStorage.setItem(CONTEXTUAL_EMAIL_STORAGE_KEY, activeEmail);
      } catch {
        // Ignore storage failures.
      }
    }

    if (activeUserId) {
      setIsAuthenticated(true);
      setUserId(activeUserId);
      transitionPhase('assessment');
      return;
    }

    transitionPhase('email_capture');
  }, [transitionPhase]);

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
        mode="post_assessment"
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

  if (phase === 'email_capture') {
    return (
      <ContextualIqEmailGate
        mode="pre_assessment"
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
          transitionPhase('assessment');
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
        onRestart={restartAssessment}
      />
    );
  }

  if (phase === 'iq_report_paywall' && result && contextualEmail) {
    return (
      <StandardIqPaywall
        result={result}
        email={contextualEmail}
        funnel="contextual_iq_assessment"
        onRestart={restartAssessment}
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
        startImmediately
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
      onStart={startContextualAssessment}
    />
  );
}

function ContextualIqEmailGate({
  mode,
  result,
  intent,
  onComplete
}: {
  mode: 'pre_assessment' | 'post_assessment';
  result?: AssessmentResult;
  intent: UserIntent;
  onComplete: (email: string, userId: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

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
              iqScore: result?.iqScore ?? null,
              percentile: result?.percentile ?? null,
              archetype: result?.archetype ?? null
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
            archetype: result?.archetype ?? null,
            iqScore: result?.iqScore ?? null
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

  const continueWithGoogle = async () => {
    setError(null);
    setGoogleSubmitting(true);
    try {
      window.localStorage.setItem(FUNNEL_PHASE_STORAGE_KEY, 'assessment');
      const supabase = createClient();
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getOAuthCallbackUrlWithNext('/iq/assessment')
        }
      });
      if (googleError) {
        setGoogleSubmitting(false);
        setError(googleError.message || 'Google sign-in failed.');
      }
    } catch {
      setGoogleSubmitting(false);
      setError('Google sign-in failed. Try again in a moment.');
    }
  };

  return (
    <main className="fixed inset-0 z-[200] overflow-y-auto bg-[#F8FAFC] px-4 py-8 text-slate-950 sm:px-6">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center">
        <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-6 text-center shadow-[0_24px_70px_-34px_rgba(15,23,42,0.42)] sm:p-8">
          <form noValidate onSubmit={submit} className="mx-auto max-w-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <BrainCircuit className="h-7 w-7" aria-hidden />
            </div>
            <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">
              {mode === 'pre_assessment' ? 'Start your IQ profile' : 'Your report is ready'}
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Where should we save your IQ profile?
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600">
              {mode === 'pre_assessment'
                ? 'Enter your email before the test so your IQ result can be saved and connected to your next step.'
                : 'Enter your email so your IQ profile is saved before you choose whether to unlock the full IQ report or continue to matched grants.'}
            </p>

            <label className="mx-auto mt-8 block max-w-md text-left">
              <span className="text-sm font-semibold text-slate-700">Email</span>
              <span className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 ring-1 ring-transparent transition focus-within:border-slate-400 focus-within:bg-white focus-within:ring-slate-200">
                <Mail className="h-5 w-5 text-slate-400" aria-hidden />
                <input
                  type="text"
                  inputMode="email"
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
              disabled={submitting || googleSubmitting}
              className="group mt-7 inline-flex w-full max-w-md items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? 'Saving your IQ profile...'
                : mode === 'pre_assessment'
                  ? 'Continue to IQ test'
                  : 'Continue'}
              <ArrowRight
                className="h-4 w-4 transition group-hover:translate-x-0.5"
                aria-hidden
              />
            </button>
            <button
              type="button"
              onClick={continueWithGoogle}
              disabled={submitting || googleSubmitting}
              className="mx-auto mt-3 flex w-full max-w-md items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-base font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden>
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.1 0 9.8-2 13.3-5.2l-6.2-5.2C29.1 35.1 26.7 36 24 36c-5.2 0-9.7-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C36.9 39.1 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
              </svg>
              {googleSubmitting ? 'Opening Google...' : 'Sign in with Google'}
            </button>

            <p className="mx-auto mt-4 max-w-md text-xs leading-5 text-slate-500">
              No password needed now. Your account keeps the IQ result available if
              you continue after the test.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}

function ContextualIqReadyChoice({
  onRevealMatches,
  onUnlockIqReport,
  onRestart
}: {
  onRevealMatches: () => void;
  onUnlockIqReport: () => void;
  onRestart: () => void;
}) {
  return (
    <main className="bg-[radial-gradient(circle_at_15%_8%,#dbeafe_0,transparent_30%),radial-gradient(circle_at_85%_12%,#ffedd5_0,transparent_30%),#F8FAFC] text-slate-950">
      <section className="mx-auto min-h-[calc(100vh-9rem)] w-full max-w-5xl px-5 py-7 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/10 sm:h-14 sm:w-14">
            <BrainCircuit className="h-7 w-7" aria-hidden />
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-indigo-600 sm:text-sm">
            IQ profile generated
          </p>
          <h1 className="mx-auto mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Your IQ profile is ready.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
            You can unlock the full IQ-style report now, or add scholarship details
            to turn this cognitive profile into matched grants and next steps.
          </p>
        </div>

        <div className="mx-auto mt-8 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
          {[
            'IQ-style score context saved',
            'Brain Archetype prepared',
            'Matched grants can be revealed next'
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm font-semibold text-slate-700 shadow-sm"
            >
              {item}
            </div>
          ))}
        </div>

        <div className="mx-auto mt-8 max-w-2xl rounded-[1.75rem] border border-slate-200 bg-white/90 p-4 shadow-[0_22px_70px_-46px_rgba(15,23,42,0.55)] sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
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
          <button
            type="button"
            onClick={onRestart}
            className="mt-5 w-full text-center text-sm font-semibold text-slate-500 transition hover:text-slate-950 hover:underline"
          >
            Start again
          </button>
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
      const profile = qualificationDataToProfile(qualificationData);
      const signup = await createCountryFirstScholarshipAccount({
        email: normalizedEmail,
        countryCode: profile.countryCode ?? 'US',
        source: 'iq-contextual-strategy',
        profile
      });
      if (!signup.ok) {
        setError(signup.error);
        setSubmitting(false);
        return;
      }

      const grants = await fetchRecommendedGrants();

      try {
        await fetch('/api/internal/telegram/iq-registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: signup.userId,
            email: normalizedEmail,
            archetype: result.archetype,
            iqScore: result.iqScore
          }),
          keepalive: true
        });
      } catch (notifyError) {
        console.warn('[iq:telegram] iq registration notify failed', notifyError);
      }

      onComplete(grants, signup.signedIn, signup.userId);
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
          <form noValidate onSubmit={submit}>
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
                  type="text"
                  inputMode="email"
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
  onStart: () => void | Promise<void>;
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
      <ContextualStrategyPreview preview={contextualPreviews[intent]} />
    </main>
  );
}

function ContextualStrategyPreview({ preview }: { preview: ContextualPreview }) {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-14 lg:px-8">
      <div className="mb-6 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">
          Final report preview
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          The test turns into a scholarship strategy dashboard.
        </h2>
        <p className="mt-3 text-base leading-7 text-slate-600">
          This is the kind of output users see after the IQ profile and matching
          details: ranked grants, money context, next reading, and essay actions.
        </p>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_28px_90px_-45px_rgba(15,23,42,0.45)]">
        <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
          <div className="p-6 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-orange-700 ring-1 ring-orange-100">
              <Sparkles className="h-4 w-4" aria-hidden />
              {preview.label}
            </div>
            <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
              Brain Archetype
            </p>
            <h3 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
              {preview.archetype}
            </h3>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Your profile becomes a practical plan, not just a score screen.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <PreviewStat label="Estimated IQ range" value={preview.iqRange} />
              <PreviewStat label="Top cognitive domain" value={preview.topDomain} />
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                Strategy summary
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                {preview.summary}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 p-6 sm:p-8 lg:border-l lg:border-t-0">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                  Recommended grants
                </p>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  4 matches
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                {preview.grants.map((grant, index) => (
                  <div
                    key={grant.title}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-start gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                            {index + 1}
                          </span>
                          <p className="text-sm font-semibold leading-5 text-slate-950">
                            {grant.title}
                          </p>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          {grant.reason}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {grant.match}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {grant.amount}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <PreviewList title="Recommended reading path" items={preview.reading} />
                <PreviewList title="Improve essays" items={preview.essays} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <ReportDecisionAnalytics />
    </section>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}

function PreviewList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-bold text-slate-950">{title}</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div
            key={item}
            className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportDecisionAnalytics() {
  return (
    <div className="mt-6 grid overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.45)] lg:grid-cols-[1fr_0.92fr_1fr]">
      <div className="bg-slate-950 p-6 text-white sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">
            Strategy decision layer
          </p>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 ring-1 ring-white/15">
            Saved plan
          </span>
        </div>
        <blockquote className="mt-8 text-2xl font-semibold leading-tight tracking-tight text-slate-100">
          “Prioritize the awards where fit, effort, and payoff line up first.”
        </blockquote>
        <div className="mt-8 grid gap-3 text-sm">
          {[
            ['Match', 'Cognitive profile + eligibility + award size'],
            ['Plan', 'Grants first, then reading, then essay moves'],
            ['Action', 'Clear next click instead of a static score']
          ].map(([label, value]) => (
            <div key={label} className="grid grid-cols-[5rem_1fr] gap-3">
              <span className="font-bold uppercase tracking-[0.16em] text-emerald-300">
                {label}
              </span>
              <span className="leading-6 text-slate-300">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-y border-slate-200 bg-white p-6 sm:p-8 lg:border-x lg:border-y-0">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
          Application sequence
        </p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          The report turns insight into a weekly action path.
        </h3>
        <div className="mt-8 flex h-44 items-end gap-4 border-b border-slate-200">
          {[
            ['Picks', '88%'],
            ['Read', '54%'],
            ['Draft', '72%'],
            ['Submit', '96%']
          ].map(([label, height]) => (
            <div key={label} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-36 w-full items-end rounded-t-2xl bg-slate-100 px-1">
                <div
                  className="w-full rounded-t-xl bg-slate-950 shadow-[0_12px_30px_-16px_rgba(15,23,42,0.8)]"
                  style={{ height }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-500">{label}</span>
            </div>
          ))}
        </div>
        <p className="mt-5 text-sm leading-6 text-slate-600">
          Instead of dumping recommendations, the dashboard shows what should
          happen first and what supports the same scholarship path.
        </p>
      </div>

      <div className="bg-white p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
          Output matrix
        </p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          Three product layers, one unlock.
        </h3>
        <div className="mt-8 space-y-4">
          {[
            ['Grant picks', '4'],
            ['Reading steps', '2'],
            ['Essay moves', '2'],
            ['Saved strategy', '1']
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-slate-950">{label}</p>
                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  unlocked section
                </p>
              </div>
              <span className="text-2xl font-semibold tracking-tight text-slate-950">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
