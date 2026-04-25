import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

export async function markdownToHtml(markdown: string): Promise<string> {
  const raw = await marked.parse(markdown);

  return sanitizeHtml(raw, {
    allowedTags: sanitizeHtml.defaults.allowedTags.filter((tag) => !["script", "style"].includes(tag)),
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "title"]
    }
  });
}
