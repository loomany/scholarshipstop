'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import DOMPurify from 'isomorphic-dompurify';

import { contentHubProseClassName } from '@/lib/content-hub/contentHubProseClassName';
import { absolutizeResourceGuideLinksInHtml } from '@/lib/scholarships/resourceGuideRoutes';

const SANITIZE_OPTIONS = {
  ALLOWED_TAGS: [
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
  ALLOWED_ATTR: ['href', 'target', 'rel', 'colspan', 'rowspan'],
  ALLOW_DATA_ATTR: false
};

type SafeContentPostBodyProps = {
  html: string;
  /** Use after a CTA so article cards sit closer together */
  tightTop?: boolean;
};

export default function SafeContentPostBody({
  html,
  tightTop = false
}: SafeContentPostBodyProps) {
  const clean = useMemo(
    () =>
      DOMPurify.sanitize(
        absolutizeResourceGuideLinksInHtml(html),
        SANITIZE_OPTIONS
      ),
    [html]
  );

  if (!clean.trim()) return null;

  return (
    <div
      className={clsx(
        'rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8 lg:p-10',
        tightTop ? 'mt-4 sm:mt-5' : 'mt-10'
      )}
    >
      <div
        className={contentHubProseClassName}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    </div>
  );
}
