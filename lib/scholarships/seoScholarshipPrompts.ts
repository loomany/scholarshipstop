/**
 * OpenAI prompt builders for scripts/generate-seo-scholarship-ai.ts.
 * Bump OPENAI_SEO_PROMPT_VERSION when changing instructions (e.g. v4).
 */

import {
  SEO_AI_HOW_BULLET_WORDS_MIN,
  SEO_AI_INTRO_WORDS_MIN,
  SEO_AI_SUPPORTING_WORDS_MIN,
  SEO_AI_WHO_BULLET_WORDS_MIN
} from './seoScholarshipContentQuality';

export type SeoPagePromptInput = {
  slug: string;
  pageType: string;
  h1Fallback: string;
  metaTitleFallback: string;
  metaDescriptionFallback: string;
  scholarshipsCount?: number;
  sampleTitles: string[];
  promptVersion: string;
  contextBlock: string;
};

export type SeoEnhancePriorMeta = {
  seo_title: string;
  seo_description: string;
  h1: string;
};

export type SeoEnhancePriorBody = {
  intro: string;
  supporting: string;
  related_intro: string | null;
  who_for: string[];
  how_to_use: string[];
};

export type SeoEnhancePriorFaq = {
  faq: { question: string; answer: string }[];
};

const SHARED_RULES = `Hard rules:
- **No digits anywhere** in your output fields (no 0–9, no $123, no “28 scholarships”, no years, no percentages). Scholarship counts, award amounts, and ranges are rendered live from the database in the page shell—your job is qualitative copy only.
- Facts: use ONLY what appears in the CONTEXT block for themes (filters, topics, sample titles). Never invent GPA rules, sponsor names, approval odds, or calendar dates not present in context.
- Dollar amounts: never write $ or numeric award figures. Say that amounts and payout wording vary by listing and must be confirmed on the official program page.
- Deadlines: never fabricate a single deadline for the whole page; speak in generalities (“deadlines differ by program”) unless CONTEXT explicitly includes a dated fact you are quoting verbatim (still without adding new digits—prefer “vary by row”).
- Tone: clear, practical, human, confident but not salesy. No keyword stuffing. Not robotic.
- Avoid generic landing-page filler and “AI obvious” transitions.
- Do NOT open the intro with tired patterns such as: “Browse scholarships…”, “This page helps…”, “This page is designed…”, “Welcome to…”, “Whether you are a student…”, “In our USA catalog…”, “Students and applicants can save time…”, “Majors and applicants can…”.
- Start the intro with the search intent (what someone is trying to solve) or a concrete observation tied to this filter slice.
- When CONTEXT implies listings exist, signal scale **without numbers** (e.g. “this filtered view”, “these rows”, “the programs below”, “a focused set of listings”)—never state how many.
- Do not repeat the H1 verbatim as the first clause of the intro; vary wording.
- who_for / how_to_use must be bullet strings that a real editor would ship—no empty labels like “Students who need scholarships” or “People looking for opportunities”. No fluff like “field-aligned opportunities”, “filter-friendly browsing”, “strong overlap with STEM funding”.`;

export function buildSeoMetaPrompt(input: SeoPagePromptInput): string {
  const samples =
    input.sampleTitles.length > 0
      ? input.sampleTitles.map((t) => `- ${t}`).join('\n')
      : '(none)';
  return `You write SEO title, meta description, and on-page H1 for a USA scholarship directory filter page.

${SHARED_RULES}

seo_title: compelling, under ~60 chars when possible, not identical to H1; **no digits**.
seo_description: max ~155 chars; include utility + honest scope; **no digits** (no counts or dollar amounts).
h1: short, intent-forward headline (often 42–62 chars); specific to THIS filter; **no digits** (no “N scholarships” in the headline).

--- CONTEXT ---
${input.contextBlock}
---

Prompt version: ${input.promptVersion}
Sample listing titles (voice only):
${samples}

Fallback title: ${input.metaTitleFallback}
Fallback description: ${input.metaDescriptionFallback}
Fallback H1 candidate: ${input.h1Fallback}

Return JSON only: { "seo_title": string, "seo_description": string, "h1": string }`;
}

/**
 * Light refresh for pages that already rank: keep keywords and intent; sync facts with CONTEXT.
 */
export function buildSeoEnhanceMetaPrompt(
  input: SeoPagePromptInput,
  prior: SeoEnhancePriorMeta
): string {
  return `You revise SEO meta for an EXISTING USA scholarship filter page. ENHANCE mode — not a full rewrite.

Goals:
- Preserve the page’s primary keywords, topic focus, and commercial/search intent.
- Keep h1 and seo_title recognizably the same page (minor polish OK; avoid swapping to a totally different angle).
- Do not add listing counts or digits; scale is shown in the UI.
- Improve clarity and readability of seo_description in small steps; do not invent stats or deadlines.

Hard rules:
- Facts only from CONTEXT. No fake GPA, sponsors, odds, or calendar dates.
- No dollar figures or digits in meta fields.

--- CONTEXT ---
${input.contextBlock}
---

Current (do not discard lightly):
- seo_title: ${prior.seo_title}
- seo_description: ${prior.seo_description}
- h1: ${prior.h1}

Fallbacks if something was empty: title ${input.metaTitleFallback}, description ${input.metaDescriptionFallback}, H1 ${input.h1Fallback}

Slug: ${input.slug}
Prompt version: ${input.promptVersion}

Return JSON only: { "seo_title": string, "seo_description": string, "h1": string }`;
}

