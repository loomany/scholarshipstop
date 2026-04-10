"""
One-off: extract circular emblem from tmp/image_12.png and write /public favicon assets.
Run from repo root: python scripts/generate-favicon-assets.py
"""
from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "scripts" / "favicon-source" / "image_12.png"
FALLBACK_SRC = ROOT / "tmp" / "image_12.png"
OUT = ROOT / "public"
ORANGE = "#ff7e00"


def load_rgb(path: Path) -> np.ndarray:
    return cv2.cvtColor(np.array(Image.open(path).convert("RGB")), cv2.COLOR_RGB2BGR)


def extract_circle_rgba(bgr: np.ndarray) -> tuple[np.ndarray, tuple[float, float, float]]:
    """Non-white region → min enclosing circle; return RGBA crop (tight bbox + alpha outside circle)."""
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    _, not_white = cv2.threshold(gray, 248, 255, cv2.THRESH_BINARY_INV)
    not_white = cv2.morphologyEx(
        not_white, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)
    )
    pts = cv2.findNonZero(not_white)
    if pts is None:
        raise RuntimeError("Could not find non-white content")
    (cx, cy), r = cv2.minEnclosingCircle(pts)
    cx, cy, r = float(cx), float(cy), float(r)

    h, w = bgr.shape[:2]
    yy, xx = np.ogrid[:h, :w]
    dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    inside = dist <= r + 0.5

    bgra = cv2.cvtColor(bgr, cv2.COLOR_BGR2BGRA)
    bgra[:, :, 3] = (inside.astype(np.uint8) * 255)
    # Trim antialiased edge: zero pixels outside circle
    bgra[~inside] = [0, 0, 0, 0]

    x0 = max(int(math.floor(cx - r - 2)), 0)
    y0 = max(int(math.floor(cy - r - 2)), 0)
    x1 = min(int(math.ceil(cx + r + 2)), w)
    y1 = min(int(math.ceil(cy + r + 2)), h)
    crop = bgra[y0:y1, x0:x1].copy()
    return crop, (cx - x0, cy - y0, r)


def orange_mask_from_emblem(bgra: np.ndarray) -> np.ndarray:
    """Binary mask of orange artwork (exclude black disk background)."""
    hsv = cv2.cvtColor(bgra[:, :, :3], cv2.COLOR_BGR2HSV)
    # Orange in OpenCV H: ~5–25 (depends on lighting)
    lower = np.array([5, 60, 60])
    upper = np.array([30, 255, 255])
    m1 = cv2.inRange(hsv, lower, upper)
    # Also catch bright orange RGB
    rgb = cv2.cvtColor(bgra[:, :, :3], cv2.COLOR_BGR2RGB)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    m2 = ((r > 160) & (g > 60) & (b < 140) & (r > g) & (r > b)).astype(np.uint8) * 255
    m = cv2.bitwise_or(m1, m2)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    # Restrict to opaque emblem area
    a = bgra[:, :, 3]
    m[a < 10] = 0
    return m


def contours_to_svg_paths(mask: np.ndarray, simplify_eps: float) -> tuple[str, tuple[float, float, float, float]]:
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    parts: list[str] = []
    min_x = min_y = float("inf")
    max_x = max_y = float("-inf")
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 80.0:
            continue
        approx = cv2.approxPolyDP(cnt, simplify_eps, True)
        pts = approx.squeeze()
        if pts.ndim != 2 or len(pts) < 3:
            continue
        x0, y0 = float(pts[0][0]), float(pts[0][1])
        min_x = min(min_x, x0)
        min_y = min(min_y, y0)
        max_x = max(max_x, x0)
        max_y = max(max_y, y0)
        d = [f"M{x0:.2f},{y0:.2f}"]
        for i in range(1, len(pts)):
            x, y = float(pts[i][0]), float(pts[i][1])
            d.append(f"L{x:.2f},{y:.2f}")
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)
        d.append("Z")
        parts.append("".join(d))
    if not parts:
        raise RuntimeError("No SVG paths from orange mask — tune HSV thresholds")
    pad = 4.0
    bbox = (
        min_x - pad,
        min_y - pad,
        (max_x - min_x) + 2 * pad,
        (max_y - min_y) + 2 * pad,
    )
    return " ".join(parts), bbox


def resize_emblem_square(
    rgba: np.ndarray, out_size: int, inscribed: bool = True
) -> Image.Image:
    """Resize emblem so the circle fits in out_size square (inscribed: diameter = out_size)."""
    a = rgba[:, :, 3]
    ys, xs = np.where(a > 0)
    if len(xs) == 0:
        raise RuntimeError("Empty emblem")
    x0, x1 = xs.min(), xs.max()
    y0, y1 = ys.min(), ys.max()
    crop = rgba[y0 : y1 + 1, x0 : x1 + 1]
    ch, cw = crop.shape[:2]
    dia = min(ch, cw)
    if inscribed:
        scale = out_size / dia
    else:
        scale = out_size / max(ch, cw)
    new_w = max(1, int(round(cw * scale)))
    new_h = max(1, int(round(ch * scale)))
    pil = Image.fromarray(cv2.cvtColor(crop, cv2.COLOR_BGRA2RGBA))
    pil = pil.resize((new_w, new_h), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (out_size, out_size), (0, 0, 0, 0))
    ox = (out_size - new_w) // 2
    oy = (out_size - new_h) // 2
    canvas.paste(pil, (ox, oy), pil)
    return canvas


