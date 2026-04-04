function hrefFromAnchorAttributes(attrs: string): string | null {
  const m = attrs.match(
    /\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i
  );
  if (!m) return null;
  return (m[2] ?? m[3] ?? m[4] ?? '').trim();
}

/** True for internal catalog paths only (relative). */
export function isWhitelistedScholarshipHref(href: string): boolean {
  const h = href.trim();
  if (!h || /^javascript:/i.test(h)) return false;
  const path = decodeURIComponent(h.split(/[?#]/)[0] ?? h).trim();
  return /^\/scholarships(\/|$)/i.test(path);
}

/**
 * Removes `<a>` whose href is not a whitelisted `/scholarships/...` path; keeps inner text.
 * Preserves internal scholarship links for editor / AI output.
 */
export function stripDisallowedAnchorsFromHtml(html: string): string {
  let out = html;
  let prev = '';
  while (out !== prev) {
    prev = out;
    out = out.replace(
      /<a\b([^>]*)>([\s\S]*?)<\/a>/gi,
      (full, attrs: string, inner: string) => {
        const href = hrefFromAnchorAttributes(attrs);
        if (href && isWhitelistedScholarshipHref(href)) return full;
        return inner;
      }
    );
  }
  return out;
}

