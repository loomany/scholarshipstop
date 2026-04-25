import { env } from "../config/env.js";
import type { AnchorSuggestion, GeneratedArticle, ScholarshipLink, SeoBrief } from "./types.js";
import { logger } from "./logger.js";
import { supabase } from "./supabase.js";

type ScholarshipRecord = Record<string, unknown>;

export interface IntentArticleContext {
  title: string;
  slug: string;
  bodyMarkdown: string;
  hints: GeneratedArticle["scholarship_match_hints"];
  seoBrief: SeoBrief;
}

export interface IntentScholarshipMatch {
  anchorText: string;
  intent: string;
  scholarship: Pick<ScholarshipLink, "slug" | "title">;
}

const INTENT_WEIGHTS = {
  degree: 10,
  audience: 8,
  country: 6,
  field: 4,
  keyword: 2
} as const;

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : ""))
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[;,|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length >= 3);
}

function uniqueNormalized(values: string[]): string[] {
  return [...new Set(values.map(normalize).filter(Boolean))];
}

function extractTextCandidates(record: ScholarshipRecord, keys: string[]): string[] {
  return keys.flatMap((key) => {
    const value = record[key];
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
    return [];
  });
}

function pickFirstString(record: ScholarshipRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function parseDeadline(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isActive(record: ScholarshipRecord): boolean {
  const activeCandidates = [record.is_active, record.active, record.status];
  for (const candidate of activeCandidates) {
    if (typeof candidate === "boolean") return candidate;
    if (typeof candidate === "string") {
      const normalized = candidate.trim().toLowerCase();
      if (["active", "published", "live", "true"].includes(normalized)) return true;
      if (["inactive", "archived", "draft", "false"].includes(normalized)) return false;
    }
  }
  return true;
}

function isExpired(record: ScholarshipRecord): boolean {
  const deadline = parseDeadline(record.deadline ?? record.deadline_at ?? record.application_deadline ?? null);
  if (!deadline) return false;
  const endOfDay = new Date(deadline);
  endOfDay.setUTCHours(23, 59, 59, 999);
  return endOfDay.getTime() < Date.now();
}

function isRoutableScholarshipRecord(record: ScholarshipRecord): boolean {
  const slug = pickFirstString(record, ["slug"]);
  const title = pickFirstString(record, ["title", "name"]);
  return Boolean(slug && title) && isActive(record) && !isExpired(record);
}

function buildInternalScholarshipUrl(slug: string): string {
  return new URL(`/scholarships/${slug}`, env.SITE_URL).toString();
}

function buildNeedles(article: GeneratedArticle, seoBrief: SeoBrief): {
  fundingType: string[];
  targetGroups: string[];
  degreeLevels: string[];
  fields: string[];
  countries: string[];
  audience: string[];
  keywordTokens: Set<string>;
} {
  const hints = article.scholarship_match_hints;
  const phrasePool = [
    seoBrief.primary_keyword,
    ...seoBrief.secondary_keywords,
    article.title,
    seoBrief.article_angle,
    ...hints.secondary_keywords
  ];

  const keywordTokens = new Set<string>();
  phrasePool.forEach((phrase) => tokenize(phrase).forEach((token) => keywordTokens.add(token)));

  return {
    fundingType: uniqueNormalized(hints.funding_type),
    targetGroups: uniqueNormalized(hints.target_groups),
    degreeLevels: uniqueNormalized(hints.degree_levels),
    fields: uniqueNormalized(hints.fields),
    countries: uniqueNormalized(hints.countries),
    audience: uniqueNormalized(hints.audience),
    keywordTokens
  };
}

function getFacet(record: ScholarshipRecord, keys: string[]): string[] {
  return uniqueNormalized(
    keys.flatMap((key) => {
      const value = record[key];
      return toArray(value);
    })
  );
}

function hasOverlap(needles: string[], haystack: string[]): boolean {
  return needles.some((needle) => haystack.some((item) => item.includes(needle) || needle.includes(item)));
}

function keywordScore(keywordTokens: Set<string>, record: ScholarshipRecord): number {
  const haystack = extractTextCandidates(record, ["title", "summary", "description", "tags", "keywords", "search_text"])
    .flatMap((value) => tokenize(value));
  const uniqueHaystack = new Set(haystack);
  let matches = 0;
  for (const token of keywordTokens) {
    if (uniqueHaystack.has(token)) matches += 1;
  }
  return matches > 0 ? 2 : 0;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildReason(parts: string[]): string {
  return parts.length > 0 ? `matched by ${parts.join(" + ")}` : "matched by keyword relevance";
}

function scoreScholarship(record: ScholarshipRecord, article: GeneratedArticle, seoBrief: SeoBrief): { score: number; reason: string } {
  const needles = buildNeedles(article, seoBrief);
  const reasons: string[] = [];
  let score = 0;

  if (!isActive(record)) score -= 100;

  const slug = pickFirstString(record, ["slug"]);
  if (!slug) score -= 100;

  const title = pickFirstString(record, ["title", "name"]);
  if (!title) score -= 100;

  if (isExpired(record)) score -= 100;

  const fundingTypes = getFacet(record, ["funding_type", "funding_types", "funding"]);
  if (hasOverlap(needles.fundingType, fundingTypes)) {
    score += 5;
    reasons.push("funding type");
  }

  const targetGroups = getFacet(record, ["target_groups", "target_group", "audience", "eligible_groups"]);
  if (hasOverlap([...needles.targetGroups, ...needles.audience], targetGroups)) {
    score += 5;
    reasons.push("target group");
  }

  const degreeLevels = getFacet(record, ["degree_levels", "degree_level", "levels"]);
  if (hasOverlap(needles.degreeLevels, degreeLevels)) {
    score += 4;
    reasons.push("degree level");
  }

  const fields = getFacet(record, ["fields", "field", "study_fields", "disciplines"]);
  if (hasOverlap(needles.fields, fields)) {
    score += 4;
    reasons.push("field");
  }

  const countries = getFacet(record, ["countries", "country", "eligible_countries", "host_countries"]);
  if (hasOverlap(needles.countries, countries)) {
    score += 3;
    reasons.push("country");
  }

  const kwScore = keywordScore(needles.keywordTokens, record);
  if (kwScore > 0) {
    score += kwScore;
    reasons.push("keywords");
  }

  return { score, reason: buildReason(reasons) };
}

function toScholarshipLink(record: ScholarshipRecord, reason: string): ScholarshipLink | null {
  const slug = pickFirstString(record, ["slug"]);
  const title = pickFirstString(record, ["title", "name"]);
  if (!slug || !title) return null;

  return {
    title,
    slug,
    url: buildInternalScholarshipUrl(slug),
    reason
  };
}

function buildIntentNeedles(intent: string, articleContext: IntentArticleContext): {
  degreeLevels: string[];
  audiences: string[];
  countries: string[];
  fields: string[];
  keywordTokens: Set<string>;
} {
  const intentTokens = tokenize(intent);
  const hints = articleContext.hints;

  const degreeIntentTokens = ["bachelor", "undergraduate", "master", "graduate", "phd", "doctorate"].filter((token) =>
    intentTokens.includes(token)
  );
  const audienceIntentTokens = ["international", "women", "minority", "refugee", "first-generation"].filter((token) =>
    intentTokens.includes(token)
  );

  const keywordTokens = new Set<string>();
  [
    articleContext.title,
    articleContext.bodyMarkdown,
    articleContext.seoBrief.primary_keyword,
    ...articleContext.seoBrief.secondary_keywords,
    ...hints.secondary_keywords,
    intent
  ].forEach((phrase) => tokenize(phrase).forEach((token) => keywordTokens.add(token)));

  return {
    degreeLevels: uniqueNormalized([...hints.degree_levels, ...degreeIntentTokens]),
    audiences: uniqueNormalized([...hints.target_groups, ...hints.audience, ...audienceIntentTokens]),
    countries: uniqueNormalized(hints.countries),
    fields: uniqueNormalized(hints.fields),
    keywordTokens
  };
}

function scoreScholarshipForIntent(record: ScholarshipRecord, intent: string, articleContext: IntentArticleContext): { score: number; reason: string } {
  if (!isRoutableScholarshipRecord(record)) {
    return { score: -999, reason: "not routable scholarship" };
  }

  const needles = buildIntentNeedles(intent, articleContext);
  let score = 0;
  const reasons: string[] = [];

  const degreeLevels = getFacet(record, ["degree_levels", "degree_level", "levels"]);
  if (hasOverlap(needles.degreeLevels, degreeLevels)) {
    score += INTENT_WEIGHTS.degree;
    reasons.push("degree");
  }

  const audiences = getFacet(record, ["target_groups", "target_group", "audience", "eligible_groups"]);
  if (hasOverlap(needles.audiences, audiences)) {
    score += INTENT_WEIGHTS.audience;
    reasons.push("audience");
  }

  const countries = getFacet(record, ["countries", "country", "eligible_countries", "host_countries"]);
  if (hasOverlap(needles.countries, countries)) {
    score += INTENT_WEIGHTS.country;
    reasons.push("country");
  }

  const fields = getFacet(record, ["fields", "field", "study_fields", "disciplines"]);
  if (hasOverlap(needles.fields, fields)) {
    score += INTENT_WEIGHTS.field;
    reasons.push("field");
  }

  const kw = keywordScore(needles.keywordTokens, record);
  if (kw > 0) {
    score += INTENT_WEIGHTS.keyword;
    reasons.push("keywords");
  }

  return { score, reason: buildReason(reasons) };
}

export async function findScholarshipsForIntent(
  intent: string,
  articleContext: IntentArticleContext,
  limit = 2
): Promise<Array<Pick<ScholarshipLink, "slug" | "title">>> {
  const boundedLimit = Math.max(1, Math.min(limit, 2));
  const { data, error } = await supabase.from("scholarships").select("*").limit(400);
  if (error) throw error;

  const selected = ((data ?? []) as ScholarshipRecord[])
    .map((candidate) => {
      const scored = scoreScholarshipForIntent(candidate, intent, articleContext);
      return { candidate, ...scored };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, boundedLimit)
    .map((entry) => toScholarshipLink(entry.candidate, entry.reason))
    .filter((entry): entry is ScholarshipLink => Boolean(entry))
    .map((entry) => ({ slug: entry.slug, title: entry.title }))
    .filter((entry) => Boolean(entry.slug) && Boolean(entry.title));

  logger.info("scholarship matched for intent", {
    articleSlug: articleContext.slug,
    intent,
    selectedScholarshipSlugs: selected.map((item) => item.slug)
  });

  return selected;
}

async function scholarshipSlugExists(slug: string): Promise<boolean> {
  const { data, error } = await supabase.from("scholarships").select("slug").eq("slug", slug).limit(1);
  if (error) throw error;
  return Boolean(data && data.length > 0);
}

function replaceFirstAnchorInParagraph(paragraphHtml: string, anchorText: string, href: string): { updated: string; inserted: boolean } {
  if (/<a\b/i.test(paragraphHtml)) return { updated: paragraphHtml, inserted: false };
  const pattern = new RegExp(`\\b${escapeRegex(anchorText)}\\b`, "i");
  if (!pattern.test(paragraphHtml)) return { updated: paragraphHtml, inserted: false };

  const updated = paragraphHtml.replace(pattern, `<a href="${href}">$&</a>`);
  return { updated, inserted: updated !== paragraphHtml };
}

export async function injectInternalLinks(
  bodyHtml: string,
  anchorSuggestions: AnchorSuggestion[],
  matchedScholarships: IntentScholarshipMatch[],
  maxLinks = env.CONTENT_HUB_MAX_SCHOLARSHIP_LINKS
): Promise<string> {
  if (!bodyHtml.trim()) return bodyHtml;
  if (anchorSuggestions.length === 0 || matchedScholarships.length === 0) return bodyHtml;

  const paragraphs = [...bodyHtml.matchAll(/<p\b[^>]*>[\s\S]*?<\/p>/gi)].map((match) => match[0]);
  if (paragraphs.length === 0) return bodyHtml;

  const boundedMaxLinks = Math.max(1, Math.min(maxLinks, 5));
  const usedAnchors = new Set<string>();
  let insertedCount = 0;
  let updatedHtml = bodyHtml;

  for (const suggestion of anchorSuggestions) {
    if (insertedCount >= boundedMaxLinks) break;
    const anchorNormalized = normalize(suggestion.text);
    logger.info("anchor detected", { anchor: suggestion.text, intent: suggestion.intent });

    if (!anchorNormalized || usedAnchors.has(anchorNormalized)) {
      logger.info("link skipped", { anchor: suggestion.text, reason: "duplicate anchor" });
      continue;
    }

    const matched = matchedScholarships.find((entry) =>
      normalize(entry.anchorText) === anchorNormalized && normalize(entry.intent) === normalize(suggestion.intent)
    );
    if (!matched) {
      logger.info("link skipped", { anchor: suggestion.text, reason: "no scholarship matched for anchor intent" });
      continue;
    }

    if (!matched.scholarship || !matched.scholarship.slug) {
      logger.info("link skipped", { anchor: suggestion.text, reason: "scholarship or slug missing" });
      continue;
    }

    logger.info("scholarship matched", {
      anchor: suggestion.text,
      intent: suggestion.intent,
      scholarshipSlug: matched.scholarship.slug
    });

    const exists = await scholarshipSlugExists(matched.scholarship.slug);
    if (!exists) {
      logger.info("link skipped", { anchor: suggestion.text, reason: "anti-404 check failed (slug missing)" });
      continue;
    }

    let insertedInParagraph = false;
    for (const paragraph of paragraphs) {
      if (insertedCount >= boundedMaxLinks || insertedInParagraph) break;

      const href = buildInternalScholarshipUrl(matched.scholarship.slug);
      const { updated, inserted } = replaceFirstAnchorInParagraph(paragraph, suggestion.text, href);
      if (!inserted) continue;

      updatedHtml = updatedHtml.replace(paragraph, updated);
      insertedInParagraph = true;
      insertedCount += 1;
      usedAnchors.add(anchorNormalized);
      logger.info("link inserted", { anchor: suggestion.text, scholarshipSlug: matched.scholarship.slug, href });
    }

    if (!insertedInParagraph) {
      logger.info("link skipped", { anchor: suggestion.text, reason: "anchor not found in eligible paragraph" });
    }
  }

  return updatedHtml;
}

export async function findRelevantScholarships(article: GeneratedArticle, seoBrief: SeoBrief, limit: number): Promise<ScholarshipLink[]> {
  logger.info("scholarship matching started", { articleSlug: article.slug, limit });

  const { data, error } = await supabase.from("scholarships").select("*").limit(400);
  if (error) throw error;

  const candidates = ((data ?? []) as ScholarshipRecord[]).filter((candidate) => isRoutableScholarshipRecord(candidate));
  logger.info("scholarship candidates count", { count: candidates.length, articleSlug: article.slug });

  const scored = candidates
    .map((candidate) => {
      const { score, reason } = scoreScholarship(candidate, article, seoBrief);
      return { candidate, score, reason };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const selected = scored
    .slice(0, Math.max(0, Math.min(limit, 6)))
    .map((entry) => toScholarshipLink(entry.candidate, entry.reason))
    .filter((entry): entry is ScholarshipLink => Boolean(entry));

  if (selected.length === 0) {
    logger.info("no matching scholarships found", { articleSlug: article.slug });
    return [];
  }

  logger.info("scholarship matches selected", {
    articleSlug: article.slug,
    selectedSlugs: selected.map((entry) => entry.slug),
    selected: selected.map((entry) => ({ slug: entry.slug, reason: entry.reason }))
  });

  return selected;
}

export async function verifyScholarshipLinks(links: ScholarshipLink[], articleSlug: string): Promise<ScholarshipLink[]> {
  const selectedSlugs = [...new Set(links.map((entry) => entry.slug.trim()).filter(Boolean))];
  logger.info("scholarship links verification started", { articleSlug, selectedSlugs });

  if (selectedSlugs.length === 0) {
    logger.info("scholarship links verification complete", {
      articleSlug,
      verifiedScholarshipSlugs: [],
      removedInvalidScholarshipSlugs: [],
      finalScholarshipLinksCount: 0
    });
    return [];
  }

  const { data, error } = await supabase.from("scholarships").select("*").in("slug", selectedSlugs);
  if (error) throw error;

  const routableBySlug = new Set(
    ((data ?? []) as ScholarshipRecord[])
      .filter((record) => isRoutableScholarshipRecord(record))
      .map((record) => pickFirstString(record, ["slug"]))
      .filter((slug): slug is string => Boolean(slug))
  );

  const verifiedLinks = links
    .filter((entry) => routableBySlug.has(entry.slug))
    .map((entry) => ({
      title: entry.title,
      slug: entry.slug,
      url: buildInternalScholarshipUrl(entry.slug),
      reason: entry.reason
    }));

  const verifiedScholarshipSlugs = verifiedLinks.map((entry) => entry.slug);
  const removedInvalidScholarshipSlugs = selectedSlugs.filter((slug) => !routableBySlug.has(slug));

  logger.info("scholarship links verification complete", {
    articleSlug,
    verifiedScholarshipSlugs,
    removedInvalidScholarshipSlugs,
    finalScholarshipLinksCount: verifiedLinks.length
  });

  return verifiedLinks;
}

export function enforceAllowedScholarshipBodyLinks(bodyHtml: string, allowedScholarshipLinks: ScholarshipLink[]): string {
  const allowed = new Set(allowedScholarshipLinks.map((entry) => entry.slug));

  return bodyHtml.replace(/<a\s+([^>]*?)href=("|')([^"']+)(\2)([^>]*)>(.*?)<\/a>/gi, (full, before, quote, href, _q2, after, inner) => {
    const normalizedHref = String(href).trim();
    let slug: string | null = null;

    if (/^\/scholarships\//i.test(normalizedHref)) {
      slug = normalizedHref.replace(/^\/scholarships\//i, "").split(/[?#]/)[0] ?? null;
    } else if (/^https?:\/\//i.test(normalizedHref)) {
      try {
        const parsed = new URL(normalizedHref);
        const sameHost = parsed.origin === env.SITE_URL;
        if (sameHost && /^\/scholarships\//i.test(parsed.pathname)) {
          slug = parsed.pathname.replace(/^\/scholarships\//i, "").split(/[?#]/)[0] ?? null;
        }
      } catch {
        slug = null;
      }
    }

    if (!slug || allowed.has(slug)) {
      return full;
    }

    return inner;
  });
}
