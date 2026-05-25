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

function collectRawText(value: unknown, depth = 0): string[] {
  if (depth > 4 || value == null) return [];
  if (typeof value === 'string') return [value];
  if (typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectRawText(item, depth + 1));
  }
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap((item) =>
      collectRawText(item, depth + 1)
    );
  }
  return [];
}

function isWordChar(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    (code >= 0x00c0 && code <= 0x024f) ||
    (code >= 0x0400 && code <= 0x04ff)
  );
}

function countHtmlLikeWordsUpTo(value: string, maxWords: number): number {
  let count = 0;
  let inTag = false;
  let inWord = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === '<') {
      if (inWord) {
        count += 1;
        if (count >= maxWords) return count;
      }
      inWord = false;
      inTag = true;
      continue;
    }
    if (char === '>') {
      inTag = false;
      continue;
    }
    if (inTag) continue;

    if (isWordChar(char)) {
      inWord = true;
      continue;
    }

    if (inWord) {
      count += 1;
      if (count >= maxWords) return count;
      inWord = false;
    }
  }

  if (inWord) count += 1;
  return count;
}

function countRawVisibleWordsUpTo(
  value: unknown,
  maxWords: number,
  depth = 0
): number {
  if (depth > 4 || value == null || maxWords <= 0) return 0;
  if (typeof value === 'string') return countHtmlLikeWordsUpTo(value, maxWords);
  if (typeof value === 'number' || typeof value === 'boolean') return 1;
  if (Array.isArray(value)) {
    let count = 0;
    for (const item of value) {
      count += countRawVisibleWordsUpTo(item, maxWords - count, depth + 1);
      if (count >= maxWords) return count;
    }
    return count;
  }
  if (typeof value === 'object') {
    let count = 0;
    for (const item of Object.values(value as Record<string, unknown>)) {
      count += countRawVisibleWordsUpTo(item, maxWords - count, depth + 1);
      if (count >= maxWords) return count;
    }
    return count;
  }
  return 0;
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

export function countVisibleWordsUpTo(
  maxWords: number,
  ...values: unknown[]
): number {
  let count = 0;
  for (const value of values) {
    count += countRawVisibleWordsUpTo(value, maxWords - count);
    if (count >= maxWords) return count;
  }
  return count;
}

export function hasRawPlaceholderText(...values: unknown[]): boolean {
  const text = values.flatMap((value) => collectRawText(value)).join(' ');
  const lower = text.toLowerCase();
  return (
    lower.includes('$' + 'undefined') ||
    lower.includes('undefined placeholder') ||
    lower.includes('lorem ipsum') ||
    lower.includes('todo:')
  );
}
