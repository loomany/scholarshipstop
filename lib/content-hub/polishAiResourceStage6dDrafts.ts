/**
 * Stage 6D — polish review_needed AI resource drafts (Stage 6D batch only).
 */
import {
  hasRawInternalPath,
  linkifyInternalPathsInMarkdown,
  replaceTldrBlock
} from '@/lib/content-hub/polishAiResourceArticleMarkdown';

export const AI_RESOURCE_STAGE6D_REVIEW_SLUGS = [
  'how-to-verify-ai-generated-scholarship-lists',
  'chatgpt-prompts-for-scholarship-search',
  'ai-tools-for-international-students-looking-for-scholarships',
  'how-to-use-ai-without-missing-scholarship-deadlines',
  'scholarship-search-checklist-using-ai'
] as const;

export type AiResourceStage6dReviewSlug =
  (typeof AI_RESOURCE_STAGE6D_REVIEW_SLUGS)[number];

export {
  AI_RESOURCE_LIVE_PUBLISHED_SLUGS,
  AI_RESOURCE_STAGE6C_REVIEW_SLUGS
} from '@/lib/content-hub/polishAiResourceStage6cDrafts';

const TLDR_BULLETS: Record<AiResourceStage6dReviewSlug, string[]> = {
  'how-to-verify-ai-generated-scholarship-lists': [
    '<strong>Turn AI ideas into a shortlist</strong> with eligibility signals, deadlines, award details, and provider paths.',
    '<strong>Use ScholarshipTop</strong> for structured [scholarship search](/scholarships), saved lists, and application planning.',
    '<strong>Red flags:</strong> upfront fees, guaranteed awards, or sponsors without a clear provider identity.',
    '<strong>ScholarshipTop is a scholarship workspace</strong> for research, comparison, essays, and next-step planning.'
  ],
  'chatgpt-prompts-for-scholarship-search': [
    '<strong>Prompts help you brainstorm</strong> categories and search phrases, then ScholarshipTop helps organize the useful results.',
    '<strong>Use provider-path signals</strong> before you apply or share documents.',
    '<strong>Pair ChatGPT with filters</strong> on [matching](/scholarships/hub/matches) and [category pages](/scholarships).',
    '<strong>No AI tool finds every scholarship</strong>; use ScholarshipTop to organize shortlists, deadlines, essays, and provider paths.'
  ],
  'ai-tools-for-international-students-looking-for-scholarships': [
    '<strong>International students need country + citizenship filters</strong>—not only generic “free money” searches.',
    '<strong>Stack tools:</strong> ScholarshipTop workspace, AI planner, tracker, and provider application paths.',
    '<strong>ScholarshipTop fits</strong> cross-border browsing by country, category, provider, and profile.',
    '<strong>Compare visa and enrollment signals</strong> with university, government, and provider-path context.'
  ],
  'how-to-use-ai-without-missing-scholarship-deadlines': [
    '<strong>AI helps you plan</strong>; ScholarshipTop organizes deadline and provider-path context.',
    '<strong>Build a tracker</strong> with deadline, documents, application path, and shortlist status per award.',
    '<strong>Review dates weekly</strong> during application season so your shortlist stays usable.',
    '<strong>ScholarshipTop is a scholarship workspace</strong> for deadlines, award details, shortlists, and application planning.'
  ],
  'scholarship-search-checklist-using-ai': [
    '<strong>Start with profile + goals</strong>, then use AI for search angles—not unverified award names.',
    '<strong>Run scholarship search on ScholarshipTop</strong>, then organize each shortlist item by fit, deadline, documents, and provider path.',
    '<strong>Track eligibility, deadlines, essays, and recommendations</strong> in one spreadsheet.',
    '<strong>No tool controls provider decisions</strong>; ScholarshipTop helps organize the path from search to application planning.'
  ]
};

