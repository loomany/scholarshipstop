/**
 * Normalizes model ids from env (e.g. accidental `gpt-gpt-4o-mini` → `gpt-4o-mini`).
 */
export function normalizeOpenAiModelId(raw: string): string {
  let m = raw.trim();
  while (m.startsWith('gpt-gpt-')) {
    m = m.slice(4);
  }
  return m;
}

/**
 * First non-empty candidate wins; then normalize. Falls back to `defaultModel`.
 */
export function resolveOpenAiModel(
  defaultModel: string,
  ...candidates: (string | undefined | null)[]
): string {
  const pick = candidates.find((c) => c != null && String(c).trim() !== '');
  return normalizeOpenAiModelId(pick != null ? String(pick) : defaultModel);
}
