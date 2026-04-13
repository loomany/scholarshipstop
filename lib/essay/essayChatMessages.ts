import { randomUUID } from 'crypto';

import type { Json } from '@/types_db';

/** UUID v4 pattern (matches API routes). */
export const MESSAGE_ID_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type EssayChatMessageRow = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  at?: string;
};

export function readEssayChatMessages(raw: Json): {
  messages: EssayChatMessageRow[];
  /** True if any id was generated — caller should persist `messages` to DB. */
  backfilledIds: boolean;
} {
  if (!Array.isArray(raw)) {
    return { messages: [], backfilledIds: false };
  }
  const out: EssayChatMessageRow[] = [];
  let backfilledIds = false;
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    const role = o.role === 'user' || o.role === 'assistant' ? o.role : null;
    const content = typeof o.content === 'string' ? o.content : '';
    if (!role || !content.trim()) continue;
    let id: string;
    if (
      typeof o.id === 'string' &&
      MESSAGE_ID_UUID_RE.test(o.id)
    ) {
      id = o.id;
    } else {
      id = randomUUID();
      backfilledIds = true;
    }
    out.push({
      id,
      role,
      content,
      at: typeof o.at === 'string' ? o.at : undefined
    });
  }
  return { messages: out, backfilledIds };
}

export function newUserMessage(content: string, at: string): EssayChatMessageRow {
  return {
    id: randomUUID(),
    role: 'user',
    content,
    at
  };
}

export function newAssistantMessage(content: string, at: string): EssayChatMessageRow {
  return {
    id: randomUUID(),
    role: 'assistant',
    content,
    at
  };
}
