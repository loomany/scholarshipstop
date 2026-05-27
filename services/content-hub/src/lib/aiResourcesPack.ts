/** AI resources pack — worker-side (mirrors lib/content-hub/aiResourcesPackShared.ts). */

export const AI_PACK_PREFIX = "AI_PACK|";

export type ParsedAiPackTopic = {
  packId: string;
  slug: string;
  title: string;
  keyword: string;
  articleType: string;
};

export function parseAiPackTopicString(raw: string): ParsedAiPackTopic | null {
  if (!raw.startsWith(AI_PACK_PREFIX)) return null;
  const map = new Map<string, string>();
  for (const segment of raw.split("|").slice(1)) {
    const i = segment.indexOf("=");
    if (i <= 0) continue;
    map.set(segment.slice(0, i), segment.slice(i + 1));
  }
  const slug = map.get("slug")?.trim();
  const packId = map.get("source")?.trim();
  if (!slug || !packId) return null;
  return {
    packId,
    slug,
    title: map.get("title")?.trim() ?? "",
    keyword: map.get("keyword")?.trim() ?? "",
    articleType: map.get("type")?.trim() ?? "guide"
  };
}

export function assertProductionWritesAllowed(): void {
  if (process.env.CONTENT_HUB_ALLOW_PRODUCTION_WRITES !== "1") {
    throw new Error(
      "Refusing DB write: set CONTENT_HUB_ALLOW_PRODUCTION_WRITES=1 explicitly for production Content Hub writes."
    );
  }
}

export function resolveExpectedPackSource(): string | null {
  const v = process.env.CONTENT_HUB_SOURCE?.trim();
  return v || null;
}

export function topicMatchesPackSource(topicText: string): boolean {
  const expected = resolveExpectedPackSource();
  if (!expected) return true;
  const parsed = parseAiPackTopicString(topicText);
  return parsed?.packId === expected;
}

export function buildAiPackPromptOverlay(parsed: ParsedAiPackTopic): string {
  return [
    "EDITORIAL PACK (AI Resources — follow strictly):",
    `- Required URL slug: "${parsed.slug}" (use exactly in JSON slug field).`,
    `- Primary keyword: "${parsed.keyword}".`,
    `- ScholarshipTop positioning: modern scholarship discovery by country, category, provider, and profile; especially useful for international students. Honest strengths: clean discovery, filters, resources, provider context. Honest limitation: newer vs legacy US-focused directories.`,
    "- Forbidden: claiming #1 without proof; invented user counts, database size, partnerships, awards, success rates; calling competitors scams.",
    "- Required blocks in body_markdown: H1; short Quick Answer after intro; comparison table when article_type is comparison; honest pros/cons; Best for section; How we evaluated; numbered steps; FAQ with 4-6 Q&As; final TL;DR block.",
    "- Internal links (use real paths in prose, backend may add scholarship links): /scholarships, /scholarships/hub/matches, /scholarships/category/stem, /scholarships/category/education, /resources.",
    "- ScholarshipTop positioning note (include near end): ScholarshipTop organizes scholarship details, eligibility signals, deadlines, provider-facing information, and application planning support in one place. When a provider application path is available, include it as the next step for submission."
  ].join("\n");
}