const RELATED_READING: Record<AiResourceStage6dReviewSlug, string> = {
  'how-to-verify-ai-generated-scholarship-lists': `## Related reading

- [How to use ChatGPT to search for scholarships safely](/resources/how-to-use-chatgpt-to-search-for-scholarships)
- [Fake scholarship website red flags](/resources/fake-scholarship-website-red-flags)
- [Can ChatGPT help you find scholarships?](/resources/can-chatgpt-help-find-scholarships)
- [Browse scholarships](/scholarships)
`,
  'chatgpt-prompts-for-scholarship-search': `## Related reading

- [Can ChatGPT help you find scholarships?](/resources/can-chatgpt-help-find-scholarships)
- [Best AI tools for finding scholarships](/resources/best-ai-tools-for-finding-scholarships)
- [How to verify AI-generated scholarship lists](/resources/how-to-verify-ai-generated-scholarship-lists)
- [Scholarship matching](/scholarships/hub/matches)
`,
  'ai-tools-for-international-students-looking-for-scholarships': `## Related reading

- [Best scholarship search engines for international students](/resources/best-scholarship-search-engines-international-students)
- [Best sites to find fully funded scholarships](/resources/best-sites-to-find-fully-funded-scholarships)
- [AI scholarship search vs traditional databases](/resources/ai-scholarship-search-vs-traditional-databases)
- [Education scholarships](/scholarships/category/education)
`,
  'how-to-use-ai-without-missing-scholarship-deadlines': `## Related reading

- [Scholarship search checklist using AI](/resources/scholarship-search-checklist-using-ai)
- [ChatGPT prompts for scholarship search](/resources/chatgpt-prompts-for-scholarship-search)
- [Scholarship deadlines explained](/resources/scholarship-deadlines-explained)
- [Resources hub](/resources)
`,
  'scholarship-search-checklist-using-ai': `## Related reading

- [ChatGPT prompts for scholarship search](/resources/chatgpt-prompts-for-scholarship-search)
- [How to verify AI-generated scholarship lists](/resources/how-to-verify-ai-generated-scholarship-lists)
- [Best scholarship websites](/resources/best-scholarship-websites)
- [Profile-based matching](/scholarships/hub/matches)
`
};

const FAQ_EXPANSIONS: Record<
  AiResourceStage6dReviewSlug,
  Array<{ questionIncludes: string; answer: string }>
> = {
  'how-to-verify-ai-generated-scholarship-lists': [
    {
      questionIncludes: 'verify',
      answer: `Look for a clear provider identity, current application cycle, deadline, amount, citizenship rules, required documents, and application path. If the scholarship only appears inside an AI chat or social post, pause until you find a credible provider path.`
    }
  ],
  'chatgpt-prompts-for-scholarship-search': [
    {
      questionIncludes: 'prompt',
      answer: `Use prompts that describe your real profile—degree level, field, countries, citizenship, and activities—and ask for search categories, not “guaranteed” awards. Then use ScholarshipTop to organize promising names by eligibility, deadline, award context, and provider application path before adding them to your shortlist.`
    }
  ],
  'ai-tools-for-international-students-looking-for-scholarships': [
    {
      questionIncludes: 'international',
      answer: `Prioritize tools with country, citizenship, and degree-level filters, then compare university, government, and provider-path context for visa-related limits. AI can suggest keywords; ScholarshipTop helps organize the application-planning signals.`
    }
  ],
  'how-to-use-ai-without-missing-scholarship-deadlines': [
    {
      questionIncludes: 'deadline',
      answer: `Store each deadline in a tracker with provider-path context and set reminders at least two weeks early for essays and recommendations. Use ScholarshipTop shortlists and deadline signals to keep your application plan current.`
    }
  ],
  'scholarship-search-checklist-using-ai': [
    {
      questionIncludes: 'checklist',
      answer: `Work in order: profile, AI brainstorming, filtered search on ScholarshipTop, shortlist review, document prep, and provider-path submission. Skip any workflow that jumps straight from AI output to application without organized provider context.`
    }
  ]
};

