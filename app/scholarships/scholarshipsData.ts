import type { ScholarshipCatalogView } from '@/lib/scholarships/scholarshipCatalogTypes';

/** Parsed from `scholarships.raw_data.catalog_ui` for human-readable catalog UI. */
export type ScholarshipCatalogUi = {
  study_levels_display?: string[];
  field_of_study_display?: string[];
  scholarship_status_display?: string | null;
};

export type ScholarshipSeoFaqItem = { question: string; answer: string };
export type ScholarshipDocumentLink = { title?: string | null; url: string };

export type Scholarship = {
  premiumFieldsRedacted?: boolean;
  seoTags?: string[];
  id: string;
  title: string;
  country: string;
  deadline: string;
  description: string;
  eligibility: string[];
  benefits: string;
  howToApply: string[];
  applyLink?: string;
  /** When present, shown in the “Who can apply” section; otherwise copy is derived or fallback. */
  whoCanApply?: string[];
  /** Optional listing fields (may be absent in current JSON). */
  provider?: string;
  /** Official provider site (Supabase `provider_url`). */
  providerUrl?: string;
  amount?: string;
  awardAmount?: string;
  applicantCount?: number;
  verified?: boolean;
  recurring?: boolean;
  /** ISO datetime for list tooltip; optional until API provides it. */
  deadlineAt?: string;
  /** Overrides the grey requirements line under the title on list cards. */
  listRequirementsSummary?: string;
  /** e.g. "Credibility 99%" — competitor-style trust badge. */
  credibilityLabel?: string;
  /** Featured / star marker on the card corner. */
  featured?: boolean;
  /** Detail page: how winners receive funds (optional). */
  winnerPayment?: string;
  /** Detail page: provider logo URL (optional). */
  providerLogo?: string;
  /** Detail page: short provider mission (optional). */
  providerMission?: string;
  /** Detail page: social profile URLs (optional). */
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
  /** Listing filter: category ids, e.g. "arts", "stem". Uncategorized → treat as miscellaneous when filtering. */
  categories?: string[];
  /** Supabase `category_slug` — канонический slug для страниц категорий и похожих грантов. */
  categorySlug?: string | null;
  /** External catalog source (Supabase `source`). */
  source?: string | null;
  /** Canonical listing URL in the upstream catalog (Supabase `url`). */
  listingUrl?: string | null;
  /** ISO timestamp from Supabase `updated_at`. */
  updatedAt?: string | null;
  /** ISO timestamp from Supabase `created_at` (sort: most recent). */
  createdAt?: string | null;
  /** Catalog: Open / Closed (Supabase `status_text`). */
  statusText?: string | null;
  /** Eligible institution types line from source. */
  institutionsText?: string | null;
  /** State / territory eligibility line. */
  stateTerritoryText?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  /** Full Eligibility section from source page. */
  eligibilityText?: string | null;
  /** Full Awards section. */
  awardsText?: string | null;
  /** Full Notification section. */
  notificationText?: string | null;
  /** Full Selection of Recipients section. */
  selectionCriteriaText?: string | null;
  /** Rich HTML fragments (sanitized on render); prefer over plain text when set. */
  descriptionHtml?: string | null;
  eligibilityHtml?: string | null;
  awardsHtml?: string | null;
  notificationHtml?: string | null;
  paymentHtml?: string | null;
  requirementsHtml?: string | null;
  selectionCriteriaHtml?: string | null;
  /** Full main column HTML from source (fallback archive). */
  fullContentHtml?: string | null;
  /** Supabase `requirements_count` when set (stat card / summary). */
  requirementsCount?: number | null;
  /** Public URL slug when set (SEO path). */
  slug?: string | null;
  providerSlug?: string | null;
  scholarshipStatus?: string | null;
  daysUntilDeadline?: number | null;
  deadlineBucket?: string | null;
  awardAmountNumericSort?: number | null;
  payoutMethod?: string | null;
  credibilityScore?: number | null;
  credibilityBucket?: string | null;
  rankingScore?: number | null;
  requirementTypes?: string[];
  requirementSignalsCount?: number | null;
  summaryShort?: string | null;
  summaryLong?: string | null;
  whoCanApplyText?: string | null;
  notificationDetails?: string | null;
  paymentDetails?: string | null;
  documentsRequired?: string[];
  documentUrls?: ScholarshipDocumentLink[];
  requirementsTextClean?: string | null;
  officialSourceName?: string | null;
  lastVerifiedAt?: string | null;
  isIndexable?: boolean;
  /** Human labels from `raw_data.catalog_ui` when present; slugs stay in `studyLevels` / `fieldOfStudy` / `scholarshipStatus`. */
  catalogUi?: ScholarshipCatalogUi;
  studyLevels?: string[];
  fieldOfStudy?: string[];
  citizenshipStatuses?: string[];
  locationScope?: string | null;
  stateCodes?: string[];
  institutionTypes?: string[];
  numberOfAwards?: number | null;
  essayRequired?: boolean;
  documentRequired?: boolean;
  photoRequired?: boolean;
  videoRequired?: boolean;
  linkRequired?: boolean;
  surveyRequired?: boolean;
  questionRequired?: boolean;
  goalRequired?: boolean;
  specialEligibilityRequired?: boolean;
  transcriptRequired?: boolean;
  recommendationRequired?: boolean;
  financialNeedConsidered?: boolean;
  /** AI finalization + SEO (unified catalog layer; optional until backfilled). */
  seoFaq?: ScholarshipSeoFaqItem[];
  aiStudentSummary?: string | null;
  aiBestFor?: string[];
  aiKeyHighlights?: string[];
  aiEligibilitySummary?: string[];
  aiImportantChecks?: string[];
  aiApplicationTips?: string[];
  aiWhyApply?: string[];
  aiRedFlags?: string[];
  aiMissingInfo?: string[];
  aiUrgencyLevel?: string | null;
  aiDifficultyLevel?: string | null;
  aiMatchScore?: number | null;
  aiMatchBand?: string | null;
  aiScoreExplanation?: string | null;
  aiConfidenceScore?: number | null;
  seoExcerpt?: string | null;
  seoOverview?: string | null;
  seoEligibility?: string | null;
  seoApplication?: string | null;
  /** Derived catalog signals for filters, chips, and category inference. */
  scholarshipCatalog?: ScholarshipCatalogView;
  /** When true, `applicantCount` may be an estimate from the source. */
  applicantsCountIsEstimated?: boolean;
  /** Server-side personalized match (listing only). */
  matchScore?: number;
  matchReasons?: string[];
};

