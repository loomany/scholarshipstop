export type StaticCompareGuide = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  shortAnswer: string;
  updatedAt: string;
  columns: [string, string];
  rows: Array<{ factor: string; left: string; right: string }>;
  chooseLeft: string[];
  chooseRight: string[];
  checklist: string[];
  links: Array<{ href: string; label: string }>;
  faq: Array<{ question: string; answer: string }>;
};

const UPDATED_AT = '2026-05-17T00:00:00.000Z';

export const STATIC_COMPARE_GUIDES: StaticCompareGuide[] = [
  {
    slug: 'scholarship-vs-grant',
    title: 'Scholarship vs Grant: What Is the Difference?',
    description:
      'Compare scholarships and grants, including eligibility, application effort, repayment expectations, and how students should search for each.',
    h1: 'Scholarship vs Grant',
    shortAnswer:
      'Scholarships and grants are both funding sources that usually do not need to be repaid, but scholarships often emphasize merit, fit, identity, field, or essays, while grants often emphasize financial need, institution rules, government programs, or project funding.',
    updatedAt: UPDATED_AT,
    columns: ['Scholarship', 'Grant'],
    rows: [
      {
        factor: 'Common basis',
        left: 'Merit, field, background, identity, service, leadership, need, or provider-specific fit.',
        right: 'Financial need, enrollment status, government rules, research/project purpose, or institutional aid policy.'
      },
      {
        factor: 'Application effort',
        left: 'Can include essays, recommendations, transcripts, portfolios, or short forms.',
        right: 'May require FAFSA or aid forms, enrollment verification, budget details, or project documentation.'
      },
      {
        factor: 'Best student action',
        left: 'Match eligibility first, then decide whether the effort is worth the award.',
        right: 'Confirm the awarding body, use restrictions, renewal rules, and required financial documents.'
      }
    ],
    chooseLeft: [
      'You have strong fit with a provider mission, major, location, or student profile.',
      'You can prepare essays or documents before the deadline.',
      'You want awards beyond institutional financial aid.'
    ],
    chooseRight: [
      'You are comparing need-based aid, government programs, or institutional aid.',
      'The funding is tied to enrollment, research, service, or a defined project.',
      'You need to understand use restrictions or renewal rules.'
    ],
    checklist: [
      'Confirm whether the funding must be repaid.',
      'Check eligibility and required documents.',
      'Use the provider or institution path when you are ready to submit.',
      'Understand how the money is paid and whether it renews.',
      'Save deadlines in one place.'
    ],
    links: [
      { href: '/scholarships', label: 'Browse scholarships' },
      { href: '/resources/how-to-find-scholarships', label: 'How to find scholarships' },
      { href: '/financial-aid-disclaimer', label: 'Financial aid disclaimer' }
    ],
    faq: [
      {
        question: 'Do scholarships and grants need to be repaid?',
        answer:
          'They usually do not need to be repaid if the student follows the rules, but every provider can set conditions. Use ScholarshipTop to organize the requirements, payment notes, and next-step path.'
      },
      {
        question: 'Can one award be both a scholarship and a grant?',
        answer:
          'In public language, yes. Some providers use the words loosely, so students should focus on eligibility, conditions, payment, and renewal rules.'
      }
    ]
  },
  {
    slug: 'merit-vs-need-based-scholarships',
    title: 'Merit vs Need-Based Scholarships',
    description:
      'Compare merit scholarships and need-based scholarships so students can prioritize the right applications.',
    h1: 'Merit vs Need-Based Scholarships',
    shortAnswer:
      'Merit scholarships reward achievement, talent, service, leadership, or field fit, while need-based scholarships focus on the student financial gap and ability to pay.',
    updatedAt: UPDATED_AT,
    columns: ['Merit scholarships', 'Need-based scholarships'],
    rows: [
      {
        factor: 'Primary signal',
        left: 'Academic record, talent, portfolio, leadership, service, field commitment, or competition result.',
        right: 'Financial gap, aid status, household context, cost of attendance, or provider-defined need.'
      },
      {
        factor: 'Common documents',
        left: 'Transcript, resume, essay, portfolio, recommendation, or activity list.',
        right: 'Financial aid forms, household information, enrollment proof, essay, or budget explanation.'
      },
      {
        factor: 'Essay focus',
        left: 'Evidence of preparation, achievement, direction, or impact.',
        right: 'Honest explanation of the funding gap and how the award supports the education plan.'
      }
    ],
    chooseLeft: [
      'Your grades, projects, service, research, creative work, or leadership are strong.',
      'You can show achievement with evidence.',
      'The provider values your field or profile.'
    ],
    chooseRight: [
      'Your biggest barrier is cost.',
      'The scholarship asks for financial context.',
      'You can document need without exaggerating or oversharing.'
    ],
    checklist: [
      'Do not assume merit means GPA only.',
      'Do not assume need-based means no essay.',
      'Prepare proof for the signal the provider cares about.',
      'Confirm whether the award can combine with other aid.'
    ],
    links: [
      { href: '/essays/financial-need', label: 'Financial need essay guide' },
      { href: '/essays/career-goals', label: 'Career goals essay guide' },
      { href: '/scholarships', label: 'Find scholarships' }
    ],
    faq: [
      {
        question: 'Can a scholarship consider both merit and need?',
        answer:
          'Yes. Many providers consider both achievement and financial context. Use ScholarshipTop to organize the eligibility and selection signals before you prepare materials.'
      },
      {
        question: 'Should I apply if my GPA is not perfect?',
        answer:
          'Yes, if you meet the rules and have other strong evidence such as service, leadership, projects, field commitment, or financial need.'
      }
    ]
  },
  {
    slug: 'no-essay-vs-essay-scholarships',
    title: 'No-Essay vs Essay Scholarships',
    description:
      'Compare no-essay scholarships with essay scholarships by effort, fit, competition, and verification risk.',
    h1: 'No-Essay vs Essay Scholarships',
    shortAnswer:
      'No-essay scholarships are faster to submit, but essay scholarships often let students prove fit and stand out with specific evidence.',
    updatedAt: UPDATED_AT,
    columns: ['No-essay scholarships', 'Essay scholarships'],
    rows: [
      {
        factor: 'Effort',
        left: 'Usually lower, though forms and eligibility checks may still apply.',
        right: 'Higher because planning, drafting, revision, and sometimes recommendations are needed.'
      },
      {
        factor: 'Competition signal',
        left: 'Often broad and high volume when eligibility is simple.',
        right: 'Can be more targeted because applicants must answer a prompt.'
      },
      {
        factor: 'Best use',
        left: 'Add to a shortlist when the source and rules are clear.',
        right: 'Prioritize when your story, field, need, or leadership fits the provider.'
      }
    ],
    chooseLeft: [
      'You have limited time and the provider path is clear.',
      'You meet eligibility and the application does not request sensitive unclear data.',
      'You want quick additions alongside stronger-fit applications.'
    ],
    chooseRight: [
      'Your profile matches the provider mission.',
      'You have strong evidence for the prompt.',
      'You can revise before the deadline.'
    ],
    checklist: [
      'Confirm whether no essay truly means no written response.',
      'Check source, deadline, and selection method.',
      'Use essay guides when the application asks for goals, need, leadership, or service.',
      'Balance quick applications with targeted applications.'
    ],
    links: [
      { href: '/scholarships/no-essay', label: 'No essay scholarships' },
      { href: '/essays/no-essay-scholarships', label: 'No-essay scholarship guide' },
      { href: '/essays/checklist', label: 'Essay checklist' }
    ],
    faq: [
      {
        question: 'Are no-essay scholarships easier to win?',
        answer:
          'They are often easier to submit, but broad eligibility can create more competition. Treat easy submission as one planning signal, not the whole strategy.'
      },
      {
        question: 'When is an essay scholarship worth the effort?',
        answer:
          'It is worth considering when you meet the eligibility rules and can give specific evidence that matches the prompt.'
      }
    ]
  },
  {
    slug: 'local-vs-national-scholarships',
    title: 'Local vs National Scholarships',
    description:
      'Compare local and national scholarships by eligibility, competition, source checks, and application strategy.',
    h1: 'Local vs National Scholarships',
    shortAnswer:
      'Local scholarships may have narrower eligibility and less applicant volume, while national scholarships can offer larger reach but often attract broader competition.',
    updatedAt: UPDATED_AT,
    columns: ['Local scholarships', 'National scholarships'],
    rows: [
      {
        factor: 'Eligibility',
        left: 'Often tied to city, county, high school, community group, employer, or state.',
        right: 'Often open across many regions, schools, or student profiles.'
      },
      {
        factor: 'Competition',
        left: 'Can be smaller if the eligibility pool is narrow.',
        right: 'Can be larger because more students can apply.'
      },
      {
        factor: 'Application path',
        left: 'Use school counselor pages, local foundation sites, civic groups, and provider contacts to plan next steps.',
        right: 'Compare national provider paths, privacy expectations, and selection rules.'
      }
    ],
    chooseLeft: [
      'You meet a location, school, employer, or community requirement.',
      'You can collect local recommendations or proof of residency.',
      'The award has a clear local provider path.'
    ],
    chooseRight: [
      'Your profile fits a broad national mission or field.',
      'You can compete with strong essays, achievements, or documents.',
      'You want to expand beyond local opportunities.'
    ],
    checklist: [
      'Search by city, county, state, school, employer, and field.',
      'Check whether local awards require residency or school attendance.',
      'Compare national award privacy and provider-path details.',
      'Apply to a mix of local, regional, and national awards.'
    ],
    links: [
      { href: '/providers', label: 'Scholarship provider hubs' },
      { href: '/scholarships', label: 'Browse all scholarships' },
      { href: '/scholarship-verification-methodology', label: 'Verification methodology' }
    ],
    faq: [
      {
        question: 'Are local scholarships better than national scholarships?',
        answer:
          'Not always. Local scholarships can be a strong fit when eligibility is narrow, but national scholarships may still be worth applying to if your profile matches.'
      },
      {
        question: 'How do I evaluate a local scholarship?',
        answer:
          'Use ScholarshipTop to organize deadline, eligibility, documents, and application-route context, then continue through the school, foundation, civic group, or provider path when ready.'
      }
    ]
  }
];

export function getStaticCompareGuide(
  slug: string | null | undefined
): StaticCompareGuide | null {
  const normalized = slug?.trim().toLowerCase();
  if (!normalized) return null;
  return (
    STATIC_COMPARE_GUIDES.find((guide) => guide.slug.toLowerCase() === normalized) ??
    null
  );
}