const STRENGTHS_BLOCK: Partial<Record<AiResourceStage6dReviewSlug, string>> = {
  'how-to-verify-ai-generated-scholarship-lists': `## Strengths and limitations at a glance

**AI-generated lists — strengths:** fast brainstorming and category ideas. **Limitations:** may include closed programs, wrong citizenship rules, or invented award names.

**ScholarshipTop workspace — strengths:** filters by country, category, provider, and profile plus organized deadlines, award details, shortlists, and provider paths. **Limitations:** final award decisions remain with providers.

**Provider application paths — strengths:** deadline, amount, and document context for submission. **Limitations:** can be hard to navigate without an organized shortlist.

`,
  'chatgpt-prompts-for-scholarship-search': `## Strengths and limitations at a glance

**ChatGPT-style prompts — strengths:** turn a messy profile into search phrases and checklists. **Limitations:** cannot confirm which programs are open or legitimate without provider-path context.

**ScholarshipTop — strengths:** organized search, eligibility signals, deadlines, provider paths, and shortlists for international and profile-based browsing. **Limitations:** final selection decisions remain with providers.

`,
  'ai-tools-for-international-students-looking-for-scholarships': `## Strengths and limitations at a glance

**Profile-based search — strengths:** fewer irrelevant results for multi-country applicants. **Limitations:** filters work best when paired with sponsor eligibility context.

**AI assistants — strengths:** language help, planning, and essay structure. **Limitations:** may omit visa rules or summarize outdated funding details.

`,
  'how-to-use-ai-without-missing-scholarship-deadlines': `## Strengths and limitations at a glance

**AI planning — strengths:** draft timelines, reminder lists, and document checklists. **Limitations:** dates in AI output can be wrong; pair them with provider-path deadline context.

**Trackers and calendars — strengths:** reduce last-minute misses when you link each row to a provider path. **Limitations:** still need current shortlist maintenance during application season.

`,
  'scholarship-search-checklist-using-ai': `## Strengths and limitations at a glance

**Checklist + AI — strengths:** repeatable workflow from brainstorm to application-ready shortlist. **Limitations:** skipping provider context weakens the purpose of the checklist.

**ScholarshipTop workspace — strengths:** practical filters, provider context, saved lists, and application planning for building a shortlist. **Limitations:** providers make final award decisions.

`
};

function stripTemplatePhrases(md: string): string {
  return md
    .replace(/\bin 3[–-]5 bullets\b/gi, '')
    .replace(/\bKey Point \d+:\s*/gi, '')
    .replace(/<strong>Key Point \d+:<\/strong>\s*/gi, '');
}

function renameWatchOutToLimitations(md: string): string {
  return md.replace(/\*\*Watch out for:\*\*/gi, '**Limitations:**');
}

function fixBrokenPathLinks(md: string): string {
  return md
    .replace(
      /\[\s*\/([^\]]+)\s*\]\s*\/\1\s*\[([^\]]+)\]\(\/\1\)/gi,
      '[$2](/$1)'
    )
    .replace(/\[\s*\/([^\]]+)\s*\]\s*\(\s*\/\1\s*\)/gi, '[$1](/$1)');
}

function repairMangledPathLinks(md: string): string {
  let out = md;
  out = out.replace(
    /\/(scholarships(?:\/[a-z0-9/-]+)?)\[([^\]]+)\]\(\/\1\)/gi,
    '[$2](/$1)'
  );
  out = out.replace(
    /([a-z])\/(scholarships(?:\/[a-z0-9/-]+)?)\[([^\]]+)\]\(\/\2\)/gi,
    '$1 [$3](/$2)'
  );
  return out;
}

