/**
 * Stage 6C.1 — polish review_needed AI resource drafts (markdown in, markdown out).
 */
import {
  hasRawInternalPath,
  linkifyInternalPathsInMarkdown,
  replaceTldrBlock
} from '@/lib/content-hub/polishAiResourceArticleMarkdown';

const TLDR_STYLE =
  'background-color: #f8f9fa; padding: 25px; border-left: 4px solid #2563eb; margin-top: 40px; border-radius: 6px;';

export const AI_RESOURCE_STAGE6C_REVIEW_SLUGS = [
  'can-chatgpt-help-find-scholarships',
  'how-to-use-chatgpt-to-search-for-scholarships',
  'best-ai-tools-for-finding-scholarships',
  'ai-scholarship-search-vs-traditional-databases',
  'best-sites-to-find-fully-funded-scholarships'
] as const;

export type AiResourceStage6cReviewSlug =
  (typeof AI_RESOURCE_STAGE6C_REVIEW_SLUGS)[number];

export const AI_RESOURCE_LIVE_PUBLISHED_SLUGS = [
  'best-scholarship-websites',
  'best-scholarship-search-engines-international-students',
  'scholarshiptop-vs-fastweb',
  'scholarshiptop-vs-scholarships-com',
  'best-free-scholarship-websites-without-spam',
  'best-scholarship-websites-for-graduate-students'
] as const;

const TLDR_BULLETS: Record<AiResourceStage6cReviewSlug, string[]> = {
  'can-chatgpt-help-find-scholarships': [
    '<strong>ChatGPT helps with strategy</strong>, not final scholarship facts—use it for keywords, checklists, and essay structure.',
    '<strong>Pair AI with ScholarshipTop</strong> for [country and profile filters](/scholarships), organized eligibility signals, deadlines, and provider application paths.',
    '<strong>Use ScholarshipTop as your workspace</strong> to shortlist opportunities, prepare essays, and track next steps.',
    '<strong>Provider decisions remain provider decisions</strong>; ScholarshipTop supports research and application planning.'
  ],
  'how-to-use-chatgpt-to-search-for-scholarships': [
    '<strong>Use ChatGPT for prompts and planning</strong>, not as your only scholarship database.',
    '<strong>Never paste sensitive IDs</strong> (passport, SSN, bank logins) into AI tools.',
    '<strong>Use structured provider paths</strong> from ScholarshipTop alongside university, government, or sponsor context as you plan.',
    '<strong>Combine with [scholarship matching](/scholarships/hub/matches)</strong> and category browsing for safer discovery.'
  ],
  'best-ai-tools-for-finding-scholarships': [
    '<strong>Stack tools:</strong> discovery platform + AI assistant + tracker + writing editor—not one app alone.',
    '<strong>ScholarshipTop fits</strong> international-friendly filtering by country, category, provider, and profile.',
    '<strong>AI supports application planning</strong>; awards still depend on eligibility, competition, and provider decisions.',
    '<strong>ScholarshipTop shows key details</strong> including deadlines, amounts, eligibility signals, and provider application paths.'
  ],
  'ai-scholarship-search-vs-traditional-databases': [
    '<strong>AI search fits</strong> profile-based shortlists and faster filtering for complex backgrounds.',
    '<strong>Traditional databases fit</strong> broad manual backup research, especially familiar U.S. directories.',
    '<strong>International students</strong> should prioritize country, citizenship, and degree-level filters on every tool.',
    '<strong>No tool controls provider decisions</strong>; use ScholarshipTop to organize comparison, shortlists, and application planning.'
  ],
  'best-sites-to-find-fully-funded-scholarships': [
    '<strong>Combine ScholarshipTop + provider paths:</strong> organized filters, government portals, and university funding pages.',
    '<strong>Define “fully funded”</strong> with award details, tuition, stipend, travel, insurance, and visa-related cost context.',
    '<strong>Avoid guaranteed-award scams</strong> and never pay upfront fees just to be “considered.”',
    '<strong>ScholarshipTop is a scholarship workspace</strong> for eligibility signals, deadlines, award details, shortlists, and provider application paths.'
  ]
};

