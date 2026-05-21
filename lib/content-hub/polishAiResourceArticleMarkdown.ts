/**
 * Stage 6B.3 — polish live AI resource articles (markdown in, markdown out).
 */

const TLDR_STYLE =
  'background-color: #f8f9fa; padding: 25px; border-left: 4px solid #2563eb; margin-top: 40px; border-radius: 6px;';

export const AI_RESOURCE_PUBLISH_SLUGS = [
  'best-scholarship-search-engines-international-students',
  'scholarshiptop-vs-fastweb',
  'scholarshiptop-vs-scholarships-com',
  'best-free-scholarship-websites-without-spam',
  'best-scholarship-websites-for-graduate-students'
] as const;

export type AiResourcePublishSlug = (typeof AI_RESOURCE_PUBLISH_SLUGS)[number];

/** Human-readable Quick Summary bullets per slug (no “Key Point N”). */
export const AI_RESOURCE_TLDR_BULLETS: Record<AiResourcePublishSlug, string[]> = {
  'best-scholarship-search-engines-international-students': [
    '<strong>Start on ScholarshipTop</strong> for country, category, and profile filters, then confirm every award on the official provider page.',
    '<strong>Check citizenship and visa rules</strong> before you apply—international eligibility is easy to misread in large directories.',
    '<strong>Combine tools</strong>: modern search plus university and government portals for safer, broader coverage.',
    '<strong>Use STEM and education hubs</strong> when your field is narrow—see <a href="/scholarships/category/stem">STEM scholarships</a> and <a href="/scholarships/category/education">education scholarships</a>.',
    '<strong>ScholarshipTop is discovery only</strong>—not a grant issuer, school, or financial aid office.'
  ],
  'scholarshiptop-vs-fastweb': [
    '<strong>ScholarshipTop fits</strong> filter-first discovery, international browsing, and clearer provider context.',
    '<strong>Fastweb fits</strong> U.S. students who want a familiar profile-matching directory and can manage email volume.',
    '<strong>Use both if helpful</strong>, but verify deadlines and eligibility on official sponsor pages.',
    '<strong>Compare by goal</strong>: country/category filters vs. legacy U.S. matching—not a single “winner” for every student.',
    '<strong>ScholarshipTop is discovery only</strong>—not a grant issuer or financial aid office.'
  ],
  'scholarshiptop-vs-scholarships-com': [
    '<strong>ScholarshipTop fits</strong> international-friendly discovery, provider context, and profile-based browsing.',
    '<strong>Scholarships.com fits</strong> many U.S. students who want a long-running directory-style search.',
    '<strong>Choose by location and workflow</strong>: global filters vs. U.S.-centric matching—not one site for every applicant.',
    '<strong>Verify every listing</strong> on the official sponsor page before you share documents or pay fees.',
    '<strong>ScholarshipTop is discovery only</strong>—not a grant issuer or financial aid office.'
  ],
  'best-free-scholarship-websites-without-spam': [
    '<strong>Start with ScholarshipTop</strong> for organized discovery by country, category, and profile.',
    '<strong>Control spam</strong> with a scholarship-only email and strict notification settings on large matchers.',
    '<strong>Never pay to apply</strong>—legit research is free; confirm awards on official provider pages.',
    '<strong>Add U.S. tools when relevant</strong> (BigFuture, CareerOneStop, Fastweb) with filters and unsubscribe discipline.',
    '<strong>ScholarshipTop is discovery only</strong>—not a grant issuer or financial aid office.'
  ],
  'best-scholarship-websites-for-graduate-students': [
    '<strong>Start with university funding offices</strong> for assistantships, tuition awards, and departmental grants.',
    '<strong>Use ScholarshipTop</strong> to browse graduate-friendly filters by country, field, and provider.',
    '<strong>Add fellowship portals</strong> (government, foundations, associations) after official school sources.',
    '<strong>Match your degree level</strong>—masters, PhD, and postdoc rules differ sharply by program.',
    '<strong>ScholarshipTop is discovery only</strong>—not a grant issuer or financial aid office.'
  ]
};

const SCHOLARSHIPS_COM_BAD =
  /Scholarships\.com remains a recognizable Scholarships\.com alternative only if your goal is a more modern, internationally useful workflow\./gi;

const SCHOLARSHIPS_COM_GOOD =
  'For U.S.-focused directory search, Scholarships.com can still be useful. ScholarshipTop is often a stronger fit when you want international discovery, clearer provider context, and profile-based browsing.';

const BARE_PATH_PREFIX = '(?:^|[\\s>,]|\\*\\*)';

/** Link bare /paths in prose only (not inside `](/path)` markdown links). */
function linkBarePaths(md: string): string {
  let out = md;
  const rules: [RegExp, string][] = [
    [
      new RegExp(`${BARE_PATH_PREFIX}(\\/scholarships\\/hub\\/matches)\\b(?!\\])`, 'g'),
      '$1[scholarship matching](/scholarships/hub/matches)'
    ],
    [
      new RegExp(`${BARE_PATH_PREFIX}(\\/scholarships\\/category\\/stem)\\b(?!\\])`, 'g'),
      '$1[STEM scholarships](/scholarships/category/stem)'
    ],
    [
      new RegExp(
        `${BARE_PATH_PREFIX}(\\/scholarships\\/category\\/education)\\b(?!\\])`,
        'g'
      ),
      '$1[education scholarships](/scholarships/category/education)'
    ],
    [
      new RegExp(`${BARE_PATH_PREFIX}(\\/resources)\\b(?!/|\\])`, 'g'),
      '$1[resources](/resources)'
    ],
    [
      new RegExp(`${BARE_PATH_PREFIX}(\\/scholarships)\\b(?!/|\\])`, 'g'),
      '$1[scholarships](/scholarships)'
    ]
  ];
  for (const [re, rep] of rules) {
    out = out.replace(re, rep);
  }
  return out;
}

