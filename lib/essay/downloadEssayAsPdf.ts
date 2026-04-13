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

function attributionParagraph(): string {
  return (
    `This draft was created on ${SITE_BRAND} using the AI mentor and essay editing tools. ` +
    'Review and personalize the text before you submit it to any scholarship or program.'
  );
}

/**
 * Builds a simple multi-page A4 PDF from plain text (same content users copy from the editor).
 */
export function downloadEssayAsPdf(options: DownloadEssayPdfOptions): void {
  const body = options.body.trim();
  if (!body) return;

  const includeAttribution = options.includeAttribution !== false;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 14;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = pageW - margin * 2;
  const lineHeight = 6;
  const footerLineHeight = 5;
  let y = margin;

  const title = options.title?.trim();
  if (title) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(title, margin, y);
    y += 12;
  }

  doc.setFont('helvetica', 'normal');
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

    doc.setFont('helvetica', 'italic');
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

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(55, 55, 55);
    const siteLine = PDF_FOOTER_SITE_LINE;
    const siteW = doc.getTextWidth(siteLine);
    doc.text(siteLine, (pageW - siteW) / 2, y);

    doc.setTextColor(0, 0, 0);
  }

  const rawBase = options.fileBaseName?.trim() || 'scholarship-essay';
  const safeBase = rawBase.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-|-$/g, '') || 'essay';
  doc.save(`${safeBase}.pdf`);
}