function linkifyBacktickAndBarePaths(md: string): string {
  const anchors: Record<string, string> = {
    '/scholarships': '[scholarships](/scholarships)',
    '/scholarships/hub/matches': '[scholarship matching](/scholarships/hub/matches)',
    '/scholarships/category/stem': '[STEM scholarships](/scholarships/category/stem)',
    '/scholarships/category/education':
      '[education scholarships](/scholarships/category/education)',
    '/resources': '[resources](/resources)'
  };
  let out = md.replace(/`(\/(?:scholarships|resources)(?:\/[a-z0-9/-]+)?)`/gi, (_, p: string) => {
    return anchors[p] ?? `[${p.replace(/^\//, '')}](${p})`;
  });
  out = out.replace(
    /through `\/scholarships`, refine matches through `\/scholarships\/hub\/matches`/gi,
    'through [scholarships](/scholarships), refine matches through [scholarship matching](/scholarships/hub/matches)'
  );
  out = out.replace(
    /ScholarshipTop's `\/scholarships`, `\/scholarships\/hub\/matches`/gi,
    "ScholarshipTop's [scholarship search](/scholarships), [scholarship matching](/scholarships/hub/matches)"
  );
  out = out.replace(
    /ScholarshipTop’s `\/scholarships`, `\/scholarships\/hub\/matches`/gi,
    'ScholarshipTop’s [scholarship search](/scholarships), [scholarship matching](/scholarships/hub/matches)'
  );
  out = out.replace(
    /research resources through `\/resources`/gi,
    'research resources through [resources](/resources)'
  );
  out = out.replace(
    /resources at `\/resources`, and category pages such as `\/scholarships\/category\/stem` and `\/scholarships\/category\/education`/gi,
    'resources at [resources](/resources), and category pages such as [STEM scholarships](/scholarships/category/stem) and [education scholarships](/scholarships/category/education)'
  );
  out = out.replace(
    /Use ScholarshipTop’s `\/scholarships`, `\/scholarships\/hub\/matches`/gi,
    'Use ScholarshipTop’s [scholarship search](/scholarships), [scholarship matching](/scholarships/hub/matches)'
  );
  out = out.replace(
    /Start with broad discovery through `\/scholarships`, refine matches through `\/scholarships\/hub\/matches`/gi,
    'Start with broad discovery through [scholarships](/scholarships), refine matches through [scholarship matching](/scholarships/hub/matches)'
  );
  out = out.replace(
    /explore focused categories such as `\/scholarships\/category\/stem` or `\/scholarships\/category\/education`/gi,
    'explore focused categories such as [STEM scholarships](/scholarships/category/stem) or [education scholarships](/scholarships/category/education)'
  );
  return out;
}

function humanizePathLikeLinkAnchors(md: string): string {
  return md
    .replace(
      /\[scholarships\/hub\/matches\]\(\/scholarships\/hub\/matches\)/gi,
      '[scholarship matching](/scholarships/hub/matches)'
    )
    .replace(
      /\[scholarships\/category\/stem\]\(\/scholarships\/category\/stem\)/gi,
      '[STEM scholarships](/scholarships/category/stem)'
    )
    .replace(
      /\[scholarships\/category\/education\]\(\/scholarships\/category\/education\)/gi,
      '[education scholarships](/scholarships/category/education)'
    );
}

function expandFaqSection(md: string, slug: AiResourceStage6dReviewSlug): string {
  const rules = FAQ_EXPANSIONS[slug] ?? [];
  let out = md;
  for (const { questionIncludes, answer } of rules) {
    const qEsc = questionIncludes.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const reBold = new RegExp(
      `(\\*\\*${qEsc}[^*]*\\*\\*)\\s*\\n+([^\\n#<]{1,180})`,
      'i'
    );
    out = out.replace(reBold, `$1\n${answer}`);
    const reHeading = new RegExp(
      `(###\\s+[^\\n]*${qEsc}[^\\n]*)\\s*\\n+([^\\n#<]{1,180})`,
      'i'
    );
    out = out.replace(reHeading, `$1\n\n${answer}`);
  }
  return out;
}