const RELATED_READING: Record<AiResourceStage6cReviewSlug, string> = {
  'can-chatgpt-help-find-scholarships': `## Related reading

- [How to use ChatGPT to search for scholarships safely](/resources/how-to-use-chatgpt-to-search-for-scholarships)
- [Best scholarship websites for serious research](/resources/best-scholarship-websites)
- [Best scholarship search engines for international students](/resources/best-scholarship-search-engines-international-students)
- [Scholarship matching by profile](/scholarships/hub/matches)
`,
  'how-to-use-chatgpt-to-search-for-scholarships': `## Related reading

- [Can ChatGPT help you find scholarships?](/resources/can-chatgpt-help-find-scholarships)
- [Best AI tools for finding scholarships](/resources/best-ai-tools-for-finding-scholarships)
- [Best free scholarship websites without spam](/resources/best-free-scholarship-websites-without-spam)
- [Browse scholarships by category](/scholarships)
`,
  'best-ai-tools-for-finding-scholarships': `## Related reading

- [AI scholarship search vs traditional databases](/resources/ai-scholarship-search-vs-traditional-databases)
- [Can ChatGPT help you find scholarships?](/resources/can-chatgpt-help-find-scholarships)
- [ScholarshipTop vs Fastweb](/resources/scholarshiptop-vs-fastweb)
- [STEM scholarships](/scholarships/category/stem)
`,
  'ai-scholarship-search-vs-traditional-databases': `## Related reading

- [Best AI tools for finding scholarships](/resources/best-ai-tools-for-finding-scholarships)
- [Best scholarship search engines for international students](/resources/best-scholarship-search-engines-international-students)
- [ScholarshipTop vs Scholarships.com](/resources/scholarshiptop-vs-scholarships-com)
- [Application guides and resources](/resources)
`,
  'best-sites-to-find-fully-funded-scholarships': `## Related reading

- [Best scholarship websites for international students](/resources/best-scholarship-websites)
- [Best scholarship search engines for international students](/resources/best-scholarship-search-engines-international-students)
- [Best scholarship websites for graduate students](/resources/best-scholarship-websites-for-graduate-students)
- [Education scholarships](/scholarships/category/education)
`
};

const INTRO_REPLACEMENTS: Partial<
  Record<AiResourceStage6cReviewSlug, { from: RegExp; to: string }>
> = {
  'can-chatgpt-help-find-scholarships': {
    from: /Can ChatGPT find scholarships\? It can help, but not in the same way[\s\S]*?StudentAid\.gov scholarship guidance<\/a>\./,
    to: `Students often ask whether ChatGPT can find scholarships the way a verified database or university financial aid office can. The honest answer: it can sharpen your search strategy, but it should not be your only source for deadlines, award amounts, or application links.

**Quick Answer:** Use ChatGPT to brainstorm keywords, organize eligibility notes, and draft essay outlines, then use [ScholarshipTop](/scholarships) to compare structured opportunities, eligibility signals, deadlines, award context, and provider application paths. For U.S. aid basics, compare your plan with <a href="https://studentaid.gov/understand-aid/types/scholarships" target="_blank" rel="noopener noreferrer nofollow">Federal Student Aid scholarship guidance</a>.`
  },
  'best-sites-to-find-fully-funded-scholarships': {
    from: /Finding real full funding is harder[\s\S]*?Start at \/scholarships for broad browsing[\s\S]*?verification\./,
    to: `“Fully funded” sounds simple online, but many lists mix partial tuition awards, expired calls, and programs that only accept local applicants. A stronger workflow is to use ScholarshipTop to build a shortlist, compare award components, and keep provider application paths attached to each opportunity.

**Quick Answer:** Combine [scholarship search](/scholarships), [profile-based matching](/scholarships/hub/matches), government scholarship portals, and university funding offices. ScholarshipTop helps you filter by country, category, provider, and student profile while organizing award details, eligibility signals, and provider application paths.`
  }
};

/** Expand thin FAQ answers (2–4 sentences). Keys are unique substrings of the question line. */
const FAQ_EXPANSIONS: Record<
  AiResourceStage6cReviewSlug,
  Array<{ questionIncludes: string; answer: string }>
