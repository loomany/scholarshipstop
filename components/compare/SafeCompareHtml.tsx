import { contentHubProseClassName } from '@/lib/content-hub/contentHubProseClassName';

type SafeCompareHtmlProps = {
  html: string;
  className?: string;
};

const ALLOWED_TAGS = new Set([
  'article',
  'p',
  'br',
  'strong',
  'em',
  'b',
  'i',
  'ul',
  'ol',
  'li',
  'h2',
  'h3',
  'a'
]);

function stripUnsafeCompareHtml(html: string): string {
  if (!html.trim()) return '';

  return html
    .replace(/<\s*(script|style|iframe|object|embed|form|input|button|textarea|select)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|form|input|button|textarea|select)\b[^>]*\/?>/gi, '')
    .replace(/<([a-z0-9-]+)\b([^>]*)>/gi, (full, rawTag: string, rawAttrs: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return '';

      if (tag === 'h2' || tag === 'h3') {
        const idDq = rawAttrs.match(/\bid\s*=\s*"([^"]*)"/i);
        const idSq = rawAttrs.match(/\bid\s*=\s*'([^']*)'/i);
        const idVal = (idDq?.[1] ?? idSq?.[1] ?? '').trim();
        if (
          idVal &&
          /^[\w\-:.]+$/.test(idVal) &&
          !/\s|^javascript:/i.test(idVal)
        ) {
          return `<${tag} id="${idVal.replace(/"/g, '&quot;')}">`;
        }
        return `<${tag}>`;
      }

      if (tag !== 'a') return `<${tag}>`;

      const hrefMatch = rawAttrs.match(/\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const href = (hrefMatch?.[2] ?? hrefMatch?.[3] ?? hrefMatch?.[4] ?? '').trim();
      if (!href || /^javascript:/i.test(href)) return '<a>';

      const safeHref = href.replace(/"/g, '&quot;');
      return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">`;
    })
    .replace(/<\/([a-z0-9-]+)\s*>/gi, (full, rawTag: string) => {
      const tag = rawTag.toLowerCase();
      return ALLOWED_TAGS.has(tag) ? `</${tag}>` : '';
    })
    .trim();
}

/** Server-rendered HTML from compare AI body with a narrow allowlist. */
export function SafeCompareHtml({ html, className }: SafeCompareHtmlProps) {
  const clean = stripUnsafeCompareHtml(html);
  if (!clean.trim()) return null;
  return (
    <div
      className={`${contentHubProseClassName} ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
