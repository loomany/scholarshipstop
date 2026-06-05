export type SuccessStory = {
  name: string;
  label: string;
  headline: string;
  body: string;
};

/**
 * Home workflow examples. Keep these as product-use scenarios, not outcome
 * or award claims, unless explicit verification is available.
 */
export const SUCCESS_STORIES: SuccessStory[] = [
  {
    name: 'STEM applicant',
    label: 'Shortlist workflow',
    headline: 'A cleaner way to compare STEM scholarship options',
    body:
      'Use filters to separate STEM opportunities by deadline, required essays, provider path, and eligibility before deciding which official pages to verify.'
  },
  {
    name: 'International student',
    label: 'Eligibility workflow',
    headline: 'Country and visa signals in one planning view',
    body:
      'Compare applicant-country, study-destination, deadline, and provider-source signals before spending time on programs that may not accept your profile.'
  },
  {
    name: 'Research-focused student',
    label: 'Essay planning workflow',
    headline: 'Research goals organized before drafting essays',
    body:
      'Turn scholarship facts into an essay plan: audience, evidence, research direction, required materials, and what to confirm on the official provider route.'
  },
  {
    name: 'Arts applicant',
    label: 'Materials workflow',
    headline: 'Portfolio, essay, and deadline checks together',
    body:
      'Use requirement signals to see whether a listing asks for a portfolio, essay, transcript, recommendation, or other supporting material before applying.'
  },
  {
    name: 'Community-service applicant',
    label: 'Narrative workflow',
    headline: 'Volunteer impact translated into application evidence',
    body:
      'Plan how to connect service hours, leadership, outcomes, and eligibility rules without inventing claims or skipping provider verification.'
  },
  {
    name: 'Busy student',
    label: 'Deadline workflow',
    headline: 'Urgent deadlines separated from longer-cycle options',
    body:
      'Sort opportunities by timing, effort, and documents so close deadlines get handled first and uncertain dates are checked on official pages.'
  },
  {
    name: 'High-effort applicant',
    label: 'Priority workflow',
    headline: 'Fewer blind applications, more fit checks',
    body:
      'Use fit, source, urgency, award, and document signals to choose a realistic shortlist before drafting personal statements or collecting references.'
  },
  {
    name: 'Cross-border STEM applicant',
    label: 'Verification workflow',
    headline: 'Cross-border STEM funding without the forum rabbit holes',
    body:
      'Use structured eligibility and host-country signals to turn forum advice into a list of official sources worth checking directly.'
  },
  {
    name: 'Parent helper',
    label: 'Family planning workflow',
    headline: 'A shared view for deadlines and provider paths',
    body:
      'Families can use saved lists, deadline context, and application-path notes to discuss next steps without relying on scattered browser tabs.'
  },
  {
    name: 'Tech applicant',
    label: 'Reuse workflow',
    headline: 'One application kit adapted across similar prompts',
    body:
      'Compare prompt themes, required proof, and provider expectations so drafts can be adapted carefully instead of copied blindly across portals.'
  }
];
