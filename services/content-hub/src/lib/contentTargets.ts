import { env } from "../config/env.js";

const LIST_BASE_MIN_WORDS = 1100;
const LIST_BASE_MIN_CHARS_NO_SPACES = 6500;
const DEFAULT_COMPACT_MIN_WORDS = 500;
const DEFAULT_COMPACT_MIN_CHARS_NO_SPACES = 2500;
const STRUCTURE_MULTIPLIER = 0.8;

function scaleLength(value: number, floor: number): number {
  return Math.max(floor, Math.round(value * env.CONTENT_HUB_LENGTH_MULTIPLIER));
}

export function getEffectiveMinWords(): number {
  return scaleLength(env.CONTENT_HUB_MIN_WORDS, DEFAULT_COMPACT_MIN_WORDS);
}

export function getEffectiveMinCharsNoSpaces(): number {
  return scaleLength(env.CONTENT_HUB_MIN_CHARS_NO_SPACES, DEFAULT_COMPACT_MIN_CHARS_NO_SPACES);
}

export function getPromptWordRange(): { minWords: number; maxWords: number } {
  const minWords = getEffectiveMinWords();
  return {
    minWords,
    maxWords: Math.max(minWords + 120, Math.round(minWords * 1.25))
  };
}

export function getAggressiveExpansionDeltaWords(): number {
  return Math.max(160, Math.round(getEffectiveMinWords() * 0.3));
}

export function scaleWordsRelativeToCompactList(baseWords: number, floor: number): number {
  return Math.max(floor, Math.round((baseWords / LIST_BASE_MIN_WORDS) * getEffectiveMinWords()));
}

export function scaleCharsRelativeToCompactList(baseChars: number, floor: number): number {
  return Math.max(floor, Math.round((baseChars / LIST_BASE_MIN_CHARS_NO_SPACES) * getEffectiveMinCharsNoSpaces()));
}

export function scaleStructureRequirement(baseValue: number, floor: number): number {
  return Math.max(floor, Math.round(baseValue * STRUCTURE_MULTIPLIER));
}
