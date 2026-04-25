import sharp from "sharp";
export const WATERMARK_TEXT = "ScholarshipTop.com";
const MIN_OPACITY = 0.12;
const MAX_OPACITY = 0.16;
function escapeXml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;");
}
async function estimateBrightness(inputBuffer) {
    const stats = await sharp(inputBuffer).stats();
    const [r, g, b] = stats.channels;
    if (!r || !g || !b) {
        return 0.5;
    }
    return (r.mean + g.mean + b.mean) / (3 * 255);
}
function createWatermarkSvg(width, height, text, brightness) {
    const safeText = escapeXml(text);
    const fontSize = Math.max(18, Math.min(22, Math.round(width * 0.016)));
    const rightPadding = Math.max(16, Math.round(width * 0.018));
    const bottomPadding = Math.max(12, Math.round(height * 0.025));
    const x = width - rightPadding;
    const y = height - bottomPadding;
    const mainOpacity = Math.min(MAX_OPACITY, Math.max(MIN_OPACITY, 0.15 - (brightness - 0.5) * 0.04));
    const shadowOpacity = Math.min(0.14, Math.max(0.1, mainOpacity - 0.03));
    const shadowDx = 1;
    const shadowDy = 1;
    return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <g font-family="Arial, Helvetica, sans-serif" font-weight="500">
    <text x="${x + shadowDx}" y="${y + shadowDy}" text-anchor="end" fill="rgba(0, 0, 0, ${shadowOpacity})" font-size="${fontSize}">
      ${safeText}
    </text>
    <text x="${x}" y="${y}" text-anchor="end" fill="rgba(255, 255, 255, ${mainOpacity})" font-size="${fontSize}">
      ${safeText}
    </text>
  </g>
</svg>`.trim();
}
export async function addWatermark(inputBuffer) {
    const metadata = await sharp(inputBuffer).metadata();
    const width = metadata.width ?? 1280;
    const height = metadata.height ?? 720;
    const brightness = await estimateBrightness(inputBuffer);
    const svgOverlay = createWatermarkSvg(width, height, WATERMARK_TEXT, brightness);
    const svgBuffer = Buffer.from(svgOverlay);
    return sharp(inputBuffer)
        .composite([{ input: svgBuffer, top: 0, left: 0 }])
        .withMetadata({
        copyright: WATERMARK_TEXT
    })
        .toBuffer();
}
