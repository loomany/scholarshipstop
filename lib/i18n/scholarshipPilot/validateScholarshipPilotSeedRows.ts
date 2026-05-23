import type { ScholarshipDetailPilotSeedRow } from '@/lib/i18n/scholarshipPilot/scholarshipPilotTranslationsData';
import type { ScholarshipPilotFacts } from '@/lib/i18n/scholarshipPilot/scholarshipPilotContentFactory';

const FORBIDDEN_PHRASES = [
  /guaranteed\s+(award|win|admission)/i,
  /scholarshiptop\s+(awards|grants|pays)/i,
  /localhost/i,
  /\/en\//i,
  /127\.0\.0\.1/
];

export function validateScholarshipPilotSeedRows(
  rows: ScholarshipDetailPilotSeedRow[],
  factsBySlug: Map<string, ScholarshipPilotFacts>
): string[] {
  const errors: string[] = [];

  for (const row of rows) {
    const facts = factsBySlug.get(row.source_slug);
    if (!facts) {
      errors.push(`missing facts for ${row.source_slug}`);
      continue;
    }
    const officialTitle = facts.officialTitle.trim() || row.source_slug;
    if (!row.translated_title?.trim()) {
      errors.push(`${row.source_slug} ${row.locale}: translated_title is empty`);
    }
    if (row.translated_title !== officialTitle) {
      errors.push(`${row.source_slug} ${row.locale}: title must match official title`);
    }
    const blob = [
      row.translated_body,
      row.translated_summary,
      row.translated_meta_description
    ].join('\n');
    const amountNeedle = facts.amount.replace(/[,$]/g, '');
    if (amountNeedle !== 'See official source' && !blob.replace(/[,$]/g, '').includes(amountNeedle)) {
      errors.push(`${row.source_slug} ${row.locale}: amount not preserved in copy`);
    }
    if (
      facts.deadline !== 'See official source' &&
      !blob.includes(facts.deadline.slice(0, Math.min(12, facts.deadline.length)))
    ) {
      errors.push(`${row.source_slug} ${row.locale}: deadline not preserved in copy`);
    }
    const providerKey = facts.provider.slice(0, 24).trim();
    if (providerKey.length >= 8 && !blob.includes(providerKey)) {
      errors.push(`${row.source_slug} ${row.locale}: provider not preserved in copy`);
    }
    if (!row.translated_faq_json?.length) {
      errors.push(`${row.source_slug} ${row.locale}: FAQ empty`);
    }
    const disclaimer =
      row.translated_extra_json &&
      typeof row.translated_extra_json === 'object' &&
      !Array.isArray(row.translated_extra_json)
        ? (row.translated_extra_json as { disclaimer?: string }).disclaimer
        : '';
    if (!disclaimer?.trim()) {
      errors.push(`${row.source_slug} ${row.locale}: missing disclaimer`);
    }
    for (const re of FORBIDDEN_PHRASES) {
      if (re.test(blob)) errors.push(`${row.source_slug} ${row.locale}: forbidden phrase ${re}`);
    }
    if (row.locale === 'es' && /\b(the scholarship is awarded by scholarshiptop)\b/i.test(blob)) {
      errors.push(`${row.source_slug} es: English leakage`);
    }
  }
  return errors;
}
