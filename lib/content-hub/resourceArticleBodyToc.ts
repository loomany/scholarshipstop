/** Injects stable `id` on <h2> and <h3> in article HTML; extracts headings for anchor TOC. */

export type ResourceArticleTocItem = { id: string; text: string };

/** TOC for `/resources/[slug]` — main H2 sections only. */
export const RESOURCE_ARTICLE_TOC_OPTIONS = {
  h2Only: true,
  excludeHeadingPatterns: [
    /^quick\s+summary$/i,
    /^faq\b/i,
    /see scholarships you may qualify/i
  ]
} as const;

export type InjectResourceArticleTocOptions = {
  idSlugPrefix?: string;
  /** When true, TOC lists only `<h2>` (ids still added to h2/h3). */
  h2Only?: boolean;
  /** Plain-text heading labels to omit from TOC. */
  excludeHeadingPatterns?: readonly RegExp[];
};

function stripInnerHtmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugifyAnchorSegment(text: string): string {
  const s = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return s.slice(0, 72) || 'section';
}

/**
 * Adds `id` to each `<h2>` / `<h3>` that lacks one (document order).
 * Preserves headings that already declare `id`.
 *
 * `idSlugPrefix`: segment before `-h2-` / `-h3-` in generated ids (default `resource` for hub articles).
 */
function shouldIncludeInToc(
  tag: string,
  text: string,
  opts?: InjectResourceArticleTocOptions
): boolean {
  if (opts?.h2Only && tag !== 'h2') return false;
  const patterns = opts?.excludeHeadingPatterns ?? [];
  return !patterns.some((re) => re.test(text));
}

export function injectH2H3IdsAndExtractToc(
  html: string,
  opts?: InjectResourceArticleTocOptions
): {
  html: string;
  toc: ResourceArticleTocItem[];
} {
  if (!html.trim()) return { html, toc: [] };

  const idSlugPrefix =
    opts?.idSlugPrefix && opts.idSlugPrefix.trim()
      ? opts.idSlugPrefix.trim().replace(/^-+|-+$/g, '')
      : 'resource';

  const used = new Set<string>();
  const toc: ResourceArticleTocItem[] = [];

  const out = html.replace(
    /<(h[23])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi,
    (full, tagRaw: string, attrs: string | undefined, inner: string) => {
      const tag = tagRaw.toLowerCase();
      const text = stripInnerHtmlToText(inner);
      if (!text) return full;

      const rawAttrs = attrs ?? '';
      const idMatch = /\bid\s*=\s*["']([^"']+)["']/i.exec(rawAttrs);
      if (idMatch?.[1]) {
        const id = idMatch[1].trim();
        if (id) {
          used.add(id);
          if (shouldIncludeInToc(tag, text, opts)) {
            toc.push({ id, text });
          }
        }
        return full;
      }

      const lvl = tag === 'h2' ? 'h2' : 'h3';
      let base = slugifyAnchorSegment(text);
      let id = `${idSlugPrefix}-${lvl}-${base}`;
      let n = 0;
      while (used.has(id)) {
        n += 1;
        id = `${idSlugPrefix}-${lvl}-${base}-${n}`;
      }
      used.add(id);
      if (shouldIncludeInToc(tag, text, opts)) {
        toc.push({ id, text });
      }

      const insert = rawAttrs.trim() ? ` ${rawAttrs.trim()}` : '';
      return `<${tag} id="${id}"${insert}>${inner}</${tag}>`;
    }
  );

  return { html: out, toc };
}