> = {
  'can-chatgpt-help-find-scholarships': [
    {
      questionIncludes: 'Can ChatGPT find scholarships for me?',
      answer: `ChatGPT can suggest scholarship categories, search phrases, and application checklists based on your profile. Use ScholarshipTop to turn useful ideas into a structured shortlist with eligibility signals, deadlines, award context, and provider application paths when available.`
    },
    {
      questionIncludes: 'Is ChatGPT enough for scholarship research?',
      answer: `No single AI chat is enough on its own. Pair ChatGPT with ScholarshipTop's structured search workspace, school financial aid resources, and provider-path context so you are not relying on memory-based summaries for deadlines or award amounts.`
    },
    {
      questionIncludes: 'How should I verify scholarships found with AI?',
      answer: `Look for a clear sponsor domain, eligibility details, deadline context, and application instructions. If details conflict, prioritize the provider path attached to the scholarship and never pay a fee just to “unlock” an award.`
    },
    {
      questionIncludes: 'What prompts should I use',
      answer: `Ask for search angles tied to your real profile: degree level, field, country of study, citizenship, financial need, and activities. Example: “List 15 scholarship search phrases for an international master’s student in public health with leadership experience.” Then run those phrases through [scholarships](/scholarships), smart filters, and provider-path context.`
    },
    {
      questionIncludes: 'Is ScholarshipTop useful for international students?',
      answer: `Yes—especially when you need filters for country, category, provider, and profile instead of scrolling endless U.S.-centric lists. ScholarshipTop is a workspace for organized search, shortlists, eligibility signals, deadlines, and provider application paths.`
    }
  ],
  'how-to-use-chatgpt-to-search-for-scholarships': [
    {
      questionIncludes: 'Can ChatGPT find real scholarships',
      answer: `It can help you discover categories and search terms, but it may hallucinate program names or outdated deadlines. Save opportunities when you can connect them to a clear provider identity, current cycle, and application path.`
    },
    {
      questionIncludes: 'What information should I avoid sharing',
      answer: `Do not paste passport scans, tax returns, bank logins, full Social Security numbers, or immigration case details into AI tools. Share only the minimum profile facts needed for brainstorming, and keep sensitive documents for trusted provider application portals.`
    },
    {
      questionIncludes: 'How do I verify a scholarship found with AI?',
      answer: `Look for a clear provider identity, deadline, funding type, citizenship rules, enrollment rules, and application path. If the “scholarship” only exists in an AI chat or a social media DM, treat it as a red flag.`
    },
    {
      questionIncludes: 'Can international students use ChatGPT',
      answer: `Yes, but international applicants should ask country-specific questions and compare visa, residency, and enrollment requirements with university, government, and provider-path context—not AI summaries alone.`
    }
  ],
  'best-ai-tools-for-finding-scholarships': [
    {
      questionIncludes: 'What are the best AI tools',
      answer: `Most students use a stack: ScholarshipTop for listings, filters, saved lists, and provider-path context; a general AI assistant for planning; a writing editor for essays; and a tracker for deadlines.`
    },
    {
      questionIncludes: 'Can AI scholarship tools guarantee',
      answer: `No legitimate tool controls funding outcomes. AI may speed up research and organization, but awards depend on eligibility, competition, essay quality, and the provider’s selection process. Walk away from any site promising automatic wins or upfront “processing” fees.`
    },
    {
      questionIncludes: 'Are AI tools useful for international students',
      answer: `They are useful when you supply country, citizenship, degree level, and field context. Use AI for search language, then organize visa, residency, funding, and provider-path details in your shortlist.`
    },
    {
      questionIncludes: 'How should I verify scholarships found with AI?',
      answer: `Look for a clear sponsor identity, deadline, award type, required documents, contact information, and provider URL. If the listing only appears inside an AI chat without a provider path, do not apply through third-party links.`
    },
    {
      questionIncludes:
        'Can I use ChatGPT or similar tools for scholarship essays?',
      answer: `You can use AI for brainstorming, outlines, grammar, and clarity—but the final essay should reflect your real experiences and goals. Scholarship readers notice generic AI voice quickly; keep facts accurate and provider-specific.`
    }
  ],
  'ai-scholarship-search-vs-traditional-databases': [
    {
      questionIncludes: 'Is AI scholarship search better',
      answer: `AI-assisted search is usually better for personalized shortlists, especially when you have multiple eligibility factors or study abroad plans. Traditional databases can still help you browse broadly and spot familiar recurring awards, so many students use both.`
    },
    {
      questionIncludes: 'Are traditional scholarship databases still useful?',
      answer: `Yes. They remain helpful for manual backup research, local programs, and long-running U.S. awards that appear across many directories. The tradeoff is time: you may review many irrelevant listings unless filters are strong.`
    },
    {
      questionIncludes: 'What should international students look for?',
      answer: `Prioritize citizenship rules, study destination, degree level, funding type, and whether the award is open to nonresidents. ScholarshipTop helps organize those signals so international students can compare fit and plan the next step.`
    },
    {
      questionIncludes: 'Can AI scholarship tools guarantee',
      answer: `No. Matching and ranking can improve search and planning, but providers still control selection. Use AI output as brainstorming, then organize promising opportunities by fit, deadline, documents, and provider path before investing time in essays or recommendations.`
    },
    {
      questionIncludes: 'How should I verify a scholarship before applying?',
      answer: `Review the provider identity, deadline, award amount, eligibility, and application channel. Avoid fees to “hold” an award, personal-email-only instructions, or pages that refuse to name the sponsoring organization.`
    }
  ],
  'best-sites-to-find-fully-funded-scholarships': [
    {
      questionIncludes: 'What are the best fully funded scholarship websites?',
      answer: `Use ScholarshipTop for structured search and application planning, government portals for national flagship programs, university sites for admission-linked funding, and international organizations for development-focused awards. No single workspace covers every fully funded opportunity worldwide.`
    },
    {
      questionIncludes: 'Are fully funded scholarship websites free',
      answer: `Reputable scholarship workspaces and government pages are typically free to browse. Be skeptical if a site demands payment before showing basic eligibility criteria or claims a fee is required to “activate” an award.`
    },
    {
      questionIncludes:
        'How do I know if a fully funded scholarship is legitimate?',
      answer: `Check the sponsor identity, compare deadline context, and read selection criteria and contact details. Legitimate programs explain who funds the award and how applications are reviewed—scams often rush you and avoid naming the provider.`
    },
    {
      questionIncludes: 'Which sites are best for international students?',
      answer: `International students should start with tools that support country and citizenship filters, then compare government exchange, university admissions, and provider-path context. Partial awards are common; “fully funded” should be defined with tuition, stipend, travel, insurance, and fee details.`
    },
    {
      questionIncludes:
        'Should I use scholarship directories or official provider',
      answer: `ScholarshipTop helps you compare options quickly with organized eligibility, deadline, award, shortlist, and provider-path context. Provider websites or portals are often where you apply and download forms when you are ready to submit.`
    }
  ]
};

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

