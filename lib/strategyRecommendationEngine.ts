import type {
  AssessmentResult,
  QualificationData,
  StrategyRecommendation,
  UserIntent
} from '@/lib/iqAssessmentTypes';
import {
  citizenshipLabelForValue,
  US_STATE_OPTIONS
} from '@/lib/constants/onboardingCitizenshipAndLocation';
import {
  fieldOfStudyLabelForValue,
  schoolLevelLabelForValue
} from '@/lib/constants/scholarshipProfileOptions';

const intentHooks: Record<UserIntent, string> = {
  general_iq: "Your Cognitive Profile Is Ready",
  essay_prep: "Your Brain's Essay Advantage",
  college_fit: 'Your College Fit Strategy',
  scholarship_match: 'Your Scholarship Match Strategy',
  provider_research: 'Your Provider Prioritization Map',
  deadline_strategy: 'Your Deadline Execution Plan'
};

const intentFocus: Record<UserIntent, string> = {
  general_iq: 'turn your cognitive profile into a practical next step',
  essay_prep: 'use your strongest reasoning pattern to write sharper essays',
  college_fit: 'compare schools through the lens of how you think',
  scholarship_match: 'prioritize scholarship opportunities that fit your profile',
  provider_research: 'focus on providers most likely to reward your strengths',
  deadline_strategy: 'choose deadlines and application types you can execute well'
};

function topTrait(result: AssessmentResult) {
  return [...result.domainScores].sort((a, b) => b.score - a.score)[0];
}

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function gpaGuidance(gpa: string): string {
  if (gpa === 'gpa_2_0_plus' || gpa === 'gpa_2_5_plus') {
    return 'Because your GPA profile needs positioning support, the strategy leans into narrative, need-based, and fit-driven opportunities.';
  }

  const numeric = Number.parseFloat(gpa);
  if (Number.isFinite(numeric) && numeric >= 3.6) {
    return 'Because your GPA profile is strong, the strategy includes more merit-forward opportunities while preserving differentiated essays.';
  }

  return 'Because your GPA profile is competitive but not automatic, the strategy balances merit filters with essays and fit-based awards.';
}

function gpaLabel(gpa: string): string {
  if (gpa === 'gpa_2_0_plus') return 'GPA 2.0+';
  if (gpa === 'gpa_2_5_plus') return 'GPA 2.5+';
  if (gpa === 'gpa_3_0_plus') return 'GPA 3.0+';
  if (gpa === 'gpa_3_5_plus') return 'GPA 3.5+';
  return gpa;
}

function stateLabel(state: string): string {
  if (!state.trim()) return 'broader U.S. matches';
  return US_STATE_OPTIONS.find((option) => option.value === state)?.label ?? state;
}

export function generateStrategy(
  archetype: string,
  intent: UserIntent,
  qualificationData: QualificationData,
  result: AssessmentResult
): StrategyRecommendation {
  const strongest = topTrait(result);
  const strongestLabel = strongest?.label ?? 'Cognitive Reasoning';
  const schoolLevelValue = safeString(qualificationData.schoolLevel);
  const fieldOfStudyValue = safeString(qualificationData.fieldOfStudy);
  const citizenshipValue = safeString(qualificationData.citizenship);
  const stateValue = safeString(qualificationData.state);
  const gpaValue = safeString(qualificationData.gpa);
  const schoolLevel =
    schoolLevelLabelForValue(schoolLevelValue) ?? 'your school level';
  const fieldOfStudy =
    fieldOfStudyLabelForValue(fieldOfStudyValue) ?? 'your field of study';
  const citizenship =
    citizenshipLabelForValue(citizenshipValue) ?? 'your citizenship profile';
  const state = stateLabel(stateValue);
  const gpa = gpaLabel(gpaValue || 'GPA profile');

  return {
    hook_title: intentHooks[intent],
    strategy_summary: `Your strongest signal is ${strongestLabel}, which fits the ${archetype} profile. We will use that advantage to ${intentFocus[intent]} for ${schoolLevel} students in ${fieldOfStudy}, with eligibility signals from ${citizenship}, ${state}, and ${gpa}. ${gpaGuidance(gpaValue)}`,
    recommended_grants: [
      {
        id: 'strategy-merit-fit',
        title: `${fieldOfStudy} Merit-Fit Scholarship Track`,
        amount: `${gpa} aligned`,
        match_reason: `Matches your ${strongestLabel.toLowerCase()} strength, ${schoolLevel.toLowerCase()} status, and ${gpa} academic signal.`,
        url: '/scholarships/hub/best-recommendation'
      },
      {
        id: 'strategy-essay-edge',
        title: `${state} and Eligibility-Based Awards`,
        amount: 'Location-aware',
        match_reason:
          `Uses your ${state} location and ${citizenship.toLowerCase()} status to avoid awards with weak eligibility fit.`,
        url: '/scholarships/hub/best-recommendation'
      },
      {
        id: 'strategy-fast-apply',
        title: 'Essay-Based Differentiation Awards',
        amount: '$1,000 - $10,000',
        match_reason:
          intent === 'essay_prep'
            ? 'You arrived from essay prep, so the strategy emphasizes prompts where reasoning and story structure matter.'
            : 'Essay awards help convert your cognitive profile into a memorable application narrative.',
        url: '/essays'
      }
    ],
    recommended_reading: [
      {
        id: 'reading-scholarship-essays',
        title: 'How to write scholarship essays that stand out',
        url: '/essays',
        match_reason:
          'Use your archetype to frame strengths in a way reviewers can remember.'
      },
      {
        id: 'reading-deadlines',
        title: 'Scholarship deadlines explained',
        url: '/resources/scholarship-deadlines-explained',
        match_reason:
          'Turn your strategy into a realistic calendar before high-value deadlines pass.'
      }
    ]
  };
}
