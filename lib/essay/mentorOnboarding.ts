/**
 * Hardcoded onboarding copy + profile snippets for AI Essay Mentor (before LLM interview).
 */

export const WELCOME_WITH_SCHOLARSHIP_TEMPLATE = (scholarshipTitle: string) =>
  `Hi! I see you're preparing an application for the ${scholarshipTitle.trim()}. Should we tailor our essay specifically for this grant, or do you have a different topic in mind?`;

export const WELCOME_GENERAL =
  "Hi! I'm your AI Mentor. Let's write a winning essay. Do you have a specific scholarship prompt you want to tackle today, or should we start with a general personal statement?";

export function buildWelcomeAssistantMessage(
  scholarshipTitle: string | null | undefined
): string {
  const t = scholarshipTitle?.trim();
  if (t) return WELCOME_WITH_SCHOLARSHIP_TEMPLATE(t);
  return WELCOME_GENERAL;
}

export type ProfileMentorSnapshot = {
  countryLabel: string | null;
  majorLabel: string | null;
  gpaLabel: string | null;
};

/** True if we should show the optional profile snapshot prompt (at least one signal). */
export function profileHasMentorSignals(row: {
  citizenship_status_label?: string | null;
  country_code?: string | null;
  field_of_study?: string | null;
  field_of_study_label?: string | null;
  gpa?: number | string | null;
}): boolean {
  return buildProfileMentorSnapshot(row) !== null;
}

export function buildProfileMentorSnapshot(row: {
  citizenship_status_label?: string | null;
  country_code?: string | null;
  field_of_study?: string | null;
  field_of_study_label?: string | null;
  gpa?: number | string | null;
}): ProfileMentorSnapshot | null {
  const country =
    row.citizenship_status_label?.trim() ||
    (row.country_code?.trim()
      ? row.country_code.trim().toUpperCase()
      : null) ||
    null;
  const major =
    row.field_of_study_label?.trim() || row.field_of_study?.trim() || null;
  let gpaLabel: string | null = null;
  if (row.gpa != null && String(row.gpa).trim() !== '') {
    gpaLabel = String(row.gpa).trim();
  }
  if (!country && !major && !gpaLabel) return null;
  return { countryLabel: country, majorLabel: major, gpaLabel };
}

export function buildProfileFollowUpMessage(snapshot: ProfileMentorSnapshot): string {
  const parts: string[] = [];
  if (snapshot.countryLabel) parts.push(`from ${snapshot.countryLabel}`);
  if (snapshot.majorLabel) {
    parts.push(`studying ${snapshot.majorLabel}`);
  }
  if (snapshot.gpaLabel) {
    parts.push(`GPA: ${snapshot.gpaLabel}`);
  }
  const middle = parts.join(', ');
  return `I also noticed in your profile that you are ${middle}. Should I keep this background in mind while we brainstorm, or are we focusing on entirely different experiences?`;
}

/**
 * Appended to the base interviewer system prompt once setup is done.
 */
export function buildMentorInterviewContextBlock(args: {
  scholarshipTitle: string | null;
  setupTranscript: string;
}): string {
  const lines: string[] = [
    '',
    '---',
    'Onboarding context (already shown in chat — do not repeat the welcome or re-ask the same setup questions):'
  ];
  if (args.scholarshipTitle?.trim()) {
    lines.push(
      `- The student started from a scholarship detail page for: "${args.scholarshipTitle.trim()}".`
    );
  } else {
    lines.push(
      '- The student opened the mentor from the general /essay flow (no specific grant title in the link).'
    );
  }
  lines.push('Their answers to your setup prompts are summarized below:');
  lines.push(args.setupTranscript.trim() || '(no extra text)');
  lines.push(
    'Begin the themed interview per your main instructions. Move naturally into the Background theme; do not output another meta greeting.'
  );
  return lines.join('\n');
}

export function transcriptForContextBlock(
  rows: Array<{ role: 'user' | 'assistant'; content: string }>
): string {
  return rows
    .map((r) => `${r.role === 'user' ? 'Student' : 'Mentor'}: ${r.content}`)
    .join('\n');
}