/** Quick facts / copy: prefer `catalog_ui`, else legacy columns (may be slug-like). */
export function scholarshipStatusDisplay(
  s: Pick<
    Scholarship,
    'catalogUi' | 'statusText' | 'scholarshipStatus'
  >
): string | null {
  const d = s.catalogUi?.scholarship_status_display?.trim();
  if (d) return d;
  return s.statusText?.trim() || s.scholarshipStatus?.trim() || null;
}

export function studyLevelsDisplayList(
  s: Pick<Scholarship, 'catalogUi' | 'studyLevels'>
): string[] {
  const fromUi = s.catalogUi?.study_levels_display
    ?.map((x) => x.trim())
    .filter((x) => x.length > 0);
  if (fromUi && fromUi.length > 0) return fromUi;
  return s.studyLevels?.filter(Boolean) ?? [];
}

export function fieldOfStudyDisplayList(
  s: Pick<Scholarship, 'catalogUi' | 'fieldOfStudy'>
): string[] {
  const fromUi = s.catalogUi?.field_of_study_display
    ?.map((x) => x.trim())
    .filter((x) => x.length > 0);
  if (fromUi && fromUi.length > 0) return fromUi;
  return s.fieldOfStudy?.filter(Boolean) ?? [];
}

const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Prefer SEO slug in links; fall back to id (UUID). */
export function scholarshipPublicPath(
  s: Pick<Scholarship, 'id' | 'slug'>
): string {
  const sl = s.slug?.trim();
  if (sl && !UUID_LIKE.test(sl)) {
    return `/scholarships/${encodeURIComponent(sl)}`;
  }
  return `/scholarships/${s.id}`;
}

/**
 * Shows a leading $ for plain numeric catalog amounts (e.g. "2,500").
 * Leaves text that already has a currency symbol or non-cash phrases unchanged.
 */
