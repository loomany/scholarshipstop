/**
 * Injects stable `id` attributes on top-level <h2> in essay HTML and extracts
 * labels for an on-page table of contents (anchor navigation).
 */
export type EssayTocItem = { id: string; text: string };

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
 * Adds `id` to each `<h2>` that lacks one; builds TOC entries in document order.
 */
export function injectH2IdsAndExtractToc(html: string): {
  html: string;
  toc: EssayTocItem[];
} {
  if (!html.trim()) return { html, toc: [] };

  const used = new Set<string>();
  const toc: EssayTocItem[] = [];

  const out = html.replace(
    /<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi,
    (full, attrs: string | undefined, inner: string) => {
      const text = stripInnerHtmlToText(inner);
      if (!text) return full;

      const rawAttrs = attrs ?? '';
      const idMatch = /\bid\s*=\s*["']([^"']+)["']/i.exec(rawAttrs);
      if (idMatch?.[1]) {
        const id = idMatch[1].trim();
        if (id) {
          used.add(id);
          toc.push({ id, text });
        }
        return full;
      }

      let base = slugifyAnchorSegment(text);
      let id = `essay-h2-${base}`;
      let n = 0;
      while (used.has(id)) {
        n += 1;
        id = `essay-h2-${base}-${n}`;
      }
      used.add(id);
      toc.push({ id, text });

      const insert = rawAttrs.trim() ? ` ${rawAttrs.trim()}` : '';
      return `<h2 id="${id}"${insert}>${inner}</h2>`;
    }
  );

  return { html: out, toc };
}
