import {
  formatScholarshipAwardDisplay,
  type Scholarship
} from '@/app/scholarships/scholarshipsData';
import { parseScholarshipDeadlineAnchor } from '@/lib/scholarships/scholarshipDeadlineTrust';
import { formatScholarshipDeadlineCompactDate } from '@/lib/scholarships/scholarshipDeadlineCompactDate';

function joinListNatural(items: string[]): string {
  const x = items.filter(Boolean);
  if (x.length === 0) return '';
  if (x.length === 1) return x[0];
  if (x.length === 2) return `${x[0]} and ${x[1]}`;
  return `${x.slice(0, -1).join(', ')}, and ${x[x.length - 1]}`;
}

function formatDeadlinePhrase(s: Scholarship): string | null {
  const anchor = parseScholarshipDeadlineAnchor(s.deadlineAt, s.deadline);
  if (anchor) {
    return `The catalog deadline is ${formatScholarshipDeadlineCompactDate(anchor, 'en')}.`;
  }
  const raw = s.deadline?.trim();
  if (raw && raw !== '—') {
    return `The catalog deadline is listed as ${raw}.`;
  }
  return null;
}

function stableIntroVariant(s: Scholarship): number {
  const seed = `${s.id}|${s.slug ?? ''}|${s.title}`;
  let total = 0;
  for (let i = 0; i < seed.length; i += 1) {
    total = (total + seed.charCodeAt(i) * (i + 3)) % 9973;
  }
  return total % 8;
}

function buildAudienceFragment(s: Scholarship): string {
  const it = s.institutionTypes?.filter(Boolean) ?? [];
  const instText = s.institutionsText?.trim();
  const st = s.stateTerritoryText?.trim();
  const scope = s.locationScope?.toLowerCase().trim() ?? '';

  if (it.length > 0) {
    return ` for students attending ${joinListNatural(it)}`;
  }
  if (instText && instText.length <= 160) {
    return ` for applicants connected to ${instText.replace(/\.\s*$/, '')}`;
  }
  if (st && st.length <= 120) {
    return ` where eligibility references ${st.replace(/\.\s*$/, '')}`;
  }
  if (scope === 'national') {
    return ' for students comparing nationwide U.S. opportunities';
  }
  if (scope === 'international') {
    return ' for applicants who need to confirm international eligibility';
  }
  if (scope === 'state' && (s.stateCodes?.length ?? 0) > 0) {
    return ` for applicants with a connection to ${joinListNatural(s.stateCodes ?? [])}`;
  }

  const levels = s.catalogUi?.study_levels_display ?? s.studyLevels ?? [];
  const fields = s.catalogUi?.field_of_study_display ?? s.fieldOfStudy ?? [];
  if (fields.length > 0) {
    return ` for ${joinListNatural(fields.slice(0, 2))} students`;
  }
  if (levels.length > 0) {
    return ` for ${joinListNatural(levels.slice(0, 2))} applicants`;
  }
  return ' for students checking fit, timing, and required materials';
}