export function buildSeoEnhanceMetaRetryPrompt(
  input: SeoPagePromptInput,
  prior: SeoEnhancePriorMeta,
  reasons: string[]
): string {
  return `${buildSeoEnhanceMetaPrompt(input, prior)}

RETRY — previous JSON failed checks. Fix while staying in ENHANCE mode (keep keywords and page identity).
${reasons.map((r) => `- ${r}`).join('\n')}
Return the same JSON shape.`;
}

export function buildSeoPagePrompt(input: SeoPagePromptInput): string {
  const samples =
    input.sampleTitles.length > 0
      ? input.sampleTitles.map((t) => `- ${t}`).join('\n')
      : '(none)';
  return `You write the main on-page copy for ONE USA scholarship catalog filter view.

${SHARED_RULES}

Field specs:
- intro: single paragraph, ~90–160 words. Open with intent or a concrete angle for THIS slice (see CONTEXT: tokens, categories). Describe variability of awards/deadlines/requirements in words only—**no digits**.
- supporting: single paragraph, ~60–120 words. Add practical value: how to interpret the list, what to compare, why this slice is worth scanning—without repeating the intro.
- related_intro: one short paragraph (40–90 words) OR JSON null if it would repeat the supporting text. Should tee up “related pages” navigation in plain language (not generic “explore more opportunities”).
- who_for: array of EXACTLY 3–5 bullet strings. Each bullet starts with a capital letter, no leading "•" in the string. Concrete reader profiles tied to this filter (e.g. state, topic, no-essay, education level)—never empty platitudes.
- how_to_use: array of EXACTLY 3–5 bullet strings. Action-oriented steps: compare deadlines, scan award text, read requirement lines, open official pages, shortlist, verify on sponsor site.

--- CONTEXT ---
${input.contextBlock}
---

Slug: ${input.slug}
Page type: ${input.pageType}
Listing count in CONTEXT (for your reasoning only—do NOT print this number): ${input.scholarshipsCount ?? 'unknown'}
Prompt version: ${input.promptVersion}
Sample titles:
${samples}

Return JSON only:
{
  "intro": string,
  "supporting": string,
  "related_intro": string | null,
  "who_for": string[],
  "how_to_use": string[]
}`;
}

const ENHANCE_BODY_RULES = `ENHANCE mode (ranking-safe refresh):
- Preserve the page’s core meaning, topic, and important keyword phrases from the CURRENT COPY below.
- Do not change the overall structure: same JSON fields; keep who_for and how_to_use at EXACTLY 3–5 items each (same count as before unless prior had wrong length—then output 3–5).
- Refresh qualitative scale wording (no digits) if CONTEXT implies listings exist or not. Remove stale “no listings” tone if CONTEXT shows matches.
- Strengthen the intro: clearer sentences, better flow, still one paragraph; do not pivot to a new topic.
- supporting: light polish only; do not duplicate the intro.
- related_intro: keep, shorten, or set null if redundant; do not add a second competing narrative.
- Bullets: keep the same intent per slot; you may tighten wording for readability.
- Facts: only from CONTEXT for themes (filters, samples). **No digits** in any field; same qualitative dollar/deadline rules as production.`;

export function buildSeoEnhancePagePrompt(
  input: SeoPagePromptInput,
  prior: SeoEnhancePriorBody
): string {
  const priorJson = JSON.stringify(prior, null, 2);
  return `You improve on-page copy for an EXISTING USA scholarship filter page.

${ENHANCE_BODY_RULES}

${SHARED_RULES}

--- CONTEXT ---
${input.contextBlock}
---

CURRENT COPY (revise from this — do not start from scratch):
${priorJson}

Slug: ${input.slug}
Listing count from CONTEXT (reasoning only—never output digits): ${input.scholarshipsCount ?? 'unknown'}
Prompt version: ${input.promptVersion}

Return JSON only:
{
  "intro": string,
  "supporting": string,
  "related_intro": string | null,
  "who_for": string[],
  "how_to_use": string[]
}`;
}

/**
 * Second-pass body generation: maps QA failures to explicit length / scale / dollar instructions.
 */
