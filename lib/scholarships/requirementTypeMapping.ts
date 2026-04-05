const REQUIREMENT_TYPE_TO_DB_COLUMN: Record<string, string | null> = {
  essay: 'essay_required',
  document: 'document_required',
  photo: 'photo_required',
  video: 'video_required',
  personal_statement: 'goal_required',
  link: 'link_required',
  survey: 'survey_required',
  question: 'question_required',
  recommendation: 'recommendation_required',
  transcript: 'transcript_required',
  /** No structured DB column exists for resume requirements. */
  resume: null
};

export function requirementTypeToDbColumn(requirementType: string): string | null {
  return REQUIREMENT_TYPE_TO_DB_COLUMN[requirementType] ?? null;
}

export function requirementTypesToDbColumns(requirementTypes: Iterable<string>): string[] {
  const seen = new Set<string>();
  for (const requirementType of requirementTypes) {
    const column = requirementTypeToDbColumn(requirementType);
    if (!column) continue;
    seen.add(column);
  }
  return Array.from(seen);
}

