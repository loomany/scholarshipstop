import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import { sanitizeRequirementLines } from '@/lib/scholarships/scholarshipText';

export const SIMPLER_GRANTS_GOV_SOURCE = 'simpler_grants_gov' as const;

export function isSimplerGrantsGovScholarship(s: Scholarship): boolean {
  return (s.source ?? '').trim() === SIMPLER_GRANTS_GOV_SOURCE;
}

/** Phrases/lines to strip from scraped Simpler.Grants.gov text (USWDS / .gov chrome). */
const GOV_BOILERPLATE_LINE_PATTERNS: RegExp[] = [
  /^skip to main content\.?$/i,
  /^menu$/i,
  /^close$/i,
  /^an official website of the united states government\.?$/i,
  /^here'?s how you know\.?$/i,
  /^official websites use \.gov\.?$/i,
  /^secure \.gov websites use https\.?$/i,
  /^a \.gov website belongs to an official government organization in the united states\.?$/i
];

const GOV_BOILERPLATE_SUBSTRINGS = [
  'skip to main content',
  "an official website of the united states government",
  "here's how you know",
  'heres how you know'
];

const REQUIREMENTS_FLUFF_PATTERNS: RegExp[] = [
  /\bsee the official page for full details\.?/gi,
  /\bcheck the official application for the final list\.?/gi,
  /\bsee the official listing\.?/gi,
  /\brefer to the official opportunity page\.?/gi,
  /\bconfirm on the official page\.?/gi
];

/**
 * Client-side cleanup for display (DB may still hold raw text).
 * Mirrors Python `strip_us_gov_boilerplate` / requirements fluff removal.
 */
export function cleanSimplerGrantsGovBoilerplate(text: string): string {
  if (!text?.trim()) return '';
  const lines = text.replace(/\r/g, '').split('\n');
  const kept: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    let drop = false;
    for (const re of GOV_BOILERPLATE_LINE_PATTERNS) {
      if (re.test(t)) {
        drop = true;
        break;
      }
    }
    if (drop) continue;
    const tl = t.toLowerCase();
    if (GOV_BOILERPLATE_SUBSTRINGS.some((s) => tl.includes(s))) continue;
    kept.push(t);
  }
  let out = kept.join(' ');
  for (const s of GOV_BOILERPLATE_SUBSTRINGS) {
    const re = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    out = out.replace(re, ' ');
  }
  return out.replace(/\s+/g, ' ').trim();
}

export function stripSimplerRequirementsFluff(text: string): string {
  let t = text;
  for (const re of REQUIREMENTS_FLUFF_PATTERNS) {
    t = t.replace(re, ' ');
  }
  return t.replace(/\s+/g, ' ').trim();
}

/** True if cleaned text is too short or only punctuation/spacer chars. */
export function isSimplerGrantsGovOverviewJunk(text: string): boolean {
  const t = cleanSimplerGrantsGovBoilerplate(text);
  if (t.length < 24) return true;
  const letters = (t.match(/[a-z]/gi) ?? []).length;
  return letters < 12;
}

/** Summary for Overview: cleaned description only (no generic SA intro). */
export function simplerGrantsGovOverviewText(s: Scholarship): string {
  const raw = (s.description ?? '').trim();
  const cleaned = cleanSimplerGrantsGovBoilerplate(raw);
  return stripSimplerRequirementsFluff(cleaned);
}

/**
 * Under H1: only listing-backed text (synopsis). No generic “helps cover tuition” copy.
 */
export function simplerGrantsGovIntroParagraph(s: Scholarship): string | null {
  const overview = simplerGrantsGovOverviewText(s);
  if (!overview || isSimplerGrantsGovOverviewJunk(overview)) {
    const aw = (s.awardsText ?? '').trim();
    const a = cleanSimplerGrantsGovBoilerplate(aw);
    if (a.length >= 40 && !isSimplerGrantsGovOverviewJunk(a)) {
      return a.length > 320 ? `${a.slice(0, 317).trim()}…` : a;
    }
    return null;
  }
  const oneLine = overview.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= 560) return oneLine;
  const cut = oneLine.slice(0, 557).trim();
  const lastDot = cut.lastIndexOf('. ');
  const snippet =
    lastDot > 200 ? `${cut.slice(0, lastDot + 1).trim()}` : `${cut}…`;
  return snippet;
}

export function simplerGrantsGovRequirementsLines(s: Scholarship): string[] {
  const raw =
    (s.requirementsTextClean ?? s.requirementsText ?? '').trim() || undefined;
  if (!raw) return [];
  const cleaned = stripSimplerRequirementsFluff(
    cleanSimplerGrantsGovBoilerplate(raw)
  );
  return sanitizeRequirementLines(cleaned || undefined);
}

export function simplerGrantsGovOfficialLabel(): string {
  return 'Simpler.Grants.gov';
}
