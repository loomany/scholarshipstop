export function countWords(text) {
    return text
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
}
export function countCharsNoSpaces(text) {
    return text.replace(/\s+/g, "").length;
}
