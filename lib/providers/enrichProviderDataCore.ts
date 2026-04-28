import OpenAI from 'openai';

import { US_STATE_CODE_TO_NAME } from '@/lib/constants/usStates';
import {
  fetchScholarshipSupplementFactsForProvider,
  PROVIDER_ENRICH_SCHOLARSHIP_SUPPLEMENT_THRESHOLD_CHARS
} from '@/lib/providers/providerScholarshipSupplements';
import { hasConcreteSignal } from '@/lib/providers/postQualityProviderEnrichment';
import { normalizeProviderOfficialUrl } from '@/lib/providers/providerOfficialUrl';

export type ProviderEnrichmentFaqItem = { question: string; answer: string };

export type ProviderEnrichmentResult = {
  description: string | null;
  faq: ProviderEnrichmentFaqItem[];
  sources: string[];
  /** USPS two-letter code when the org is primarily US-state-based; null if unknown / national / non-US. */
  state: string | null;
  /**
   * When true, output passes the same minimum “catalog” gate as bulk scripts (non-empty description).
   * Display sources may be empty when every usable citation would be a competitor-only aggregator.
   */
  postQualityPassed?: boolean;
};

/** Deep visibility for CLI diagnostics only; enrichment behavior unchanged for callers of {@link enrichProviderData}. */
export type ProviderSourceFetchAttempt = {
  url: string;
  fetchAttempted: boolean;
  gotResponse: boolean;
  httpStatus?: number;
  contentType?: string | null;
  /** True only when text is usable for enrichment (not empty, not weak/placeholder). */
  extractedText: boolean;
  textLength: number;
  textPreview500: string;
  error?: string;
};

export type ProviderEnrichmentRunDiagnostics = {
  gate: 'missing_api_key' | 'model_not_allowed' | 'ok';
  /** Effective model env value (trimmed). */
  configuredModelLabel: string;
  /** Pipeline requires exactly this model string to call OpenAI. */
  requiredModel: 'gpt-5.4';
  candidateSourceUrls: string[];
  sourceFetchAttempts: ProviderSourceFetchAttempt[];
  usedSourceUrl: string | null;
  promptMode: 'with_source' | 'without_source';
  rawOpenAiResponse: string | null;
  openAiTransportError: string | null;
  parseSucceeded: boolean;
  parseFailureDetail: string | null;
  /** Same completeness check as `scripts/enrich-all-providers.ts` (non-empty description). */
  passesCatalogCompletenessCheck: boolean;
  completenessGap: string | null;
  /** No post-quality step in this module — always documented here. */
  postQualityNote: 'postQualityNotImplementedInCore';
};

const VALID_US_STATE_CODES = new Set(Object.keys(US_STATE_CODE_TO_NAME));
/** Target token budget for fetched page HTML→text sent to the model (~4 chars per token ≈ UTF-8 Latin). */
const MAX_SOURCE_TOKENS = 1500;
/** ~{@link MAX_SOURCE_TOKENS} tokens in characters — primary cap before assembling prompt (word-safe truncation). */
const MAX_SOURCE_INPUT_CHARS = MAX_SOURCE_TOKENS * 4;
/** Stored org profile copy (page body); meta tags truncate separately in the UI. */
const PROVIDER_ENRICHMENT_DESCRIPTION_MAX_CHARS = 12_000;
const PROVIDER_ENRICHMENT_DESCRIPTION_FILL_MIN_CHARS = 150;

function normalizeEnrichedState(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'string') return null;
  const t = raw.trim().toUpperCase();
  if (
    !t ||
    t === 'NATIONAL' ||
    t === 'NONE' ||
    t === 'NULL' ||
    t === 'UNKNOWN' ||
    t === 'N/A'
  ) {
    return null;
  }
  if (t.length === 2 && VALID_US_STATE_CODES.has(t)) return t;
  return null;
}

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Caps raw fetched text for prompting; trims at a word boundary near the limit (avoids mid-word cuts).
 */
function truncateText(text: string, maxChars = MAX_SOURCE_INPUT_CHARS): string {
  if (!text) return text;
  const t = text.trim();
  if (t.length <= maxChars) return t;
  const slice = t.slice(0, maxChars);
  const lastBoundary = slice.lastIndexOf(' ');
  const cut =
    lastBoundary >= Math.floor(maxChars * 0.88) ? lastBoundary : maxChars;
  return `${slice.slice(0, cut).trimEnd()}…`;
}

function normalizeFaqEntry(raw: unknown): ProviderEnrichmentFaqItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const q =
    (typeof o.q === 'string' && o.q.trim()) ||
    (typeof o.question === 'string' && o.question.trim()) ||
    '';
  const a =
    (typeof o.a === 'string' && o.a.trim()) ||
    (typeof o.answer === 'string' && o.answer.trim()) ||
    '';
  if (!q || !a) return null;
  return { question: q, answer: a };
}

