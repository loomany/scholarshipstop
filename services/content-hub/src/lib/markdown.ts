export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function countCharsNoSpaces(text: string): number {
  return text.replace(/\s+/g, "").length;
}