/** Turn bare internal paths into markdown links (longest paths first). */
export function linkifyInternalPathsInMarkdown(md: string): string {
  let out = md;

  const replacements: [RegExp, string][] = [
    [
      /clean browsing through \/scholarships and personalized discovery through \/scholarships\/hub\/matches/gi,
      'clean browsing through [scholarship search](/scholarships) and personalized discovery through [matching](/scholarships/hub/matches)'
    ],
    [
      /personalized matching at \/scholarships\/hub\/matches/gi,
      'personalized matching at [scholarship matching](/scholarships/hub/matches)'
    ],
    [
      /STEM students should browse \/scholarships\/category\/stem, future teachers can start with \/scholarships\/category\/education, and students who need application help should keep \/resources open/gi,
      'STEM students should browse [STEM scholarships](/scholarships/category/stem), future teachers can start with [education scholarships](/scholarships/category/education), and students who need application help should keep our [resources hub](/resources) open'
    ],
    [
      /field categories such as \/scholarships\/category\/stem and \/scholarships\/category\/education/gi,
      'field categories such as [STEM scholarships](/scholarships/category/stem) and [education scholarships](/scholarships/category/education)'
    ],
    [
      /start with \/scholarships\/category\/stem or \/scholarships\/category\/education/gi,
      'start with [STEM scholarships](/scholarships/category/stem) or [education scholarships](/scholarships/category/education)'
    ],
    [
      /pages like <a href="\/scholarships">\/scholarships<\/a>, \/scholarships\/hub\/matches, and <a href="\/resources">\/resources<\/a>/gi,
      'pages like [scholarship search](/scholarships), [matching](/scholarships/hub/matches), and [resources](/resources)'
    ],
    [
      /<a href="\/scholarships">\/scholarships<\/a>, \/scholarships\/hub\/matches/gi,
      '[scholarship search](/scholarships), [matching](/scholarships/hub/matches)'
    ],
    [
      /<a href="\/resources">\/resources<\/a>, <a href="\/scholarships">\/scholarships<\/a>, and personalized matching at \/scholarships\/hub\/matches/gi,
      '[resources](/resources), [scholarships](/scholarships), and personalized matching at [scholarship matching](/scholarships/hub/matches)'
    ],
    [
      /types\[scholarships\]\/scholarships\[scholarships\]\(\/scholarships\)/gi,
      'types/scholarships'
    ],
    [
      /\[([^\]]+)\]\1\[([^\]]+)\]\(\/([^)]+)\)\)/g,
      '[$2](/$3)'
    ],
    [
      /\[\/([^\]]+)\]\/\1\[([^\]]+)\]\(\/\1\)\)/g,
      '[/$1](/$1)'
    ]
  ];

  for (const [re, rep] of replacements) {
    out = out.replace(re, rep);
  }

  out = linkBarePaths(out);

  return out;
}

export function fixScholarshipsComSentence(md: string): string {
  return md.replace(SCHOLARSHIPS_COM_BAD, SCHOLARSHIPS_COM_GOOD);
}

/** Remove duplicate TL;DR blocks; keep one styled block at end with real bullets. */
export function replaceTldrBlock(md: string, bullets: string[]): string {
  const listHtml = bullets.map((b) => `    <li>${b}</li>`).join('\n');
  const block = `<div class="article-tldr-block" style="${TLDR_STYLE}">
  <h3 style="margin-top: 0; color: #1e293b;">📌 Quick Summary</h3>
  <ul style="margin-bottom: 0;">
${listHtml}
  </ul>
</div>`;

  let out = md.replace(/<div class="article-tldr-block"[\s\S]*?<\/div>\s*/gi, '');
  out = out.replace(/##\s*Quick Summary[\s\S]*?(?=\n## |\n<div|$)/gi, '');
  out = out.trimEnd();
  return `${out}\n\n${block}\n`;
}

function repairBrokenMarkdownLinks(md: string): string {
  return md.replace(
    /\[\/([a-z0-9-]+)\]\/\1\[[^\]]+\]\(\/\1\)\)/gi,
    '[/$1](/$1)'
  );
}

export function polishAiResourceArticleMarkdown(
  slug: AiResourcePublishSlug,
  md: string
): string {
  let out = repairBrokenMarkdownLinks(md);
  if (slug === 'scholarshiptop-vs-scholarships-com') {
    out = fixScholarshipsComSentence(out);
  }
  out = linkifyInternalPathsInMarkdown(out);
  out = out.replace(/<strong>Key Point \d+:<\/strong>\s*/gi, '');
  out = replaceTldrBlock(out, AI_RESOURCE_TLDR_BULLETS[slug]);
  return out;
}

export function hasRawInternalPath(text: string): boolean {
  return (
    /(?:^|[\s(>,])\/?scholarships\/(?:hub\/matches|category\/(?:stem|education))\b/m.test(
      text
    ) ||
    /(?:^|[\s(>,])\/resources\b/m.test(text) ||
    /(?:^|[\s(>,])\/scholarships\b(?!\/)/m.test(text) ||
    /<a href="\/scholarships">\/scholarships<\/a>/i.test(text)
  );
}
