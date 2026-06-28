import sanitizeHtml from 'sanitize-html';

import {
  absolutizeResourceGuideLinksInHtml,
  normalizeScholarshipEntryLinksInHtml
} from '@/lib/scholarships/resourceGuideRoutes';
import { canonicalizeContentIntentLinksInHtml } from '@/lib/seo/contentIntentCanonical';

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

export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(
    canonicalizeContentIntentLinksInHtml(
      normalizeScholarshipEntryLinksInHtml(
        absolutizeResourceGuideLinksInHtml(html)
      )
    ),
    SANITIZE_HTML_OPTIONS
  );
}
