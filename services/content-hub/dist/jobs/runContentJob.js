import slugify from "slugify";
import { env } from "../config/env.js";
import { FalTimeoutError, generateImage } from "../lib/fal.js";
import { markdownToHtml } from "../lib/html.js";
import { getFaqLinks } from "../lib/links.js";
import { logger } from "../lib/logger.js";
import { getEffectiveMinWords } from "../lib/contentTargets.js";
import { addExternalAuthorityLinksToHtml, autoFixArticleByMetrics, expandShortArticleBody, generateArticle, generateSeoBrief } from "../lib/openai.js";
import { buildImagePrompt } from "../lib/prompts.js";
import { pickRelatedArticles, verifyRelatedArticleLinks } from "../lib/related.js";
import { enforceAllowedScholarshipBodyLinks, findScholarshipsForIntent, injectInternalLinks, verifyScholarshipLinks } from "../lib/scholarshipMatching.js";
import { fetchPublishedArticles, pickQueuedTopic, slugExists, supabase, updateTopicStatus, uploadImageFromUrl } from "../lib/supabase.js";
import { validateArticleMetrics } from "../lib/validators.js";
import { triggerArticleMatching } from "../lib/articleMatchingNotifier.js";
import { isImagePromptTooSimilar, pickCompositionVariant, pickAlternativeImageStyle, pickArticleType, pickImageStyle, pickIntroStyle, selectScene } from "../lib/variation.js";
import { countWords } from "../lib/markdown.js";
class RequeueTopicError extends Error {
    constructor(message) {
        super(message);
        this.name = "RequeueTopicError";
    }
}
function normalizeError(error) {
    if (error instanceof Error) {
        return { message: error.message, stack: error.stack ?? null };
    }
    return {
        message: typeof error === "string" ? error : JSON.stringify(error, null, 2),
        stack: null
    };
}
function logUnknownError(message, error, data) {
    const normalized = normalizeError(error);
    logger.error(message, { ...data, error: normalized.message, stack: normalized.stack });
}
function isTransientPipelineError(error) {
    const normalized = normalizeError(error);
    const haystack = `${normalized.message}\n${normalized.stack ?? ""}`.toLowerCase();
    return [
        "connection error",
        "fetch failed",
        "enotfound",
        "eai_again",
        "etimedout",
        "econnreset",
        "econnrefused",
        "socket hang up",
        "service unavailable",
        "status: 503",
        "status code 503",
        "rate limit",
        "too many requests",
        "status: 429",
        "insufficient_quota",
        "timeout"
    ].some((needle) => haystack.includes(needle));
}
function imageFileName(slug) {
    const safe = slugify(slug, { lower: true, strict: true, trim: true });
    return `${safe}-cover-${Date.now()}.jpg`;
}
function buildMetricsDebugMessage(params) {
    const { strictness, shouldPublish, wordCount, minWords, softWarnings } = params;
    const primaryReason = wordCount < minWords
        ? `Wordcount ${wordCount}/${minWords}`
        : softWarnings[0] ?? null;
    if (!primaryReason)
        return null;
    if (strictness === "medium" && shouldPublish) {
        return `${primaryReason} - Auto-published due to medium strictness`;
    }
    if (strictness === "relaxed") {
        return `${primaryReason} - Auto-published due to relaxed strictness`;
    }
    return null;
}
function shouldRequireCoverImageForAutoPublish() {
    return env.CONTENT_HUB_AUTO_PUBLISH === 1 && env.CONTENT_HUB_REQUIRE_COVER_FOR_PUBLISH === 1;
}
function pickGeneratedLinks(links, max, category) {
    const selected = links.slice(0, max);
    if (selected.length === 0) {
        console.warn(`No ${category} links available yet, continuing without them`);
    }
    return selected;
}
function parseBooleanEnv(value) {
    if (typeof value !== "string")
        return null;
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized))
        return true;
    if (["0", "false", "no", "off"].includes(normalized))
        return false;
    return null;
}
function resolveLinkingFlag(primary, aliases) {
    for (const alias of aliases) {
        const parsed = parseBooleanEnv(process.env[alias]);
        if (parsed !== null)
            return parsed;
    }
    return primary === 1;
}
function countExternalAuthorityLinks(body) {
    const htmlMatches = [...body.matchAll(/<a\b[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>/gi)].map((match) => match[1]);
    const markdownMatches = [...body.matchAll(/\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/gi)].map((match) => match[1]);
    const all = [...htmlMatches, ...markdownMatches];
    const siteOrigin = new URL(env.SITE_URL).origin;
    const external = all.filter((raw) => {
        try {
            return new URL(raw).origin !== siteOrigin;
        }
        catch {
            return false;
        }
    });
    return new Set(external).size;
}
function countInternalScholarshipLinks(bodyHtml) {
    const matches = [...bodyHtml.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1]);
    const count = matches.filter((href) => /\/scholarships\//i.test(href)).length;
    return count;
}
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
function ensureTldrBlockAtEnd(bodyHtml, context) {
    const existing = /<div\b[^>]*class=["'][^"']*\barticle-tldr-block\b[^"']*["'][^>]*>[\s\S]*?<\/div>\s*$/i;
    if (existing.test(bodyHtml.trim()))
        return bodyHtml;
    const fallbackPoints = [
        `This guide breaks down the core strategy for ${context.h1 || context.title}.`,
        context.excerpt?.trim() || "Focus on eligibility fit, deadlines, and complete documentation to improve approval odds.",
        context.metaDescription?.trim() || "Use a checklist approach to avoid common application mistakes and submit stronger applications."
    ].slice(0, 3);
    const listItems = fallbackPoints
        .map((point, index) => `<li><strong>Key Point ${index + 1}:</strong> ${escapeHtml(point)}</li>`)
        .join("");
    const block = `<div class="article-tldr-block" style="background-color: #f8f9fa; padding: 25px; border-left: 4px solid #2563eb; margin-top: 40px; border-radius: 6px;"><h3 style="margin-top: 0; color: #1e293b;">📌 Quick Summary</h3><ul style="margin-bottom: 0;">${listItems}</ul></div>`;
    return `${bodyHtml.trimEnd()}\n\n${block}`;
}
function appendFallbackSourcesBlock(bodyHtml) {
    if (/<h2[^>]*>\s*Sources\s*<\/h2>/i.test(bodyHtml))
        return bodyHtml;
    const sourcesBlock = `
<h2>Sources</h2>
<ul>
  <li><a href="https://studentaid.gov/" target="_blank" rel="noopener noreferrer nofollow">Federal Student Aid (U.S. Department of Education)</a></li>
  <li><a href="https://www.ed.gov/" target="_blank" rel="noopener noreferrer nofollow">U.S. Department of Education</a></li>
  <li><a href="https://nces.ed.gov/" target="_blank" rel="noopener noreferrer nofollow">National Center for Education Statistics (NCES)</a></li>
</ul>`;
    return `${bodyHtml.trimEnd()}\n${sourcesBlock}`;
}
function appendFallbackSourcesMarkdown(bodyMarkdown) {
    if (/^##\s+Sources\s*$/im.test(bodyMarkdown))
        return bodyMarkdown;
    const sourcesMarkdown = `
## Sources
- [Federal Student Aid (U.S. Department of Education)](https://studentaid.gov/)
- [U.S. Department of Education](https://www.ed.gov/)
- [National Center for Education Statistics (NCES)](https://nces.ed.gov/)`;
    return `${bodyMarkdown.trimEnd()}\n${sourcesMarkdown}`;
}
const EXTERNAL_REFERENCE_ALLOWED_EXACT = new Set([
    "unesco.org",
    "worldbank.org",
    "un.org",
    "wikipedia.org",
    "topuniversities.com",
    "timeshighereducation.com"
]);
const EXTERNAL_COMPETITOR_BLOCKLIST = new Set([
    "scholarships.com",
    "fastweb.com",
    "scholarshipowl.com",
    "scholarshipportal.com",
    "scholarships360.org",
    "bold.org"
]);
function isAllowedExternalDomain(hostname) {
    const host = hostname.toLowerCase();
    if (host.endsWith(".gov") || host.endsWith(".edu"))
        return true;
    if (EXTERNAL_REFERENCE_ALLOWED_EXACT.has(host))
        return true;
    for (const allowed of EXTERNAL_REFERENCE_ALLOWED_EXACT) {
        if (host.endsWith(`.${allowed}`))
            return true;
    }
    return false;
}
function isBlockedCompetitorDomain(hostname) {
    const host = hostname.toLowerCase();
    if (EXTERNAL_COMPETITOR_BLOCKLIST.has(host))
        return true;
    for (const blocked of EXTERNAL_COMPETITOR_BLOCKLIST) {
        if (host.endsWith(`.${blocked}`))
            return true;
    }
    return false;
}
function sanitizeExternalAuthorityLinks(bodyHtml) {
    let removedCount = 0;
    let normalizedCount = 0;
    const ownHost = new URL(env.SITE_URL).hostname.toLowerCase();
    const html = bodyHtml.replace(/<a\s+([^>]*?)href=("|')([^"']+)(\2)([^>]*)>(.*?)<\/a>/gi, (full, before, quote, href, _q2, after, inner) => {
        const url = String(href).trim();
        if (!/^https?:\/\//i.test(url))
            return full;
        let parsed;
        try {
            parsed = new URL(url);
        }
        catch {
            removedCount += 1;
            return inner;
        }
        const host = parsed.hostname.toLowerCase();
        const isOwnDomain = host === ownHost || host.endsWith(`.${ownHost}`);
        if (isOwnDomain)
            return full;
        const allowed = isAllowedExternalDomain(host);
        const blocked = isBlockedCompetitorDomain(host);
        if (!allowed || blocked) {
            removedCount += 1;
            return inner;
        }
        normalizedCount += 1;
        return `<a ${before}href=${quote}${url}${quote}${after} target="_blank" rel="noopener noreferrer nofollow">${inner}</a>`;
    });
    return { html, removedCount, normalizedCount };
}
function isCriticalHtmlIssue(updatedHtml, originalHtml) {
    if (!updatedHtml.trim())
        return true;
    if (!/<h1\b/i.test(updatedHtml) && /<h1\b/i.test(originalHtml))
        return true;
    if (updatedHtml.length < Math.floor(originalHtml.length * 0.6))
        return true;
    return false;
}
function normalizeJsonArray(value) {
    return Array.isArray(value) ? value : [];
}
async function runStartupReprocess() {
    logger.info("[Maintenance] Startup reprocess triggered...");
    const { data, error } = await supabase
        .from("content_posts")
        .select("id,slug,body_html,scholarship_links,related_article_links")
        .order("created_at", { ascending: true });
    if (error)
        throw error;
    const articles = (data ?? []).map((row) => ({
        id: row.id,
        slug: row.slug,
        body_html: row.body_html || "",
        scholarship_links: normalizeJsonArray(row.scholarship_links),
        related_article_links: normalizeJsonArray(row.related_article_links)
    }));
    const publishedArticles = await fetchPublishedArticles(500);
    for (const [index, article] of articles.entries()) {
        logger.info(`[Maintenance] Processing article ${article.id} (${index + 1}/${articles.length})...`);
        let updatedBodyHtml = article.body_html || "";
        let updatedScholarshipLinks = article.scholarship_links;
        let updatedRelatedLinks = article.related_article_links;
        let externalAddedCount = 0;
        let internalUpdated = false;
        if (env.PROCESS_EXTERNAL_LINKS) {
            const existingExternal = countExternalAuthorityLinks(updatedBodyHtml);
            if (env.PROCESS_FORCE_UPDATE || existingExternal === 0) {
                try {
                    const candidateHtml = await addExternalAuthorityLinksToHtml(updatedBodyHtml);
                    if (!isCriticalHtmlIssue(candidateHtml, updatedBodyHtml)) {
                        updatedBodyHtml = candidateHtml;
                        const newExternal = countExternalAuthorityLinks(updatedBodyHtml);
                        externalAddedCount = Math.max(0, newExternal - existingExternal);
                    }
                }
                catch (err) {
                    logUnknownError("[Maintenance] external links update failed", err, { articleId: article.id, slug: article.slug });
                }
            }
        }
        if (env.PROCESS_INTERNAL_LINKS) {
            try {
                if (env.PROCESS_FORCE_UPDATE || updatedScholarshipLinks.length > 0) {
                    updatedScholarshipLinks = await verifyScholarshipLinks(updatedScholarshipLinks, article.slug);
                    const cleanedHtml = enforceAllowedScholarshipBodyLinks(updatedBodyHtml, updatedScholarshipLinks);
                    if (cleanedHtml !== updatedBodyHtml) {
                        updatedBodyHtml = cleanedHtml;
                        internalUpdated = true;
                    }
                }
                const pickedRelated = env.PROCESS_FORCE_UPDATE || updatedRelatedLinks.length === 0
                    ? pickRelatedArticles(publishedArticles, article.slug, env.CONTENT_HUB_MIN_RELATED_ARTICLES, env.CONTENT_HUB_MAX_RELATED_ARTICLES)
                    : updatedRelatedLinks;
                updatedRelatedLinks = await verifyRelatedArticleLinks(pickedRelated, article.slug);
                internalUpdated = internalUpdated || JSON.stringify(updatedRelatedLinks) !== JSON.stringify(article.related_article_links);
            }
            catch (err) {
                logUnknownError("[Maintenance] internal links update failed", err, { articleId: article.id, slug: article.slug });
            }
        }
        const hasChanges = updatedBodyHtml !== article.body_html
            || JSON.stringify(updatedScholarshipLinks) !== JSON.stringify(article.scholarship_links)
            || JSON.stringify(updatedRelatedLinks) !== JSON.stringify(article.related_article_links);
        if (hasChanges) {
            const { error: updateError } = await supabase
                .from("content_posts")
                .update({
                body_html: updatedBodyHtml,
                scholarship_links: updatedScholarshipLinks,
                related_article_links: updatedRelatedLinks
            })
                .eq("id", article.id);
            if (updateError) {
                logUnknownError("[Maintenance] article update failed", updateError, { articleId: article.id, slug: article.slug });
            }
        }
        logger.info(`[Maintenance] External links added: ${externalAddedCount}, Internal updated: ${internalUpdated ? "yes" : "no"}`);
    }
    logger.info("[Maintenance] Reprocess complete. Starting main publication cycle...");
}
const lastImagePrompts = [];
const lastImageScenes = [];
const MAX_IMAGE_MEMORY = 12;
const MAX_EXPANSION_ATTEMPTS = 2;
const MAX_TOTAL_RETRIES = 3;
const MIN_PUBLICATION_INTERVAL_MINUTES = 5;
const INITIAL_REPROCESS_DELAY_MINUTES = 3;
function getSafePublicationIntervalMinutes() {
    if (env.PUBLICATION_INTERVAL_MINUTES < MIN_PUBLICATION_INTERVAL_MINUTES) {
        logger.warn("PUBLICATION_INTERVAL_MINUTES is too low, clamping to safe minimum", {
            requested: env.PUBLICATION_INTERVAL_MINUTES,
            minAllowed: MIN_PUBLICATION_INTERVAL_MINUTES
        });
    }
    return Math.max(env.PUBLICATION_INTERVAL_MINUTES, MIN_PUBLICATION_INTERVAL_MINUTES);
}
async function processOneTopic() {
    const minWords = getEffectiveMinWords();
    let stage = "picking_topic";
    let postInserted = false;
    const topic = await pickQueuedTopic();
    if (!topic) {
        logger.info("no queued topics");
        return "empty";
    }
    logger.info("topic picked", { topicId: topic.id, topic: topic.topic });
    await updateTopicStatus(topic.id, "processing");
    try {
        const faqPages = getFaqLinks();
        const publishedArticles = await fetchPublishedArticles(20);
        const scholarshipLinkingEnabled = resolveLinkingFlag(env.CONTENT_HUB_ENABLE_SCHOLARSHIP_LINKING, ["ENABLE_SCHOLARSHIP_LINKING"]);
        const faqLinksEnabled = env.CONTENT_HUB_ENABLE_FAQ_LINKS === 1;
        const relatedArticlesEnabled = resolveLinkingFlag(env.CONTENT_HUB_ENABLE_RELATED_ARTICLES, ["ENABLE_RELATED_ARTICLES_LINKING"]);
        const externalLinksEnabled = resolveLinkingFlag(env.CONTENT_HUB_ENABLE_EXTERNAL_LINKS, ["ENABLE_EXTERNAL_LINKS"]);
        stage = "generating_seo";
        const seoBrief = await generateSeoBrief(topic.topic);
        logger.info("seo generated", { topicId: topic.id, slug: seoBrief.slug });
        stage = "generating_article";
        const context = { scholarships: [], faqPages, relatedArticles: publishedArticles };
        const articleType = pickArticleType(topic.topic);
        const introStyle = pickIntroStyle();
        const article = await generateArticle(topic.topic, seoBrief, context, { articleType, introStyle, allowExternalLinks: externalLinksEnabled });
        logger.info("article generated", { topicId: topic.id, slug: article.slug });
        const initialExternalAuthorityLinksCount = countExternalAuthorityLinks(article.body_markdown);
        logger.info(`[Content] OpenAI included ${initialExternalAuthorityLinksCount} external authority links in the article body.`, {
            topicId: topic.id,
            slug: article.slug,
            externalAuthorityLinksCount: initialExternalAuthorityLinksCount,
            externalLinksEnabled
        });
        let totalRetriesUsed = 0;
        let currentWordCount = countWords(article.body_markdown);
        if (currentWordCount < minWords && totalRetriesUsed < MAX_TOTAL_RETRIES) {
            for (let attempt = 1; attempt <= MAX_EXPANSION_ATTEMPTS && totalRetriesUsed < MAX_TOTAL_RETRIES; attempt += 1) {
                totalRetriesUsed += 1;
                logger.warn(`[Expansion] Article too short (${currentWordCount} words). Sending for expansion... Attempt ${attempt}/${MAX_EXPANSION_ATTEMPTS}.`, {
                    topicId: topic.id,
                    slug: article.slug,
                    minWords,
                    totalRetriesUsed,
                    maxTotalRetries: MAX_TOTAL_RETRIES
                });
                try {
                    const expandedBody = await expandShortArticleBody(article.body_markdown, currentWordCount, minWords);
                    if (!expandedBody.trim()) {
                        logger.warn("[Expansion] Empty expansion result, keeping current draft.", {
                            topicId: topic.id,
                            slug: article.slug,
                            attempt
                        });
                        continue;
                    }
                    if (!/^#\s+/.test(expandedBody.trimStart())) {
                        logger.warn("[Expansion] Expanded content missing top H1, attempt ignored.", {
                            topicId: topic.id,
                            slug: article.slug,
                            attempt
                        });
                        continue;
                    }
                    await markdownToHtml(expandedBody);
                    article.body_markdown = expandedBody;
                    currentWordCount = countWords(article.body_markdown);
                    logger.info(`[Expansion] Success! New word count: ${currentWordCount} words.`, {
                        topicId: topic.id,
                        slug: article.slug,
                        attempt
                    });
                    if (currentWordCount >= minWords) {
                        break;
                    }
                }
                catch (error) {
                    logUnknownError("[Expansion] Attempt failed", error, {
                        topicId: topic.id,
                        slug: article.slug,
                        attempt
                    });
                }
            }
            if (currentWordCount < minWords) {
                logger.error("[Expansion] Failed to reach target after all attempts. Topic status set to failed.", {
                    topicId: topic.id,
                    slug: article.slug,
                    currentWordCount,
                    minWords
                });
                await updateTopicStatus(topic.id, "failed");
                return "deferred";
            }
        }
        const externalAuthorityLinksCount = countExternalAuthorityLinks(article.body_markdown);
        logger.info(`[Content] OpenAI included ${externalAuthorityLinksCount} external authority links in the article body.`, {
            topicId: topic.id,
            slug: article.slug,
            externalAuthorityLinksCount,
            externalLinksEnabled,
            afterExpansion: true
        });
        stage = "matching_scholarships";
        logger.info("[Linking] Attempting to link scholarships...", {
            topicId: topic.id,
            slug: article.slug,
            scholarshipLinkingEnabled
        });
        let anchorSuggestions = (article.anchor_suggestions ?? []);
        let intentMatches = [];
        if (!scholarshipLinkingEnabled) {
            anchorSuggestions = [];
            intentMatches = [];
            article.scholarship_links = [];
            logger.info("scholarship linking disabled by env flag", {
                topicId: topic.id,
                topic: topic.topic,
                slug: article.slug,
                envFlag: "CONTENT_HUB_ENABLE_SCHOLARSHIP_LINKING"
            });
        }
        else {
            try {
                if (anchorSuggestions.length === 0) {
                    logger.info("matching_scholarships skipped", { topicId: topic.id, topic: topic.topic, reason: "no anchor suggestions" });
                }
                else {
                    const intentContext = {
                        title: article.title,
                        slug: article.slug,
                        bodyMarkdown: article.body_markdown,
                        hints: article.scholarship_match_hints,
                        seoBrief
                    };
                    const intentMatchesNested = await Promise.all(anchorSuggestions.map(async (suggestion) => {
                        const matches = await findScholarshipsForIntent(suggestion.intent, intentContext, 2);
                        return matches
                            .slice(0, 1)
                            .filter((match) => Boolean(match?.slug))
                            .map((match) => ({
                            anchorText: suggestion.text,
                            intent: suggestion.intent,
                            scholarship: match
                        }));
                    }));
                    intentMatches = intentMatchesNested.flat();
                    logger.info(`[Linking] Found ${intentMatches.length} potential links.`, {
                        topicId: topic.id,
                        slug: article.slug
                    });
                }
            }
            catch (err) {
                logger.error("[Linking] Error: scholarship linking failed", {
                    topicId: topic.id,
                    slug: article.slug,
                    reason: err instanceof Error ? err.message : String(err)
                });
                logUnknownError("matching_scholarships failed", err, {
                    topicId: topic.id,
                    topic: topic.topic
                });
                anchorSuggestions = [];
                intentMatches = [];
            }
            article.scholarship_links = intentMatches
                .map((entry) => entry.scholarship)
                .filter((entry) => Boolean(entry?.slug) && Boolean(entry?.title))
                .filter((entry, index, all) => all.findIndex((candidate) => candidate.slug === entry.slug) === index)
                .map((entry) => ({
                slug: entry.slug,
                title: entry.title,
                reason: "matched by intent",
                url: new URL(`/scholarships/${entry.slug}`, env.SITE_URL).toString()
            }));
            stage = "verifying_scholarship_links";
            try {
                article.scholarship_links = await verifyScholarshipLinks(article.scholarship_links, article.slug);
            }
            catch (err) {
                logUnknownError("verifying_scholarship_links failed, keeping non-verified links", err, {
                    stage,
                    topicId: topic.id,
                    topic: topic.topic,
                    slug: article.slug
                });
            }
        }
        logger.info("scholarship links saved", {
            topicId: topic.id,
            slug: article.slug,
            scholarshipLinksCount: article.scholarship_links.length
        });
        if (!relatedArticlesEnabled) {
            article.related_article_links = [];
            logger.info("related articles linking disabled by env flag", {
                topicId: topic.id,
                topic: topic.topic,
                slug: article.slug,
                envFlag: "CONTENT_HUB_ENABLE_RELATED_ARTICLES"
            });
        }
        else {
            logger.info("[Linking] Attempting to link related articles...", {
                topicId: topic.id,
                slug: article.slug
            });
            stage = "matching_related_articles";
            try {
                article.related_article_links = pickRelatedArticles(publishedArticles, article.slug, env.CONTENT_HUB_MIN_RELATED_ARTICLES, env.CONTENT_HUB_MAX_RELATED_ARTICLES);
                logger.info(`[Linking] Found ${article.related_article_links.length} potential links.`, {
                    topicId: topic.id,
                    slug: article.slug
                });
            }
            catch (err) {
                logger.error("[Linking] Error: related articles linking failed", {
                    topicId: topic.id,
                    slug: article.slug,
                    reason: err instanceof Error ? err.message : String(err)
                });
                logUnknownError("matching_related_articles failed, continuing without related links", err, {
                    stage,
                    topicId: topic.id,
                    topic: topic.topic,
                    slug: article.slug
                });
                article.related_article_links = [];
            }
            stage = "verifying_related_links";
            try {
                article.related_article_links = await verifyRelatedArticleLinks(article.related_article_links, article.slug);
            }
            catch (err) {
                logUnknownError("verifying_related_links failed, keeping picked related links", err, {
                    stage,
                    topicId: topic.id,
                    topic: topic.topic,
                    slug: article.slug
                });
            }
        }
        if (!faqLinksEnabled) {
            article.faq_links = [];
            logger.info("faq links disabled by env flag", {
                topicId: topic.id,
                topic: topic.topic,
                slug: article.slug,
                envFlag: "CONTENT_HUB_ENABLE_FAQ_LINKS"
            });
        }
        else {
            article.faq_links = pickGeneratedLinks(article.faq_links, env.CONTENT_HUB_MAX_FAQ_LINKS, "faq");
        }
        const exists = await slugExists(article.slug);
        if (exists) {
            logger.warn("slug already exists; marking topic done to avoid duplicate retry loop", {
                topicId: topic.id,
                topic: topic.topic,
                slug: article.slug
            });
            await updateTopicStatus(topic.id, "done");
            return "deferred";
        }
        stage = "validating_metrics";
        let validation;
        try {
            validation = await validateArticleMetrics(article, {
                topic: topic.topic,
                articleType,
                introStyle
            });
        }
        catch (err) {
            logUnknownError("validating_metrics failed, continuing with fallback metrics", err, {
                stage,
                topicId: topic.id,
                topic: topic.topic,
                slug: article.slug
            });
            validation = {
                ok: false,
                hardFailed: true,
                failedChecks: ["metrics_validation_error"],
                softWarnings: ["metrics_validation_error"],
                metrics: {},
                thresholds: {},
                wordCount: article.body_markdown.split(/\s+/).filter(Boolean).length,
                charCount: article.body_markdown.length
            };
        }
        while (validation.hardFailed && totalRetriesUsed < MAX_TOTAL_RETRIES) {
            totalRetriesUsed += 1;
            const attemptNumber = totalRetriesUsed;
            logger.warn(`[Metrics] Hard fail detected. Sending to OpenAI for auto-fix... (Attempt ${attemptNumber}/${MAX_TOTAL_RETRIES})`, {
                topicId: topic.id,
                slug: article.slug,
                failedChecks: validation.failedChecks
            });
            try {
                const fixedBody = await autoFixArticleByMetrics(article.body_markdown, validation.failedChecks);
                if (!fixedBody.trim()) {
                    logger.warn("[Metrics] Auto-fix returned empty content; keeping previous draft.", {
                        topicId: topic.id,
                        slug: article.slug,
                        attemptNumber
                    });
                    continue;
                }
                if (!/^#\s+/.test(fixedBody.trimStart())) {
                    logger.warn("[Metrics] Auto-fix result missing top H1; attempt ignored.", {
                        topicId: topic.id,
                        slug: article.slug,
                        attemptNumber
                    });
                    continue;
                }
                await markdownToHtml(fixedBody);
                article.body_markdown = fixedBody;
                logger.info("[Metrics] Auto-fix success! Retrying validation...", {
                    topicId: topic.id,
                    slug: article.slug,
                    attemptNumber
                });
            }
            catch (fixError) {
                logUnknownError("[Metrics] Auto-fix attempt failed", fixError, {
                    topicId: topic.id,
                    slug: article.slug,
                    attemptNumber
                });
                continue;
            }
            validation = await validateArticleMetrics(article, {
                topic: topic.topic,
                articleType,
                introStyle
            });
        }
        if (validation.hardFailed) {
            logger.error("article metrics hard fail after retries exhausted", {
                topicId: topic.id,
                slug: article.slug,
                failedChecks: validation.failedChecks,
                softWarnings: validation.softWarnings,
                totalRetriesUsed,
                maxTotalRetries: MAX_TOTAL_RETRIES
            });
            await updateTopicStatus(topic.id, "failed");
            return "deferred";
        }
        if (scholarshipLinkingEnabled) {
            stage = "matching_scholarships";
            logger.info("[Linking] Re-syncing internal scholarship links on final article body...");
            try {
                if (anchorSuggestions.length > 0) {
                    const intentContext = {
                        title: article.title,
                        slug: article.slug,
                        bodyMarkdown: article.body_markdown,
                        hints: article.scholarship_match_hints,
                        seoBrief
                    };
                    const intentMatchesNested = await Promise.all(anchorSuggestions.map(async (suggestion) => {
                        const matches = await findScholarshipsForIntent(suggestion.intent, intentContext, 2);
                        return matches
                            .slice(0, 1)
                            .filter((match) => Boolean(match?.slug))
                            .map((match) => ({
                            anchorText: suggestion.text,
                            intent: suggestion.intent,
                            scholarship: match
                        }));
                    }));
                    intentMatches = intentMatchesNested.flat();
                }
                else {
                    intentMatches = [];
                }
                article.scholarship_links = intentMatches
                    .map((entry) => entry.scholarship)
                    .filter((entry) => Boolean(entry?.slug) && Boolean(entry?.title))
                    .filter((entry, index, all) => all.findIndex((candidate) => candidate.slug === entry.slug) === index)
                    .map((entry) => ({
                    slug: entry.slug,
                    title: entry.title,
                    reason: "matched by intent",
                    url: new URL(`/scholarships/${entry.slug}`, env.SITE_URL).toString()
                }));
                article.scholarship_links = await verifyScholarshipLinks(article.scholarship_links, article.slug);
            }
            catch (err) {
                logger.error("[Linking] Error: scholarship re-sync failed", {
                    topicId: topic.id,
                    slug: article.slug,
                    reason: err instanceof Error ? err.message : String(err)
                });
            }
        }
        if (validation.softWarnings.length > 0) {
            logger.warn("article metrics soft warnings, continuing pipeline", {
                topicId: topic.id,
                slug: article.slug,
                softWarnings: validation.softWarnings
            });
        }
        const { wordCount, charCount } = validation;
        logger.info("validation completed", {
            topicId: topic.id,
            wordCount,
            charCount,
            hardFailed: validation.hardFailed,
            softWarnings: validation.softWarnings.length
        });
        let uploadedImage = null;
        try {
            stage = "generating_image";
            logger.info("before image generation", { stage, topicId: topic.id, topic: topic.topic });
            let imageStyle = pickImageStyle(topic.topic, articleType);
            let selectedScene = selectScene({
                topic: topic.topic,
                articleType,
                imageBrief: seoBrief.image_brief,
                recentScenes: lastImageScenes
            });
            let composition = pickCompositionVariant(selectedScene);
            let imagePrompt = buildImagePrompt(topic.topic, { articleType, imageStyle, scene: selectedScene, composition });
            if (isImagePromptTooSimilar(imagePrompt, lastImagePrompts)) {
                imageStyle = pickAlternativeImageStyle(imageStyle);
                selectedScene = selectScene({
                    topic: topic.topic,
                    articleType,
                    imageBrief: seoBrief.image_brief,
                    recentScenes: lastImageScenes,
                    avoidSceneIds: [selectedScene.id]
                });
                composition = pickCompositionVariant(selectedScene);
                imagePrompt = buildImagePrompt(topic.topic, { articleType, imageStyle, scene: selectedScene, composition });
            }
            console.log("FINAL IMAGE PROMPT:", imagePrompt);
            lastImagePrompts.push(imagePrompt);
            lastImageScenes.push(selectedScene.id);
            if (lastImagePrompts.length > MAX_IMAGE_MEMORY) {
                lastImagePrompts.splice(0, lastImagePrompts.length - MAX_IMAGE_MEMORY);
            }
            if (lastImageScenes.length > MAX_IMAGE_MEMORY) {
                lastImageScenes.splice(0, lastImageScenes.length - MAX_IMAGE_MEMORY);
            }
            const generatedImage = await generateImage(imagePrompt);
            logger.info("after image generation", { stage, topicId: topic.id, topic: topic.topic, imageUrl: generatedImage.url });
            stage = "processing_image";
            logger.info("before image processing", { stage, topicId: topic.id, topic: topic.topic });
            uploadedImage = await uploadImageFromUrl({
                imageUrl: generatedImage.url,
                fileName: imageFileName(article.slug)
            });
            logger.info("after image processing", {
                stage,
                topicId: topic.id,
                topic: topic.topic,
                original: uploadedImage.original,
                processed: {
                    width: uploadedImage.width,
                    height: uploadedImage.height,
                    mime: uploadedImage.mimeType,
                    size: uploadedImage.sizeBytes,
                    filename: uploadedImage.filename
                }
            });
            stage = "uploading_image";
            logger.info("after upload", {
                stage,
                topicId: topic.id,
                topic: topic.topic,
                storagePath: uploadedImage.path,
                publicUrl: uploadedImage.publicUrl
            });
        }
        catch (err) {
            if (err instanceof FalTimeoutError) {
                console.error(`FAL API Timeout (${err.timeoutMs} ms exceeded)`);
            }
            else {
                console.error("FAL API error:", err);
            }
            logUnknownError("image stage failed", err, {
                stage,
                topicId: topic.id,
                topic: topic.topic,
                slug: article.slug
            });
            uploadedImage = null;
        }
        if (!uploadedImage?.publicUrl && shouldRequireCoverImageForAutoPublish()) {
            logger.warn("cover image missing; topic will be re-queued for retry", {
                topicId: topic.id,
                topic: topic.topic,
                slug: article.slug
            });
            throw new RequeueTopicError("cover image missing; postponing insert until image generation succeeds");
        }
        let rawBodyHtml = await markdownToHtml(article.body_markdown);
        rawBodyHtml = ensureTldrBlockAtEnd(rawBodyHtml, {
            title: article.title,
            h1: article.h1,
            excerpt: article.excerpt,
            metaDescription: article.meta_description
        });
        if (externalLinksEnabled && countExternalAuthorityLinks(rawBodyHtml) === 0) {
            try {
                const withExternal = await addExternalAuthorityLinksToHtml(rawBodyHtml);
                if (!isCriticalHtmlIssue(withExternal, rawBodyHtml)) {
                    rawBodyHtml = withExternal;
                    logger.info("[Content] External authority links were added post-processing to preserve mixed linking.");
                }
            }
            catch (err) {
                logUnknownError("[Content] external links fallback failed", err, { topicId: topic.id, slug: article.slug });
            }
        }
        let withInjectedLinks = rawBodyHtml;
        if (!rawBodyHtml.trim()) {
            logger.info("injection skipped", { topicId: topic.id, topic: topic.topic, reason: "empty bodyHtml" });
        }
        else {
            try {
                stage = "injecting_links";
                withInjectedLinks = await injectInternalLinks(rawBodyHtml, anchorSuggestions, intentMatches);
            }
            catch (err) {
                logUnknownError("injectInternalLinks failed", err, { topicId: topic.id, topic: topic.topic, slug: article.slug });
                withInjectedLinks = rawBodyHtml;
            }
        }
        const scholarshipSafeContent = enforceAllowedScholarshipBodyLinks(withInjectedLinks, article.scholarship_links);
        const externalLinksBeforeSanitize = countExternalAuthorityLinks(scholarshipSafeContent);
        let { html: processedContent, removedCount: removedExternalCount, normalizedCount: normalizedExternalCount } = sanitizeExternalAuthorityLinks(scholarshipSafeContent);
        const externalLinksAfterSanitize = countExternalAuthorityLinks(processedContent);
        let fallbackSourcesAdded = false;
        if (externalLinksAfterSanitize === 0) {
            logger.warn("[Content] No external authority links in final body; appending fallback Sources block.", {
                topicId: topic.id,
                slug: article.slug,
                externalLinksEnabled
            });
            processedContent = appendFallbackSourcesBlock(processedContent);
            article.body_markdown = appendFallbackSourcesMarkdown(article.body_markdown);
            fallbackSourcesAdded = true;
        }
        const finalInternalLinkCount = (processedContent.match(/<a\b/gi) ?? []).length;
        const finalScholarshipLinkCount = countInternalScholarshipLinks(processedContent);
        const finalExternalLinkCount = countExternalAuthorityLinks(processedContent);
        logger.info("final processed content prepared for insert", {
            topicId: topic.id,
            slug: article.slug,
            finalInternalLinkCount,
            finalScholarshipLinkCount,
            finalExternalLinkCount,
            removedExternalCount,
            normalizedExternalCount
        });
        const strictness = env.METRICS_STRICTNESS;
        const shouldPublish = env.CONTENT_HUB_AUTO_PUBLISH === 1;
        const contentNotEmpty = article.body_markdown.trim().length > 0;
        const hasCoverImage = Boolean(uploadedImage?.publicUrl);
        const meetsWordThreshold = wordCount >= minWords;
        const qualityWarnings = [...validation.softWarnings];
        if (!meetsWordThreshold) {
            qualityWarnings.unshift(`totalWordCount: expected >= ${minWords}, got ${wordCount}`);
        }
        const hasQualityWarnings = qualityWarnings.length > 0;
        let status;
        if (strictness === "relaxed") {
            status = contentNotEmpty ? "published" : "review_needed";
        }
        else if (strictness === "medium") {
            status = shouldPublish && contentNotEmpty ? "published" : "review_needed";
        }
        else {
            status = shouldPublish && contentNotEmpty && !hasQualityWarnings ? "published" : "review_needed";
        }
        if (!hasCoverImage && status === "published" && shouldRequireCoverImageForAutoPublish()) {
            status = "review_needed";
            logger.error("CRITICAL: Skipping auto-publish because image is missing.", {
                topicId: topic.id,
                slug: article.slug,
                strictness
            });
        }
        let metricsDebug = buildMetricsDebugMessage({
            strictness,
            shouldPublish,
            wordCount,
            minWords,
            softWarnings: qualityWarnings
        });
        if (!hasCoverImage) {
            metricsDebug = metricsDebug
                ? `${metricsDebug}; image missing`
                : "Auto-publish blocked: image missing";
        }
        if (metricsDebug && status === "published") {
            logger.warn("publishing with metrics warnings", {
                topicId: topic.id,
                slug: article.slug,
                strictness,
                metricsDebug
            });
        }
        const schemaJson = {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: article.h1,
            description: article.meta_description,
            image: uploadedImage?.publicUrl ?? null,
            datePublished: status === "published" ? new Date().toISOString() : null,
            dateModified: new Date().toISOString(),
            quality: {
                ok: validation.ok,
                hardFailed: validation.hardFailed,
                hasWarnings: hasQualityWarnings,
                failedChecks: validation.failedChecks,
                softWarnings: validation.softWarnings,
                warnings: validation.softWarnings,
                metrics: validation.metrics,
                thresholds: validation.thresholds
            }
        };
        stage = "inserting_post";
        logger.info("before post insert", { stage, topicId: topic.id, topic: topic.topic });
        const finalPayload = {
            topic_id: topic.id,
            title: article.title,
            slug: article.slug,
            h1: article.h1,
            excerpt: article.excerpt,
            body_markdown: article.body_markdown,
            body_html: processedContent,
            meta_title: article.meta_title,
            meta_description: article.meta_description,
            primary_keyword: seoBrief.primary_keyword,
            secondary_keywords: seoBrief.secondary_keywords,
            faq_items: article.faq_items,
            scholarship_links: article.scholarship_links,
            faq_links: article.faq_links,
            related_article_links: article.related_article_links,
            cover_image_url: uploadedImage?.publicUrl ?? null,
            cover_image_path: uploadedImage?.path ?? null,
            cover_image_alt: article.cover_image_alt,
            image_width: uploadedImage?.width ?? null,
            image_height: uploadedImage?.height ?? null,
            image_mime_type: uploadedImage?.mimeType ?? null,
            image_size_bytes: uploadedImage?.sizeBytes ?? null,
            schema_json: schemaJson,
            metrics_debug: metricsDebug,
            status,
            published_at: status === "published" ? new Date().toISOString() : null,
            word_count: wordCount,
            char_count: charCount
        };
        logger.info("[DB INSERT CHECK] sources marker presence", {
            topicId: topic.id,
            slug: article.slug,
            bodyHtmlHasStudentaid: finalPayload.body_html.includes("studentaid.gov"),
            bodyMarkdownHasStudentaid: finalPayload.body_markdown.includes("studentaid.gov")
        });
        if (process.env.DEBUG_MODE === "true") {
            const shouldAppendFallback = externalLinksAfterSanitize === 0;
            console.log(`[DEBUG_1_FLAGS] PROCESS_EXTERNAL_LINKS=${env.PROCESS_EXTERNAL_LINKS}, shouldAppendFallback=${shouldAppendFallback}`);
            console.log(`[DEBUG_2_SANITIZER] externalLinks before sanitize=${externalLinksBeforeSanitize}, after sanitize=${externalLinksAfterSanitize}`);
            console.log(`[DEBUG_3_FALLBACK] fallbackSourcesAdded=${fallbackSourcesAdded ? "yes" : "no"}`);
            console.log(`[DEBUG_4_PAYLOAD_HTML] ${finalPayload.body_html.slice(-200)}`);
            console.log(`[DEBUG_5_PAYLOAD_MD] ${finalPayload.body_markdown.slice(-200)}`);
        }
        const { error: postInsertError } = await supabase.from("content_posts").insert(finalPayload);
        if (process.env.DEBUG_MODE === "true") {
            console.log(`[DEBUG_6_SUPABASE] success=${!postInsertError}, warnings=none`, {
                error: postInsertError ? postInsertError.message : null,
                code: postInsertError?.code ?? null,
                details: postInsertError?.details ?? null,
                hint: postInsertError?.hint ?? null
            });
        }
        if (postInsertError)
            throw postInsertError;
        postInserted = true;
        logger.info("after post insert", { stage, topicId: topic.id, topic: topic.topic, slug: article.slug, status });
        if (status === "published") {
            await triggerArticleMatching({ slug: article.slug });
        }
        stage = "marking_topic_done";
        await updateTopicStatus(topic.id, "done");
        logger.info("done", { topicId: topic.id });
        return status === "published" ? "published" : "deferred";
    }
    catch (error) {
        const normalized = normalizeError(error);
        logUnknownError("job failed", error, {
            stage,
            topicId: topic?.id,
            topic: topic?.topic
        });
        let finalTopicStatus = "status_update_failed";
        try {
            if (postInserted) {
                await updateTopicStatus(topic.id, "done");
                finalTopicStatus = "done";
            }
            else if (error instanceof RequeueTopicError || isTransientPipelineError(error)) {
                await updateTopicStatus(topic.id, "queued");
                finalTopicStatus = "queued";
            }
            else {
                await updateTopicStatus(topic.id, "failed");
                finalTopicStatus = "failed";
            }
        }
        catch (statusError) {
            logUnknownError("topic status update failed", statusError, {
                topicId: topic.id,
                topic: topic.topic,
                desiredStatus: postInserted ? "done" : "failed"
            });
            if (!postInserted) {
                try {
                    await updateTopicStatus(topic.id, "queued");
                    finalTopicStatus = "queued";
                }
                catch (queueError) {
                    logUnknownError("fallback queued status update failed", queueError, {
                        topicId: topic.id,
                        topic: topic.topic
                    });
                }
            }
        }
        logger.error("content job failed final", {
            topicId: topic.id,
            topic: topic.topic,
            stage,
            error: normalized.message,
            stack: normalized.stack,
            postInserted,
            finalTopicStatus
        });
        return "deferred";
    }
}
async function main() {
    if (env.RUN_REPROCESS_ON_START) {
        await runStartupReprocess();
    }
    if (env.CONTINUOUS_MODE) {
        while (true) {
            let result = "deferred";
            try {
                result = await processOneTopic();
            }
            catch (error) {
                logUnknownError("[Cycle] uncaught loop error", error);
                continue;
            }
            if (result === "empty") {
                logger.info("[Cycle] Queue fully drained. Exiting continuous run.");
                break;
            }
            if (result === "published") {
                logger.info("[Cycle] Article published successfully. Continuing immediately without pause.");
            }
            else {
                logger.info("[Cycle] Publication failed/deferred. Retrying next topic immediately...", { result });
            }
        }
        return;
    }
    for (let i = 0; i < env.CONTENT_HUB_POSTS_PER_RUN; i += 1) {
        const result = await processOneTopic();
        if (result === "empty")
            break;
    }
}
main().catch((error) => {
    logUnknownError("fatal", error);
    process.exitCode = 1;
});
