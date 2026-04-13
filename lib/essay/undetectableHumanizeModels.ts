/**
 * Undetectable Humanization API model ids (whitelist for server + UI).
 * @see lib/essay/undetectableHumanize.ts
 */
export const UNDETECTABLE_HUMANIZE_MODEL_IDS = ['v2', 'v11', 'v11sr'] as const;

export type UndetectableHumanizeModelId =
  (typeof UNDETECTABLE_HUMANIZE_MODEL_IDS)[number];

/** Подписи для UI: id по-прежнему шлётся в API (v2 / v11 / v11sr). */
export const UNDETECTABLE_HUMANIZE_MODEL_OPTIONS: ReadonlyArray<{
  id: UndetectableHumanizeModelId;
  title: string;
  description: string;
}> = [
  {
    id: 'v2',
    title: 'Balanced (multilingual)',
    description:
      'Pick this for Spanish or mixed-language essays. General-purpose engine; reasonable default when the text is not English-only.'
  },
  {
    id: 'v11',
    title: 'Stronger for AI checks',
    description:
      'English-only drafts. Often a better shot at passing English AI detectors—not a guarantee; avoid for Spanish-only text.'
  },
  {
    id: 'v11sr',
    title: 'Alternate English style',
    description:
      'English-only drafts. Another rewrite mode—try if you want a different tone; not tuned for Spanish.'
  }
];

export function isUndetectableHumanizeModelId(
  s: string
): s is UndetectableHumanizeModelId {
  return (UNDETECTABLE_HUMANIZE_MODEL_IDS as readonly string[]).includes(s);
}

/** С `essay_` — удаляется вместе с остальным essay-кэшем в `clearEssayBrowserStorage`. */
export const ESSAY_HUMANIZE_MODEL_STORAGE_KEY =
  'essay_undetectable_humanize_model';

/** Старый ключ до унификации с префиксом `essay_`. */
export const LEGACY_ESSAY_HUMANIZE_MODEL_STORAGE_KEY =
  'essay-undetectable-humanize-model';
