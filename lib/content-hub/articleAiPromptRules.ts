/**
 * Cover images for `content_posts` (Resources / Content Hub listing): use **FLUX.1 [dev]** only —
 * `fal-ai/flux/dev` via `tryResolveResourceCoverImageUrl` in `resourceCoverFromFlux.ts`.
 * Do not use Nano Banana for resource covers. Essay Hub heroes are also FLUX-only (no env switch).
 */

/**
 * Append this block to your article-generation system prompt (Codex / OpenAI).
 * AI must not emit links; backend `runArticleScholarshipMatchingPipeline` owns URLs.
 */
export const CONTENT_HUB_ARTICLE_NO_LINKS_RULE = `
IMPORTANT:
Do not include any links.
Do not generate URLs.
Do not use anchor tags or markdown links.
Write plain article content only (headings and paragraphs; no <a>).
`.trim();
