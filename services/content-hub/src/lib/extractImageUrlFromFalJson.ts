/** First HTTP(S) image URL in a fal.run JSON response (FLUX / other models). */
export function extractImageUrlFromFalJson(data: unknown, depth = 0): string | null {
  if (depth > 10 || !data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;

  const asHttpUrl = (u: unknown): string | null =>
    typeof u === "string" && u.startsWith("http") ? u : null;

  if (asHttpUrl(d.url)) return asHttpUrl(d.url);

  const maybeSingle =
    d.output && typeof d.output === "object" && !Array.isArray(d.output)
      ? d.output
      : d.image && typeof d.image === "object" && !Array.isArray(d.image)
        ? d.image
        : null;
  if (maybeSingle) {
    const u = asHttpUrl((maybeSingle as Record<string, unknown>).url);
    if (u) return u;
  }
  if (typeof d.output === "string" && d.output.startsWith("http")) return d.output;

  const images =
    d.images ??
    (Array.isArray(d.image) ? d.image : null) ??
    (Array.isArray(d.output) ? d.output : null);
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0];
    if (typeof first === "string" && first.startsWith("http")) return first;
    if (first && typeof first === "object") {
      const img = first as Record<string, unknown>;
      const u = img.url ?? img.image_url ?? img.file_url ?? img.content;
      if (asHttpUrl(u)) return u as string;
    }
  }

  for (const nestKey of ["data", "result", "response", "output"] as const) {
    const inner = d[nestKey];
    if (inner && typeof inner === "object") {
      const nested = extractImageUrlFromFalJson(inner, depth + 1);
      if (nested) return nested;
    }
  }
  return null;
}