/** One or two natural sentences under H1: what / who / award / deadline. */
export function buildScholarshipIntroParagraph(s: Scholarship): string | null {
  const provider = s.provider?.trim();
  const amount = (s.amount || s.awardAmount)?.trim();
  const it = s.institutionTypes?.filter(Boolean) ?? [];
  const instText = s.institutionsText?.trim();
  const st = s.stateTerritoryText?.trim();
  const scope = s.locationScope?.toLowerCase().trim() ?? '';

  let audience = '';
  if (it.length > 0) {
    audience = ` It references students attending ${joinListNatural(it)}.`;
  } else if (instText && instText.length <= 160) {
    audience = ` It typically applies to ${instText.replace(/\.\s*$/, '')}.`;
  } else if (st && st.length <= 120) {
    audience = ` The source describes eligibility as '${st.replace(/\.\s*$/, '')}'.`;
  } else if (scope === 'national') {
    audience = ' It is open nationwide in the United States.';
  } else if (scope === 'international') {
    audience = ' It may include international applicants—confirm on the official page.';
  } else if (scope === 'state' && (s.stateCodes?.length ?? 0) > 0) {
    const codes = s.stateCodes ?? [];
    audience = ` It emphasizes applicants with a connection to ${codes.join(', ')}.`;
  }

  let lead: string;
  if (provider) {
    lead = `${provider} is listed as the scholarship source.${audience}`;
  } else {
    lead = `This scholarship listing is organized for student planning.${audience}`;
  }

  const title = s.title?.trim() || 'This scholarship';
  const detailAudience = buildAudienceFragment(s);
  const providerPhrase = provider ? ` from ${provider}` : '';
  const leads = [
    `${title} is organized on ScholarshipTop as a funding opportunity${providerPhrase}${detailAudience}.`,
    `For ${title}, start with the source, deadline, award, and eligibility signals${providerPhrase}${detailAudience}.`,
    `${provider ? `${provider} is the listed source for ${title}` : `${title} is a structured scholarship listing`}${detailAudience}.`,
    `Use this ${title} profile to compare application fit${providerPhrase}${detailAudience}.`,
    `${title} gives students one place to review award context, timing, and requirements${providerPhrase}${detailAudience}.`,
    `This listing turns the available ${title} facts into a planning view${providerPhrase}${detailAudience}.`,
    `Students shortlisting ${title} can compare provider context, eligibility, and materials${providerPhrase}${detailAudience}.`,
    `${title} is best reviewed as a source-verified planning record${providerPhrase}${detailAudience}.`
  ];
  lead = leads[stableIntroVariant(s)] ?? leads[0]!;

  const dl = formatDeadlinePhrase(s);
  const parts: string[] = [];
  if (amount) {
    parts.push(
      `The listed award is ${formatScholarshipAwardDisplay(amount).replace(/\.\s*$/, '')}.`
    );
  }
  if (dl) {
    parts.push(dl.endsWith('.') ? dl : `${dl}.`);
  }

  if (parts.length === 0) {
    return lead.replace(/\s+/g, ' ').trim();
  }
  const tail =
    parts.length === 1
      ? ` ${parts[0]}`
      : ` ${parts[0]} ${parts[1].replace(/^\s+/, '')}`;
  return `${lead}${tail}`.replace(/\s+/g, ' ').trim();
}

/** Single location line for Quick facts; avoids "National · national". */
export function formatQuickFactsLocation(
  stateTerritoryText: string | undefined,
  locationScope: string | undefined,
  stateCodes: string[]
): string | null {
  const st = stateTerritoryText?.trim() ?? '';
  const sc = locationScope?.toLowerCase().trim() ?? '';
  const codes = stateCodes.filter(Boolean);

  const isShortNationalLabel =
    /^national$/i.test(st) ||
    /^nationwide$/i.test(st) ||
    /^u\.s\.a?\.?$/i.test(st);

  if (sc === 'national') {
    if (!st || isShortNationalLabel) return 'National';
    if (/\bnational\b|\bnationwide\b|\bunited states\b|\bu\.s\.\b/i.test(st)) {
      return st.length <= 72 ? st : 'National';
    }
    return st;
  }

  if (st) return st;
  if (sc === 'international') return 'International';
  if (sc === 'state' && codes.length) return codes.join(', ');
  return null;
}

/** Prefer normalized `institution_types`; else free-text institutions line. */
export function institutionsQuickFactValue(s: Scholarship): string | null {
  const it = s.institutionTypes?.filter(Boolean) ?? [];
  if (it.length) return it.join(', ');
  const t = s.institutionsText?.trim();
  return t || null;
}

