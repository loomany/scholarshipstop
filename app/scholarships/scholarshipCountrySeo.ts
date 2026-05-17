import { countryLabelFromCode } from '@/lib/scholarships/countryEligibility/countries';

export type ScholarshipCountrySeoKind = 'applicant' | 'host';

export type ScholarshipCountrySeoRoute = {
  kind: ScholarshipCountrySeoKind;
  code: string;
  slug: string;
  label: string;
  canonicalPath: string;
  href: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  supporting: string;
  faq: Array<{ question: string; answer: string }>;
};

const COUNTRY_CODE_TO_SLUG = {
  US: 'united-states',
  CA: 'canada',
  GB: 'united-kingdom',
  IN: 'india',
  NG: 'nigeria',
  MX: 'mexico',
  PH: 'philippines',
  AU: 'australia',
  DE: 'germany',
  FR: 'france',
  NL: 'netherlands',
  IE: 'ireland'
} as const;

const SLUG_TO_COUNTRY_CODE = Object.fromEntries(
  Object.entries(COUNTRY_CODE_TO_SLUG).map(([code, slug]) => [slug, code])
) as Record<string, keyof typeof COUNTRY_CODE_TO_SLUG | undefined>;

const APPLICANT_SEO_CODES = ['US', 'CA', 'GB', 'IN', 'NG', 'MX', 'PH'] as const;
const HOST_SEO_CODES = ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'NL', 'IE'] as const;

function isApplicantSeoCode(code: string): boolean {
  return APPLICANT_SEO_CODES.includes(
    code.toUpperCase() as (typeof APPLICANT_SEO_CODES)[number]
  );
}

function isHostSeoCode(code: string): boolean {
  return HOST_SEO_CODES.includes(
    code.toUpperCase() as (typeof HOST_SEO_CODES)[number]
  );
}

export function scholarshipCountrySlugFromCode(code: string): string | null {
  const normalized = code.trim().toUpperCase();
  return COUNTRY_CODE_TO_SLUG[normalized as keyof typeof COUNTRY_CODE_TO_SLUG] ?? null;
}

export function scholarshipApplicantCountrySeoHref(code: string): string | null {
  const normalized = code.trim().toUpperCase();
  if (!isApplicantSeoCode(normalized)) return null;
  const slug = scholarshipCountrySlugFromCode(normalized);
  return slug ? `/scholarships/for-students-from/${slug}` : null;
}

export function scholarshipHostCountrySeoHref(code: string): string | null {
  const normalized = code.trim().toUpperCase();
  if (!isHostSeoCode(normalized)) return null;
  const slug = scholarshipCountrySlugFromCode(normalized);
  return slug ? `/scholarships/study-in/${slug}` : null;
}

export function allScholarshipCountrySeoRoutes(): ScholarshipCountrySeoRoute[] {
  return [
    ...APPLICANT_SEO_CODES.map((code) => buildCountrySeoRoute('applicant', code)),
    ...HOST_SEO_CODES.map((code) => buildCountrySeoRoute('host', code))
  ];
}

export function resolveScholarshipCountrySeoRoute(
  segments: string[]
): ScholarshipCountrySeoRoute | null {
  if (segments.length !== 2) return null;
  const [family, countrySlug] = segments;
  const code = SLUG_TO_COUNTRY_CODE[countrySlug ?? ''];
  if (!code) return null;
  if (family === 'for-students-from' && isApplicantSeoCode(code)) {
    return buildCountrySeoRoute('applicant', code);
  }
  if (family === 'study-in' && isHostSeoCode(code)) {
    return buildCountrySeoRoute('host', code);
  }
  return null;
}

