import { z } from "zod";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { env } from "../config/env.js";
import { getEffectiveMinCharsNoSpaces, getEffectiveMinWords, scaleCharsRelativeToCompactList, scaleStructureRequirement, scaleWordsRelativeToCompactList } from "./contentTargets.js";
import { logger } from "./logger.js";
import { countCharsNoSpaces, countWords } from "./markdown.js";
import { markdownToHtml } from "./html.js";
const internalLinkUrlSchema = z.string().min(1).refine((value) => /^https?:\/\//i.test(value) || value.startsWith("/"), {
    message: "Link URL must be absolute (http/https) or root-relative"
});
export const internalLinkSchema = z.object({
    title: z.string().min(2),
    url: internalLinkUrlSchema
});
export const relatedArticleLinkSchema = z.object({
    title: z.string().min(2),
    slug: z.string().min(1),
    reason: z.string().min(3),
    url: internalLinkUrlSchema.optional()
});
export const scholarshipLinkSchema = z.object({
    title: z.string().min(2),
    slug: z.string().min(1),
    url: z.string().regex(/^\/scholarships\/[a-z0-9-]+$/i).optional(),
    reason: z.string().min(3)
});
export const anchorSuggestionSchema = z.object({
    text: z.string().min(2),
    intent: z.string().min(2)
});
export const scholarshipMatchHintsSchema = z.object({
    audience: z.array(z.string().min(2)).default([]),
    funding_type: z.array(z.string().min(2)).default([]),
    degree_levels: z.array(z.string().min(2)).default([]),
    fields: z.array(z.string().min(2)).default([]),
    target_groups: z.array(z.string().min(2)).default([]),
    countries: z.array(z.string().min(2)).default([]),
    secondary_keywords: z.array(z.string().min(2)).default([])
});
export const faqItemSchema = z.object({
    question: z.string().min(8),
    answer: z.string().min(20)
});
function normalizeImageBriefField(val) {
    if (typeof val === 'string')
        return val.trim();
    if (val && typeof val === 'object' && !Array.isArray(val)) {
        return Object.values(val)
            .filter((v) => typeof v === 'string')
            .map((v) => v.trim())
            .filter(Boolean)
            .join(' ');
    }
    return val;
}
export const seoBriefSchema = z.object({
    primary_keyword: z.string().min(2),
    secondary_keywords: z.array(z.string().min(2)).default([]),
    slug: z.string().min(2),
    title: z.string().min(5),
    h1: z.string().min(5),
    meta_title: z.string().min(10),
    meta_description: z.string().min(30),
    faq_questions: z.array(z.string().min(8)).default([]),
    article_angle: z.string().min(10),
    image_brief: z.preprocess((val) => normalizeImageBriefField(val), z.string().min(10))
});
export const articleSchema = z.object({
    title: z.string().min(5),
    slug: z.string().min(2),
    h1: z.string().min(5),
    excerpt: z.string().min(20),
    meta_title: z.string().min(10),
    meta_description: z.string().min(30),
    body_markdown: z.string().min(1000),
    faq_items: z.array(faqItemSchema).default([]),
    anchor_suggestions: z.array(anchorSuggestionSchema).default([]),
    scholarship_match_hints: scholarshipMatchHintsSchema.default({
        audience: [],
        funding_type: [],
        degree_levels: [],
        fields: [],
        target_groups: [],
        countries: [],
        secondary_keywords: []
    }),
    scholarship_links: z.array(scholarshipLinkSchema).default([]),
    faq_links: z.array(internalLinkSchema).default([]),
    related_article_links: z.array(relatedArticleLinkSchema).default([]),
    cover_image_alt: z.string().min(8)
});
const THRESHOLDS_BY_ARTICLE_TYPE = {
    list: {
        minTotalWords: getEffectiveMinWords(),
        minCharsNoSpaces: getEffectiveMinCharsNoSpaces(),
        minIntroWords: scaleStructureRequirement(90, 50),
        minH2Count: scaleStructureRequirement(6, 4),
        minFaqCount: 2,
        minParagraphCount: scaleStructureRequirement(14, 8),
        minSectionCount: scaleStructureRequirement(6, 4)
    },
    guide: {
        minTotalWords: scaleWordsRelativeToCompactList(1000, 500),
        minCharsNoSpaces: scaleCharsRelativeToCompactList(5800, 2900),
        minIntroWords: scaleStructureRequirement(80, 45),
        minH2Count: scaleStructureRequirement(5, 4),
        minFaqCount: 2,
        minParagraphCount: scaleStructureRequirement(13, 8),
        minSectionCount: scaleStructureRequirement(5, 4)
    },
    strategy: {
        minTotalWords: scaleWordsRelativeToCompactList(950, 480),
        minCharsNoSpaces: scaleCharsRelativeToCompactList(5600, 2800),
        minIntroWords: scaleStructureRequirement(75, 45),
        minH2Count: scaleStructureRequirement(5, 4),
        minFaqCount: 2,
        minParagraphCount: scaleStructureRequirement(12, 7),
        minSectionCount: scaleStructureRequirement(5, 4)
    },
    comparison: {
        minTotalWords: scaleWordsRelativeToCompactList(1000, 500),
        minCharsNoSpaces: scaleCharsRelativeToCompactList(5600, 2800),
        minIntroWords: scaleStructureRequirement(70, 40),
        minH2Count: scaleStructureRequirement(5, 4),
        minFaqCount: 1,
        minParagraphCount: scaleStructureRequirement(12, 7),
        minSectionCount: scaleStructureRequirement(5, 4)
    },
    niche: {
        minTotalWords: scaleWordsRelativeToCompactList(950, 480),
        minCharsNoSpaces: scaleCharsRelativeToCompactList(5400, 2700),
        minIntroWords: scaleStructureRequirement(70, 40),
        minH2Count: scaleStructureRequirement(5, 4),
        minFaqCount: 1,
        minParagraphCount: scaleStructureRequirement(11, 7),
        minSectionCount: scaleStructureRequirement(5, 4)
    },
    deep_dive: {
        minTotalWords: scaleWordsRelativeToCompactList(1100, 550),
        minCharsNoSpaces: scaleCharsRelativeToCompactList(6200, 3000),
        minIntroWords: scaleStructureRequirement(85, 48),
        minH2Count: scaleStructureRequirement(5, 4),
        minFaqCount: 1,
        minParagraphCount: scaleStructureRequirement(14, 8),
        minSectionCount: scaleStructureRequirement(5, 4)
    }
};
function detectIntroStyle(text) {
    const normalized = text.trim().toLowerCase();
    if (/^\s*["'“][^"'”]+["'”]/.test(normalized))
        return "story";
    if (/\?/.test(normalized.split("\n")[0] || ""))
        return "question";
    if (/\d+%|\d+\s*(students|applicants|scholarships|awards)/.test(normalized))
        return "statistic";
    if (/problem|challenge|struggle|hard|difficult/.test(normalized))
        return "problem";
    return "direct";
}
function buildFailure(check, expected, actual, severity) {
    return {
        check,
        expected,
        actual,
        severity,
        message: `${check}: expected ${expected}, got ${String(actual)}`
    };
}
async function persistValidationDebugPayload(payload, slug) {
    try {
        const dir = join(process.cwd(), "tmp", "article-metrics-validation");
        await mkdir(dir, { recursive: true });
        const filePath = join(dir, `${Date.now()}-${slug || "unknown"}.json`);
        await writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
        logger.warn("article metrics debug payload saved", { filePath, slug });
    }
    catch (error) {
        logger.warn("failed to save article metrics debug payload", {
            slug,
            error: error instanceof Error ? error.message : String(error)
        });
    }
}
export async function validateArticleMetrics(article, context) {
    const wordCount = countWords(article.body_markdown);
    const charCount = countCharsNoSpaces(article.body_markdown);
    const h2Matches = [...article.body_markdown.matchAll(/^##\s+/gm)];
    const headingMatches = [...article.body_markdown.matchAll(/^#{1,6}\s+/gm)];
    const paragraphMatches = article.body_markdown
        .split(/\n\s*\n/)
        .map((chunk) => chunk.trim())
        .filter((chunk) => chunk.length > 0 && !/^#{1,6}\s+/.test(chunk) && !/^[-*+]\s+/.test(chunk) && !/^\d+\.\s+/.test(chunk));
    const listMatches = [...article.body_markdown.matchAll(/^(?:[-*+]\s+|\d+\.\s+)/gm)];
    const sectionCount = h2Matches.length;
    const faqCount = article.faq_items.length;
    const textLength = article.body_markdown.length;
    const thresholds = THRESHOLDS_BY_ARTICLE_TYPE[context.articleType];
    const firstH2Index = article.body_markdown.search(/\n##\s+/);
    const introMarkdown = firstH2Index >= 0 ? article.body_markdown.slice(0, firstH2Index) : article.body_markdown;
    const introWordCount = countWords(introMarkdown.replace(/^#\s+.+$/m, "").trim());
    const detectedIntroStyle = detectIntroStyle(introMarkdown);
    const failed = [];
    let bodyHtml = "";
    try {
        bodyHtml = await markdownToHtml(article.body_markdown);
    }
    catch (error) {
        failed.push(buildFailure("bodyHtml", "valid HTML conversion", "markdown_to_html_failed", "hard"));
        logger.error("markdown to html failed during metrics validation", {
            slug: article.slug,
            topic: context.topic,
            error: error instanceof Error ? error.message : String(error)
        });
    }
    if (!article.body_markdown.trim()) {
        failed.push(buildFailure("body", "non-empty content", 0, "hard"));
    }
    if (!/^#\s+/.test(article.body_markdown.trimStart())) {
        failed.push(buildFailure("h1", "top-level H1 at beginning", false, "hard"));
    }
    if (wordCount < Math.floor(thresholds.minTotalWords * 0.45)) {
        failed.push(buildFailure("totalWordCount", `>= ${Math.floor(thresholds.minTotalWords * 0.45)} (critical floor)`, wordCount, "hard"));
    }
    else if (wordCount < thresholds.minTotalWords) {
        failed.push(buildFailure("totalWordCount", `>= ${thresholds.minTotalWords}`, wordCount, "soft"));
    }
    if (charCount < Math.floor(thresholds.minCharsNoSpaces * 0.45)) {
        failed.push(buildFailure("charCountNoSpaces", `>= ${Math.floor(thresholds.minCharsNoSpaces * 0.45)} (critical floor)`, charCount, "hard"));
    }
    else if (charCount < thresholds.minCharsNoSpaces) {
        failed.push(buildFailure("charCountNoSpaces", `>= ${thresholds.minCharsNoSpaces}`, charCount, "soft"));
    }
    if (introWordCount < Math.floor(thresholds.minIntroWords * 0.5)) {
        failed.push(buildFailure("introWordCount", `>= ${Math.floor(thresholds.minIntroWords * 0.5)} (critical floor)`, introWordCount, "hard"));
    }
    else if (introWordCount < thresholds.minIntroWords) {
        failed.push(buildFailure("introWordCount", `>= ${thresholds.minIntroWords}`, introWordCount, "soft"));
    }
    if (h2Matches.length < Math.max(1, thresholds.minH2Count - 2)) {
        failed.push(buildFailure("h2Count", `>= ${Math.max(1, thresholds.minH2Count - 2)} (critical floor)`, h2Matches.length, "hard"));
    }
    else if (h2Matches.length < thresholds.minH2Count) {
        failed.push(buildFailure("h2Count", `>= ${thresholds.minH2Count}`, h2Matches.length, "soft"));
    }
    if (faqCount < Math.max(0, thresholds.minFaqCount - 1)) {
        failed.push(buildFailure("faqCount", `>= ${Math.max(0, thresholds.minFaqCount - 1)} (critical floor)`, faqCount, "hard"));
    }
    else if (faqCount < thresholds.minFaqCount) {
        failed.push(buildFailure("faqCount", `>= ${thresholds.minFaqCount}`, faqCount, "soft"));
    }
    if (paragraphMatches.length < Math.max(1, thresholds.minParagraphCount - 4)) {
        failed.push(buildFailure("paragraphCount", `>= ${Math.max(1, thresholds.minParagraphCount - 4)} (critical floor)`, paragraphMatches.length, "hard"));
    }
    else if (paragraphMatches.length < thresholds.minParagraphCount) {
        failed.push(buildFailure("paragraphCount", `>= ${thresholds.minParagraphCount}`, paragraphMatches.length, "soft"));
    }
    if (sectionCount < Math.max(1, thresholds.minSectionCount - 2)) {
        failed.push(buildFailure("sectionCount", `>= ${Math.max(1, thresholds.minSectionCount - 2)} (critical floor)`, sectionCount, "hard"));
    }
    else if (sectionCount < thresholds.minSectionCount) {
        failed.push(buildFailure("sectionCount", `>= ${thresholds.minSectionCount}`, sectionCount, "soft"));
    }
    if (article.scholarship_links.length > env.CONTENT_HUB_MAX_SCHOLARSHIP_LINKS) {
        failed.push(buildFailure("scholarshipLinkCount", `<= ${env.CONTENT_HUB_MAX_SCHOLARSHIP_LINKS}`, article.scholarship_links.length, "hard"));
    }
    if (article.faq_links.length > env.CONTENT_HUB_MAX_FAQ_LINKS) {
        failed.push(buildFailure("faqLinkCount", `<= ${env.CONTENT_HUB_MAX_FAQ_LINKS}`, article.faq_links.length, "hard"));
    }
    if (article.related_article_links.length > env.CONTENT_HUB_MAX_RELATED_ARTICLES) {
        failed.push(buildFailure("relatedArticleLinksCount", `<= ${env.CONTENT_HUB_MAX_RELATED_ARTICLES}`, article.related_article_links.length, "hard"));
    }
    const metrics = {
        totalWordCount: wordCount,
        introWordCount,
        faqCount,
        headingCount: headingMatches.length,
        h2Count: h2Matches.length,
        paragraphCount: paragraphMatches.length,
        listCount: listMatches.length,
        sectionCount,
        detectedArticleType: context.articleType,
        detectedIntroStyle,
        bodyHtmlLength: bodyHtml.length,
        textLength,
        charCountNoSpaces: charCount
    };
    const hardFailures = failed.filter((item) => item.severity === "hard");
    const softFailures = failed.filter((item) => item.severity === "soft");
    const result = {
        ok: hardFailures.length === 0,
        hardFailed: hardFailures.length > 0,
        failedChecks: hardFailures.map((item) => item.message),
        softWarnings: softFailures.map((item) => item.message),
        metrics,
        thresholds,
        wordCount,
        charCount
    };
    const validationLog = {
        stage: "article_metrics_validation",
        topic: context.topic,
        articleType: context.articleType,
        introStyle: context.introStyle,
        metrics,
        thresholds,
        failedChecks: result.failedChecks,
        softWarnings: result.softWarnings
    };
    if (result.hardFailed) {
        logger.error("article metrics validation failed", validationLog);
        await persistValidationDebugPayload({
            ...validationLog,
            title: article.title,
            slug: article.slug,
            bodyMarkdown: article.body_markdown,
            bodyHtml
        }, article.slug);
    }
    else if (result.softWarnings.length > 0) {
        logger.warn("article metrics validation soft warnings", validationLog);
    }
    else {
        logger.info("article metrics validation passed", validationLog);
    }
    return result;
}
