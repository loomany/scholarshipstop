export const ESSAY_PILOT_SLUGS = [
  'how-to-write-about-the-gap-between-expectation-and-reality-of-studying-in-america',
  'how-to-write-a-strong-public-policy-scholarship-essay-as-an-international-student',
  'how-to-write-richard-r-tufenkian-scholarship-details-scholarship-essay'
] as const;

export type EssayPilotSlug = (typeof ESSAY_PILOT_SLUGS)[number];

export const ESSAY_PILOT_STAGE_MAX_ROWS = 6;

const SET = new Set<string>(ESSAY_PILOT_SLUGS);

export function isEssayPilotSlug(slug: string | null | undefined): slug is EssayPilotSlug {
  if (!slug) return false;
  return SET.has(slug.trim().toLowerCase());
}