function parseEnrichmentJson(text: string): ProviderEnrichmentResult | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const o = parsed as Record<string, unknown>;

  const descRaw = o.description;
  const description =
    descRaw === null
      ? null
      : typeof descRaw === 'string' && descRaw.trim()
        ? descRaw.trim()
        : null;

  const faqOut: ProviderEnrichmentFaqItem[] = [];
  if (Array.isArray(o.faq)) {
    for (const item of o.faq) {
      const row = normalizeFaqEntry(item);
      if (row) faqOut.push(row);
    }
  }

  const sourcesOut: string[] = [];
  if (Array.isArray(o.sources)) {
    for (const s of o.sources) {
      if (typeof s !== 'string') continue;
      const t = s.trim();
      if (t && isHttpUrl(t)) sourcesOut.push(t);
    }
  }

  const state = normalizeEnrichedState(o.state);

  return {
    description: normalizeProviderDescriptionForSeo(description),
    faq: ensureProviderFaqMinimum(faqOut),
    sources: sourcesOut,
    state
  };
}

function normalizeProviderDescriptionForSeo(input: string | null): string | null {
  if (!input) return null;
  const paras = input
    .trim()
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/[\t\r\f\v]+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  let out = paras.join('\n\n');
  if (out.length > PROVIDER_ENRICHMENT_DESCRIPTION_MAX_CHARS) {
    out = out
      .slice(0, PROVIDER_ENRICHMENT_DESCRIPTION_MAX_CHARS - 1)
      .trimEnd() + '…';
  }
  if (out.length < PROVIDER_ENRICHMENT_DESCRIPTION_FILL_MIN_CHARS) {
    out = `${out} Review current programs, eligibility, and official application details before applying.`;
    out = out.replace(/\s+/g, ' ').trim();
    if (out.length > PROVIDER_ENRICHMENT_DESCRIPTION_MAX_CHARS) {
      out = out
        .slice(0, PROVIDER_ENRICHMENT_DESCRIPTION_MAX_CHARS - 1)
        .trimEnd() + '…';
    }
  }
  return out;
}

function ensureProviderFaqMinimum(
  faq: ProviderEnrichmentFaqItem[]
): ProviderEnrichmentFaqItem[] {
  const cleaned = faq
    .map((f) => ({
      question: f.question.replace(/\s+/g, ' ').trim(),
      answer: f.answer.replace(/\s+/g, ' ').trim()
    }))
    .filter((f) => f.question.length >= 8 && f.answer.length >= 20);
  if (cleaned.length >= 3) return cleaned.slice(0, 5);
  const defaults: ProviderEnrichmentFaqItem[] = [
    {
      question: 'Who is eligible for scholarships from this provider?',
      answer:
        'Eligibility depends on each scholarship. Check official criteria, residency rules, and required documents before applying.'
    },
    {
      question: 'When are application deadlines for this provider?',
      answer:
        'Deadlines vary by program and cycle. Verify each date on the official provider site before final submission.'
    },
    {
      question: 'How should I apply for provider scholarships?',
      answer:
        'Shortlist relevant opportunities, prepare required materials early, and submit through official provider application pages.'
    }
  ];
  return [...cleaned, ...defaults].slice(0, 3);
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function extractReadableTextFromHtml(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<\/(p|div|section|article|main|header|footer|aside|li|ul|ol|h[1-6]|br)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\r/g, ' ')
      .replace(/\t/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ ]{2,}/g, ' ')
  )
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

const REQUIRED_ENRICH_MODEL = 'gpt-5.4' as const;

/** Minimum readable text length before we accept a page as a retrieval source (SPA shells, thin pages). */
export const MIN_SOURCE_TEXT_CHARS = 100;

/** Max outbound links we'll keep for user-visible provider sources (UI shows a short list). */
export const MAX_DISPLAY_SOURCE_URLS = 3;

function normalizedHostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

function urlsCanonicallySame(a: string, b: string): boolean {
  const na = normalizeProviderOfficialUrl(a.trim());
  const nb = normalizeProviderOfficialUrl(b.trim());
  if (!na || !nb) return false;
  return na.replace(/\/$/, '') === nb.replace(/\/$/, '');
}

/** Scholarship aggregators we may fetch for facts but usually hide in UI when a better source exists. */
export function isCompetitorAggregatorHost(hostname: string): boolean {
  const h = hostname.replace(/^www\./i, '').toLowerCase();
  return (
    h === 'bigfuture.collegeboard.org' ||
    h.endsWith('.bigfuture.collegeboard.org') ||
    h === 'scholarships360.org' ||
    h.endsWith('.scholarships360.org') ||
    h === 'bold.org' ||
    h.endsWith('.bold.org') ||
    h === 'fastweb.com' ||
    h.endsWith('.fastweb.com') ||
    h === 'scholarships.com' ||
    h.endsWith('.scholarships.com')
  );
}

