import { jsPDF } from 'jspdf';

import { SITE_BRAND } from '@/lib/seo/siteTitle';

/** Public site line in PDF footer (branded domain). */
export const PDF_FOOTER_SITE_LINE = 'ScholarshipTop.com';

export type DownloadEssayPdfOptions = {
  body: string;
  /** Shown at the top of the first page. */
  title?: string;
  /** Used for the downloaded file name (without extension). */
  fileBaseName?: string;
  /** Append ScholarshipTop / AI mentor attribution after the essay (default: true). */
  includeAttribution?: boolean;
};

const PDF_FONT_FAMILY = 'NotoSans';

const FONT_FILES = {
  normal: 'NotoSans-Regular.ttf',
  bold: 'NotoSans-Bold.ttf',
  italic: 'NotoSans-Italic.ttf'
} as const;

/** Same-origin paths (served from /public/fonts). */
const FONT_URLS: Record<keyof typeof FONT_FILES, string> = {
  normal: '/fonts/NotoSans-Regular.ttf',
  bold: '/fonts/NotoSans-Bold.ttf',
  italic: '/fonts/NotoSans-Italic.ttf'
};

type FontVfs = Record<string, string>;

let cachedFontVfs: FontVfs | null = null;

function arrayBufferToBinaryString(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return binary;
}

async function loadNotoSansIntoVfs(): Promise<FontVfs> {
  if (cachedFontVfs) return cachedFontVfs;

  const [normalRes, boldRes, italicRes] = await Promise.all([
    fetch(FONT_URLS.normal),
    fetch(FONT_URLS.bold),
    fetch(FONT_URLS.italic)
  ]);

  if (!normalRes.ok || !boldRes.ok || !italicRes.ok) {
    throw new Error(
      'Could not load PDF fonts. Check your connection and try again.'
    );
  }

  const [normalBuf, boldBuf, italicBuf] = await Promise.all([
    normalRes.arrayBuffer(),
    boldRes.arrayBuffer(),
    italicRes.arrayBuffer()
  ]);

  cachedFontVfs = {
    [FONT_FILES.normal]: arrayBufferToBinaryString(normalBuf),
    [FONT_FILES.bold]: arrayBufferToBinaryString(boldBuf),
    [FONT_FILES.italic]: arrayBufferToBinaryString(italicBuf)
  };

  return cachedFontVfs;
}

function registerNotoSans(doc: jsPDF, vfs: FontVfs): void {
  doc.addFileToVFS(FONT_FILES.normal, vfs[FONT_FILES.normal]);
  doc.addFont(FONT_FILES.normal, PDF_FONT_FAMILY, 'normal');
  doc.addFileToVFS(FONT_FILES.bold, vfs[FONT_FILES.bold]);
  doc.addFont(FONT_FILES.bold, PDF_FONT_FAMILY, 'bold');
  doc.addFileToVFS(FONT_FILES.italic, vfs[FONT_FILES.italic]);
  doc.addFont(FONT_FILES.italic, PDF_FONT_FAMILY, 'italic');
}

function attributionParagraph(): string {
  return (
    `This draft was created on ${SITE_BRAND} using the AI mentor and essay editing tools. ` +
    'Review and personalize the text before you submit it to any scholarship or program.'
  );
}

/**
 * Builds a simple multi-page A4 PDF from plain text (same content users copy from the editor).
 * Uses Noto Sans so Cyrillic and other Unicode text render correctly (Helvetica only supports Latin-1).
 */
export async function downloadEssayAsPdf(
  options: DownloadEssayPdfOptions
): Promise<void> {
  const body = options.body.trim();
  if (!body) return;

  const includeAttribution = options.includeAttribution !== false;

  const vfs = await loadNotoSansIntoVfs();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  registerNotoSans(doc, vfs);

  const margin = 14;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = pageW - margin * 2;
  const lineHeight = 6;
  const footerLineHeight = 5;
  let y = margin;

  const title = options.title?.trim();
  if (title) {
    doc.setFont(PDF_FONT_FAMILY, 'bold');
    doc.setFontSize(14);
    doc.text(title, margin, y);
    y += 12;
  }

  doc.setFont(PDF_FONT_FAMILY, 'normal');
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(body, maxW);

  for (const line of lines) {
    if (y + lineHeight > pageH - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += lineHeight;
  }

  if (includeAttribution) {
    const footerText = attributionParagraph();
    const footerLines = doc.splitTextToSize(footerText, maxW);
    const footerBlockH = 6 + footerLines.length * footerLineHeight + margin;

    y += 6;
    if (y + footerBlockH > pageH) {
      doc.addPage();
      y = margin;
    }

    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.25);
    doc.line(margin, y, pageW - margin, y);
    y += 8;

    doc.setFont(PDF_FONT_FAMILY, 'italic');
    doc.setFontSize(9);
    doc.setTextColor(75, 75, 75);

    for (const fl of footerLines) {
      if (y + footerLineHeight > pageH - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(fl, margin, y);
      y += footerLineHeight;
    }

    y += 5;
    if (y + footerLineHeight > pageH - margin) {
      doc.addPage();
      y = margin;
    }

    doc.setFont(PDF_FONT_FAMILY, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(55, 55, 55);
    const siteLine = PDF_FOOTER_SITE_LINE;
    const siteW = doc.getTextWidth(siteLine);
    doc.text(siteLine, (pageW - siteW) / 2, y);

    doc.setTextColor(0, 0, 0);
  }

  const rawBase = options.fileBaseName?.trim() || 'scholarship-essay';
  const safeBase =
    rawBase.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-|-$/g, '') || 'essay';
  doc.save(`${safeBase}.pdf`);
}
