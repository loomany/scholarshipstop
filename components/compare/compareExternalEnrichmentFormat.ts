const NA = 'Not available';

export function fmtEnrichmentUsd(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

export function fmtEnrichmentPctFromFraction(
  value: number | null | undefined
): string | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return `${(value * 100).toFixed(1)}%`;
}

export function fmtEnrichmentCount(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

export function fmtEnrichmentHourly(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return `${value.toFixed(2)}/hr`;
}

export function fmtEnrichmentRatePer100k(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(value)} per 100k population`;
}

export function enrichmentNotAvailableLabel(fallback?: string): string {
  const trimmed = fallback?.trim();
  if (!trimmed || trimmed === '—' || trimmed === '-') return NA;
  return trimmed;
}