/** Domains acceptable as public “trusted” citations (when not suppressed by competitor rules). */
function isTrustedDisplayHost(hostname: string): boolean {
  const h = hostname.replace(/^www\./i, '').toLowerCase();
  return (
    h.endsWith('.edu') ||
    isWikiHostname(h) ||
    isTrustedNeutralHost(h)
  );
}

function isWikiHostname(h: string): boolean {
  return h.endsWith('.wikipedia.org') || h === 'wikipedia.org';
}

function isTrustedNeutralHost(h: string): boolean {
  return (
    h === 'charitynavigator.org' ||
    h.endsWith('.charitynavigator.org') ||
    h === 'guidestar.org' ||
    h.endsWith('.guidestar.org') ||
    h === 'causeiq.com' ||
    h.endsWith('.causeiq.com') ||
    h === 'scholarshipamerica.org' ||
    h.endsWith('.scholarshipamerica.org') ||
    h === 'goingmerry.com' ||
    h.endsWith('.goingmerry.com')
  );
}

/** Hard SPA / error-page signals — treat as weak retrieval text (continue to next URL). */
function hasBlockingPlaceholderFragments(text: string): boolean {
  const t = text.trim();
  const lower = t.toLowerCase();
  if (lower.includes('enable javascript')) return true;
  if (lower.includes('please enable javascript')) return true;
  if (lower.includes('access denied')) return true;

  const shortPage = t.length <= 900;
  if (
    shortPage &&
    (/\bpage not found\b/i.test(t) || /\b404\b/.test(t))
  ) {
    return true;
  }
  if (shortPage && /\bnot\s+found\b/i.test(lower)) return true;

  const compactLine = t.replace(/\s+/g, ' ').trim().toLowerCase();
  const loadingLine =
    /^(loading|please wait|one moment|just a moment|hang tight)([.\s!?…]*)$/i.test(
      compactLine
    ) ||
    (/^(loading|please wait)\b/i.test(compactLine) &&
      compactLine.replace(/[^a-z]/gi, '').length < 18);

  if (loadingLine) return true;
  if (t.length <= 420 && /\bloading\b/i.test(lower)) return true;

  return false;
}

function retrievalLikelinessBoost(hostname: string): number {
  const h = hostname.replace(/^www\./i, '').toLowerCase();

  if (h.endsWith('.edu')) return 520;

  if (isWikiHostname(h)) return 505;

  if (
    isTrustedNeutralHost(h) ||
    h === 'scholarshipamerica.org' ||
    h.endsWith('.scholarshipamerica.org')
  )
    return 492;

  if (
    isCompetitorAggregatorHost(h) ||
    h.endsWith('.collegeboard.org')
  )
    return 468;

  if (h.endsWith('.gov') || h.endsWith('.mil')) return 480;

  return 400;
}

/**
 * Provider name overlap with page text (optional; used only to pick among multiple usable URLs).
 */
export function textLikelyMentionsProvider(providerName: string, text: string): boolean {
  const tl = text.toLowerCase();
  const words = providerName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4);

  for (const w of words) {
    if (tl.includes(w)) return true;
  }

  const parts = providerName.trim().split(/\s+/);
  if (parts.length >= 2) {
    const acr = parts.map((p) => p[0]).join('').toLowerCase();
    if (acr.length >= 3 && tl.includes(acr)) return true;
  }
  return false;
}

function retrievalSourceScore(
  url: string,
  text: string,
  providerName: string,
  officialNormalized: string | null
): number {
  let s = 0;
  const host = normalizedHostname(url);
  if (!host) return -1e9;
  s += retrievalLikelinessBoost(host);

  if (
    officialNormalized &&
    urlsCanonicallySame(url, officialNormalized)
  ) {
    s += 5200;
  }

  if (textLikelyMentionsProvider(providerName, text)) s += 220;
  s += Math.min(text.length, 9000) / 200;
  return s;
}

/**
 * Returns a human-readable reason if HTML-derived text is too thin or looks like a client-side placeholder.
 * Null means the text is an acceptable *retrieval* source.
 */
