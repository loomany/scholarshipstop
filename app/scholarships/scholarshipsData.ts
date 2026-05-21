import type { ScholarshipCatalogView } from '@/lib/scholarships/scholarshipCatalogTypes';
import {
  deadlineTextAllowsCalendarSemantics,
  isPhantomCalendarYear2001,
  parseScholarshipDeadlineAnchor
} from '@/lib/scholarships/scholarshipDeadlineTrust';

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
  /**
   * True when the row has `apply_url` and/or listing `url`. Kept on redacted payloads so guests
   * still see a locked “Apply now” without exposing the actual href.
   */
  hasOfficialApplicationDestination?: boolean;
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
  /** Linked university row when `institutions` backfill matches `provider_slug`. */
  institutionId?: string | null;
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
  supportEmailRedacted?: boolean;
  supportPhoneRedacted?: boolean;
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
  awardCurrency?: string | null;
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
  applicantCountryCodes?: string[];
  hostCountryCodes?: string[];
  /** Listing view flag: no valid ISO2 host/program country is known. */
  hostProgramLocationUnspecified?: boolean;
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
  /**
   * Personalized match strength (0–100), from listing API or client-side profile scoring
   * when an authenticated user views scholarship cards outside the ranked hub tabs.
   */
  profileMatchPercent?: number | null;
  /**
   * When true, row matches the legacy “International Friendly” SQL predicate
   * (`scholarships.international_friendly_listing`). Omitted on older payloads.
   */
  internationalFriendlyListing?: boolean;
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
 * SEO slug when the public URL uses `/scholarships/{slug}` (not UUID). Matches
 * `content_posts.related_scholarships[].slug` from the article matching pipeline.
 */
export function scholarshipPublicSlugForMatching(
  s: Pick<Scholarship, 'id' | 'slug'>
): string | null {
  const sl = s.slug?.trim();
  if (!sl || UUID_LIKE.test(sl)) return null;
  return sl;
}

function awardLocaleForDisplay(locale?: string): string {
  const l = locale?.trim().toLowerCase();
  if (l === 'es') return 'es-ES';
  if (l === 'fr') return 'fr-FR';
  return 'en-US';
}

function formatAwardIntegerGrouped(raw: string, locale?: string): string {
  const digits = raw.replace(/[,\.\s]/g, '');
  if (!/^\d+$/.test(digits)) return raw;
  const n = Number(digits);
  if (!Number.isFinite(n)) return raw;
  return n.toLocaleString(awardLocaleForDisplay(locale));
}

function formatAwardThousandsGrouped(text: string, locale?: string): string {
  return text.replace(
    /(^|[^\w.])(\d{1,3}(?:,\d{3})+|\d{4,})(?![\w.])/g,
    (_match, prefix: string, amount: string) =>
      `${prefix}${formatAwardIntegerGrouped(amount, locale)}`
  );
}

/**
 * Shows a leading $ for plain numeric catalog amounts (e.g. "2500" → "$2,500" en-US).
 */
export function formatScholarshipAwardDisplay(
  raw: string | null | undefined,
  locale?: string
): string {
  const t = raw?.trim() ?? '';
  if (!t || t === '—') return t;
  const rangeMatch = t.match(/^(\d[\d,.\s]*)\s*[-–]\s*(\d[\d,.\s]*)$/);
  if (rangeMatch) {
    return `$${formatAwardIntegerGrouped(rangeMatch[1], locale)} – $${formatAwardIntegerGrouped(rangeMatch[2], locale)}`;
  }
  if (/^\d[\d,.\s]*$/.test(t)) return `$${formatAwardIntegerGrouped(t, locale)}`;
  if (
    /\b(full\s+tuition|full\s+ride|non[-\s]?monetary|amount\s+varies|varies|see\s+(the\s+)?(site|page|listing))\b/i.test(
      t
    )
  ) {
    return formatAwardThousandsGrouped(t, locale);
  }
  return formatAwardThousandsGrouped(t, locale);
}

/** Listing cards: max visible characters for text awards (Full Ride, Amount Varies, …). */
export const SCHOLARSHIP_CARD_AWARD_TEXT_MAX_LEN = 25;

/**
 * Card award line: prefer source display text, then numeric sort as a fallback only.
 * `awardAmountNumericSort` powers sorting/filtering and may not preserve source currency.
 * Truncates long text; use `lineTitle` for full string when truncated.
 */
export function resolveScholarshipCardAwardDisplay(
  s: Scholarship,
  locale?: string
): {
  line: string;
  isPlaceholder: boolean;
  lineTitle?: string;
  isNumeric: boolean;
} {
  const raw = (s.amount ?? s.awardAmount)?.trim() ?? '';
  if (raw && raw !== '—') {
    const formatted = formatScholarshipAwardDisplay(raw, locale).trim();
    if (!formatted) {
      return {
        line: 'Amount Varies',
        isPlaceholder: true,
        isNumeric: false
      };
    }
    if (formatted.length <= SCHOLARSHIP_CARD_AWARD_TEXT_MAX_LEN) {
      return {
        line: formatted,
        isPlaceholder: false,
        isNumeric: false
      };
    }
    return {
      line: `${formatted.slice(0, SCHOLARSHIP_CARD_AWARD_TEXT_MAX_LEN)}…`,
      isPlaceholder: false,
      lineTitle: formatted,
      isNumeric: false
    };
  }
  const n = s.awardAmountNumericSort;
  if (n != null && Number.isFinite(n) && n > 0) {
    const rounded = Math.round(n);
    const grouped = formatAwardIntegerGrouped(String(rounded), locale);
    return {
      line: formatScholarshipAwardDisplay(grouped, locale),
      isPlaceholder: false,
      isNumeric: true
    };
  }
  return {
    line: 'Amount Varies',
    isPlaceholder: true,
    isNumeric: false
  };
}