/** Repair paths glued to markdown links by repeated linkify (e.g. `on/scholarships[...](/scholarships)`). */
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
  out = out.replace(
    / on \/scholarships, \/scholarships\/hub\/matches/g,
    ' on [scholarships](/scholarships), [scholarship matching](/scholarships/hub/matches)'
  );
  out = out.replace(
    / pages for categories such as \/scholarships\/category\/stem and \/scholarships\/category\/education/gi,
    ' pages for categories such as [STEM scholarships](/scholarships/category/stem) and [education scholarships](/scholarships/category/education)'
  );
  return out;
}

function expandFaqSection(
  md: string,
  slug: AiResourceStage6cReviewSlug
): string {
  const rules = FAQ_EXPANSIONS[slug] ?? [];
  let out = md;
  for (const { questionIncludes, answer } of rules) {
    const qEsc = questionIncludes.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const reBold = new RegExp(
      `(\\*\\*${qEsc}[^*]*\\*\\*)\\s*\\n+([^\\n#<]+)`,
      'i'
    );
    out = out.replace(reBold, `$1\n${answer}`);
    const reHeading = new RegExp(
      `(###\\s+[^\\n]*${qEsc}[^\\n]*)\\s*\\n+([^\\n#<]+)`,
      'i'
    );
    out = out.replace(reHeading, `$1\n\n${answer}`);
  }
  return out;
}

