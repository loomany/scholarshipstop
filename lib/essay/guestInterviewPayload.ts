import { MESSAGE_ID_UUID_RE, type EssayChatMessageRow } from '@/lib/essay/essayChatMessages';

export const MAX_GUEST_INTERVIEW_MESSAGES = 120;
export const MAX_GUEST_USER_MESSAGE_CHARS = 12_000;

/**
 * Validates the client-provided interview transcript for unauthenticated `/api/interviewer/guest*` routes.
 */
export function normalizeGuestInterviewMessages(
  raw: unknown
): EssayChatMessageRow[] | null {
  if (
    !Array.isArray(raw) ||
    raw.length === 0 ||
    raw.length > MAX_GUEST_INTERVIEW_MESSAGES
  ) {
    return null;
  }
  const out: EssayChatMessageRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const m = item as Record<string, unknown>;
    if (m.role !== 'user' && m.role !== 'assistant') return null;
    const content = typeof m.content === 'string' ? m.content : '';
    const id = typeof m.id === 'string' ? m.id : '';
    if (!content.trim() || !MESSAGE_ID_UUID_RE.test(id)) return null;
    out.push({
      id,
      role: m.role,
      content,
      at: typeof m.at === 'string' ? m.at : undefined
    });
  }
  return out;
}
