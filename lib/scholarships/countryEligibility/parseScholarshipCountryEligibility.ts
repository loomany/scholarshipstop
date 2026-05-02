import type { Json } from '@/types_db';
import {
  countryCodesFromText,
  normalizeCountryCode,
  sanitizeCountryCodes
} from './countries';

export type ScholarshipCountryEligibilityInput = {
  title?: string | null;
  providerName?: string | null;
  source?: string | null;
  stateTerritoryText?: string | null;
  eligibilityText?: string | null;
  requirementsText?: string | null;
  description?: string | null;
  summaryShort?: string | null;
  summaryLong?: string | null;
  rawData?: Json | null;
};

export type ScholarshipCountryEligibility = {
  applicantCountryCodes: string[];
  hostCountryCodes: string[];
  reasons: string[];
};

function compactText(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => part?.trim() ?? '')
    .filter(Boolean)
    .join(' | ');
}

function normalizeCountryBlob(raw: string): string {
  return raw.replace(/\\n/g, '\n').replace(/\\r/g, '\n');
}

function textFromJson(value: Json | null | undefined): string | null {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return null;
  const out: string[] = [];
  const visit = (item: unknown) => {
    if (typeof item === 'string') {
      const s = item.trim();
      if (s) out.push(s);
      return;
    }
    if (!item || typeof item !== 'object') return;
    if (Array.isArray(item)) {
      for (const child of item) visit(child);
      return;
    }
    for (const child of Object.values(item)) visit(child);
  };
  visit(value);
  return out.length > 0 ? out.join('\n') : null;
}

function rawLocationTexts(value: Json | null | undefined): string[] {
  if (!value || typeof value !== 'object') return [];
  const out: string[] = [];
  const visit = (item: unknown) => {
    if (!item || typeof item !== 'object') return;
    if (Array.isArray(item)) {
      for (const child of item) visit(child);
      return;
    }
    for (const [key, child] of Object.entries(item)) {
      if (
        typeof child === 'string' &&
        /^(?:location_text|location|host_country|host_countries)$/i.test(key)
      ) {
        const value = child.trim();
        if (value) out.push(value);
      }
      visit(child);
    }
  };
  visit(value);
  return [...new Set(out)];
}

function extractIefaField(label: string, blob: string): string | null {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = blob.match(new RegExp(`${escaped}:\\s*([^|\\n]+)`, 'i'));
  return match?.[1]?.trim().replace(/\s+/g, ' ') || null;
}

function cleanCountryPhrase(raw: string): string {
  return raw
    .replace(
      /\b(?:target\s+group|host\s+institution(?:\(s\))?|field\s+of\s+study|scholarship\s+value|eligibility|candidates?|number\s+of\s+awards)\s*:.*$/i,
      ''
    )
    .trim();
}

function addDelimitedCountryCodes(
  target: Set<string>,
  raw: string | null,
  opts?: { maxDelimitedParts?: number }
): void {
  if (!raw) return;
  const cleaned = cleanCountryPhrase(raw);
  if (!cleaned || /^unrestricted$/i.test(cleaned)) return;
  const parts = cleaned
    .split(/,|\band\b|\/|;/i)
    .map((part) => part.trim())
    .filter(Boolean);
  if (opts?.maxDelimitedParts && parts.length > opts.maxDelimitedParts) return;
  for (const part of parts) {
    const code = normalizeCountryCode(part);
    if (code) target.add(code);
  }
  for (const code of countryCodesFromText(cleaned)) target.add(code);
}