function formatDeadlineDateOnly(d: Date): string {
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

function stripDeadlineTimeText(text: string): string {
  return text
    .replace(/T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?$/i, '')
    .replace(
      /\s*(?:at\s*)?\b\d{1,2}:\d{2}\s*(?:AM|PM)?\s*(?:UTC|GMT|ET|EST|EDT|PT|PST|PDT)?\b/gi,
      ''
    )
    .replace(/\s*[•,]\s*$/, '')
    .trim();
}

function rawDeadlineDisplayParts(text: string): {
  primary: string;
  secondary: string | null;
} {
  const cleaned = stripDeadlineTimeText(text).replace(/\s+/g, ' ').trim();
  const annual = /\bannual(?:ly)?\b/i.test(cleaned);
  const monthLookup: Record<string, string> = {
    jan: 'Jan',
    january: 'Jan',
    feb: 'Feb',
    february: 'Feb',
    mar: 'Mar',
    march: 'Mar',
    apr: 'Apr',
    april: 'Apr',
    may: 'May',
    jun: 'Jun',
    june: 'Jun',
    jul: 'Jul',
    july: 'Jul',
    aug: 'Aug',
    august: 'Aug',
    sep: 'Sep',
    sept: 'Sep',
    september: 'Sep',
    oct: 'Oct',
    october: 'Oct',
    nov: 'Nov',
    november: 'Nov',
    dec: 'Dec',
    december: 'Dec'
  };
  const dayFirst = cleaned.match(
    /\b(?:before|by|due(?:\s+date)?|deadline)?\s*(\d{1,2})(?:st|nd|rd|th)?\s*([A-Za-z]{3,9})\b/i
  );
  const monthFirst = cleaned.match(
    /\b([A-Za-z]{3,9})\s*(\d{1,2})(?:st|nd|rd|th)?\b/i
  );
  const match = dayFirst
    ? { day: dayFirst[1], month: dayFirst[2] }
    : monthFirst
      ? { day: monthFirst[2], month: monthFirst[1] }
      : null;
  const month = match ? monthLookup[match.month.toLowerCase()] : null;
  if (month && match) {
    return {
      primary: `${month} ${Number(match.day)}`,
      secondary: annual ? 'Annual deadline' : null
    };
  }
  return {
    primary: cleaned
      .replace(/\s*\((?:annual|annually)\)\s*/gi, ' ')
      .replace(/\bannual(?:ly)?\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim(),
    secondary: annual ? 'Annual deadline' : null
  };
}

/** Supabase maps `deadline_date` → `deadlineAt` with a synthetic UTC clock when time is unknown. */
export function isScholarshipDeadlineDateOnlyIso(iso: string | undefined): boolean {
  const t = iso?.trim();
  return Boolean(
    t?.endsWith('T12:00:00.000Z') || t?.endsWith('T23:59:59.999Z')
  );
}

export type ScholarshipDeadlineFields = Pick<Scholarship, 'deadline' | 'deadlineAt'>;

function scholarshipDeadlineAnchorDate(s: ScholarshipDeadlineFields): Date | null {
  return parseScholarshipDeadlineAnchor(s.deadlineAt, s.deadline);
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

/**
 * Calendar date line: "May 14, 2026". Deadline times are intentionally hidden
 * across the product because most catalog rows only provide date-level precision.
 */
export function formatScholarshipDeadlineAbsoluteLine(
  s: ScholarshipDeadlineFields
): string | null {
  const d = scholarshipDeadlineAnchorDate(s);
  if (!d) return null;
  return formatDeadlineDateOnly(d);
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
export function getScholarshipDeadlineDisplayParts(s: ScholarshipDeadlineFields): {
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
  if (raw && raw !== '—') {
    return rawDeadlineDisplayParts(raw);
  }
  return { primary: '—', secondary: null };
}

/** Full deadline line for card tooltip; uses `deadlineAt` when parseable, else raw `deadline`. */
export function formatDeadlineTooltipText(s: Scholarship): string {
  const rawLine = s.deadline?.trim();
  if (
    rawLine &&
    rawLine !== '—' &&
    !deadlineTextAllowsCalendarSemantics(rawLine)
  ) {
    return stripDeadlineTimeText(rawLine);
  }
  const iso = s.deadlineAt?.trim();
  if (iso) {
    const d = new Date(iso);
    if (
      !Number.isNaN(d.getTime()) &&
      !isPhantomCalendarYear2001(iso, s.deadline)
    ) {
      const weekday = d.toLocaleDateString('en-US', {
        weekday: 'long',
        timeZone: 'UTC'
      });
      const month = d.toLocaleDateString('en-US', {
        month: 'long',
        timeZone: 'UTC'
      });
      const day = d.getUTCDate();
      const year = d.getUTCFullYear();
      return `${weekday} ${month} ${day}, ${year}`;
    }
  }
  const raw = s.deadline?.trim();
  if (raw && raw !== '—') return stripDeadlineTimeText(raw);
  return 'Deadline details will be added when available.';
}