export function buildBodyQaRetryPrompt(
  input: SeoPagePromptInput,
  failedReasons: string[],
  failedWarnings: string[]
): string {
  const reasonBlock =
    failedReasons.length > 0
      ? failedReasons.map((r) => `- ${r}`).join('\n')
      : '- (shape/parsing issue — re-read field specs)';
  const warnBlock =
    failedWarnings.length > 0
      ? `\nNon-blocking warnings (still fix if applicable):\n${failedWarnings.map((w) => `- ${w}`).join('\n')}\n`
      : '\n';

  return `${buildSeoPagePrompt(input)}

RETRY — the previous JSON failed automated checks. Regenerate intro, supporting, related_intro, who_for, and how_to_use from scratch (do not patch one sentence). Same JSON shape only; no markdown.

What went wrong:
${reasonBlock}
${warnBlock}
Hit these targets so validation passes:
- intro: at least ${SEO_AI_INTRO_WORDS_MIN} words; lead with search intent or a concrete observation about THIS filter; **no digits**; use qualitative scale (“this filtered slice”, “the rows below”) when CONTEXT implies listings exist.
- supporting: at least ${SEO_AI_SUPPORTING_WORDS_MIN} words; new angle vs intro (how to read rows, compare deadlines/awards, verify on sponsor sites).
- who_for: exactly 3–5 bullets; each bullet at least ${SEO_AI_WHO_BULLET_WORDS_MIN} words; specific reader profiles for this slice.
- how_to_use: exactly 3–5 bullets; each at least ${SEO_AI_HOW_BULLET_WORDS_MIN} words; concrete actions (sort, read requirement line, open official page, shortlist).
- Never write $ amounts or other digits in intro/supporting/bullets.
- No calendar dates in intro/supporting unless present in CONTEXT (and still avoid adding new digits).

Return JSON only:
{
  "intro": string,
  "supporting": string,
  "related_intro": string | null,
  "who_for": string[],
  "how_to_use": string[]
}`;
}

export function buildEnhanceBodyQaRetryPrompt(
  input: SeoPagePromptInput,
  prior: SeoEnhancePriorBody,
  failedReasons: string[],
  failedWarnings: string[]
): string {
  const reasonBlock =
    failedReasons.length > 0
      ? failedReasons.map((r) => `- ${r}`).join('\n')
      : '- (shape issue)';
  const warnBlock =
    failedWarnings.length > 0
      ? `\nWarnings:\n${failedWarnings.map((w) => `- ${w}`).join('\n')}\n`
      : '\n';

  return `${buildSeoEnhancePagePrompt(input, prior)}

RETRY — output failed validation. Fix issues while staying in ENHANCE mode (keep prior meaning and keywords; satisfy length/scale/dollar rules).
What failed:
${reasonBlock}
${warnBlock}
Targets: intro ≥ ${SEO_AI_INTRO_WORDS_MIN} words, supporting ≥ ${SEO_AI_SUPPORTING_WORDS_MIN} words, bullets ≥ ${SEO_AI_WHO_BULLET_WORDS_MIN} / ${SEO_AI_HOW_BULLET_WORDS_MIN} words each, qualitative scale when CONTEXT implies listings—**zero digits**.

Return JSON only:
{
  "intro": string,
  "supporting": string,
  "related_intro": string | null,
  "who_for": string[],
  "how_to_use": string[]
}`;
}

export function buildSeoFaqPrompt(input: SeoPagePromptInput): string {
  return `Write 2–4 FAQ items for this scholarship FILTER page (not a single program).

${SHARED_RULES}

Each answer: 2–4 sentences, practical, grounded in “catalog + official sources” framing. **No digits** (no counts, $, years, or GPA numbers). Prefer guidance on how to use the list, what varies row-to-row, and how to verify details.

--- CONTEXT ---
${input.contextBlock}
---

Slug: ${input.slug}
H1 candidate: ${input.h1Fallback}
Prompt version: ${input.promptVersion}

Return JSON only: { "faq": [ { "question": string, "answer": string } ] }`;
}

export function buildSeoEnhanceFaqPrompt(
  input: SeoPagePromptInput,
  prior: SeoEnhancePriorFaq | null
): string {
  const priorBlock =
    prior && prior.faq.length > 0
      ? `Current FAQ (keep questions when still accurate; refresh answers with CONTEXT; light edits only):\n${JSON.stringify(prior.faq, null, 2)}`
      : 'No prior FAQ — write 2–4 new items consistent with CONTEXT.';
  return `You refresh FAQ for an EXISTING USA scholarship filter page. ENHANCE mode.

${priorBlock}

Rules:
- **No digits** in questions or answers.
- Keep practical “how to use this list” framing.
- 2–4 items; each answer 2–4 sentences.

${SHARED_RULES}

--- CONTEXT ---
${input.contextBlock}
---

Slug: ${input.slug}
Prompt version: ${input.promptVersion}

Return JSON only: { "faq": [ { "question": string, "answer": string } ] }`;
}

export function buildSeoMetaRetryPrompt(
  input: SeoPagePromptInput,
  reasons: string[]
): string {
  return `${buildSeoMetaPrompt(input)}

RETRY — previous JSON failed checks:
${reasons.map((r) => `- ${r}`).join('\n')}
Fix only what is wrong; keep facts accurate. Return the same JSON shape.`;
}