export function formatScholarshipAwardDisplay(
  raw: string | null | undefined
): string {
  const t = raw?.trim() ?? '';
  if (!t || t === '—') return t;
  if (/[\$€£¥]/.test(t)) return t;
  if (
    /\b(usd|eur|gbp|full\s+tuition|full\s+ride|non[-\s]?monetary|amount\s+varies|varies|see\s+(the\s+)?(site|page|listing))\b/i.test(
      t
    )
  ) {
    return t;
  }
  const rangeMatch = t.match(/^(\d[\d,]*)\s*[-–]\s*(\d[\d,]*)$/);
  if (rangeMatch) {
    return `$${rangeMatch[1]} – $${rangeMatch[2]}`;
  }
  if (/^\d[\d,]*$/.test(t)) return `$${t}`;
  return t;
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Supabase maps `deadline_date` → `deadlineAt` with fixed noon UTC when time unknown. */
export function isScholarshipDeadlineDateOnlyIso(iso: string | undefined): boolean {
  const t = iso?.trim();
  return Boolean(t?.endsWith('T12:00:00.000Z'));
}

function scholarshipDeadlineAnchorDate(s: Scholarship): Date | null {
  const iso = s.deadlineAt?.trim();
  if (iso) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const raw = s.deadline?.trim();
  if (raw && raw !== '—') {
    const ts = Date.parse(raw);
    if (!Number.isNaN(ts)) return new Date(ts);
  }
  return null;
}

/** Pulls a time fragment from listing `deadline` text (e.g. "11:59 PM UTC"); does not invent times. */
export function parseTimeFragmentFromDeadlineText(
  text: string | null | undefined
): string | null {
  if (!text?.trim()) return null;
  const t = text.trim();
  const ampm = t.match(
    /\b(\d{1,2}):(\d{2})\s*(AM|PM)\b(?:\s*(UTC|GMT|ET|EST|PT|PST|EDT|PDT))?/i
  );
  if (ampm) {
    const tz = ampm[4] ? ` ${ampm[4].toUpperCase()}` : ' UTC';
    return `${ampm[1]}:${ampm[2]} ${ampm[3].toUpperCase()}${tz}`;
  }
  const m24 = t.match(/\b(\d{1,2}):(\d{2})\s*(UTC|GMT)\b/i);
  if (m24) {
    return `${m24[1]}:${m24[2]} ${m24[3].toUpperCase()}`;
  }
  return null;
}

function formatUtcClockFromDate(d: Date): string {
  let h = d.getUTCHours();
  const mi = d.getUTCMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${pad2(mi)} ${ampm} UTC`;
}

/**
 * Calendar date line: "May 14, 2026", optionally with time from `deadlineAt` (real UTC) or parsed from `deadline` text.
 */
export function formatScholarshipDeadlineAbsoluteLine(s: Scholarship): string | null {
  const d = scholarshipDeadlineAnchorDate(s);
  if (!d) return null;
  const datePart = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const timeFromText = parseTimeFragmentFromDeadlineText(s.deadline);
  if (timeFromText) {
    return `${datePart} • ${timeFromText}`;
  }
  const iso = s.deadlineAt?.trim();
  if (iso && isScholarshipDeadlineDateOnlyIso(iso)) {
    return datePart;
  }
  if (iso) {
    return `${datePart}, ${formatUtcClockFromDate(d)}`;
  }
  return datePart;
}

function formatDaysLeftSubtitle(d: Date): string {
  const diffMs = d.getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / 86400000);
  if (diffDays > 1) return `${diffDays} days left`;
  if (diffDays === 1) return '1 day left';
  if (diffDays === 0) return 'today';
  if (diffDays < 0) return 'deadline passed';
  return '';
}

/** Legacy relative primary: "in 44 days" — used only when no parseable calendar date. */
export function formatScholarshipDeadlineRelativePrimary(d: Date): string {
  const diffMs = d.getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / 86400000);
  if (diffDays > 1) return `in ${diffDays} days`;
  if (diffDays === 1) return 'in 1 day';
  if (diffDays === 0) return 'today';
  if (diffDays < 0) return 'deadline passed';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Hero / card: main line = absolute date when known; subtitle = "X days left".
 * If no calendar date, main line stays relative (in X days) and subtitle is null.
 */
export function getScholarshipDeadlineDisplayParts(s: Scholarship): {
  primary: string;
  secondary: string | null;
} {
  const abs = formatScholarshipDeadlineAbsoluteLine(s);
  const anchor = scholarshipDeadlineAnchorDate(s);
  const relSub = anchor != null ? formatDaysLeftSubtitle(anchor) : null;
  if (abs) {
    return { primary: abs, secondary: relSub || null };
  }
  if (anchor) {
    return { primary: formatScholarshipDeadlineRelativePrimary(anchor), secondary: null };
  }
  const raw = s.deadline?.trim();
  if (raw && raw !== '—') return { primary: raw, secondary: null };
  return { primary: '—', secondary: null };
}

/** Full deadline line for card tooltip; uses `deadlineAt` when parseable, else raw `deadline`. */
export function formatDeadlineTooltipText(s: Scholarship): string {
  if (s.deadlineAt) {
    const d = new Date(s.deadlineAt);
    if (!Number.isNaN(d.getTime())) {
      const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
      const month = d.toLocaleDateString('en-US', { month: 'long' });
      const day = d.getDate();
      const year = d.getFullYear();
      let h = d.getHours();
      const m = d.getMinutes();
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      if (h === 0) h = 12;
      const time = `${pad2(h)}:${pad2(m)}${ampm}`;
      return `${weekday} ${month} ${day}, ${year}, ${time}`;
    }
  }
  const raw = s.deadline?.trim();
  if (raw && raw !== '—') return raw;
  return 'Deadline details will be added when available.';
}

