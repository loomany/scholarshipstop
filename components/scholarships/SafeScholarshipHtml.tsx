'use client';

import { useMemo } from 'react';
import DOMPurify from 'isomorphic-dompurify';

import { absolutizeResourceGuideLinksInHtml } from '@/lib/scholarships/resourceGuideRoutes';
import { stripScholarshipSourceHtmlNoise } from '@/lib/scholarships/stripSourceHtmlNoise';
import { scholarshipDetailCardPrimaryClass } from '@/lib/scholarships/scholarshipDetailLayoutClasses';

/** Full HTML is passed through; only DOMPurify runs — no substring or max-length. */

/** Tailwind-only styling for pasted SA-like HTML (lists, headings, links). */
export const scholarshipRichProseClassName =
  'sa-rich min-w-0 max-w-full break-words text-sm leading-relaxed text-zinc-700 md:text-base [&_a]:break-words [&_a]:font-medium [&_a]:text-sky-700 [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-200 [&_blockquote]:pl-4 [&_blockquote]:text-zinc-600 [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-zinc-900 [&_h2]:first:mt-0 [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-zinc-800 [&_h4]:mb-1 [&_h4]:mt-3 [&_h4]:text-sm [&_h4]:font-semibold [&_ol]:mb-3 [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:marker:text-zinc-500 [&_ul]:mb-3 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:marker:text-zinc-500 [&_li]:my-1 [&_ol_ol]:mt-1 [&_ol_ul]:mt-1 [&_ul_ol]:mt-1 [&_ul_ul]:mt-1 [&_p]:mb-3 [&_p]:break-words [&_p]:last:mb-0 [&_strong]:font-semibold [&_em]:italic [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_thead]:bg-slate-50 [&_th]:border [&_th]:border-slate-200 [&_th]:px-4 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-slate-600 [&_td]:border [&_td]:border-slate-200 [&_td]:px-4 [&_td]:py-2 [&_td]:text-slate-700';

type SafeScholarshipHtmlProps = {
  html: string;
  className?: string;
};

export function SafeScholarshipHtml({
  html,
  className
}: SafeScholarshipHtmlProps) {
  const clean = useMemo(
    () =>
      DOMPurify.sanitize(
        stripScholarshipSourceHtmlNoise(absolutizeResourceGuideLinksInHtml(html)),
        {
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
        }
      ),
    [html]
  );

  if (!clean.trim()) return null;

  return (
    <div
      className={className ?? scholarshipRichProseClassName}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

type ScholarshipRichSectionProps = {
  label: string;
  html?: string | null;
  fallbackText?: string | null;
};

export function ScholarshipRichSection({
  label,
  html,
  fallbackText
}: ScholarshipRichSectionProps) {
  const h = html?.trim();
  const t = fallbackText?.trim();
  if (!h && !t) return null;

  return (
    <div className="mt-10">
      <h2 className="mb-3 text-base font-semibold tracking-tight text-zinc-900">
        {label}
      </h2>
      <div className={scholarshipDetailCardPrimaryClass}>
        {h ? (
          <SafeScholarshipHtml html={h} />
        ) : (
          <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-600 md:text-base">
            {t}
          </p>
        )}
      </div>
    </div>
  );
}
