function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function collectText(value: unknown, depth = 0): string[] {
  if (depth > 4 || value == null) return [];
  if (typeof value === 'string') return [stripHtml(value)];
  if (typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectText(item, depth + 1));
  }
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap((item) =>
      collectText(item, depth + 1)
    );
  }
  return [];
}

export function visibleTextFromUnknown(...values: unknown[]): string {
  return values.flatMap((value) => collectText(value)).join(' ').trim();
}

export function countVisibleWords(...values: unknown[]): number {
  const text = visibleTextFromUnknown(...values);
  const matches = text.match(
    /[A-Za-z0-9À-ÖØ-öø-ÿ]+(?:['’-][A-Za-z0-9À-ÖØ-öø-ÿ]+)*/g
  );
  return matches ? matches.length : 0;
}

export function hasRawPlaceholderText(...values: unknown[]): boolean {
  const text = visibleTextFromUnknown(...values);
  const lower = text.toLowerCase();
  return (
    lower.includes('$' + 'undefined') ||
    lower.includes('undefined placeholder') ||
    lower.includes('lorem ipsum') ||
    lower.includes('todo:')
  );
}
