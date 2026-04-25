import { logger } from "./logger.js";
import { fetchPublishedArticleSlugs } from "./supabase.js";
export function pickRelatedArticles(articles, currentSlug, min, max) {
    const unique = new Map();
    for (const article of articles) {
        if (article.slug === currentSlug)
            continue;
        if (!unique.has(article.slug)) {
            unique.set(article.slug, article);
        }
    }
    const selected = Array.from(unique.values()).slice(0, max).map((article) => ({
        title: article.title,
        slug: article.slug,
        reason: "Related topic for further reading"
    }));
    if (selected.length === 0) {
        console.warn("No related articles available yet, continuing without them");
    }
    else if (selected.length < min) {
        console.warn(`Related articles below soft target: got ${selected.length}, target is ${min}`);
    }
    return selected;
}
export async function verifyRelatedArticleLinks(links, articleSlug) {
    const selectedSlugs = Array.from(new Set(links
        .map((link) => link.slug.trim())
        .filter(Boolean)));
    logger.info("related article links verification started", { articleSlug, selectedSlugs });
    if (selectedSlugs.length === 0) {
        logger.info("related article links verification complete", {
            articleSlug,
            beforeCount: links.length,
            afterCount: 0
        });
        return [];
    }
    const publishedSlugs = await fetchPublishedArticleSlugs(selectedSlugs);
    const publishedSet = new Set(publishedSlugs);
    const verified = links
        .filter((link) => publishedSet.has(link.slug))
        .map((link) => ({
        title: link.title,
        slug: link.slug,
        reason: link.reason
    }));
    logger.info("related article links verification complete", {
        articleSlug,
        beforeCount: links.length,
        afterCount: verified.length,
        droppedCount: links.length - verified.length
    });
    return verified;
}
export function buildRelatedArticlePath(slug) {
    return `/content-hub/${slug}`;
}