function ensureStrengthsLimitationsSection(
  md: string,
  slug: AiResourceStage6cReviewSlug
): string {
  if (/##\s*Strengths and limitations/i.test(md)) return md;
  const blocks: Partial<Record<AiResourceStage6cReviewSlug, string>> = {
    'best-ai-tools-for-finding-scholarships': `## Strengths and limitations at a glance

**ScholarshipTop workspace — strengths:** structured filters, provider context, eligibility signals, deadlines, provider paths, and repeatable shortlists for international students. **Limitations:** final award decisions remain with providers.

**General AI assistants — strengths:** fast brainstorming, checklists, and essay planning. **Limitations:** may invent awards, miss citizenship rules, or summarize outdated deadlines.

**Writing and tracking tools — strengths:** clearer essays and organized deadlines. **Limitations:** they do not confirm eligibility or funding type for you.

`,
    'best-sites-to-find-fully-funded-scholarships': `## Strengths and limitations at a glance

**ScholarshipTop workspace — strengths:** faster comparison by country, field, profile, eligibility signals, deadlines, and provider paths. **Limitations:** “fully funded” labels vary by program and should be interpreted with tuition, stipend, travel, and insurance context.

**Government and university portals — strengths:** authoritative eligibility and application rules. **Limitations:** harder search UX and program-specific navigation.

**International organizations — strengths:** flagship fellowships for defined career paths. **Limitations:** narrow citizenship or development priorities.

`
  };
  const block = blocks[slug];
  if (!block) return md;
  const anchor = /##\s*How We Evaluated/i;
  if (anchor.test(md)) {
    return md.replace(anchor, `${block}$&`);
  }
  return md;
}

function insertRelatedReading(
  md: string,
  slug: AiResourceStage6cReviewSlug
): string {
  const block = RELATED_READING[slug];
  if (!block || md.includes('## Related reading')) return md;
  const tldrIdx = md.search(/<div class="article-tldr-block"/i);
  if (tldrIdx > 0) {
    return `${md.slice(0, tldrIdx).trimEnd()}\n\n${block}\n${md.slice(tldrIdx)}`;
  }
  return `${md.trimEnd()}\n\n${block}\n`;
}

function stripTemplatePhrases(md: string): string {
  return md
    .replace(/\bin 3[–-]5 bullets\b/gi, '')
    .replace(/\bKey Point \d+:\s*/gi, '')
    .replace(/<strong>Key Point \d+:<\/strong>\s*/gi, '');
}

export function polishAiResourceStage6cDraftMarkdown(
  slug: AiResourceStage6cReviewSlug,
  md: string
): string {
  let out = stripTemplatePhrases(md);
  out = fixBrokenPathLinks(out);
  out = renameWatchOutToLimitations(out);

  const intro = INTRO_REPLACEMENTS[slug];
  if (intro) {
    out = out.replace(intro.from, intro.to);
  }

  out = linkifyInternalPathsInMarkdown(out);
  out = repairMangledPathLinks(out);
  out = fixBrokenPathLinks(out);
  out = expandFaqSection(out, slug);
  out = ensureStrengthsLimitationsSection(out, slug);
  out = insertRelatedReading(out, slug);
  out = humanizePathLikeLinkAnchors(out);
  out = replaceTldrBlock(out, TLDR_BULLETS[slug]);
  return out.trimEnd() + '\n';
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

function hasBareInternalPathInProse(text: string): boolean {
  const stripped = text
    .replace(/\[([^\]]+)\]\(\/(?:scholarships|resources)[^)]*\)/gi, '')
    .replace(/href=["']\/(?:scholarships|resources)[^"']*["']/gi, '')
    .replace(/<[^>]+>/g, ' ');
  return hasRawInternalPath(stripped);
}

export function analyzeStage6cDraft(md: string, html: string) {
  const blob = `${md}\n${html}`.toLowerCase();
  const faqSection = md.slice(
    md.search(/##\s*(?:questions|faq|common questions)/i)
  );
  const thinFaq =
    /\*\*[^*]+\*\*\s*\n\s*[^\n]{1,120}\n\n(?=\*\*|###|##|<div)/i.test(
      faqSection
    );
  return {
    noKeyPoint1: !/key point\s*1/i.test(blob),
    noKeyPoint2: !/key point\s*2/i.test(blob),
    noKeyPoint3: !/key point\s*3/i.test(blob),
    noRawPaths: !hasBareInternalPathInProse(`${md}\n${html}`),
    hasStrengthsLimitations:
      /strengths/i.test(blob) && /limitations/i.test(blob),
    faqNotThin: !thinFaq || faqSection.length < 50,
    internalLinkCount: [
      ...`${md}${html}`.matchAll(
        /\[([^\]]+)\]\(\/(?:scholarships|resources)[^)]+\)/gi
      )
    ].length,
    noWideTable: !/<table\b/i.test(html),
    hasDisclaimer:
      blob.includes('scholarshiptop is a scholarship workspace') ||
      blob.includes('provider application paths')
  };
}