function applicantCodesFromStrongPhrases(blob: string): string[] {
  const out = new Set<string>();
  const phrasePatterns = [
    /\btarget\s+group\s*:\s*([^\n.;|]+)/gi,
    /\bnationality\s*:\s*([^\n.;|]+)/gi,
    /\b(?:citizens?|nationals?|residents?)\s+of\s+([^\n.;|]+)/gi,
    /\bmust\s+be\s+(?:a\s+)?(?:citizen|national|resident)\s+of\s+([^\n.;|]+)/gi,
    /\bopen\s+to\s+(?:students\s+)?from\s+([^\n.;|]+)/gi
  ];

  if (
    /\b(?:resident|residents|residency)\s+of\s+(?:the\s+)?u\.?s\.?\b/i.test(blob) ||
    /\b(?:u\.?s\.?|united\s+states)\s+(?:citizens?|nationals?|residents?)\b/i.test(blob)
  ) {
    out.add('US');
  }

  for (const pattern of phrasePatterns) {
    for (const match of blob.matchAll(pattern)) {
      addDelimitedCountryCodes(out, match[1] ?? null, { maxDelimitedParts: 12 });
    }
  }

  if (
    /\bu\.?s\.?\s+citizens?\b/i.test(blob) ||
    /\bcitizens?\s+of\s+the\s+united\s+states\b/i.test(blob) ||
    /\bpermanent\s+residents?\s+of\s+the\s+united\s+states\b/i.test(blob)
  ) {
    out.add('US');
  }

  return [...out].sort();
}

function hostCodesFromStrongPhrases(blob: string): string[] {
  const out = new Set<string>();
  const hostPatterns = [
    /\bHost countries \(IEFA\):\s*([^|;\n]+)/gi,
    /\bstudy\s+in\s*:?\s*([^\n.;|]+)/gi,
    /\bhost\s+(?:country|countries)\s*:?\s*([^\n.;|]+)/gi,
    /\bhost\s+institution(?:\(s\))?\s*:?\s*([^\n.;|]+)/gi
  ];

  if (
    /\b(?:study|studying|host(?:ed)?|located)\s+in\s+(?:the\s+)?u\.?s\.?\b/i.test(blob) ||
    /\b(?:study|studying|host(?:ed)?|located)\s+in\s+(?:the\s+)?united\s+states\b/i.test(blob)
  ) {
    out.add('US');
  }

  for (const pattern of hostPatterns) {
    for (const match of blob.matchAll(pattern)) {
      addDelimitedCountryCodes(out, match[1] ?? null);
    }
  }

  return [...out].sort();
}

function hostCodesFromRawLocations(rawData: Json | null | undefined): string[] {
  const out = new Set<string>();
  for (const locationText of rawLocationTexts(rawData)) {
    addDelimitedCountryCodes(out, locationText);
  }
  return [...out].sort();
}

export function parseScholarshipCountryEligibility(
  input: ScholarshipCountryEligibilityInput
): ScholarshipCountryEligibility {
  const applicant = new Set<string>();
  const host = new Set<string>();
  const reasons: string[] = [];
  const blob = normalizeCountryBlob(compactText([
    input.title,
    input.providerName,
    input.stateTerritoryText,
    input.eligibilityText,
    input.requirementsText,
    input.summaryShort,
    input.summaryLong,
    input.description,
    textFromJson(input.rawData)
  ]));

  const iefaNationality = extractIefaField('Nationality (IEFA)', blob);
  const iefaHost = extractIefaField('Host countries (IEFA)', blob);
  if (iefaNationality) {
    const before = applicant.size;
    addDelimitedCountryCodes(applicant, iefaNationality);
    if (applicant.size > before) reasons.push('IEFA nationality');
  }
  if (iefaHost) {
    const before = host.size;
    addDelimitedCountryCodes(host, iefaHost);
    if (host.size > before) reasons.push('IEFA host countries');
  }

  const phraseApplicants = applicantCodesFromStrongPhrases(blob);
  for (const code of phraseApplicants) applicant.add(code);
  if (phraseApplicants.length > 0) reasons.push('applicant country text');

  const phraseHosts = hostCodesFromStrongPhrases(blob);
  for (const code of phraseHosts) host.add(code);
  if (phraseHosts.length > 0) reasons.push('host country text');

  const rawLocationHosts = hostCodesFromRawLocations(input.rawData);
  for (const code of rawLocationHosts) host.add(code);
  if (rawLocationHosts.length > 0) reasons.push('raw location text');

  if (
    applicant.size === 0 &&
    /\b(?:international|foreign)\s+students?\b/i.test(blob)
  ) {
    reasons.push('international student text without specific country');
  }

  return {
    applicantCountryCodes: sanitizeCountryCodes(applicant),
    hostCountryCodes: sanitizeCountryCodes(host),
    reasons: [...new Set(reasons)]
  };
}
