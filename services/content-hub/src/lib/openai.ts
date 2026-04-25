import OpenAI, { APIError } from "openai";
import slugify from "slugify";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { getEffectiveMinCharsNoSpaces, getEffectiveMinWords } from "./contentTargets.js";
import { markdownToHtml } from "./html.js";
import { logger } from "./logger.js";
import { countCharsNoSpaces, countWords } from "./markdown.js";
import { buildArticleExpansionPrompt, buildArticlePrompt, buildSeoBriefPrompt, buildShortArticleExpansionPrompt } from "./prompts.js";
import { articleSchema, seoBriefSchema } from "./validators.js";
import type { ArticleContext, ArticleGenerationOptions, GeneratedArticle, SeoBrief } from "./types.js";

const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

function resolveModel(modelFromEnv: string | undefined): string {
  const candidate = (modelFromEnv ?? "").trim();
  return candidate.length > 0 ? candidate : "gpt-4.1-mini";
}

function logAiCall(taskName: string, model: string): void {
  logger.info(`[AI] Calling ${model} for ${taskName}...`);
}

function logOpenAiFailure(taskName: string, model: string, error: unknown): void {
  if (error instanceof APIError) {
    logger.error("OpenAI API error", {
      taskName,
      model,
      status: error.status,
      code: error.code,
      message: error.message,
      type: error.type
    });
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  logger.error("OpenAI call failed", { taskName, model, message });
}

/**
 * Chat Completions — works across model ids that may not support the Responses API (`client.responses.create`).
 */
async function chatCompletionText(params: {
  model: string;
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  taskName: string;
  jsonMode?: boolean;
}): Promise<string> {
  const { model, messages, taskName, jsonMode } = params;
  logAiCall(taskName, model);
  try {
    const completion = await client.chat.completions.create(
      {
        model,
        messages,
        temperature: 0.45,
        max_completion_tokens: env.OPENAI_MAX_COMPLETION_TOKENS,
        ...(jsonMode ? { response_format: { type: "json_object" as const } } : {})
      },
      { timeout: env.OPENAI_REQUEST_TIMEOUT_MS }
    );
    const raw = completion.choices[0]?.message?.content?.trim();
    const finish = completion.choices[0]?.finish_reason;
    if (!raw) {
      logger.error("OpenAI chat returned empty content", {
        taskName,
        model,
        finish_reason: finish,
        id: completion.id
      });
      throw new Error(`OpenAI chat returned empty content (finish_reason=${finish ?? "unknown"})`);
    }
    return raw;
  } catch (e) {
    logOpenAiFailure(taskName, model, e);
    throw e;
  }
}

async function generateJson(prompt: string, taskName: string, model: string): Promise<unknown> {
  const raw = await chatCompletionText({
    model,
    taskName,
    jsonMode: true,
    messages: [
      {
        role: "system",
        content:
          "You output only a single valid JSON object. No markdown code fences, no commentary before or after the JSON."
      },
      { role: "user", content: prompt }
    ]
  });
  try {
    return JSON.parse(raw) as unknown;
  } catch (e) {
    logger.error("JSON parse failed for AI output", {
      taskName,
      model,
      preview: raw.slice(0, 2000),
      parseError: e instanceof Error ? e.message : String(e)
    });
    throw e;
  }
}

const INTRO_REPEAT_PATTERNS = [/discover scholarships/i, /in this guide/i, /in this article/i];

function safeSlug(slug: string): string {
  return slugify(slug, { lower: true, strict: true, trim: true });
}

const MIN_H2_SECTIONS = 6;
const MAX_H2_SECTIONS = 10;

const HEADING_NORMALIZATION_RULES: Array<{ canonical: string; patterns: RegExp[] }> = [
  {
    canonical: "What This Scholarship Topic Means",
    patterns: [/what this .* means/i, /why this matters/i, /introduction/i, /overview/i]
  },
  {
    canonical: "Who Should Care About This Opportunity",
    patterns: [/who should/i, /who can apply/i, /who is eligible/i]
  },
  {
    canonical: "How to Qualify or What to Check",
    patterns: [/qualif/i, /eligib/i, /requirements?/i, /what to check/i]
  },
  {
    canonical: "Common Mistakes to Avoid",
    patterns: [/mistakes?/i, /avoid/i, /pitfalls?/i]
  },
  {
    canonical: "Step-by-Step Action Plan",
    patterns: [/step/i, /how to/i, /action plan/i, /roadmap/i, /plan/i]
  },
  {
    canonical: "Related Scholarship Opportunities",
    patterns: [/related/i, /other scholarships?/i, /alternatives?/i]
  },
  {
    canonical: "Frequently Asked Questions",
    patterns: [/\bfaq\b/i, /questions?/i]
  },
  {
    canonical: "Final Takeaway and Next Steps",
    patterns: [/next steps?/i, /final/i, /takeaway/i, /conclusion/i]
  }
];

function sentenceCount(text: string): number {
  return text
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
}

function normalizeHeadingTitle(title: string): string {
  const clean = title.trim().toLowerCase();
  for (const rule of HEADING_NORMALIZATION_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(clean))) {
      return rule.canonical;
    }
  }
  return title.trim();
}

