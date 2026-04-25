import type { ArticleContext, ArticleGenerationOptions, GeneratedArticle, ImageGenerationOptions, SeoBrief } from "./types.js";
import { getAggressiveExpansionDeltaWords, getPromptWordRange } from "./contentTargets.js";
import { shuffleSections } from "./variation.js";

const structureByType: Record<ArticleGenerationOptions["articleType"], string[]> = {
  list: ["intro", "list of scholarships", "tips", "faq"],
  guide: ["intro", "step-by-step process", "requirements", "documents", "tips", "faq"],
  strategy: ["intro", "mistakes", "tips", "strategy breakdown", "faq"],
  comparison: ["intro", "comparison sections", "pros/cons", "summary", "faq"],
  niche: ["intro", "who qualifies", "best options", "tips", "faq"],
  deep_dive: ["intro", "explanation", "examples", "implications", "faq"]
};

function buildStructureInstructions(articleType: ArticleGenerationOptions["articleType"]): string {
  const base = structureByType[articleType];
  const reorderable = ["tips", "requirements", "benefits", "mistakes"];
  const present = base.filter((item) => reorderable.includes(item));
  const shuffled = shuffleSections(present);
  let shuffledIndex = 0;

  const sections = base.map((item) => (reorderable.includes(item) ? shuffled[shuffledIndex++] : item));
  return `Target structure for article_type="${articleType}":\n${sections.map((line, index) => `${index + 1}) ${line}`).join("\n")}`;
}

const TLDR_BLOCK_TEMPLATE = `<div class="article-tldr-block" style="background-color: #f8f9fa; padding: 25px; border-left: 4px solid #2563eb; margin-top: 40px; border-radius: 6px;">
  <h3 style="margin-top: 0; color: #1e293b;">📌 Quick Summary</h3>
  <ul style="margin-bottom: 0;">
    <li><strong>Key Point 1:</strong> Description...</li>
    <li><strong>Key Point 2:</strong> Description...</li>
    <li><strong>Key Point 3:</strong> Description...</li>
  </ul>
</div>`;

export function buildSeoBriefPrompt(topic: string): string {
  return `You are an SEO strategist for a scholarships content hub.\nCreate a strict JSON object for topic: "${topic}".\nRequirements:\n- Output ONLY valid JSON (no markdown).\n- English language.\n- No fake scholarships, no fake facts.\n- Include fields: primary_keyword, secondary_keywords, slug, title, h1, meta_title, meta_description, faq_questions, article_angle, image_brief.\n- slug should be concise and URL-safe.`;
}

