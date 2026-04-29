import clsx from 'clsx';
import sanitizeHtml from 'sanitize-html';
import type { ReactNode } from 'react';

import { contentHubProseClassName } from '@/lib/content-hub/contentHubProseClassName';
import {
  absolutizeResourceGuideLinksInHtml,
  normalizeScholarshipEntryLinksInHtml
} from '@/lib/scholarships/resourceGuideRoutes';

/** Mirrors previous DOMPurify allowlist; avoids jsdom/Turbopack path issues on SSR. */
const SANITIZE_HTML_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'hr',
    'strong',
    'em',
    'b',
    'i',
    'u',
    'sub',
    'sup',
    'ul',
    'ol',
    'li',
    'a',
    'h2',
    'h3',
    'h4',
    'h5',
    'blockquote',
    'div',
    'span',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'caption'
  ],
  allowedAttributes: {
    '*': [
      'id',
      'href',
      'target',
      'rel',
      'colspan',
      'rowspan',
      'class',
      'style',
      'title',
      'aria-label'
    ]
  },
  allowProtocolRelative: true
};

type SafeContentPostBodyProps = {
  html: string;
  /** Use after a CTA so article cards sit closer together */
  tightTop?: boolean;
  /** Rendered inside the same bordered card, below the article body (e.g. Sources). */
  footer?: ReactNode;
};

function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(
    normalizeScholarshipEntryLinksInHtml(
      absolutizeResourceGuideLinksInHtml(html)
    ),
    SANITIZE_HTML_OPTIONS
  );
}

export default function SafeContentPostBody({
  html,
  tightTop = false,
  footer
}: SafeContentPostBodyProps) {
  const clean = sanitizeArticleHtml(html);

  if (!clean.trim() && !footer) return null;

  return (
    <div
      className={clsx(
        'min-w-0 max-w-full rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8 lg:p-10',
        tightTop ? 'mt-4 sm:mt-5' : 'mt-10'
      )}
    >
      {clean.trim() ? (
        <div
          className={clsx(
            contentHubProseClassName,
            '!text-lg !leading-relaxed md:!text-lg',
            '[&_h1]:text-center [&_h1]:text-3xl [&_h1]:!mt-10 [&_h1]:first:!mt-0',
            '[&_h2]:!text-center [&_h2]:!text-2xl [&_h2]:!mt-12 [&_h2]:first:!mt-0',
            '[&_h3]:!text-center [&_h3]:!text-xl [&_h3]:!mt-10 [&_h3]:first:!mt-0',
            '[&_.article-tldr-block]:!text-left',
            '[&_.article-tldr-block_h2]:!text-left',
            '[&_.article-tldr-block_h3]:!text-left',
            '[&_.article-tldr-block_ul]:text-left [&_.article-tldr-block_ol]:text-left',
            '[&_p]:leading-relaxed [&_li]:leading-relaxed',
            "[&_a[href^='/scholarships/hub/']]:font-medium [&_a[href^='/scholarships/hub/']]:text-blue-700 [&_a[href^='/scholarships/hub/']]:underline [&_a[href^='/scholarships/hub/']]:underline-offset-2 [&_a[href^='/scholarships/hub/']]:transition [&_a[href^='/scholarships/hub/']]:hover:text-blue-900"
          )}
          dangerouslySetInnerHTML={{ __html: clean }}
        />
      ) : null}
      {footer}
    </div>
  );
}