function normalizeWs(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** One narrative block when payment_details and winner_payment overlap. */
export function pickSinglePaymentNarrative(
  paymentDetails: string,
  winnerPayment: string
): string | null {
  const a = paymentDetails.trim();
  const b = winnerPayment.trim();
  if (!a) return b || null;
  if (!b) return a;
  const na = normalizeWs(a);
  const nb = normalizeWs(b);
  if (na === nb) return a;
  if (na.includes(nb)) return a;
  if (nb.includes(na)) return b;
  return a;
}

const _BOILERPLATE_RES: RegExp[] = [
  /^(eligibility )?requirements\s*:?\s*$/i,
  /^requirements\s*$/i,
  /^requirement\s*$/i,
  /^note:?\s*/i,
  /^your application is\b/i,
  /^as part of your application\b/i,
  /^the following (documents|materials) (are )?required\b/i,
  /^please (direct )?any questions\b/i,
  /^required\s*documents?\s*:?\s*$/i,
  /^supporting\s*documents?\s*:?\s*$/i
];

function stripCellNoise(line: string): string {
  return line
    .replace(/^\|+\s*|\s*\|+$/g, '')
    .replace(/^\s*[\-*•]+\s*/, '')
    .trim();
}

function lineLooksLikeDocOnly(line: string, docs: string[]): boolean {
  const low = line.toLowerCase();
  if (docs.length === 0) return false;
  if (line.length > 220) return false;
  const docish =
    /\b(upload|submit|provide|attach|include)\b.*\b(transcript|recommendation|essay|fafsa|resume|cv|photo|headshot|document|pdf)\b/i.test(
      line
    ) || /\bofficial transcript\b/i.test(low);
  if (!docish) return false;
  const hasTranscript = docs.some((d) => /transcript|academic record/i.test(d));
  const hasRec = docs.some((d) => /recommendation/i.test(d));
  const hasEssay = docs.some((d) => /essay|statement/i.test(d));
  if (hasTranscript && /transcript|grade report|academic record/i.test(low))
    return true;
  if (hasRec && /recommendation|reference letter/i.test(low)) return true;
  if (hasEssay && /\bessay\b|personal statement/i.test(low)) return true;
  return false;
}

/** Standalone document checklist items → keep in Required documents only. */
function isStandaloneDocumentTitle(line: string, docs: string[]): boolean {
  const t = stripCellNoise(line).replace(/\s+/g, ' ').trim();
  if (t.length > 140) return false;
  const low = t.toLowerCase().replace(/\.$/, '');
  const hasTranscript = docs.some((d) => /transcript|academic record/i.test(d));
  const hasRec = docs.some((d) => /recommendation/i.test(d));
  const hasEssay = docs.some((d) => /essay|written statement/i.test(d));
  const hasFafsa = docs.some((d) => /fafsa|financial aid doc/i.test(d));
  const hasResume = docs.some((d) => /résumé|resume|cv/i.test(d));
  if (
    hasTranscript &&
    /^(official )?transcript(s)?( or (academic )?record)?$/i.test(low)
  )
    return true;
  if (hasRec && /^(letter of )?recommendation(s)?( letter)?$/i.test(low))
    return true;
  if (hasEssay && /^personal statement$/i.test(low)) return true;
  if (hasEssay && /^essay(s)?( or written statement)?$/i.test(low)) return true;
  if (hasFafsa && /^(the )?fafsa$/i.test(low)) return true;
  if (hasResume && /^(résumé|resume|cv|curriculum vitae)$/i.test(low))
    return true;
  if (
    docs.length > 0 &&
    /^(pdf|jpeg|png)\s*(upload|file)?$/i.test(low)
  )
    return true;
  return false;
}

function isTranscriptMetadataLine(raw: string): boolean {
  const line = stripCellNoise(raw);
  if (line.length > 100) return false;
  const low = line.toLowerCase();
  if (
    /^(student\s*)?name\s*:?\s*$/i.test(line) ||
    /^student\s+name\b/i.test(line)
  )
    return true;
  if (/^school\s*name\s*:?\s*$/i.test(line) || /^school\s+name\b/i.test(line))
    return true;
  if (
    /^(current\s+)?grades?\s*:?\s*$/i.test(low) ||
    (/^grades?\b/i.test(low) &&
      line.length < 48 &&
      !/\b(must|should|will|are|need)\b/i.test(low))
  )
    return true;
  if (
    /^credit\s+hours?\s*:?\s*$/i.test(low) ||
    (/^number\s+of\s+credits?\b/i.test(low) && line.length < 56) ||
    (/^course\s+credits?\b/i.test(low) && line.length < 56)
  )
    return true;
  if (/^cumulative\s+gpa\b/i.test(low) || /^gpa\s*:?\s*$/i.test(low))
    return true;
  if (/^class\s*rank\b/i.test(low)) return true;
  return false;
}

function transcriptFieldLabelsFromGroup(group: string[]): string[] {
  const order: string[] = [];
  const seen = new Set<string>();
  const add = (display: string) => {
    const k = display.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    order.push(display);
  };
  for (const raw of group) {
    const plain = stripCellNoise(raw);
    const low = plain.toLowerCase();
    if (/student\s+name/i.test(low) || /^student\s*name\b/i.test(plain))
      add('student name');
    else if (/school\s*name/i.test(low)) add('school name');
    else if (/\bgrades?\b/i.test(low) && !/transcript/i.test(low))
      add('grades');
    else if (
      /credit\s+hours?/i.test(low) ||
      /\bnumber\s+of\s+credits?\b/i.test(low) ||
      (/^credits?\b/i.test(plain) && plain.length < 36)
    )
      add('course credit hours');
    else if (/gpa|class\s*rank/i.test(low)) add('GPA or class rank');
  }
  return order;
}

function shouldDropProseOrContactLine(line: string): boolean {
  const t = stripCellNoise(line);
  const low = t.toLowerCase();
  if (t.length < 3) return true;
  if (/^no exceptions\.?$/i.test(t.trim())) return true;
  if (low === 'no exceptions' || low === 'no exception') return true;
  if (/\bmust be completed by (a )?(physician|doctor|medical)/i.test(t))
    return true;
  if (/^for (more )?information\b/i.test(low)) return true;
  if (/^(questions?|inquiries)\b.*\b(contact|call|email)\b/i.test(low))
    return true;
  if (/^(call|email|contact)\s+(us|the|our)\b/i.test(low)) return true;
  if (/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(t) && t.length < 160)
    return true;
  if (/\S+@\S+\.\S+/.test(t)) return true;
  if (/^if you have (any )?questions\b/i.test(low)) return true;
  if (/^visit\s+(our|the)\s+website\b/i.test(low) && t.length < 100)
    return true;
  return false;
}

function lightlyCleanRuleLine(line: string): string {
  let t = stripCellNoise(line).replace(/\s+/g, ' ').trim();
  t = t.replace(/^[•\-*]\s+/, '');
  if (t.length > 280) {
    const cut = t.slice(0, 277).trim();
    const last = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '));
    t = last > 80 ? cut.slice(0, last + 1).trim() + '…' : cut + '…';
  }
  if (t && !/[.!?]$/.test(t)) t += '.';
  const low = t.toLowerCase();
  if (low.startsWith('must ')) {
    t = t.charAt(0).toUpperCase() + t.slice(1);
  } else if (!/^(you |applicants? |students? |all )/i.test(t)) {
    t = t.charAt(0).toUpperCase() + t.slice(1);
  }
  return t;
}

function dedupeLinesCaseInsensitive(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const k = line.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(line);
  }
  return out;
}