def write_simple_png(path: Path, pil_rgba: Image.Image) -> None:
    pil_rgba.save(path, "PNG", optimize=True)


def write_ico(path: Path, images: list[Image.Image]) -> None:
    """Write multi-size ICO (PNG-compressed entries, Windows-friendly)."""
    pil_rgba = images[0]
    if pil_rgba.mode != "RGBA":
        pil_rgba = pil_rgba.convert("RGBA")
    entries: list[bytes] = []
    directory: list[bytes] = []
    offset = 6 + len(images) * 16
    for im in images:
        if im.mode != "RGBA":
            im = im.convert("RGBA")
        w, h = im.size
        buf = BytesPNGWriter(im.tobytes("raw", "RGBA"), w, h).write()
        entries.append(buf)
        # ICO directory entry
        width_byte = 0 if w >= 256 else w
        height_byte = 0 if h >= 256 else h
        directory.append(
            struct.pack(
                "<BBBBHHII",
                width_byte,
                height_byte,
                0,
                0,
                1,
                32,
                len(buf),
                offset,
            )
        )
        offset += len(buf)
    with path.open("wb") as f:
        f.write(struct.pack("<HHH", 0, 1, len(images)))
        for d in directory:
            f.write(d)
        for e in entries:
            f.write(e)


class BytesPNGWriter:
    """Minimal RGBA PNG for ICO embedding."""

    def __init__(self, raw_rgba: bytes, width: int, height: int) -> None:
        self.raw = raw_rgba
        self.w = width
        self.h = height

    def write(self) -> bytes:
        def chunk(tag: bytes, data: bytes) -> bytes:
            return struct.pack(">I", len(data)) + tag + data + struct.pack(
                ">I", zlib.crc32(tag + data) & 0xFFFFFFFF
            )

        ihdr = struct.pack(">IIBBBBB", self.w, self.h, 8, 6, 0, 0, 0)
        raw_lines = b""
        stride = self.w * 4
        for y in range(self.h):
            raw_lines += b"\x00" + self.raw[y * stride : (y + 1) * stride]
        compressed = zlib.compress(raw_lines, 9)
        return (
            b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", ihdr)
            + chunk(b"IDAT", compressed)
            + chunk(b"IEND", b"")
        )


def main() -> None:
    src = SRC if SRC.exists() else FALLBACK_SRC
    if not src.exists():
        raise SystemExit(
            f"Missing {SRC} (or {FALLBACK_SRC}) — add image_12.png to scripts/favicon-source/"
        )

    OUT.mkdir(parents=True, exist_ok=True)
    bgr = load_rgb(src)
    emblem_rgba, (ccx, ccy, cr) = extract_circle_rgba(bgr)

    # Master sizes from extracted circle (square crop is ~2r+margin)
    sizes = [16, 32, 48, 120, 152, 180, 192, 512]
    pngs: dict[int, Image.Image] = {}
    for s in sizes:
        pngs[s] = resize_emblem_square(emblem_rgba, s, inscribed=True)

    write_simple_png(OUT / "icon-16x16.png", pngs[16])
    write_simple_png(OUT / "icon-32x32.png", pngs[32])
    write_simple_png(OUT / "apple-touch-icon-120x120.png", pngs[120])
    write_simple_png(OUT / "apple-touch-icon-152x152.png", pngs[152])
    write_simple_png(OUT / "apple-touch-icon.png", pngs[180])
    write_simple_png(OUT / "icon-192x192.png", pngs[192])
    write_simple_png(OUT / "icon-512x512.png", pngs[512])

    ico_imgs = [pngs[16], pngs[32], pngs[48]]
    write_ico(OUT / "favicon.ico", ico_imgs)

    # Safari pinned tab: orange glyph only → black paths (Safari tints via link color)
    mask = orange_mask_from_emblem(emblem_rgba)
    eps = max(emblem_rgba.shape[:2]) * 0.002
    path_d, (vb_x0, vb_y0, vb_w, vb_h) = contours_to_svg_paths(mask, eps)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb_x0:.2f} {vb_y0:.2f} {vb_w:.2f} {vb_h:.2f}">
  <path fill="#000000" d="{path_d}"/>
</svg>
'''
    (OUT / "safari-pinned-tab.svg").write_text(svg, encoding="utf-8")

    manifest = f'''{{
  "name": "ScholarshipTop",
  "short_name": "ScholarshipTop",
  "description": "Find scholarships that match you.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#fafafa",
  "theme_color": "{ORANGE}",
  "icons": [
    {{
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    }},
    {{
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    }}
  ]
}}
'''
    (OUT / "site.webmanifest").write_text(manifest, encoding="utf-8")

    print("Wrote favicon assets to", OUT)


if __name__ == "__main__":
    main()
