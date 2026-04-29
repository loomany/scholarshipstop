export type ScholarshipHubCanonicalSeoSlug =
  | 'matches'
  | 'easy-apply'
  | 'international-friendly'
  | 'hot-deadlines'
  | 'best-recommendation';

export type ScholarshipHubCanonicalFaqItem = {
  question: string;
  answer: string;
};

export type ScholarshipHubCanonicalSeoPack = {
  introText: string;
  faq: ScholarshipHubCanonicalFaqItem[];
  /** Relative paths (href) for related links beyond the base row. */
  extraRelatedHrefs?: { label: string; href: string }[];
};

/** Hub path segment `/scholarships/hub/[segment]` → static SEO bundles (FAQ + related must match SSR output). */
export const SCHOLARSHIP_HUB_CANONICAL_SEO: Record<
  ScholarshipHubCanonicalSeoSlug,
  ScholarshipHubCanonicalSeoPack
> = {
  matches: {
    introText:
      'Browse scholarships matched to your profile, eligibility, education level, and goals.',
    faq: [
      {
        question: 'How are scholarship matches selected?',
        answer:
          'Scholarship matches are based on eligibility signals such as school level, field of study, citizenship, GPA, location, requirements, deadlines, and available scholarship data.'
      },
      {
        question: 'Can I apply to scholarships if I do not match every detail?',
        answer:
          'Yes. Some scholarships use flexible eligibility rules. Always review the official provider page before applying.'
      },
      {
        question: 'How often should I check scholarship matches?',
        answer:
          'Check regularly because deadlines, eligibility details, and new scholarships can change over time.'
      }
    ]
  },
  'easy-apply': {
    introText:
      'Find scholarships with simpler applications, fewer requirements, and faster ways to apply.',
    faq: [
      {
        question: 'What does easy apply mean for scholarships?',
        answer:
          'Easy apply scholarships usually have fewer requirements, simpler forms, or no long essay requirement compared with more competitive applications.'
      },
      {
        question: 'Are easy apply scholarships less valuable?',
        answer:
          'Not always. Some smaller or simpler scholarships can still be useful, especially when you apply to several opportunities.'
      },
      {
        question: 'Should I only apply to easy scholarships?',
        answer:
          'No. Easy scholarships are useful, but a strong strategy combines easy applications with targeted scholarships that fit your profile.'
      }
    ],
    extraRelatedHrefs: [
      {
        label: 'Scholarships for international students',
        href: '/scholarships/hub/international-friendly'
      }
    ]
  },
  'international-friendly': {
    introText:
      'Explore scholarships that may be open to international students, non-U.S. citizens, or students studying in the United States.',
    faq: [
      {
        question: 'Can international students apply for U.S. scholarships?',
        answer:
          'Some U.S. scholarships are open to international students, while others are limited to U.S. citizens or permanent residents. Always check the official eligibility rules.'
      },
      {
        question: 'What should international students check before applying?',
        answer:
          'Review citizenship rules, visa requirements, school eligibility, field of study, GPA requirements, and whether the scholarship is open to non-U.S. applicants.'
      },
      {
        question:
          'Are international-friendly scholarships guaranteed for international students?',
        answer:
          'No. International-friendly means the scholarship may be relevant, but each provider sets its own final eligibility rules.'
      }
    ],
    extraRelatedHrefs: [
      {
        label: 'International student scholarship guide',
        href: '/resources/scholarships-for-international-students-guide'
      },
      {
        label: 'Easy apply scholarships',
        href: '/scholarships/hub/easy-apply'
      }
    ]
  },
  'hot-deadlines': {
    introText:
      'Find scholarships closing soon and prioritize applications before deadlines pass.',
    faq: [
      {
        question: 'Why should I prioritize scholarship deadlines?',
        answer:
          'Missing a deadline usually means you cannot apply for that award cycle. Sorting by deadline helps you focus on applications that need action first.'
      },
      {
        question: 'Should I apply close to the deadline?',
        answer:
          'It is better to apply earlier when possible so you have time to review requirements, essays, transcripts, and recommendation letters.'
      },
      {
        question: 'How can I manage multiple scholarship deadlines?',
        answer:
          'Keep a simple tracker with deadline dates, requirements, essay status, and submission links so you know what to finish next.'
      }
    ],
    extraRelatedHrefs: [
      {
        label: 'Browse all scholarship matches',
        href: '/scholarships/hub/matches'
      }
    ]
  },
  'best-recommendation': {
    introText:
      'Answer a few questions to get scholarship recommendations based on your school level, field of study, citizenship, GPA, and location.',
    faq: [
      {
        question: 'How do best recommendations work?',
        answer:
          'Best recommendations use your answers to match scholarships against profile signals such as school level, field of study, citizenship, GPA, and location.'
      },
      {
        question: 'Do I need to answer every question?',
        answer:
          'No. Even one answer can help improve recommendations, but more answers usually make the list more relevant.'
      },
      {
        question: 'Can I update my recommendations?',
        answer:
          'Yes. You can edit your answers and the recommendation list should update based on the new information.'
      }
    ]
  }
};

/** Base rows used on every hub SEO footer. */
export const SCHOLARSHIP_HUB_RELATED_LINKS_DEFAULT: {
  label: string;
  href: string;
}[] = [
  { label: 'Scholarship resources', href: '/resources' },
  { label: 'Essay guides', href: '/essays' },
  { label: 'Scholarship providers', href: '/providers' },
  { label: 'Compare opportunities', href: '/compare' }
];

export function isScholarshipHubCanonicalSeoSlug(
  slug: string
): slug is ScholarshipHubCanonicalSeoSlug {
  return slug in SCHOLARSHIP_HUB_CANONICAL_SEO;
}