function filterKeyRequirementLinesRaw(
  lines: string[],
  opts: { documents: string[]; supportEmail?: string | null }
): string[] {
  const email = opts.supportEmail?.trim().toLowerCase();
  const out: string[] = [];
  for (let line of lines) {
    const t = stripCellNoise(line);
    if (t.length < 4) continue;
    if (_BOILERPLATE_RES.some((re) => re.test(t))) continue;
    const low = t.toLowerCase();
    if (email && low.includes(email)) continue;
    if (/^contact\s+/i.test(t) && /@/.test(t)) continue;
    if (lineLooksLikeDocOnly(t, opts.documents)) continue;
    if (isStandaloneDocumentTitle(t, opts.documents)) continue;
    out.push(t);
  }
  return out;
}

function consolidateTranscriptAndRules(
  lines: string[],
  docs: string[]
): string[] {
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    if (isTranscriptMetadataLine(lines[i])) {
      const group: string[] = [];
      while (i < lines.length && isTranscriptMetadataLine(lines[i])) {
        group.push(lines[i]);
        i++;
      }
      const labels = transcriptFieldLabelsFromGroup(group);
      if (labels.length > 0) {
        result.push(
          `Official transcript must include ${joinListNatural(labels)}.`
        );
      }
      continue;
    }

    const line = lines[i];
    i++;
    if (shouldDropProseOrContactLine(line)) continue;
    if (isStandaloneDocumentTitle(line, docs)) continue;
    const low = stripCellNoise(line).toLowerCase();
    if (
      /\bno exceptions\b/i.test(low) &&
      stripCellNoise(line).length < 50
    ) {
      continue;
    }
    const cleaned = lightlyCleanRuleLine(line);
    if (
      cleaned.length < 8 ||
      /^note:?\s/i.test(cleaned) ||
      shouldDropProseOrContactLine(cleaned)
    ) {
      continue;
    }
    result.push(cleaned);
  }

  return dedupeLinesCaseInsensitive(result);
}

/**
 * Turn raw requirement lines into concise rule bullets (not source fragments).
 * Call from the detail page for the Key requirements block only.
 */
export function prepareKeyRequirementBullets(
  lines: string[],
  opts: { documents: string[]; supportEmail?: string | null }
): string[] {
  const pass1 = filterKeyRequirementLinesRaw(lines, opts);
  return consolidateTranscriptAndRules(pass1, opts.documents);
}