export function buildArticlePrompt(topic: string, seoBrief: SeoBrief, context: ArticleContext, options: ArticleGenerationOptions): string {
  const dynamicStructure = buildStructureInstructions(options.articleType);
  const { minWords, maxWords } = getPromptWordRange();
  const externalLinkRules = options.allowExternalLinks === false
    ? `- External authority links are disabled for this run. Do not add external links.`
    : `- External authority links: include 2-3 external links and follow strict allow-list policy.\n- Allowed domains only: .gov (e.g., travel.state.gov, education.gov), .edu (official university websites), unesco.org, worldbank.org, un.org, wikipedia.org (definitions only), topuniversities.com or timeshighereducation.com (rankings only).\n- You are strictly forbidden from linking to general scholarship aggregators or competitor websites.\n- External links must be contextually relevant to each paragraph topic.\n- External links must use HTML anchors in this exact format: <a href="https://..." target="_blank" rel="noopener noreferrer nofollow">descriptive anchor text</a>.\n- Use natural descriptive anchor text; never use "click here".`;

  return `Write an SEO article in clear American English for topic: "${topic}".\nSEO brief: ${JSON.stringify(seoBrief)}\nContext links: ${JSON.stringify(context)}\n\nStrict output rules:\n- Output ONLY valid JSON (no markdown fences, no commentary).\n- Output JSON fields only: title, slug, h1, excerpt, meta_title, meta_description, body_markdown, faq_items, anchor_suggestions, scholarship_match_hints, faq_links, related_article_links, cover_image_alt.
- anchor_suggestions must be an array of objects with exactly: text, intent.
- AI must never generate URLs, slugs, or HTML <a> tags inside anchor_suggestions.\n- scholarship_match_hints must be an object with arrays: audience, funding_type, degree_levels, fields, target_groups, countries, secondary_keywords.\n- Do not output scholarship_links. Backend will attach real scholarship records from database.\n- related_article_links must be an array of objects with exactly: title, slug, reason. url is optional and should be omitted unless absolutely needed for compatibility.\n- Target article length: ${minWords}-${maxWords} words.\n- Hard minimum length: ${minWords} words.\n- The article must be comprehensive, practical, useful, and SEO-strong even in a compact format.\n- Keep the same editorial building blocks as the longer version, but remove padding and repetition.\n- Avoid fluff, filler, keyword stuffing, and generic intros.\n- Do not invent non-existing scholarships or facts.\n- Include up to 3 FAQ links from provided context only (0 is allowed when unavailable).\n- Include up to 4 related article links from provided context only (0 is allowed when unavailable).\n- For related_article_links use internal article slugs from context (not full URLs).\n- At the very end of the article, you MUST generate a distinct "TL;DR / Key Takeaways" block with a condensed, punchy summary in 3-5 bullet points for users who want a quick overview.\n- Use this exact visual TL;DR HTML scaffold (replace the bullet text with article-specific insights while preserving the container/class/styles):\n${TLDR_BLOCK_TEMPLATE}\n${externalLinkRules}\n\nArticle type: ${options.articleType}\nIntro style: ${options.introStyle}\n\nDO NOT follow a fixed template.\n\nEach article must:\n- have a different structure depending on article_type\n- vary paragraph order\n- vary tone and flow\n- avoid repeating patterns from previous articles\n\nUse natural editorial writing style.\nAvoid generic AI phrasing like "In this article we will explore..."\nAvoid repeating:\n- "Discover scholarships..."\n- "In this guide..."\n- "In this article..."\n\nUse varied sentence openings.\n\n${dynamicStructure}\n\nSection quality rules:\n- Each H2 section must contain at least one substantial paragraph and either a second paragraph, a list, or a concrete example.\n- No empty or short sections allowed.\n- You may rename headings naturally as long as the intent is preserved.\n\nAction / Steps rules:\n- Must contain numbered steps (1, 2, 3...).\n- Include practical, concrete guidance for each step.\n- Keep step explanations concise but specific.\n\nFAQ rules:\n- Target 3-4 questions.\n- Each answer must be 1-3 sentences.\n- No generic answers.\n\nContent depth rules:\n- Keep the same components as the longer format: intro, H2 sections, actionable steps, FAQ, and final TL;DR.\n- Reach the compact target through practical examples, step-by-step instructions, mistakes to avoid, checklists, comparisons, eligibility tips, and application strategy advice.\n- Prefer dense, specific paragraphs over extra sections or repeated phrasing.\n- Do not increase length with repetition or vague statements.\n\nBefore returning JSON, self-check:\n- H1 is present at top,\n- there is intro text before first H2,\n- there are 4-6 H2 sections,\n- there is FAQ/Questions section,\n- there is numbered steps block,\n- TL;DR block with class "article-tldr-block" is present at the very end.`;
}

