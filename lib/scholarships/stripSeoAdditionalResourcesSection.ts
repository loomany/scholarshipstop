/**
 * Removes an AI-authored "Additional Resources" section from SEO HTML so we can
 * render the same block with Next.js <Link> (fixes empty/# hrefs and plain <li> text).
 */
export function stripSeoAdditionalResourcesSection(html: string): string {
  const t = html.trim();
  if (!t) return html;
  const stripped = t.replace(
    /<h2\b[^>]*>\s*Additional\s+Resources\s*<\/h2>[\s\S]*?(?=<h2\b|\s*$)/i,
    ''
  );
  return stripped.trim();
}