function validateArticleStructure(article: GeneratedArticle): string[] {
  const issues: string[] = [];
  const body = article.body_markdown || "";
  const lines = body.split("\n");
  const trimmedLines = lines.map((line) => line.trim());

  const h1Lines = trimmedLines.filter((line) => /^#\s+/.test(line));
  if (h1Lines.length !== 1 || !/^#\s+/.test(trimmedLines[0] || "")) {
    issues.push("Body must contain exactly one H1 at the top.");
  }

  const h2Matches = [...body.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim());
  if (h2Matches.length < MIN_H2_SECTIONS || h2Matches.length > MAX_H2_SECTIONS) {
    issues.push(`Expected ${MIN_H2_SECTIONS}-${MAX_H2_SECTIONS} H2 sections, got ${h2Matches.length}.`);
  }

  const normalizedH2Matches = h2Matches.map(normalizeHeadingTitle);
  const hasFaqSection = normalizedH2Matches.some((title) => /Frequently Asked Questions/i.test(title));
  if (!hasFaqSection) {
    issues.push('Missing FAQ section (expected heading containing "FAQ" or "Questions").');
  }

  const firstH2Index = trimmedLines.findIndex((line) => /^##\s+/.test(line));
  if (firstH2Index > 1) {
    const introLines = lines.slice(1, firstH2Index);
    const introText = introLines.join("\n");
    const introParagraphs = introText.split(/\n\s*\n/).map((chunk) => chunk.trim()).filter(Boolean);
    if (introParagraphs.length < 1) {
      issues.push("Missing introduction before first H2 section.");
    }
  } else {
    issues.push("Missing introduction before first H2 section.");
  }

  const sectionRanges = h2Matches.map((title, index) => {
    const headingLine = `## ${title}`;
    const sectionStart = lines.findIndex((line) => line.trim() === headingLine);
    const sectionEnd = index === h2Matches.length - 1
      ? lines.length
      : lines.findIndex((line, lineIndex) => lineIndex > sectionStart && /^##\s+/.test(line.trim()));
    return {
      title,
      normalizedTitle: normalizeHeadingTitle(title),
      start: sectionStart,
      end: sectionEnd === -1 ? lines.length : sectionEnd
    };
  }).filter((section) => section.start >= 0);

  const actionSection = sectionRanges.find((section) =>
    /step|how to|action plan|plan/i.test(section.title) || /Step-by-Step Action Plan/i.test(section.normalizedTitle)
  );
  const actionSourceLines = actionSection
    ? lines.slice(actionSection.start + 1, actionSection.end)
    : lines;
  const numberedSteps = actionSourceLines.map((line) => line.trim()).filter((line) => /^\d+\.\s+/.test(line));
  if (numberedSteps.length < 3) {
    issues.push("Missing actionable step-by-step block (expected numbered list like 1., 2., 3.).");
  }

  if (article.faq_items.length < 3 || article.faq_items.length > 5) {
    issues.push(`FAQ must contain 3-5 items; got ${article.faq_items.length}.`);
  }

  article.faq_items.forEach((item, index) => {
    const sc = sentenceCount(item.answer);
    if (sc < 2 || sc > 4) {
      issues.push(`FAQ answer #${index + 1} must have 2-4 sentences; got ${sc}.`);
    }
  });

  const normalizedBody = body.trim();
  const hasTldrBlock = /<div\b[^>]*class=["'][^"']*\barticle-tldr-block\b[^"']*["'][^>]*>[\s\S]*<\/div>\s*$/i.test(normalizedBody);
  if (!hasTldrBlock) {
    issues.push("Missing final TL;DR block with class article-tldr-block at the end of body_markdown.");
  }

  return issues;
}

function hasTopH1(bodyMarkdown: string): boolean {
  const trimmedLines = (bodyMarkdown || "").split("\n").map((line) => line.trim());
  const h1Lines = trimmedLines.filter((line) => /^#\s+/.test(line));
  return h1Lines.length === 1 && /^#\s+/.test(trimmedLines[0] || "");
}

function hasTopHtmlH1(bodyHtml: string): boolean {
  return /^<h1(?:\s[^>]*)?>/i.test((bodyHtml || "").trimStart());
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function splitIntro(bodyMarkdown: string): { intro: string; rest: string } {
  const match = bodyMarkdown.match(/\n##\s+/);
  if (!match || typeof match.index !== "number") {
    return { intro: bodyMarkdown, rest: "" };
  }
  return {
    intro: bodyMarkdown.slice(0, match.index).trimEnd(),
    rest: bodyMarkdown.slice(match.index).trimStart()
  };
}

function shouldRegenerateIntro(bodyMarkdown: string): boolean {
  const { intro } = splitIntro(bodyMarkdown);
  return INTRO_REPEAT_PATTERNS.some((pattern) => pattern.test(intro));
}

async function rewriteIntro(article: GeneratedArticle, options: ArticleGenerationOptions): Promise<GeneratedArticle> {
  const { intro, rest } = splitIntro(article.body_markdown);
  if (!intro.trim() || !rest.trim()) return article;
  const originalIntroWords = countWords(intro);
  const minIntroWords = Math.max(40, Math.floor(originalIntroWords * 0.6));

  const rewritePrompt = `Rewrite ONLY the intro block below in natural editorial English.\n\nArticle type: ${options.articleType}\nIntro style: ${options.introStyle}\n\nRules:\n- keep meaning and SEO intent\n- avoid repeating phrases: "Discover scholarships", "In this guide", "In this article"\n- use varied sentence openings\n- no markdown code fences\n- output plain markdown intro only (start with # heading and intro paragraphs)\n\nCurrent intro:\n${intro}`;

  const rewrittenIntro = await chatCompletionText({
    model: resolveModel(env.OPENAI_MODEL_STANDARD),
    taskName: "intro_rewrite",
    messages: [{ role: "user", content: rewritePrompt }]
  });
  if (!rewrittenIntro) return article;
  const rewrittenIntroWords = countWords(rewrittenIntro);
  if (rewrittenIntroWords < minIntroWords) {
    logger.warn("intro rewrite too short, keeping original intro", {
      slug: article.slug,
      articleType: options.articleType,
      introStyle: options.introStyle,
      originalIntroWords,
      rewrittenIntroWords,
      minIntroWords
    });
    return article;
  }

  return {
    ...article,
    body_markdown: `${rewrittenIntro}\n\n${rest}`.trim()
  };
}

async function autoFixMissingH1(article: GeneratedArticle): Promise<GeneratedArticle> {
  const h1 = article.h1?.trim();
  const bodyMarkdown = article.body_markdown || "";

  if (!h1) {
    throw new Error("Article invalid: h1 missing in article JSON.");
  }

  if (!bodyMarkdown.trim()) {
    throw new Error("Article invalid: body is empty.");
  }

  const bodyHtml = await markdownToHtml(bodyMarkdown);
  const missingMarkdownH1 = !hasTopH1(bodyMarkdown);
  const missingHtmlH1 = !hasTopHtmlH1(bodyHtml);

  if (missingMarkdownH1 || missingHtmlH1) {
    logger.warn("missing H1 detected, auto-prepending H1", {
      title: article.title,
      slug: article.slug,
      missingMarkdownH1,
      missingHtmlH1
    });
  }

  const fixedMarkdown = missingMarkdownH1
    ? `# ${h1}\n\n${bodyMarkdown}`
    : bodyMarkdown;
  const fixedHtml = missingHtmlH1
    ? `<h1>${escapeHtml(h1)}</h1>\n${bodyHtml}`
    : bodyHtml;

  if (!hasTopH1(fixedMarkdown) || !hasTopHtmlH1(fixedHtml)) {
    throw new Error("Article invalid: unable to recover missing H1 at top.");
  }

  return {
    ...article,
    body_markdown: fixedMarkdown
  };
}

export async function generateSeoBrief(topic: string): Promise<SeoBrief> {
  const raw = await generateJson(buildSeoBriefPrompt(topic), "seo_brief_generation", resolveModel(env.OPENAI_MODEL_STANDARD));
  try {
    const parsed = seoBriefSchema.parse(raw);
    return {
      ...parsed,
      slug: safeSlug(parsed.slug || parsed.primary_keyword || topic)
    };
  } catch (e) {
    if (e instanceof ZodError) {
      logger.error("seo_brief JSON failed schema validation", {
        issues: e.flatten(),
        rawPreview: JSON.stringify(raw).slice(0, 2500)
      });
    }
    throw e;
  }
}

export async function generateArticle(
  topic: string,
  seoBrief: SeoBrief,
  context: ArticleContext,
  options: ArticleGenerationOptions
): Promise<GeneratedArticle> {
  const minWords = getEffectiveMinWords();
  const minCharsNoSpaces = getEffectiveMinCharsNoSpaces();
  const standardModel = resolveModel(env.OPENAI_MODEL_STANDARD);
  const smartModel = resolveModel(env.OPENAI_MODEL_SMART);
  const firstRaw = await generateJson(buildArticlePrompt(topic, seoBrief, context, options), "article_generation", standardModel);
  const firstParsed = articleSchema.parse(firstRaw);
  const firstArticleBase = {
    ...firstParsed,
    slug: safeSlug(firstParsed.slug || seoBrief.slug || topic)
  };
  let firstArticle = await autoFixMissingH1(firstArticleBase);
  if (shouldRegenerateIntro(firstArticle.body_markdown)) {
    firstArticle = await rewriteIntro(firstArticle, options);
  }

  const wordCount = countWords(firstArticle.body_markdown);
  const charCount = countCharsNoSpaces(firstArticle.body_markdown);
  const belowMinWords = wordCount < minWords;
  const belowMinChars = charCount < minCharsNoSpaces;
  const missingTopH1 = !hasTopH1(firstArticle.body_markdown);
  const structureIssues = validateArticleStructure(firstArticle);
  if (!belowMinWords && !belowMinChars && !missingTopH1) {
    if (structureIssues.length > 0) {
      logger.warn("article structure soft validation warnings", {
        topic,
        title: firstArticle.title,
        slug: firstArticle.slug,
        structureIssues
      });
    }
    return firstArticle;
  }

  logger.warn("article failed critical checks, retrying with expansion prompt", {
    topic,
    title: firstArticle.title,
    slug: firstArticle.slug,
    wordCount,
    charCount,
    missingTopH1,
    structureIssues
  });

  const retryIssues = [
    ...(missingTopH1 ? ["Body must contain exactly one H1 at the top."] : []),
    ...(belowMinWords ? [`Word count below minimum ${minWords} (got ${wordCount}).`] : []),
    ...(belowMinChars ? [`Char count below minimum ${minCharsNoSpaces} (got ${charCount}).`] : []),
    ...structureIssues
  ];

  const retryRaw = await generateJson(
    buildArticleExpansionPrompt(topic, seoBrief, context, firstArticle, retryIssues, options),
    "article_expansion_retry",
    smartModel
  );
  const retryParsed = articleSchema.parse(retryRaw);
  const retryArticleBase = {
    ...retryParsed,
    slug: safeSlug(retryParsed.slug || seoBrief.slug || topic)
  };
  let retryArticle = await autoFixMissingH1(retryArticleBase);
  if (shouldRegenerateIntro(retryArticle.body_markdown)) {
    retryArticle = await rewriteIntro(retryArticle, options);
  }
  const retryWordCount = countWords(retryArticle.body_markdown);
  const retryCharCount = countCharsNoSpaces(retryArticle.body_markdown);
  logger.info("article expansion retry comparison", {
    topic,
    slug: retryArticle.slug,
    initialWordCount: wordCount,
    retryWordCount,
    deltaWords: retryWordCount - wordCount,
    initialCharCount: charCount,
    retryCharCount,
    deltaChars: retryCharCount - charCount
  });
  if (retryWordCount <= wordCount) {
    logger.warn("article expansion retry did not increase body depth", {
      topic,
      slug: retryArticle.slug,
      initialWordCount: wordCount,
      retryWordCount
    });

    const aggressiveRetryIssues = [
      ...retryIssues,
      `Expansion retry did not improve depth (initial words: ${wordCount}, retry words: ${retryWordCount}).`,
      "Add materially new sections and practical details; do not paraphrase previous text."
    ];
    const aggressiveRetryRaw = await generateJson(
      buildArticleExpansionPrompt(topic, seoBrief, context, retryArticle, aggressiveRetryIssues, options, "aggressive_depth"),
      "article_expansion_aggressive_retry",
      smartModel
    );
    const aggressiveRetryParsed = articleSchema.parse(aggressiveRetryRaw);
    let aggressiveRetryArticle = await autoFixMissingH1({
      ...aggressiveRetryParsed,
      slug: safeSlug(aggressiveRetryParsed.slug || seoBrief.slug || topic)
    });
    if (shouldRegenerateIntro(aggressiveRetryArticle.body_markdown)) {
      aggressiveRetryArticle = await rewriteIntro(aggressiveRetryArticle, options);
    }
    const aggressiveRetryWordCount = countWords(aggressiveRetryArticle.body_markdown);
    const aggressiveRetryCharCount = countCharsNoSpaces(aggressiveRetryArticle.body_markdown);
    logger.info("article expansion aggressive retry comparison", {
      topic,
      slug: aggressiveRetryArticle.slug,
      retryWordCount,
      aggressiveRetryWordCount,
      deltaWords: aggressiveRetryWordCount - retryWordCount,
      retryCharCount,
      aggressiveRetryCharCount,
      deltaChars: aggressiveRetryCharCount - retryCharCount
    });
    if (aggressiveRetryWordCount > retryWordCount) {
      retryArticle = aggressiveRetryArticle;
    } else {
      logger.warn("article expansion aggressive retry still did not increase body depth", {
        topic,
        slug: aggressiveRetryArticle.slug,
        retryWordCount,
        aggressiveRetryWordCount
      });
    }
  }
  const retryStructureIssues = validateArticleStructure(retryArticle);
  if (retryStructureIssues.length > 0) {
    logger.warn("article structure soft validation warnings after retry", {
      topic,
      title: retryArticle.title,
      slug: retryArticle.slug,
      structureIssues: retryStructureIssues
    });
  }

  return retryArticle;
}

export async function expandShortArticleBody(bodyMarkdown: string, currentCount: number, minWords: number): Promise<string> {
  const prompt = buildShortArticleExpansionPrompt(bodyMarkdown, currentCount, minWords);
  const model = resolveModel(env.OPENAI_MODEL_SMART);
  return chatCompletionText({
    model,
    taskName: "short_article_expansion",
    messages: [{ role: "user", content: prompt }]
  });
}

export async function addExternalAuthorityLinksToHtml(bodyHtml: string): Promise<string> {
  const prompt = `Analyze the HTML content below. Insert 2-3 relevant external links to official high-authority sites (.gov, .edu, university portals) without changing the text structure. Return updated HTML only.\n\nHTML:\n${bodyHtml}`;
  const model = resolveModel(env.OPENAI_MODEL_SMART);
  return chatCompletionText({
    model,
    taskName: "external_links_revision",
    messages: [{ role: "user", content: prompt }]
  });
}

export async function autoFixArticleByMetrics(bodyMarkdown: string, metricsErrors: string[]): Promise<string> {
  const prompt = `The article failed quality checks due to the following issues: ${JSON.stringify(metricsErrors)}.
Please rewrite only the problematic parts of the content to fix these issues while maintaining the length and informative value.
DO NOT remove external or internal links.
Return ONLY valid markdown content.

Content:
${bodyMarkdown}`;
  const model = resolveModel(env.OPENAI_MODEL_SMART);
  return chatCompletionText({
    model,
    taskName: "metrics_auto_fix",
    messages: [{ role: "user", content: prompt }]
  });
}
