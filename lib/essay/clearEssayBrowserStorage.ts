import { LEGACY_ESSAY_HUMANIZE_MODEL_STORAGE_KEY } from '@/lib/essay/undetectableHumanizeModels';

/**
 * Клиентское хранилище эссе:
 * - sessionStorage `essay_*` — кэш GPTZero, pending-строка, режим превью на странице результата.
 * - localStorage `essay_*` — в т.ч. привязка чата интервью (`essay_interviewer_chat:…`), последняя модель humanize (`essay_undetectable_humanize_model`).
 *
 * Supabase не трогаем. Новый диалог в UI опроса — отдельно от кэша результата.
 */

export function clearEssaySessionStorageCaches(): void {
  if (typeof window === 'undefined') return;
  try {
    for (const k of Object.keys(sessionStorage)) {
      if (k.startsWith('essay_')) sessionStorage.removeItem(k);
    }
  } catch {
    /* quota / private mode */
  }
}

/** Сброс привязки чата опроса (как «Новый диалог», но без запроса к API). */
export function clearEssayInterviewChatStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('essay_interviewer_chat:')) localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}

/** Все ключи `essay_*` в sessionStorage и localStorage — полный клиентский сброс под тесты. */
export function clearEssayBrowserStorage(): void {
  clearEssaySessionStorageCaches();
  if (typeof window === 'undefined') return;
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('essay_')) localStorage.removeItem(k);
    }
    localStorage.removeItem(LEGACY_ESSAY_HUMANIZE_MODEL_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
