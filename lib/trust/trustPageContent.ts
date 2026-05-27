import type { Metadata } from 'next';

import { buildStage2EnglishPilotAlternates } from '@/lib/i18n/englishAlternates';
import { getCanonical } from '@/lib/seo/canonical';

export type TrustPageKey =
  | 'about'
  | 'editorialPolicy'
  | 'verificationMethodology'
  | 'ranking'
  | 'howItWorks'
  | 'contact'
  | 'disclaimer'
  | 'corrections'
  | 'scamWarning'
  | 'howWeMakeMoney';

export type TrustPageSection = {
  title: string;
  body?: string;
  bullets?: string[];
};

export type TrustPageCard = {
  title: string;
  body: string;
};

export type TrustPageLink = {
  href: string;
  label: string;
  body: string;
};

export type TrustPageContent = {
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  intro: string;
  cards?: TrustPageCard[];
  sections: TrustPageSection[];
  faq?: Array<{ question: string; answer: string }>;
  links?: TrustPageLink[];
  cta?: {
    href: string;
    label: string;
  };
};

const TRUST_PAGE_PATHS: Record<TrustPageKey, string> = {
  about: '/about',
  editorialPolicy: '/editorial-policy',
  verificationMethodology: '/scholarship-verification-methodology',
  ranking: '/how-we-rank-scholarships',
  howItWorks: '/how-scholarshiptop-works',
  contact: '/contact',
  disclaimer: '/financial-aid-disclaimer',
  corrections: '/corrections',
  scamWarning: '/scholarship-scam-warning',
  howWeMakeMoney: '/how-we-make-money'
};

const trustLinks = {
  methodology: {
    href: '/scholarship-verification-methodology',
    label: 'Verification methodology',
    body: 'See how ScholarshipTop checks source, deadline, award, eligibility, and application-path signals.'
  },
  editorial: {
    href: '/editorial-policy',
    label: 'Editorial policy',
    body: 'Learn how ScholarshipTop turns public listing facts into original student guidance without inventing facts.'
  },
  ranking: {
    href: '/how-we-rank-scholarships',
    label: 'How rankings work',
    body: 'Understand recommendation factors, fit signals, deadline urgency, source-quality signals, and shortlist planning.'
  },
  disclaimer: {
    href: '/financial-aid-disclaimer',
    label: 'Financial aid disclaimer',
    body: 'See the legal boundaries behind scholarship research and application planning.'
  },
  corrections: {
    href: '/corrections',
    label: 'Corrections',
    body: 'Report inaccurate deadlines, application paths, eligibility notes, or scam concerns.'
  }
} as const;