export function getWeakSourceReason(text: string): string | null {
  const t = text.trim();
  if (t.length === 0) {
    return null;
  }

  if (hasBlockingPlaceholderFragments(t)) {
    return `weak source: blocked placeholder or error text (${t.length} chars)`;
  }

  const compactLine = t.replace(/\s+/g, ' ').trim().toLowerCase();

  const loadingLike =
    /^(loading|please wait|one moment|just a moment|hang tight)([.\s!?…]*)$/i.test(
      compactLine
    ) ||
    (/^(loading|please wait)\b/i.test(compactLine) &&
      compactLine.replace(/[^a-z]/gi, '').length < 18);

  if (t.length < MIN_SOURCE_TEXT_CHARS) {
    if (loadingLike) {
      return `weak source: loading/placeholder (${t.length} chars)`;
    }
    return `weak source: text too short (${t.length} < ${MIN_SOURCE_TEXT_CHARS})`;
  }

  if (t.length < 300 && loadingLike) {
    return 'weak source: loading-style placeholder';
  }

  return null;
}

export type BuildOutputSourcesContext = {
  providerName: string;
  /** Primary org site from provider record (or first-party official URL on file), if any. */
  officialWebsiteUrl: string | null;
  sourceFetchAttempts: ProviderSourceFetchAttempt[];
  /** Raw `sources` array from the model JSON. */
  modelSources: string[];
  /** Retrieval URL whose body text was passed into the prompt. */
  retrievalUrlUsed: string | null;
};

/** User-visible citations only — retrieval may use aggregators we omit here when alternatives exist. */
export function buildProviderDisplaySources(ctx: BuildOutputSourcesContext): string[] {
  const usableAttempts = ctx.sourceFetchAttempts.filter((a) => a.extractedText);
  const officialNorm =
    ctx.officialWebsiteUrl?.trim()
      ? normalizeProviderOfficialUrl(ctx.officialWebsiteUrl.trim())
      : null;

  const pushDedupe = (acc: string[], candidate: string | null | undefined) => {
    const u = typeof candidate === 'string' ? candidate.trim() : '';
    if (!isHttpUrl(u)) return acc;
    const canon = normalizeProviderOfficialUrl(u);
    const fin = canon ?? u;
    if (!acc.some((x) => urlsCanonicallySame(x, fin))) acc.push(fin);
    return acc;
  };

  let wikiCandidate: string | undefined;
  for (const s of ctx.modelSources) {
    const u = typeof s === 'string' ? s.trim() : '';
    if (!isHttpUrl(u)) continue;
    const h = normalizedHostname(u);
    if (h && isWikiHostname(h)) {
      wikiCandidate = normalizeProviderOfficialUrl(u) ?? u;
      break;
    }
  }
  if (!wikiCandidate) {
    const wa = ctx.sourceFetchAttempts.find((a) => {
      const h = normalizedHostname(a.url);
      return h ? isWikiHostname(h) : false;
    });
    wikiCandidate = wa?.url;
  }

  const out: string[] = [];

  if (officialNorm) pushDedupe(out, officialNorm);

  if (wikiCandidate) pushDedupe(out, wikiCandidate);

  let filledTrustedThird = false;
  for (const raw of ctx.modelSources) {
    const s = typeof raw === 'string' ? raw.trim() : '';
    if (!isHttpUrl(s)) continue;
    const canon = normalizeProviderOfficialUrl(s);
    const u = canon ?? s;
    const host = normalizedHostname(u);
    if (!host) continue;

    if (isCompetitorAggregatorHost(host)) continue;

    if (
      officialNorm &&
      urlsCanonicallySame(u, officialNorm)
    )
      continue;
    if (
      wikiCandidate &&
      urlsCanonicallySame(u, wikiCandidate)
    )
      continue;

    if (
      !filledTrustedThird &&
      out.length < MAX_DISPLAY_SOURCE_URLS &&
      isTrustedDisplayHost(host)
    ) {
      filledTrustedThird = true;
      pushDedupe(out, u);
      break;
    }
  }

  if (!filledTrustedThird && out.length < MAX_DISPLAY_SOURCE_URLS) {
    const neutralAttempt = usableAttempts.find((a) => {
      const host = normalizedHostname(a.url);
      return (
        host &&
        !urlsCanonicallySame(a.url, officialNorm ?? '') &&
        !isWikiHostname(host) &&
        isTrustedNeutralHost(host) &&
        !isCompetitorAggregatorHost(host)
      );
    });
    if (neutralAttempt) pushDedupe(out, neutralAttempt.url);
  }

  return filterOutCompetitorAggregatorUrls(out).slice(
    0,
    MAX_DISPLAY_SOURCE_URLS
  );
}

/** Display-only URLs; competitor aggregators are never included (retrieval may still use them). */
export function filterOutCompetitorAggregatorUrls(urls: string[]): string[] {
  return urls.filter((u) => {
    if (!isHttpUrl(u.trim())) return false;
    const h = normalizedHostname(u.trim());
    return h ? !isCompetitorAggregatorHost(h) : false;
  });
}