function buildCountrySeoRoute(
  kind: ScholarshipCountrySeoKind,
  code: string
): ScholarshipCountrySeoRoute {
  const normalized = code.trim().toUpperCase();
  const slug = scholarshipCountrySlugFromCode(normalized);
  if (!slug) {
    throw new Error(`Unsupported scholarship country SEO code: ${code}`);
  }
  const label = countryLabelFromCode(normalized);
  const applicant = kind === 'applicant';
  const canonicalPath = applicant
    ? `for-students-from/${slug}`
    : `study-in/${slug}`;
  const h1 = applicant
    ? `Scholarships for students from ${label}`
    : `Scholarships to study in ${label}`;
  const metaTitle = applicant
    ? `Scholarships for Students from ${label}`
    : `Scholarships to Study in ${label}`;
  const metaDescription = applicant
    ? `Browse scholarships that may be open to students from ${label}. Compare deadlines, award amounts, eligibility requirements, and official application links.`
    : `Browse scholarships hosted in ${label}. Compare award amounts, deadlines, eligibility requirements, and official application links.`;
  const intro = applicant
    ? `Explore scholarships that list ${label} as an eligible applicant country or citizenship/home-country signal. Use the filters below to compare deadlines, award amounts, study levels, and requirements before opening the official application page.`
    : `Explore scholarships and funding opportunities hosted in ${label}. This page focuses on grants with a ${label} host-country signal so you can compare local, university, and organization-backed opportunities in one place.`;
  const contextBullets = countrySeoContextBullets(kind, normalized, label);
  const contextHtml = contextBullets.length
    ? `<ul>${contextBullets.map((item) => `<li>${item}</li>`).join('')}</ul>`
    : '';
  const supporting = applicant
    ? `<p>Use this country page as a starting point, then narrow the list by field of study, education level, deadline, GPA, and application effort. Always confirm citizenship, residency, and enrollment requirements on the official scholarship page before applying.</p>${contextHtml}`
    : `<p>Use this study destination page to compare opportunities by deadline, award amount, institution, and eligibility. Host-country signals can describe where the scholarship is based, where study takes place, or where the provider operates, so review each official listing before applying.</p>${contextHtml}`;
  const faq = applicant
    ? [
        {
          question: `Who can use this ${label} scholarship list?`,
          answer: `This page is for students from ${label} looking for scholarships that may include their country, citizenship, or home-country eligibility.`
        },
        {
          question: `Are all scholarships here guaranteed for ${label} students?`,
          answer:
            'No. The list is based on catalog country signals, so you should always verify citizenship, residency, school level, and program requirements on the official scholarship page.'
        },
        {
          question: 'How should I narrow the list?',
          answer:
            'Start with deadline and education level, then refine by field of study, award size, GPA, and application requirements.'
        }
      ]
    : [
        {
          question: `What does “study in ${label}” mean here?`,
          answer: `It means the scholarship has a ${label} host-country signal, such as a provider, institution, or study destination connected to ${label}.`
        },
        {
          question: `Can international students apply for scholarships in ${label}?`,
          answer:
            'Some listed scholarships may be open to international students, while others may be limited by citizenship, residency, university, or program. Check the official eligibility rules before applying.'
        },
        {
          question: 'What should I compare first?',
          answer:
            'Compare deadline, award amount, eligible institution or program, required documents, and whether the scholarship pays the student, college, or another recipient.'
        }
      ];
  return {
    kind,
    code: normalized,
    slug,
    label,
    canonicalPath,
    href: `/scholarships/${canonicalPath}`,
    h1,
    metaTitle,
    metaDescription,
    intro,
    supporting,
    faq
  };
}

function countrySeoContextBullets(
  kind: ScholarshipCountrySeoKind,
  code: string,
  label: string
): string[] {
  const applicant: Record<string, string[]> = {
    IN: [
      'Students from India should check whether the provider accepts non-US citizens, Indian residents, Indian citizens studying abroad, or only students enrolled at specific universities.',
      'Many international awards require transcripts, proof of enrollment, and English-language or program-specific documents.'
    ],
    NG: [
      'Students from Nigeria should verify whether the award is open by citizenship, country of residence, or current institution.',
      'If financial need is considered, confirm whether the provider accepts local financial documents, school financial aid records, or separate statements.'
    ],
    PH: [
      'Students from the Philippines should check whether eligibility is based on citizenship, home country, current school, or destination country.',
      'Provider pages may use different wording for international, non-citizen, or overseas applicants.'
    ],
    US: [
      'US applicant rules can depend on citizenship, permanent residency, state residency, FAFSA eligibility, or enrollment at a specific school.',
      'State and local awards often require location-specific proof that broad national awards do not.'
    ],
    CA: [
      'Canadian applicant eligibility can depend on province, citizenship or permanent residency, current school, and study destination.',
      'Check whether awards are payable to a Canadian institution, a foreign institution, or directly to the student.'
    ],
    GB: [
      'UK applicant eligibility may distinguish citizenship, ordinary residence, home-fee status, and current institution.',
      'Confirm whether the scholarship is for UK-based study or allows international study destinations.'
    ]
  };
  const host: Record<string, string[]> = {
    US: [
      'For study in the United States, check whether the scholarship requires US citizenship, permanent residency, FAFSA eligibility, state residency, or enrollment at a US institution.',
      'International students should verify visa, non-citizen, and school-specific rules before preparing documents.'
    ],
    CA: [
      'For study in Canada, check whether the award is tied to a province, Canadian institution, citizenship or permanent residency, or a specific study level.',
      'International applicants should confirm whether the provider accepts non-Canadian students and where funds are paid.'
    ],
    GB: [
      'For study in the United Kingdom, verify home/international fee status, university enrollment rules, and whether the award is course-specific.',
      'Deadlines may align with admission cycles, so compare scholarship timing against course application dates.'
    ],
    DE: [
      'For study in Germany, check whether the scholarship requires admission to a German institution, a specific degree level, German-language evidence, or a research proposal.',
      'Some Germany-based awards are tied to foundations, government-backed programs, or university enrollment milestones.'
    ],
    AU: [
      'For study in Australia, confirm whether the award is institution-specific, open to international students, and tied to coursework or research programs.',
      'Check whether the scholarship covers tuition only, living support, or a partial award.'
    ]
  };

  const specific = kind === 'applicant' ? applicant[code] : host[code];
  if (specific?.length) return specific;
  return [
    `For ${label}, compare country-specific rules with the official provider page before applying.`
  ];
}