export const TRUST_PAGE_CONTENT: Record<TrustPageKey, TrustPageContent> = {
  about: {
    title: 'About ScholarshipTop',
    description:
      'Learn how ScholarshipTop helps students search, compare, save, and act on scholarship opportunities.',
    eyebrow: 'About ScholarshipTop',
    h1: 'A scholarship search and application-planning platform',
    intro:
      'ScholarshipTop helps students find relevant scholarships, compare eligibility and deadlines, understand application requirements, save opportunities, prepare materials, and continue toward provider application paths when ready.',
    cards: [
      {
        title: 'Search by fit',
        body:
          'Students can narrow opportunities by study level, background, country signals, field, award value, deadline, and application effort.'
      },
      {
        title: 'Understand requirements',
        body:
          'Listings are organized into practical summaries, eligibility notes, missing-data flags, and next-step checklists.'
      },
      {
        title: 'Move toward application paths',
        body:
          'Provider application links and submission paths are included when available so students can move from shortlist to application planning faster.'
      }
    ],
    sections: [
      {
        title: 'What makes ScholarshipTop different',
        body:
          'ScholarshipTop is built as a scholarship workspace. The product adds a decision-support layer on top of scholarship data so students can spend less time guessing and more time preparing realistic applications.',
        bullets: [
          'Source-quality and provider-path signals',
          'Deadline clarity and urgency signals',
          'Eligibility summaries written in plain language',
          'Application effort and required-materials signals',
          'Save, ignore, and match workflows for building a real shortlist'
        ]
      },
      {
        title: 'What providers decide',
        body:
          'Final selection decisions and award disbursement are made by the relevant provider. ScholarshipTop focuses on organized research, comparison, shortlisting, and application preparation.'
      }
    ],
    links: [
      trustLinks.methodology,
      trustLinks.ranking,
      trustLinks.editorial,
      trustLinks.disclaimer
    ],
    cta: { href: '/scholarships', label: 'Browse scholarships' }
  },
  editorialPolicy: {
    title: 'Editorial Policy',
    description:
      'How ScholarshipTop creates original scholarship summaries, guidance, and corrections from public listing facts.',
    eyebrow: 'Editorial standards',
    h1: 'How we write scholarship guidance',
    intro:
      'ScholarshipTop uses scholarship facts to create student-friendly explanations. The goal is clarity: explain eligibility, deadlines, documents, and next steps without copying provider pages or inventing details.',
    cards: [
      {
        title: 'Facts first',
        body:
          'Public scholarship facts such as deadline, sponsor, award amount, requirements, and application route are treated as source data.'
      },
      {
        title: 'Original summaries',
        body:
          'ScholarshipTop summaries explain what the facts mean for a student, rather than republishing provider copy as-is.'
      },
      {
        title: 'Transparent uncertainty',
        body:
          'When data is incomplete, the site flags source-quality context and available provider-path signals instead of filling gaps with assumptions.'
      }
    ],
    sections: [
      {
        title: 'How content is created',
        bullets: [
          'We structure public scholarship facts into searchable fields and readable summaries.',
          'We write plain-English guidance for eligibility, required documents, and application planning.',
          'We include provider application paths when available so students can plan the next step from organized context.',
          'AI tools may help organize data or draft wording, but facts must come from available listing evidence and should not be invented.'
        ]
      },
      {
        title: 'How incomplete data is handled',
        body:
          'If a deadline, award value, eligibility rule, payout method, document list, or application route is unclear, ScholarshipTop should mark that uncertainty visibly and show the available context for planning.'
      },
      {
        title: 'Corrections',
        body:
          'Scholarship information can change. Students, providers, and readers can report inaccurate or outdated information through the corrections page.'
      }
    ],
    links: [trustLinks.corrections, trustLinks.methodology, trustLinks.disclaimer],
    cta: { href: '/corrections', label: 'Report a correction' }
  },
  verificationMethodology: {
    title: 'Scholarship Verification Methodology',
    description:
      'How ScholarshipTop organizes source-quality signals, deadlines, award values, eligibility, required materials, and application routes.',
    eyebrow: 'Verification methodology',
    h1: 'How ScholarshipTop verifies scholarship listings',
    intro:
      'ScholarshipTop checks whether a listing has enough evidence for students to evaluate fit and plan next steps. Verification is about source clarity, structured context, and student usefulness.',
    cards: [
      {
        title: 'Verified source',
        body:
          'An official provider or application destination is available and the listing has enough core details to guide the student.'
      },
      {
        title: 'Provider path signal',
        body:
          'A sponsor or source is present, and ScholarshipTop highlights the available application route context for planning.'
      },
      {
        title: 'Partial data',
        body:
          'Some fields are useful, but one or more critical details such as deadline, award amount, eligibility, documents, or payout are unclear.'
      }
    ],
    sections: [
      {
        title: 'What we check',
        bullets: [
          'Official source or provider application path',
          'Deadline and whether the date is current or recurring',
          'Award amount, payout method, renewal notes, and number of awards when available',
          'Eligibility rules such as level, field, citizenship, residency, institution, GPA, or special status',
          'Required materials such as essays, transcripts, recommendations, forms, portfolios, videos, or proof of enrollment',
          'Application route and whether a provider application path is available'
        ]
      },
      {
        title: 'Status labels',
        bullets: [
          'Structured provider path: a provider or application destination is available.',
          'Provider source available: a provider/application route exists with useful context for planning.',
          'Application path signal: source information exists and can guide next-step planning.',
          'Limited source context: current data is not enough to show a complete provider path.',
          'Expired or check next cycle: the listed deadline appears old or the provider may reopen a future cycle.'
        ]
      },
      {
        title: 'Application readiness',
        body:
          'Use organized deadlines, eligibility signals, award details, required materials, and provider application paths to decide what belongs on your shortlist and what to prepare next.'
      }
    ],
    links: [trustLinks.editorial, trustLinks.ranking, trustLinks.corrections],
    cta: { href: '/scholarships', label: 'Find structured listings' }
  },
  ranking: {
    title: 'How ScholarshipTop Ranks Scholarships',
    description:
      'How ScholarshipTop recommendation and ranking signals work, including fit, urgency, effort, source confidence, and data completeness.',
    eyebrow: 'Ranking transparency',
    h1: 'How recommendations work',
    intro:
      'ScholarshipTop recommendations are designed to help students build a realistic shortlist, compare fit, and prioritize application preparation.',
    cards: [
      {
        title: 'Profile fit',
        body:
          'Signals such as study level, field, background, citizenship, country, and student goals can influence matching.'
      },
      {
        title: 'Application timing',
        body:
          'Deadline clarity and urgency help students prioritize what to save and prepare first.'
      },
      {
        title: 'Data confidence',
        body:
          'Source status, missing fields, and application-route clarity help distinguish stronger workspace signals from thinner listings.'
      }
    ],
    sections: [
      {
        title: 'Ranking factors',
        bullets: [
          'Eligibility and profile match signals',
          'Deadline urgency and whether the date is clear enough for planning',
          'Application effort, including essays, transcripts, recommendations, and special documents',
          'Award value and payout clarity when available',
          'Source confidence and provider application path',
          'Data completeness and missing-data flags',
          'Student behavior such as saved, ignored, or viewed opportunities'
        ]
      },
      {
        title: 'What providers decide',
        body:
          'A high match or visible recommendation is a planning signal, not a provider decision. Final selection and award disbursement are made by the relevant provider.'
      }
    ],
    links: [trustLinks.methodology, trustLinks.disclaimer, trustLinks.editorial],
    cta: { href: '/get-scholarships', label: 'Get matched' }
  },
  howItWorks: {
    title: 'How ScholarshipTop Works',
    description:
      'How students use ScholarshipTop to answer questions, get matches, compare scholarships, save deadlines, prepare materials, and move toward application paths.',
    eyebrow: 'How it works',
    h1: 'From scholarship search to application shortlist',
    intro:
      'ScholarshipTop turns a broad scholarship search into a practical workflow: answer questions, review matches, compare requirements, save realistic options, prepare materials, and continue toward provider application paths.',
    cards: [
      {
        title: '1. Answer questions',
        body:
          'Share academic level, background, location, interests, and goals so ScholarshipTop can surface better-fit opportunities.'
      },
      {
        title: '2. Compare opportunities',
        body:
          'Use deadlines, award values, requirements, source status, and application effort to decide what deserves your time.'
      },
      {
        title: '3. Prepare and submit',
        body:
          'Prepare documents, essays, and required materials, then use the provider application path when you are ready to submit.'
      }
    ],
    sections: [
      {
        title: 'Why the workflow matters',
        body:
          'Students often lose time applying from a title alone. ScholarshipTop encourages the opposite: compare fit first, evaluate effort, prepare the right materials, and keep provider application paths tied to the saved opportunity.'
      },
      {
        title: 'Application readiness checklist',
        bullets: [
          'Eligibility rules and whether they match your profile',
          'Deadline, timezone, and whether the cycle is still open',
          'Award value, payout route, renewal rules, and number of awards',
          'Required documents and how long they take to prepare',
          'Provider application route and contact information when available'
        ]
      }
    ],
    links: [trustLinks.methodology, trustLinks.ranking, trustLinks.disclaimer],
    cta: { href: '/scholarships', label: 'Start searching' }
  },
  contact: {
    title: 'Contact ScholarshipTop',
    description:
      'Contact ScholarshipTop for support, listing corrections, official-source updates, broken links, or scholarship safety concerns.',
    eyebrow: 'Contact',
    h1: 'Contact ScholarshipTop',
    intro:
      'Use this page to find the right path for support, corrections, source updates, and safety concerns. ScholarshipTop cannot submit applications for students or decide awards.',
    cards: [
      {
        title: 'Support',
        body:
          'For account or product help, contact support at support@scholarshiptop.com.'
      },
      {
        title: 'Corrections',
        body:
          'For inaccurate deadlines, broken links, or eligibility issues, use the corrections page so the report includes the right context.'
      },
      {
        title: 'Safety concerns',
        body:
          'If a scholarship listing asks for suspicious fees, private data, or unofficial payment steps, review the scam-warning guide and report the concern.'
      }
    ],
    sections: [
      {
        title: 'What to include',
        bullets: [
          'The ScholarshipTop URL or scholarship title',
          'The official provider URL if you have it',
          'The specific field that seems inaccurate',
          'A short description of what should be checked'
        ]
      },
      {
        title: 'Important limitation',
        body:
          'ScholarshipTop is not a scholarship provider, university, or government agency. We cannot influence provider decisions or guarantee scholarship results.'
      }
    ],
    links: [trustLinks.corrections, trustLinks.methodology, trustLinks.disclaimer],
    cta: { href: '/corrections', label: 'Report listing issue' }
  },
  disclaimer: {
    title: 'Financial Aid Disclaimer',
    description:
      'Important limitations for using ScholarshipTop scholarship listings, recommendations, deadlines, and application guidance.',
    eyebrow: 'Financial aid disclaimer',
    h1: 'Scholarship information can change',
    intro:
      'ScholarshipTop helps students search and plan, but it is not a scholarship provider, university, government agency, lender, or financial aid office.',
    cards: [
      {
        title: 'No award guarantee',
        body:
          'Recommendations do not guarantee eligibility, selection, scholarship approval, or award payment.'
      },
      {
        title: 'Official rules control',
        body:
          'The official provider page controls final deadlines, eligibility, documents, payout, and renewal rules.'
      },
      {
        title: 'Verify before applying',
        body:
          'Always confirm the final application path and avoid sharing sensitive information with unclear sources.'
      }
    ],
    sections: [
      {
        title: 'ScholarshipTop does not provide financial aid advice',
        body:
          'Information on ScholarshipTop is for scholarship discovery and application planning. It is not legal, tax, immigration, or financial aid advice.'
      },
      {
        title: 'Before relying on a listing',
        bullets: [
          'Open the official provider page',
          'Confirm the current deadline and timezone',
          'Confirm eligibility rules and required documents',
          'Confirm payout, renewal, and award conditions',
          'Avoid application fees or suspicious payment requests unless the official provider clearly explains them'
        ]
      }
    ],
    links: [trustLinks.methodology, trustLinks.corrections],
    cta: { href: '/scholarships', label: 'Browse scholarships carefully' }
  },
  corrections: {
    title: 'Corrections',
    description:
      'Report inaccurate scholarship deadlines, broken official links, wrong eligibility notes, or safety concerns.',
    eyebrow: 'Corrections',
    h1: 'Report a scholarship listing issue',
    intro:
      'Scholarship details can change. Corrections help ScholarshipTop keep listings useful and transparent for students.',
    cards: [
      {
        title: 'Deadline issue',
        body:
          'Report a deadline that is missing, outdated, expired, reopened, or listed with unclear timezone details.'
      },
      {
        title: 'Official link issue',
        body:
          'Report a broken official source, outdated provider page, redirect problem, or application route that needs confirmation.'
      },
      {
        title: 'Eligibility issue',
        body:
          'Report wrong study level, country, citizenship, residency, field, GPA, document, or institution information.'
      }
    ],
    sections: [
      {
        title: 'How correction review works',
        bullets: [
          'We identify the affected ScholarshipTop listing or page.',
          'We compare the report against the official provider source when available.',
          'We update, flag, or remove information when the current evidence supports a change.',
          'If the source is unclear, we may mark the listing as needing confirmation rather than guessing.'
        ]
      },
      {
        title: 'How to submit',
        body:
          'Email support@scholarshiptop.com with the ScholarshipTop URL, the official source URL if available, and the specific detail that should be reviewed.'
      }
    ],
    links: [trustLinks.editorial, trustLinks.methodology, trustLinks.disclaimer],
    cta: { href: 'mailto:support@scholarshiptop.com', label: 'Email support' }
  },
  scamWarning: {
    title: 'Scholarship Scam Warning',
    description:
      'How to spot scholarship scams, suspicious application fees, fake checks, unofficial emails, and unsafe provider requests.',
    eyebrow: 'Safety guide',
    h1: 'Scholarship scam warning signs',
    intro:
      'Most scholarship searches include some uncertainty. Use these checks before sharing personal information, paying fees, or trusting an unofficial application route.',
    cards: [
      {
        title: 'Application fees',
        body:
          'Be cautious when an opportunity asks for money to apply, claim, process, or unlock a scholarship.'
      },
      {
        title: 'Unofficial contact',
        body:
          'Provider emails should match a credible organization, school, nonprofit, government, or official program domain when possible.'
      },
      {
        title: 'Pressure tactics',
        body:
          'Urgent payment demands, guaranteed awards, and requests to keep an award secret are major red flags.'
      }
    ],
    sections: [
      {
        title: 'Red flags to check',
        bullets: [
          'Guaranteed scholarship or guaranteed selection claims',
          'Requests for bank details before official award confirmation',
          'Checks that ask you to send money back',
          'Application fees that are not clearly explained by an official provider',
          'Provider pages with no clear organization identity or contact information',
          'Emails from free or lookalike domains that do not match the sponsor'
        ]
      },
      {
        title: 'How to verify a scholarship source',
        bullets: [
          'Search for the scholarship on the provider website, not only on third-party pages.',
          'Check whether the application domain matches the official organization.',
          'Confirm deadline, eligibility, award amount, and documents from the provider page.',
          'Avoid sending sensitive documents until the source and application route are clear.'
        ]
      }
    ],
    links: [trustLinks.methodology, trustLinks.corrections, trustLinks.disclaimer],
    cta: { href: '/scholarships', label: 'Search with source checks' }
  },
  howWeMakeMoney: {
    title: 'How ScholarshipTop Makes Money',
    description:
      'How free and paid ScholarshipTop features help students search, organize, compare, save, and plan scholarship applications.',
    eyebrow: 'Business transparency',
    h1: 'How ScholarshipTop makes money',
    intro:
      'ScholarshipTop may offer free and paid product features that help students search, organize, compare, save, and plan scholarship applications.',
    cards: [
      {
        title: 'Free access',
        body:
          'Students can browse and learn from public scholarship information and trust resources.'
      },
      {
        title: 'Paid features',
        body:
          'Subscriptions may unlock additional matching, planning, research, or productivity features depending on the current product plan.'
      },
      {
        title: 'Provider decisions',
        body:
          'Paid tools improve organization, matching, filtering, and planning; final award decisions remain with the relevant provider.'
      }
    ],
    sections: [
      {
        title: 'Ranking integrity',
        body:
          'ScholarshipTop should not sell fake placement, fake reviews, or fake verification status. If sponsored placement is ever introduced, it should be labeled clearly and kept separate from factual source and eligibility signals.'
      },
      {
        title: 'What students should know',
        bullets: [
          'ScholarshipTop organizes scholarship details, deadlines, and application signals.',
          'Provider application paths are included when available.',
          'Paid tools can help organize the search, compare fit, and prepare materials.',
          'Final selection and award disbursement are made by the relevant provider.'
        ]
      }
    ],
    links: [trustLinks.ranking, trustLinks.disclaimer, trustLinks.editorial],
    cta: { href: '/subscription', label: 'View plans' }
  }
};

export function trustPageMetadata(key: TrustPageKey): Metadata {
  const page = TRUST_PAGE_CONTENT[key];
  const path = TRUST_PAGE_PATHS[key];
  const alternates = buildStage2EnglishPilotAlternates(path);
  const canonical = getCanonical(path);
  return {
    title: page.title,
    description: page.description,
    alternates,
    openGraph: {
      title: page.title,
      description: page.description,
      url: canonical,
      type: 'website'
    }
  };
}
