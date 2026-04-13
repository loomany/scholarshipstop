/** Tag line appended to `grinder_notes` for smart-merge after Humanize entire draft. */
export const FULL_DRAFT_HUMANIZE_TAG = '[Full draft humanize]';

export const FULL_DRAFT_HUMANIZE_GRINDER_LINE = `${FULL_DRAFT_HUMANIZE_TAG} Full text rewritten via Undetectable.AI (Humanize entire draft).`;

export function essayRowHasFullDraftHumanize(
  grinderNotes: string | null | undefined
): boolean {
  return Boolean(grinderNotes?.includes(FULL_DRAFT_HUMANIZE_TAG));
}