function ensureStrengthsBlock(md: string, slug: AiResourceStage6dReviewSlug): string {
  if (/##\s*Strengths and limitations/i.test(md)) return md;
  const block = STRENGTHS_BLOCK[slug];
  if (!block) return md;
  const anchor = /##\s*(?:How We Evaluated|Questions|FAQ|Common Questions|Frequently Asked)/i;
  if (anchor.test(md)) return md.replace(anchor, `${block}$&`);
  const tldr = md.search(/<div class="article-tldr-block"/i);
  if (tldr > 0) {
    return `${md.slice(0, tldr).trimEnd()}\n\n${block}${md.slice(tldr)}`;
  }
  return `${md}\n\n${block}`;
}

function insertRelatedReading(md: string, slug: AiResourceStage6dReviewSlug): string {
  const block = RELATED_READING[slug];
  if (!block || md.includes('## Related reading')) return md;
  const tldrIdx = md.search(/<div class="article-tldr-block"/i);
  if (tldrIdx > 0) {
    return `${md.slice(0, tldrIdx).trimEnd()}\n\n${block}\n${md.slice(tldrIdx)}`;
  }
  return `${md.trimEnd()}\n\n${block}\n`;
}

function hasBareInternalPathInProse(text: string): boolean {
  const stripped = text
    .replace(/\[([^\]]+)\]\(\/(?:scholarships|resources)[^)]*\)/gi, '')
    .replace(/href=["']\/(?:scholarships|resources)[^"']*["']/gi, '')
    .replace(/<[^>]+>/g, ' ');
  return hasRawInternalPath(stripped);
}

export function polishAiResourceStage6dDraftMarkdown(
  slug: AiResourceStage6dReviewSlug,
  md: string
): string {
  let out = stripTemplatePhrases(md);
  out = fixBrokenPathLinks(out);
  out = renameWatchOutToLimitations(out);
  out = linkifyBacktickAndBarePaths(out);
  out = linkifyInternalPathsInMarkdown(out);
  out = repairMangledPathLinks(out);
  out = fixBrokenPathLinks(out);
  out = linkifyBacktickAndBarePaths(out);
  out = expandFaqSection(out, slug);
  out = ensureStrengthsBlock(out, slug);
  out = insertRelatedReading(out, slug);
  out = humanizePathLikeLinkAnchors(out);
  out = replaceTldrBlock(out, TLDR_BULLETS[slug]);
  return out.trimEnd() + '\n';
}

export function analyzeStage6dDraft(md: string, html: string) {
  const blob = `${md}\n${html}`.toLowerCase();
  const faqIdx = md.search(/##\s*(?:questions|faq|common questions|frequently asked)/i);
  const faqSection = faqIdx >= 0 ? md.slice(faqIdx) : md;
  const thinFaq = /\*\*[^*]+\*\*\s*\n\s*[^\n]{1,100}\n\n(?=\*\*|###|##|<div)/i.test(
    faqSection
  );
  const internalLinkCount = [
    ...`${md}${html}`.matchAll(
      /\[([^\]]+)\]\(\/(?:scholarships|resources)[^)]+\)/gi
    )
  ].length;
  return {
    noKeyPoint1: !/key point\s*1/i.test(blob),
    noKeyPoint2: !/key point\s*2/i.test(blob),
    noKeyPoint3: !/key point\s*3/i.test(blob),
    noBarePaths: !hasBareInternalPathInProse(`${md}\n${html}`),
    faqNotThin: !thinFaq || faqSection.length < 80,
    hasStrengthsLimitations:
      /strengths/i.test(blob) && /limitations/i.test(blob),
    internalLinksPresent: internalLinkCount >= 2,
    internalLinkCount,
    hasDisclaimer:
      blob.includes('scholarshiptop is a scholarship workspace') ||
      blob.includes('provider application paths'),
    statusReviewNeeded: true
  };
}