function pickWikipediaUrlFromContext(
  ctx: BuildOutputSourcesContext
): string | null {
  for (const s of ctx.modelSources) {
    const u = typeof s === 'string' ? s.trim() : '';
    if (!isHttpUrl(u)) continue;
    const h = normalizedHostname(u);
    if (h && isWikiHostname(h)) return u;
  }
  for (const a of ctx.sourceFetchAttempts) {
    const h = normalizedHostname(a.url);
    if (h && isWikiHostname(h)) return a.url;
  }
  return null;
}

/**
 * When higher-priority picks yield nothing, only official / Wikipedia may be added—
 * never competitor aggregators (Bold, BigFuture, etc.) or retrieval fallbacks.
 */
export function finalizeProviderDisplaySources(
  ctx: BuildOutputSourcesContext
): string[] {
  const curated = filterOutCompetitorAggregatorUrls(
    buildProviderDisplaySources(ctx)
  );
  if (curated.length > 0) return curated.slice(0, MAX_DISPLAY_SOURCE_URLS);

  const rescue: string[] = [];
  if (ctx.officialWebsiteUrl?.trim()) {
    const o = normalizeProviderOfficialUrl(ctx.officialWebsiteUrl.trim());
    if (o && isHttpUrl(o)) {
      const h = normalizedHostname(o);
      if (h && !isCompetitorAggregatorHost(h)) rescue.push(o);
    }
  }
  const wikiRaw = pickWikipediaUrlFromContext(ctx);
  if (wikiRaw) {
    const w = normalizeProviderOfficialUrl(wikiRaw) ?? wikiRaw;
    if (isHttpUrl(w) && !rescue.some((u) => urlsCanonicallySame(u, w))) {
      rescue.push(w);
    }
  }

  return filterOutCompetitorAggregatorUrls(rescue).slice(
    0,
    MAX_DISPLAY_SOURCE_URLS
  );
}

async function fetchSourcesWithDiagnostics(
  sourceUrls: string[],
  ctx: { providerName: string; officialNormalized: string | null }
): Promise<{
  attempts: ProviderSourceFetchAttempt[];
  source: { url: string; text: string } | null;
}> {
  const attempts: ProviderSourceFetchAttempt[] = [];
  const usableCandidates: { url: string; text: string; score: number }[] = [];

  for (const raw of sourceUrls) {
    const normalizedUrl = normalizeProviderOfficialUrl(raw);
    if (!normalizedUrl) {
      attempts.push({
        url: String(raw),
        fetchAttempted: false,
        gotResponse: false,
        extractedText: false,
        textLength: 0,
        textPreview500: '',
        error: 'normalizeProviderOfficialUrl returned null'
      });
      continue;
    }

    try {
      const response = await fetch(normalizedUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; ScholarshipTopProviderBot/1.0; +https://scholarshiptop.com)',
          Accept: 'text/html,application/xhtml+xml'
        },
        signal: AbortSignal.timeout(12000)
      });
      const contentType = response.headers.get('content-type');
      const ct = contentType?.toLowerCase() ?? '';
      const html = await response.text();
      const plain = extractReadableTextFromHtml(html);
      const text = plain.slice(0, 12000).trim();
      const okHtml = response.ok && ct.includes('text/html');
      const hasText = Boolean(text);
      const weakReason = hasText ? getWeakSourceReason(text) : null;
      const usable = okHtml && hasText && weakReason === null;
      const preview = plain.slice(0, 500);
      attempts.push({
        url: normalizedUrl,
        fetchAttempted: true,
        gotResponse: true,
        httpStatus: response.status,
        contentType,
        extractedText: usable,
        textLength: text.length,
        textPreview500: preview,
        error: !response.ok
          ? `HTTP ${response.status}`
          : !ct.includes('text/html')
            ? 'content-type is not text/html'
            : !hasText
              ? 'empty after html→text extraction'
              : weakReason ?? undefined
      });
      if (usable) {
        const finalUrl = response.url || normalizedUrl;
        usableCandidates.push({
          url: finalUrl,
          text,
          score: retrievalSourceScore(
            finalUrl,
            text,
            ctx.providerName,
            ctx.officialNormalized
          )
        });
      }
    } catch (e) {
      attempts.push({
        url: normalizedUrl,
        fetchAttempted: true,
        gotResponse: false,
        extractedText: false,
        textLength: 0,
        textPreview500: '',
        error: e instanceof Error ? e.message : String(e)
      });
    }
  }

  usableCandidates.sort(
    (a, b) => b.score - a.score || b.text.length - a.text.length
  );
  const source =
    usableCandidates[0] != null
      ? { url: usableCandidates[0].url, text: usableCandidates[0].text }
      : null;

  return { attempts, source };
}

