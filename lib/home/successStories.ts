export type SuccessStory = {
  name: string;
  label: string;
  headline: string;
  body: string;
  /** ui-avatars fallback initials */
  avatarName: string;
  /** File base: `/images/success-stories/avatar-{slug}.webp` */
  avatarSlug: string;
};

/**
 * Home success stories — copy + avatar slugs (images generated via
 * `scripts/generate-success-stories-avatars.ts` using FAL Nano Banana 2).
 */
export const SUCCESS_STORIES: SuccessStory[] = [
  {
    name: 'Alex R.',
    label: 'Scholarship Winner',
    headline: '$10,000 from Google — two weeks earlier than I expected',
    body:
      'Finding that Google grant was like a lottery for me. AI match identified it two weeks early. I used the Essay Mentor to structure my application. Just won $10,000!',
    avatarName: 'Alex R',
    avatarSlug: 'alex-r'
  },
  {
    name: 'Maria L.',
    label: 'Tech Grant Recipient',
    headline: 'Full tuition to U of T after 20 hours of dead-end searching',
    body:
      'I wasted 20 hours on filtering before finding ScholarshipTop. Their AI draft got me a full-tuition scholarship to the University of Toronto. Absolutely changed my life!',
    avatarName: 'Maria L',
    avatarSlug: 'maria-l'
  },
  {
    name: 'David K.',
    label: 'STEM Scholar',
    headline: 'NSF-style research funding — finally a list that matched my lab CV',
    body:
      'I was drowning in PDFs and eligibility quizzes. The match engine pulled two STEM programs I had missed entirely. Essay Mentor helped me tighten my research statement. Awarded $8,500.',
    avatarName: 'David K',
    avatarSlug: 'david-k'
  },
  {
    name: 'Sophia N.',
    label: 'Arts Grant Awardee',
    headline: 'Portfolio + essay in one workflow — $6k for my MFA path',
    body:
      'Arts scholarships are scattered and vague. This hub cut the noise. I framed my story with the mentor, submitted on time, and landed a $6,000 studio grant.',
    avatarName: 'Sophia N',
    avatarSlug: 'sophia-n'
  },
  {
    name: 'James W.',
    label: 'Community Impact Grant',
    headline: 'From volunteer burnout to a $5k community scholarship',
    body:
      'I almost quit because I could not prove my impact on paper. The mentor helped me turn messy volunteer hours into a clear narrative. Won $5,000 and a renewable community award.',
    avatarName: 'James W',
    avatarSlug: 'james-w'
  },
  {
    name: 'Aisha M.',
    label: 'Merit Scholarship',
    headline: '$5k merit award — deadlines I would have missed on my own',
    body:
      'Notifications saved me. I was working two jobs and still almost missed a merit cycle. One match was a perfect fit for my GPA and major. The essay tools cut rewrite time in half.',
    avatarName: 'Aisha M',
    avatarSlug: 'aisha-m'
  },
  {
    name: 'Omar H.',
    label: 'Full Ride Recipient',
    headline: 'Full ride + stipend — I stopped applying blind',
    body:
      'I used to spray applications everywhere. ScholarshipTop narrowed it to high-fit programs. Mentor feedback on my personal statement was the difference. Full ride with a living stipend.',
    avatarName: 'Omar H',
    avatarSlug: 'omar-h'
  },
  {
    name: 'Elena V.',
    label: 'International STEM',
    headline: 'Cross-border STEM funding without the forum rabbit holes',
    body:
      'As an international student, forums gave conflicting answers. Verified matches here replaced guesswork. Essay Mentor helped me align my research goals with what reviewers want.',
    avatarName: 'Elena V',
    avatarSlug: 'elena-v'
  },
  {
    name: 'Jennifer K.',
    label: 'Parent',
    headline: 'Five verified matches in minutes — he’s a Coca-Cola Scholar now',
    body:
      'Finding funding for my son felt impossible. This tool surfaced five verified matches in minutes. He used the mentor for his essays. He is now a Coca-Cola Scholar.',
    avatarName: 'Jennifer K',
    avatarSlug: 'jennifer-k'
  },
  {
    name: 'Tyler B.',
    label: 'Tech + Internship Award',
    headline: '$10k + internship — one application kit instead of ten drafts',
    body:
      'I was recycling weak essays for every portal. The mentor forced structure: hook, proof, outcome. Landed $10,000 plus a summer internship pipeline I did not know existed.',
    avatarName: 'Tyler B',
    avatarSlug: 'tyler-b'
  }
];

export const SUCCESS_STORY_AVATAR_BASE = '/images/success-stories' as const;

export function successStoryAvatarSrc(slug: string): string {
  return `${SUCCESS_STORY_AVATAR_BASE}/avatar-${slug}.webp`;
}
