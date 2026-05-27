export type StaticScholarshipGuide = {
  slug: string;
  title: string;
  description: string;
  intro: string;
  sections: Array<{
    title: string;
    body: string;
    bullets: string[];
  }>;
  checklist: string[];
  examples: string[];
  links: Array<{ href: string; label: string }>;
  faq: Array<{ question: string; answer: string }>;
};

export const STATIC_SCHOLARSHIP_GUIDES: StaticScholarshipGuide[] = [
  {
    slug: 'how-to-find-scholarships',
    title: 'How to Find Scholarships That Are Worth Your Time',
    description:
      'A practical scholarship search guide for finding realistic opportunities, checking eligibility, and building a useful shortlist.',
    intro:
      'A strong scholarship search is not about applying to every award you see. Start broad, review eligibility early, compare effort against award value, and save opportunities where the structured details support your profile.',
    sections: [
      {
        title: 'Start with fit, not volume',
        body:
          'The fastest way to waste time is applying from a title alone. Use filters to check student level, field, country, citizenship, GPA, institution, and special status before reading the essay prompt.',
        bullets: [
          'Build one broad search first, then narrow by eligibility.',
          'Prioritize listings with source-quality signals, provider paths, and clear deadlines.',
          'Keep a separate list for promising but incomplete leads.'
        ]
      },
      {
        title: 'Compare effort before you commit',
        body:
          'A large award with multiple essays, recommendations, and transcripts may still be worth it, but only if you have enough time and fit the core rules.',
        bullets: [
          'Estimate the documents required.',
          'Check whether recommendations or transcripts need lead time.',
          'Match high-effort applications with your strongest profile evidence.'
        ]
      }
    ],
    checklist: [
      'Review source-quality signal',
      'Review eligibility fit',
      'Track deadline and timezone',
      'Prepare required documents',
      'Save realistic options',
      'Use the provider path when ready'
    ],
    examples: [
      'A STEM student should check field, level, citizenship, and essay requirements before starting.',
      'An international student should compare whether the provider accepts non-citizens or only domestic applicants.'
    ],
    links: [
      { href: '/scholarships', label: 'Browse the scholarship catalog' },
      { href: '/how-scholarshiptop-works', label: 'How ScholarshipTop works' },
      { href: '/scholarship-verification-methodology', label: 'Verification methodology' }
    ],
    faq: [
      {
        question: 'How many scholarships should I apply to?',
        answer:
          'There is no universal number. A smaller shortlist of scholarships where you clearly match the eligibility rules is usually stronger than a long list of weak-fit applications.'
      },
      {
        question: 'Should I apply if the listing has missing information?',
        answer:
          'Use it as a lower-confidence shortlist item and prioritize listings with clearer deadline, eligibility, award value, and application-route context first.'
      }
    ]
  },
  {
    slug: 'how-to-apply-for-scholarships-checklist',
    title: 'Scholarship Application Checklist',
    description:
      'A step-by-step checklist for preparing scholarship applications without missing documents, deadlines, or provider rules.',
    intro:
      'Scholarship applications become easier when you separate the process into eligibility checks, document prep, essay drafting, provider-path review, and final submission.',
    sections: [
      {
        title: 'Before you write anything',
        body:
          'Do not start an essay until you know the scholarship is open, your profile matches the core rules, and you understand the required materials.',
        bullets: [
          'Read eligibility before the application form.',
          'Check deadline timezone and submission method.',
          'List every document and who controls it.'
        ]
      },
      {
        title: 'Before you submit',
        body:
          'A final review should catch missed fields, outdated transcripts, weak file names, and unclear application routes.',
        bullets: [
          'Use the provider application path for submission steps.',
          'Proofread essays against the prompt.',
          'Save submission pages or emails.'
        ]
      }
    ],
    checklist: [
      'Eligibility fit reviewed',
      'Deadline tracked',
      'Essay prompt copied into your plan',
      'Transcript or proof of enrollment requested',
      'Recommendation timeline planned',
      'Provider application link saved',
      'Submission receipt saved'
    ],
    examples: [
      'If a recommendation is required, ask early and include the scholarship prompt.',
      'If the award is renewable, check whether you must reapply each year.'
    ],
    links: [
      { href: '/scholarships', label: 'Find scholarships' },
      { href: '/resources/scholarship-documents-checklist', label: 'Documents checklist' },
      { href: '/financial-aid-disclaimer', label: 'Financial aid disclaimer' }
    ],
    faq: [
      {
        question: 'What should I do first?',
        answer:
          'Review eligibility and deadline before writing. Those two checks prevent most wasted applications.'
      },
      {
        question: 'Can ScholarshipTop submit my application?',
        answer:
          'ScholarshipTop helps you search, compare, save, and prepare. When a provider application route is available, use it to continue toward submission.'
      }
    ]
  },
  {
    slug: 'no-essay-scholarships-guide',
    title: 'No Essay Scholarships Guide',
    description:
      'How to evaluate no essay scholarships, avoid weak leads, and check eligibility before applying.',
    intro:
      'No essay scholarships can be useful, but easy applications often attract broad competition. Treat them as part of your plan, not your whole strategy.',
    sections: [
      {
        title: 'Why no essay awards are different',
        body:
          'Lower effort usually means more applicants. The main task is using source-quality, eligibility, and application-route signals to decide whether the listing belongs on your shortlist.',
        bullets: [
          'Check source status before entering personal data.',
          'Compare whether the award is sweepstakes-style or merit-based.',
          'Do not pay fees to unlock a scholarship claim.'
        ]
      },
      {
        title: 'How to use them well',
        body:
          'Use no essay scholarships as quick additions after you complete stronger-fit applications that require essays or documents.',
        bullets: [
          'Apply only when the provider path is clear.',
          'Save deadlines so quick awards do not distract from bigger applications.',
          'Balance easy entries with targeted scholarships.'
        ]
      }
    ],
    checklist: [
      'Provider path visible',
      'No fee required',
      'Eligibility rules clear',
      'Deadline clear',
      'Privacy expectations acceptable'
    ],
    examples: [
      'A no essay award with unclear provider identity should be treated as a lower-confidence shortlist item, not an automatic application.',
      'A quick application from a known provider can be worth saving if the deadline is close.'
    ],
    links: [
      { href: '/scholarships/no-essay', label: 'Browse no essay scholarships' },
      { href: '/scholarship-scam-warning', label: 'Scholarship scam warning' },
      { href: '/scholarship-verification-methodology', label: 'Verification methodology' }
    ],
    faq: [
      {
        question: 'Are no essay scholarships real?',
        answer:
          'Some are real, and stronger listings make the provider, application route, privacy terms, deadline, and award rules easier to compare before applying.'
      },
      {
        question: 'Are no essay scholarships easier to win?',
        answer:
          'Not necessarily. They may be easier to submit, but broad eligibility can mean more competition.'
      }
    ]
  },
  {
    slug: 'easy-scholarships-guide',
    title: 'Easy Scholarships Guide',
    description:
      'How to decide whether easy scholarships are worth applying to and what to organize before submitting.',
    intro:
      'Easy scholarships are useful when they save time without hiding risk. The key is to separate low-effort legitimate applications from vague listings with thin source-quality or application-route context.',
    sections: [
      {
        title: 'What easy should mean',
        body:
          'Easy should mean fewer required materials, clearer rules, and a direct application route. It should not mean unclear source context, guaranteed award, or suspicious payment request.',
        bullets: [
          'Look for few required materials.',
          'Check the provider path.',
          'Check privacy and data-sharing expectations.'
        ]
      },
      {
        title: 'When to skip',
        body:
          'Skip an easy listing when eligibility is unclear, the provider is unknown, the deadline is missing, or the page pressures you to pay or share sensitive data.',
        bullets: [
          'No clear provider path',
          'No clear award value',
          'No clear application rules'
        ]
      }
    ],
    checklist: [
      'Effort level checked',
      'Documents checked',
      'Deadline checked',
      'Source-quality signal reviewed',
      'Award rules checked'
    ],
    examples: [
      'A short form from a clear provider path may be a good easy application.',
      'A guaranteed award claim from an unknown site should be treated as unsafe.'
    ],
    links: [
      { href: '/scholarships/hub/easy-apply', label: 'Browse easy apply scholarships' },
      { href: '/how-we-rank-scholarships', label: 'How recommendations work' },
      { href: '/scholarship-scam-warning', label: 'Scam warning signs' }
    ],
    faq: [
      {
        question: 'What makes a scholarship easy?',
        answer:
          'A scholarship may be easier when it has few required materials, clear eligibility, a simple form, and a provider application route.'
      },
      {
        question: 'Should easy scholarships be my main strategy?',
        answer:
          'Usually no. They can supplement your plan, but targeted scholarships where you strongly match eligibility often deserve more attention.'
      }
    ]
  },
  {
    slug: 'stem-scholarships-guide',
    title: 'STEM Scholarships Guide',
    description:
      'How STEM students can evaluate scholarship eligibility, documents, essays, and research or major requirements.',
    intro:
      'STEM scholarships often depend on field, level, institution, research interest, GPA, citizenship, or career goals. Read the eligibility rules carefully before drafting essays.',
    sections: [
      {
        title: 'Common STEM eligibility signals',
        body:
          'Providers may restrict awards to specific majors, engineering branches, computer science, healthcare, data science, research tracks, or underrepresented groups.',
        bullets: [
          'Check exact field or major wording.',
          'Review level: high school, undergraduate, graduate, or PhD.',
          'Look for GPA, research, internship, or project evidence requirements.'
        ]
      },
      {
        title: 'How to strengthen a STEM application',
        body:
          'Use concrete evidence: projects, research, internships, coursework, leadership, or community impact tied to the provider mission.',
        bullets: [
          'Match your story to the provider focus.',
          'Prepare transcripts early.',
          'Ask recommenders for STEM-specific examples.'
        ]
      }
    ],
    checklist: [
      'Major or field matches',
      'Level matches',
      'GPA rules checked',
      'Transcript needed',
      'Recommendation needed',
      'Project or research evidence ready'
    ],
    examples: [
      'An engineering scholarship may not include all STEM majors.',
      'A research-focused award may reward project depth more than a generic leadership essay.'
    ],
    links: [
      { href: '/scholarships/category/stem', label: 'Browse STEM scholarships' },
      { href: '/scholarships/category/medical', label: 'Medical scholarships' },
      { href: '/scholarships/engineering', label: 'Engineering scholarships' }
    ],
    faq: [
      {
        question: 'Do STEM scholarships always require high GPA?',
        answer:
          'No. Some do, but others emphasize field interest, projects, identity, financial need, research, or community impact.'
      },
      {
        question: 'Should I reuse the same STEM essay?',
        answer:
          'Reuse your evidence, not the entire essay. Each provider may care about a different field, mission, or student profile.'
      }
    ]
  },
  {
    slug: 'scholarships-in-usa-for-international-students',
    title: 'Scholarships in the USA for International Students',
    description:
      'How international students can search for USA scholarships, compare eligibility, and plan provider application steps.',
    intro:
      'USA scholarships for international students require careful eligibility checks. Some awards are open to non-citizens, while others require US residency, citizenship, FAFSA eligibility, or enrollment at a specific institution.',
    sections: [
      {
        title: 'Eligibility checks that matter',
        body:
          'International students should compare citizenship, visa status, institution, level, field, and whether the award requires FAFSA or domestic residency.',
        bullets: [
          'Check non-citizen eligibility wording.',
          'Review whether F-1 or other visa students can apply.',
          'Read school-specific restrictions carefully.'
        ]
      },
      {
        title: 'Documents to prepare',
        body:
          'Common materials include transcripts, proof of enrollment, essays, financial need documentation, recommendations, and sometimes visa or residency details.',
        bullets: [
          'Do not upload sensitive documents to unclear sources.',
          'Review the provider application domain.',
          'Check whether translated documents are accepted.'
        ]
      }
    ],
    checklist: [
      'Non-citizen eligibility reviewed',
      'School enrollment rules reviewed',
      'Visa or residency language checked',
      'FAFSA requirement checked',
      'Provider path reviewed'
    ],
    examples: [
      'A scholarship may say "international" but still require enrollment at a US college.',
      'Some private awards are open to international students even when government aid is not.'
    ],
    links: [
      { href: '/scholarships/hub/international-friendly', label: 'International-friendly scholarships' },
      { href: '/scholarships/study-in/united-states', label: 'Scholarships in the United States' },
      { href: '/financial-aid-disclaimer', label: 'Financial aid disclaimer' }
    ],
    faq: [
      {
        question: 'Can international students get USA scholarships?',
        answer:
          'Yes, but eligibility varies. Use ScholarshipTop to organize citizenship, visa, enrollment, deadline, and provider-path signals before you prepare applications.'
      },
      {
        question: 'Do international students need FAFSA?',
        answer:
          'Some US scholarships require FAFSA or domestic aid eligibility, but many private or institutional awards use different requirements.'
      }
    ]
  },
  {
    slug: 'scholarships-for-high-school-seniors',
    title: 'Scholarships for High School Seniors',
    description:
      'How high school seniors can find scholarships, prioritize deadlines, and prepare common application materials.',
    intro:
      'High school seniors should build a scholarship calendar early because deadlines, recommendations, transcripts, essays, and enrollment proof can overlap with college applications.',
    sections: [
      {
        title: 'Prioritize by deadline and fit',
        body:
          'Start with scholarships where senior status, graduation year, intended college, GPA, field, or location clearly match the rules.',
        bullets: [
          'Separate local, school, national, and college-specific awards.',
          'Watch fall, winter, and spring deadline clusters.',
          'Ask counselors early for transcript and recommendation timing.'
        ]
      },
      {
        title: 'Common materials',
        body:
          'High school senior scholarships often ask for essays, transcripts, activities, recommendation letters, proof of enrollment, or financial need evidence.',
        bullets: [
          'Keep one activity list ready.',
          'Save reusable essay evidence.',
          'Track submission receipts.'
        ]
      }
    ],
    checklist: [
      'Graduation year matches',
      'College enrollment rules checked',
      'Transcript requested',
      'Recommendation requested',
      'Essay prompt saved',
      'Deadline calendar updated'
    ],
    examples: [
      'Local awards may be less searchable but can have stronger fit.',
      'College-specific scholarships may require admitted or enrolled status.'
    ],
    links: [
      { href: '/scholarships/high-school', label: 'Browse high school scholarships' },
      { href: '/resources/how-to-apply-for-scholarships-checklist', label: 'Application checklist' },
      { href: '/resources/scholarship-documents-checklist', label: 'Documents checklist' }
    ],
    faq: [
      {
        question: 'When should high school seniors start applying?',
        answer:
          'Start as early as possible in senior year, and keep checking deadlines through spring because award cycles vary.'
      },
      {
        question: 'Do seniors need college enrollment proof?',
        answer:
          'Some scholarships require proof of admission or enrollment, while others accept intended enrollment. Review the listed requirements before planning documents.'
      }
    ]
  },
  {
    slug: 'scholarship-eligibility-explained',
    title: 'Scholarship Eligibility Explained',
    description:
      'A plain-English guide to scholarship eligibility rules, including level, field, citizenship, residency, GPA, and documents.',
    intro:
      'Eligibility is the first filter. If you do not match the core rules, a strong essay usually cannot fix the application.',
    sections: [
      {
        title: 'Common eligibility categories',
        body:
          'Scholarships may limit applicants by academic level, field, institution, country, citizenship, residency, GPA, financial need, identity, community, or career plan.',
        bullets: [
          'Read "must be" language carefully.',
          'Separate preferred qualifications from required qualifications.',
          'Check whether requirements apply at application time or award time.'
        ]
      },
      {
        title: 'When eligibility is unclear',
        body:
          'If a listing does not clearly explain eligibility, treat it as lower-confidence and prioritize opportunities with clearer provider-path and requirement context before investing major effort.',
        bullets: [
          'Look for provider FAQ or rules PDF.',
          'Check current-year terms.',
          'Do not rely on third-party summaries alone.'
        ]
      }
    ],
    checklist: [
      'Academic level',
      'Field or major',
      'Citizenship or residency',
      'GPA',
      'Institution',
      'Financial need',
      'Documents'
    ],
    examples: [
      'A scholarship for "US students" may mean citizens, residents, or students enrolled in the US. Review the exact rule before planning materials.',
      'A STEM scholarship may include only certain majors.'
    ],
    links: [
      { href: '/scholarships', label: 'Search by eligibility' },
      { href: '/scholarship-verification-methodology', label: 'Verification methodology' },
      { href: '/how-we-rank-scholarships', label: 'How recommendations work' }
    ],
    faq: [
      {
        question: 'Should I apply if I almost meet eligibility?',
        answer:
          'Usually no unless the provider says exceptions are allowed. Prioritize listings where your eligibility fit is clear before spending time.'
      },
      {
        question: 'Can eligibility change?',
        answer:
          'Yes. Providers can change rules between cycles, so use current requirement and provider-path signals when planning.'
      }
    ]
  },
  {
    slug: 'scholarship-documents-checklist',
    title: 'Scholarship Documents Checklist',
    description:
      'Documents students should prepare before applying for scholarships, including essays, transcripts, recommendations, and proof of enrollment.',
    intro:
      'Documents often decide whether an application is possible before the deadline. Build a reusable document folder and track what each provider requires.',
    sections: [
      {
        title: 'Common documents',
        body:
          'Many scholarships ask for academic, identity, enrollment, financial need, essay, recommendation, or portfolio materials.',
        bullets: [
          'Transcript or academic record',
          'Proof of enrollment or admission',
          'Essay or short answer',
          'Recommendation letter',
          'Resume, activity list, portfolio, or project evidence'
        ]
      },
      {
        title: 'Document safety',
        body:
          'Only upload sensitive documents through trusted provider routes. Be careful with unclear forms, unexpected payment requests, or links from unknown emails.',
        bullets: [
          'Check the application domain.',
          'Avoid sending bank details early.',
          'Save copies of submitted files.'
        ]
      }
    ],
    checklist: [
      'Transcript',
      'Enrollment proof',
      'Essay draft',
      'Recommendation request',
      'Resume or activity list',
      'Financial need evidence',
      'Portfolio or project file if required'
    ],
    examples: [
      'A recommendation letter can take longer than the application form.',
      'A portfolio scholarship may require file formats or links that need testing before the deadline.'
    ],
    links: [
      { href: '/resources/how-to-apply-for-scholarships-checklist', label: 'Application checklist' },
      { href: '/scholarship-scam-warning', label: 'Scam warning signs' },
      { href: '/scholarships', label: 'Find scholarships' }
    ],
    faq: [
      {
        question: 'Do all scholarships require essays?',
        answer:
          'No. Some require no essay, while others require short answers, full essays, recommendations, transcripts, or special documents.'
      },
      {
        question: 'Should I reuse documents?',
        answer:
          'You can reuse evidence and base materials, but tailor essays and statements to the provider prompt.'
      }
    ]
  }
];

export function getStaticScholarshipGuide(
  slug: string | null | undefined
): StaticScholarshipGuide | null {
  const normalized = slug?.trim().toLowerCase();
  if (!normalized) return null;
  return STATIC_SCHOLARSHIP_GUIDES.find((guide) => guide.slug === normalized) ?? null;
}