function describeParseFailure(content: string): string {
  const t = content.trim();
  if (!t) {
    return 'empty or whitespace-only model output';
  }
  try {
    JSON.parse(t);
  } catch (e) {
    return `JSON.parse failed: ${e instanceof Error ? e.message : String(e)}`;
  }
  if (!parseEnrichmentJson(t)) {
    return 'valid JSON but rejected by parseEnrichmentJson (e.g. missing description, non-https sources, bad faq shape)';
  }
  return 'unexpected: parseEnrichmentJson failed after JSON.parse succeeded';
}

async function runProviderEnrichmentEngine(
  providerName: string,
  options?: {
    sourceUrls?: string[];
    officialWebsiteUrl?: string | null;
    /** Used to load extra on-site scholarship facts when the primary fetch is thin (internal only; not user sources). */
    providerSlug?: string | null;
  }
): Promise<{
  result: ProviderEnrichmentResult;
  diagnostics: ProviderEnrichmentRunDiagnostics;
}> {
  const empty: ProviderEnrichmentResult = {
    description: null,
    faq: [],
    sources: [],
    state: null,
    postQualityPassed: false
  };

  const baseDiag = (): ProviderEnrichmentRunDiagnostics => ({
    gate: 'ok',
    configuredModelLabel: '',
    requiredModel: REQUIRED_ENRICH_MODEL,
    candidateSourceUrls: [],
    sourceFetchAttempts: [],
    usedSourceUrl: null,
    promptMode: 'without_source',
    rawOpenAiResponse: null,
    openAiTransportError: null,
    parseSucceeded: false,
    parseFailureDetail: null,
    passesCatalogCompletenessCheck: false,
    completenessGap: null,
    postQualityNote: 'postQualityNotImplementedInCore'
  });

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const configuredRaw =
    process.env.OPENAI_PROVIDER_ENRICH_MODEL?.trim() || '';

  const diagnostics = baseDiag();
  diagnostics.configuredModelLabel = configuredRaw || '(unset)';

  const nameInPrompt = JSON.stringify(providerName);
  const candidateSourceUrls = Array.from(
    new Set(
      (options?.sourceUrls ?? [])
        .map((url) => normalizeProviderOfficialUrl(url))
        .filter(Boolean)
    )
  ) as string[];
  diagnostics.candidateSourceUrls = candidateSourceUrls;

  const officialWebsiteParam = options?.officialWebsiteUrl?.trim() || null;
  const officialNormalized = officialWebsiteParam
    ? normalizeProviderOfficialUrl(officialWebsiteParam)
    : null;

  const { attempts, source } = await fetchSourcesWithDiagnostics(
    candidateSourceUrls,
    {
      providerName,
      officialNormalized
    }
  );
  diagnostics.sourceFetchAttempts = attempts;
  diagnostics.usedSourceUrl = source?.url ?? null;
  diagnostics.promptMode = source ? 'with_source' : 'without_source';

  if (!apiKey) {
    diagnostics.gate = 'missing_api_key';
    diagnostics.completenessGap = 'OPENAI_API_KEY missing';
    return { result: empty, diagnostics };
  }

  if (configuredRaw !== REQUIRED_ENRICH_MODEL) {
    diagnostics.gate = 'model_not_allowed';
    diagnostics.completenessGap = `OPENAI_PROVIDER_ENRICH_MODEL must be exactly "${REQUIRED_ENRICH_MODEL}"; got ${JSON.stringify(configuredRaw || '(unset)')}`;
    return { result: empty, diagnostics };
  }

  diagnostics.gate = 'ok';

  const trimmedSourceText = source?.text ? truncateText(source.text) : '';

  let sourceMaterialForPrompt = trimmedSourceText;
  if (
    source &&
    trimmedSourceText &&
    options?.providerSlug?.trim() &&
    trimmedSourceText.length <
      PROVIDER_ENRICH_SCHOLARSHIP_SUPPLEMENT_THRESHOLD_CHARS
  ) {
    const extra = await fetchScholarshipSupplementFactsForProvider(
      options.providerSlug.trim(),
      { primarySourceText: trimmedSourceText }
    );
    if (extra) {
      sourceMaterialForPrompt = `${trimmedSourceText}\n\n---\nInternal scholarship-record excerpts (same provider; context only—infer facts about the ORGANIZATION: mission, audiences, focus areas. Do not write the description as a brochure for a single grant. Avoid "this scholarship…" / "the award provides…" as the dominant voice; prefer "the organization offers…" / "it supports…". Do not list these rows as public citation URLs.):\n${extra}`;
    }
  }

  const maxSourceChars = 14_000;
  if (sourceMaterialForPrompt.length > maxSourceChars) {
    sourceMaterialForPrompt =
      sourceMaterialForPrompt.slice(0, maxSourceChars - 1).trimEnd() + '…';
  }

  const userPrompt = source
    ? `You are a strict data researcher. Use ONLY the supplied source material from the organization's official website.
Organization: ${nameInPrompt}
Official URL: ${JSON.stringify(source.url)}

Source material:
"""
${sourceMaterialForPrompt}
"""

Rules:
1. DO NOT invent concrete specifics (amounts, dates, names, geographies) that are not in the source material. If the material cannot support a fact, omit it; description may still use careful generalization (see rule 2). If nothing meaningful can be said, return null for description.

FACT REQUIREMENT — If the Source material includes any of: amounts or other numbers (\$, counts), calendar years or dates ("founded", "established", dated programs), geography (state, region, city, territory), named programs/initiatives, or identifiable audiences, you MUST work at least 1–2 of those verifiable specifics into the description (accuracy only).

UNIQUE ANCHOR — The description MUST contain at least one vivid anchor drawn from verified material: (a) a specific program/initiative/scholarship name or line of work; (b) a concrete audience (e.g., first-generation graduates, STEM majors—only if supported); or (c) an explicit geography beyond repeating the organization name alone (city, metro, state/province, country—or that the program is statewide/national-wide if sourced).

FACT & ANTI-GENERIC — It is forbidden to output only bland generalizations with no specificity. ❌ Wrong: generic lines like "supports students pursuing education" or "provides opportunities for learners" with no dollar amounts, years, named programs, geography, audiences, or other concrete anchors from rules above. Prefer null over generic filler when sourcing will not bear facts.

2. Field "description" — authoritative encyclopedia-style portrait of the organization—as if written by editors who know the institution, not as an aggregated recap of whatever appeared online. ORGANIZATION-level only; NOT a scholarship listing. Minimum 180 words; aim for 200–300. Use multiple paragraphs; in JSON you may use \\n\\n between paragraphs. Start naturally with the organization name exactly as given in Organization above, but vary sentence structure—do NOT require a rigid opener such as \\\"X is an organization/foundation that\\\" or similar scaffolding. Prefer varied predicates (provides, serves, operates, supports, invests in…) and optionally lead with \\\"The\\\" plus the formal name when it reads well. Illustrative openings only—adapt, do not copy verbatim: \\\"Eastern Florida State College provides …\\\", \\\"Worcester State University serves …\\\", \\\"The Kankakee Community College Foundation supports ….\\\" Then cover: what the entity is, what it does, whom it supports, and broader context (education, community, impact). Use scholarship/program details only to illustrate what the organization offers; never make the entire description about one award. Voice: direct declarative assertions—state facts plainly (e.g. "Its work centers on…", "The organization prioritizes…", "It serves…"). FORBIDDEN wording (and close paraphrases): "publicly presented", "publicly described", "publicly available", "as reflected", "as shown", "as described", "according to", "the available source", "the page/listing says", or other meta hedges that distance the reader from the fact. FORBIDDEN: naming third-party platforms in running prose (e.g. "through Bold.org"), "this scholarship provides". If internal scholarship-record excerpts appear below, use them only as organizational context—never as the sole subject.

3. Generate 3-4 FAQ pairs based ONLY on this source material. Use the same direct, confident tone; avoid the hedge phrases banned in rule 2.
4. Return an array of the exact URL sources you used. Prefer the official URL above.
5. Identify the primary U.S. state (USPS two-letter code, e.g. "CA") where the organization is headquartered or primarily operates in the United States. If unknown, nationwide, or non-US, set "state" to null.
6. You MUST respond in valid JSON format matching this schema:
{ "description": "...", "faq": [{"q": "..", "a": ".."}], "sources": ["url1", "url2"], "state": "CA" | null }`
    : `You are a strict data researcher. Find factual information about the organization: ${nameInPrompt}.
Rules:
1. DO NOT invent concrete specifics you cannot verify. Use careful generalization where evidence is thin; if nothing meaningful can be said, return null for description.

UNIQUE ANCHOR — Whenever you can responsibly ground them from verifiable cues, description MUST include at least one concrete anchor: a specific program/scholarship line, a named audience, or an explicit region/scale (beyond the org name alone). If you cannot cite any specificity, prefer null rather than bland platitudes.

FACT & ANTI-GENERIC — It is forbidden to output only bland generalizations with no verifiable specificity. ❌ Wrong: "supports students pursuing education" / "provides opportunities for learners" with no geography, numeric detail, institutional role, audiences, programs, or other concrete grounding you can responsibly claim.

2. Field "description" — authoritative encyclopedia-style portrait of the organization (not aggregated recap); NOT a single-scholarship write-up. Minimum 180 words; aim for 200–300. Multiple paragraphs; use \\n\\n in JSON for breaks. Start naturally with the organization name used in Rules, but vary sentence structure—do NOT require a rigid opener such as \\\"X is an organization/foundation that\\\". Illustrative openings only—adapt, do not copy verbatim: \\\"Eastern Florida State College provides …\\\", \\\"Worcester State University serves …\\\", \\\"The Kankakee Community College Foundation supports ….\\\" Cover what it is, what it does, whom it supports, and context (education, community, impact). Voice: direct assertions (e.g. "Its work centers on…" not "Its publicly described work centers on…"; "The organization prioritizes…"). FORBIDDEN: "publicly presented", "publicly described", "publicly available", "as reflected", "as shown", "as described", "according to", "through Bold.org", "this scholarship provides", "the page says", listing-only recap tone.
3. Generate 3-4 FAQ pairs based ONLY on real data. Direct tone; avoid the hedges listed in rule 2.
4. Return an array of the exact URL sources you used.
5. Identify the primary U.S. state (USPS two-letter code, e.g. "CA") where the organization is headquartered or primarily operates in the United States. If the organization is nationwide with no clear primary state, is not US-based, or unknown, set "state" to null.
6. You MUST respond in valid JSON format matching this schema:
{ "description": "...", "faq": [{"q": "..", "a": ".."}], "sources": ["url1", "url2"], "state": "CA" | null }`;

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: REQUIRED_ENRICH_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You output only one JSON object. Use null for unknown description or state. Omit speculation. The "description" must read as an authoritative org profile—not a scraped recap—minimum ~180 words unless truly impossible; when source material mentions amounts, dates, geography, audiences, programs, those facts must surface in prose (without inventing). Descriptions without concrete anchors must be avoided (prefer null). No hedges (publicly presented/described/available, as reflected/shown/described, according to…); no aggregator names in prose. FAQ items grounded in same facts as description. Sources: absolute https URLs only. Field "state": valid USPS code or null.'
        },
        { role: 'user', content: userPrompt }
      ]
    });

    const text = completion.choices[0]?.message?.content?.trim();
    diagnostics.rawOpenAiResponse = text ?? null;
    if (!text) {
      diagnostics.openAiTransportError = 'empty message content from OpenAI';
      diagnostics.completenessGap = diagnostics.openAiTransportError;
      return { result: empty, diagnostics };
    }

    const parsed = parseEnrichmentJson(text);
    diagnostics.parseSucceeded = Boolean(parsed);
    if (!parsed) {
      diagnostics.parseFailureDetail = describeParseFailure(text);
      diagnostics.completenessGap = diagnostics.parseFailureDetail;
      return { result: empty, diagnostics };
    }

    parsed.sources = finalizeProviderDisplaySources({
      providerName,
      officialWebsiteUrl: officialWebsiteParam,
      sourceFetchAttempts: attempts,
      modelSources: parsed.sources,
      retrievalUrlUsed: source?.url ?? null
    });

    const description = parsed.description?.trim() || '';
    const hasBody = Boolean(description);
    const concreteOk = hasBody && hasConcreteSignal(description);

    diagnostics.passesCatalogCompletenessCheck = hasBody && concreteOk;
    if (!hasBody) {
      diagnostics.completenessGap =
        'empty description after parse + SEO normalization (catalog requires non-empty description)';
    } else if (!concreteOk) {
      diagnostics.completenessGap =
        'description failed post-quality: lacks concrete signal (digits, institution/program vocabulary, Title Case tokens, acronym tokens, or long non-stopword tokens)';
    } else {
      diagnostics.completenessGap = null;
    }

    return {
      result: {
        ...parsed,
        postQualityPassed: diagnostics.passesCatalogCompletenessCheck
      },
      diagnostics
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    diagnostics.openAiTransportError = msg;
    diagnostics.completenessGap = msg;
    return { result: empty, diagnostics };
  }
}

/**
 * Calls OpenAI once with a strict JSON schema prompt.
 * Shared by Next.js server code and CLI scripts (no `server-only` here).
 */
export async function enrichProviderData(
  providerName: string,
  options?: {
    sourceUrls?: string[];
    officialWebsiteUrl?: string | null;
    providerSlug?: string | null;
  }
): Promise<ProviderEnrichmentResult> {
  const { result } = await runProviderEnrichmentEngine(providerName, options);
  return result;
}

/**
 * Same OpenAI + fetch path as {@link enrichProviderData}, plus structured diagnostics (CLI / troubleshooting).
 * Same enrichment policy as {@link enrichProviderData}; enriched display `sources` replace raw URLs when applicable.
 */
export async function diagnoseProviderEnrichment(
  providerName: string,
  options?: {
    sourceUrls?: string[];
    officialWebsiteUrl?: string | null;
    providerSlug?: string | null;
  }
): Promise<{
  result: ProviderEnrichmentResult;
  diagnostics: ProviderEnrichmentRunDiagnostics;
}> {
  return runProviderEnrichmentEngine(providerName, options);
}