export function buildArticleExpansionPrompt(
  topic: string,
  seoBrief: SeoBrief,
  context: ArticleContext,
  article: GeneratedArticle,
  issues: string[],
  options: ArticleGenerationOptions,
  mode: "standard" | "aggressive_depth" = "standard"
): string {
  const dynamicStructure = buildStructureInstructions(options.articleType);
  const { minWords, maxWords } = getPromptWordRange();
  const externalLinkRules = options.allowExternalLinks === false
    ? `- External authority links are disabled for this run. Do not add external links.`
    : `- Keep or improve external authority links quality with strict allow-list: .gov/.edu, unesco.org, worldbank.org, un.org, wikipedia.org (definitions), topuniversities.com/timeshighereducation.com (rankings). Do not link competitors/aggregators. Keep target="_blank" and rel="noopener noreferrer nofollow".`;
  const depthRequirements = mode === "aggressive_depth"
    ? `Length and depth (aggressive retry mode):\n- Add at least ${getAggressiveExpansionDeltaWords()}+ NEW words versus the previous draft.\n- Preserve the same overall article components, but make thin sections materially more useful.\n- Add at most 1 NEW H2 section only if the draft is missing an essential angle.\n- For each weak H2, expand with concrete eligibility examples, deadline strategy, and mistakes-to-avoid.\n- Add one practical checklist and one step-by-step mini playbook.\n- Avoid paraphrasing existing text: new content must be materially different and more specific.`
    : `Length and depth:\n- Target ${minWords}-${maxWords} words, hard minimum ${minWords} words.\n- Ensure the expanded version adds missing depth/content versus previous draft, not just paraphrasing.\n- Keep the same compact structure and improve specificity instead of stretching the article back into a long-form essay.\n- Use practical examples, step-by-step instructions, mistakes to avoid, checklists, comparisons, eligibility tips, and application strategy advice.`;

  return `Expand and improve the following scholarship article JSON.\nTopic: "${topic}"\nSEO brief: ${JSON.stringify(seoBrief)}\nContext links: ${JSON.stringify(context)}\nDetected issues to fix: ${JSON.stringify(issues)}\nCurrent article JSON: ${JSON.stringify(article)}\n\nExpand the article with more practical depth, examples, checklists, and concrete guidance. Keep the same topic, structure, and SEO intent. Do not add fluff.\n\nStrict requirements:\n- Keep output as strict JSON only.\n- Keep the same JSON fields: title, slug, h1, excerpt, meta_title, meta_description, body_markdown, faq_items, anchor_suggestions, scholarship_match_hints, faq_links, related_article_links, cover_image_alt.
- Keep anchor_suggestions as an array of objects with exactly: text, intent.
- AI must never generate URLs, slugs, or HTML <a> tags inside anchor_suggestions.\n- Keep scholarship_match_hints as an object with arrays: audience, funding_type, degree_levels, fields, target_groups, countries, secondary_keywords.\n- Do not output scholarship_links. Backend will attach real scholarship records from database.\n- Keep related_article_links objects in format: title, slug, reason (url optional, do not rely on it).\n- Keep the same topic and SEO intent, but strictly fix all listed issues.\n- Do not invent non-existing scholarships or facts.\n- Keep or add a final TL;DR / Key Takeaways block at the very end of body_markdown with 3-5 concise bullet points.\n- Use this exact visual TL;DR HTML scaffold (replace the bullet text with article-specific insights while preserving the container/class/styles):\n${TLDR_BLOCK_TEMPLATE}\n${externalLinkRules}\n\nArticle type: ${options.articleType}\nIntro style: ${options.introStyle}\n\nDO NOT follow a fixed template.\n\nEach article must:\n- have a different structure depending on article_type\n- vary paragraph order\n- vary tone and flow\n- avoid repeating patterns from previous articles\n\nUse natural editorial writing style.\nAvoid generic AI phrasing like "In this article we will explore..."\nAvoid repeating:\n- "Discover scholarships..."\n- "In this guide..."\n- "In this article..."\n\nUse varied sentence openings.\n\n${dynamicStructure}\n\nSection quality rules:\n- Each H2 section must contain at least one substantial paragraph and either a second paragraph, a list, or a concrete example.\n- No empty or short sections allowed.\n- You may rename headings naturally as long as the intent is preserved.\n\nAction / Steps rules:\n- Must contain numbered steps (1, 2, 3...).\n- Include practical, concrete guidance for each step.\n\nFAQ rules:\n- Target 3-4 questions.\n- Each answer must be 1-3 sentences.\n- No generic answers.\n\n${depthRequirements}\n\nBefore returning JSON, self-check:\n- H1 is present at top,\n- there is intro text before first H2,\n- there are 4-6 H2 sections,\n- there is FAQ/Questions section,\n- there is numbered steps block,\n- TL;DR block with class "article-tldr-block" is present at the very end.`;
}

export function buildImagePrompt(topic: string, options: ImageGenerationOptions): string {
  const styleLayer = `STYLE (constant):
- Highly realistic photography, authentic camera capture
- Natural lighting only (daylight or indoor ambient)
- Editorial / documentary mood with clean academic tone
- Real-world textures, believable materials, honest color grading
- No illustration, no cartoon, no anime, no 3D render, no painting, no vector`;

  const sceneLayer = `SCENE (variable):
Topic: ${topic}
Article type: ${options.articleType}
Style profile: ${options.imageStyle}
Scene type: ${options.scene.id}
Scene direction: ${options.scene.prompt}
Scene exclusions: ${options.scene.exclusions.length > 0 ? options.scene.exclusions.join(", ") : "none"}`;

  const compositionLayer = `COMPOSITION (variable):
- Camera angle: ${options.composition.angle}
- Distance: ${options.composition.distance}
- Perspective: ${options.composition.perspective}
- Lens: 35mm or 50mm
- Preserve depth and natural spatial context
- Horizontal cover framing only (strict 16:9)
- Keep the main subject inside a centered widescreen safe area; avoid tight square framing`;

  return `${styleLayer}

${sceneLayer}

${compositionLayer}

Avoid:
text, watermark, logo, letters overlay, cartoon styling, illustration artifacts, glossy synthetic skin`;
}

export function buildShortArticleExpansionPrompt(bodyMarkdown: string, currentCount: number, minWords: number): string {
  return `The article below is too short (current: ${currentCount} words). Your goal is to expand it to at least ${minWords} words. Please add more professional insights, practical examples, and in-depth details to EACH existing section while preserving the same compact structure.
STRICT RULES:
1. Preserve the existing heading structure (#, ##, ###), lists, and section order.
2. Do not change the H1 title.
3. Do not just repeat the same ideas — provide new, valuable information.
4. Do not remove existing internal or external links.
5. Keep or add the final TL;DR block with class "article-tldr-block" at the very end of the article.
6. Add only enough content to make each section complete; do not turn it into a long-form essay.
7. Return ONLY the enhanced markdown content.

Article content:
${bodyMarkdown}`;
}
