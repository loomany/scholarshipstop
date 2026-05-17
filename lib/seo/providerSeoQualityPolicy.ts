export type ProviderSourceStatus =
  | 'official_source_available'
  | 'source_needs_confirmation'
  | 'missing_official_url';

export type ProviderDataCompleteness = 'strong' | 'partial' | 'weak';

export type ProviderSeoQualityFacts = {
  slug?: string | null;
  displayName?: string | null;
  activeScholarshipCount?: number | null;
  officialUrl?: string | null;
  hasDescription?: boolean;
  hasPublicScholarshipList?: boolean;
  hasSourceTrustContext?: boolean;
  routeResolves?: boolean;
  duplicateOrMerged?: boolean;
};

export type ProviderSeoQualityDecision = {
  indexable: boolean;
  includeInSitemap: boolean;
  sourceStatus: ProviderSourceStatus;
  dataCompleteness: ProviderDataCompleteness;
  reasons: string[];
};

function normalizeText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/g, ' ') ?? '';
}

function isHttpUrl(value: string | null | undefined): boolean {
  const raw = value?.trim();
  if (!raw) return false;
  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isClearProviderDisplayName(
  value: string | null | undefined
): boolean {
  const name = normalizeText(value);
  if (!name) return false;
  if (name.length < 2 || name.length > 120) return false;
  if (name.split(/\s+/).length > 14) return false;
  if (/^https?:\/\//i.test(name) || /^www\./i.test(name)) return false;
  if (/[.!?]\s/.test(name) || /[{}[\]|]/.test(name)) return false;
  if (/^(unknown|provider|scholarship provider)$/i.test(name)) return false;
  return true;
}

export function getProviderSourceStatus(
  officialUrl: string | null | undefined
): ProviderSourceStatus {
  if (isHttpUrl(officialUrl)) return 'official_source_available';
  if (normalizeText(officialUrl)) return 'source_needs_confirmation';
  return 'missing_official_url';
}

function computeCompleteness(
  facts: ProviderSeoQualityFacts,
  sourceStatus: ProviderSourceStatus
): ProviderDataCompleteness {
  const count = Math.max(0, Math.floor(facts.activeScholarshipCount ?? 0));
  const hasDescription = facts.hasDescription === true;
  const hasPublicList = facts.hasPublicScholarshipList !== false && count > 0;
  const hasTrustContext = facts.hasSourceTrustContext !== false;

  if (
    sourceStatus === 'official_source_available' &&
    hasDescription &&
    hasPublicList &&
    hasTrustContext &&
    count >= 3
  ) {
    return 'strong';
  }

  if (hasPublicList && (hasDescription || count >= 2 || hasTrustContext)) {
    return 'partial';
  }

  return 'weak';
}

export function getProviderSeoQualityPolicy(
  facts: ProviderSeoQualityFacts
): ProviderSeoQualityDecision {
  const reasons: string[] = [];
  const activeCount = Math.max(0, Math.floor(facts.activeScholarshipCount ?? 0));
  const sourceStatus = getProviderSourceStatus(facts.officialUrl);
  const nameIsClear = isClearProviderDisplayName(facts.displayName);
  const slug = normalizeText(facts.slug);

  if (!slug) reasons.push('Missing canonical provider slug.');
  if (facts.routeResolves === false) reasons.push('Provider route does not resolve.');
  if (activeCount < 1) reasons.push('No active public scholarships are linked.');
  if (!nameIsClear) reasons.push('Provider display name is unclear.');
  if (facts.duplicateOrMerged === true) {
    reasons.push('Provider appears to be duplicate or unresolved merged data.');
  }
  if (facts.hasPublicScholarshipList === false) {
    reasons.push('No visible public scholarship list is available.');
  }
  if (facts.hasSourceTrustContext === false) {
    reasons.push('Source/trust context is missing from the public page.');
  }

  const dataCompleteness = computeCompleteness(facts, sourceStatus);
  if (
    sourceStatus === 'missing_official_url' &&
    dataCompleteness === 'weak'
  ) {
    reasons.push('Missing official URL and not enough unique public value.');
  }

  const hardFail = reasons.some((reason) =>
    [
      'Missing canonical provider slug.',
      'Provider route does not resolve.',
      'No active public scholarships are linked.',
      'Provider display name is unclear.',
      'Provider appears to be duplicate or unresolved merged data.',
      'No visible public scholarship list is available.',
      'Source/trust context is missing from the public page.',
      'Missing official URL and not enough unique public value.'
    ].includes(reason)
  );

  return {
    indexable: !hardFail,
    includeInSitemap: !hardFail,
    sourceStatus,
    dataCompleteness,
    reasons: reasons.length > 0 ? reasons : ['Provider page meets public SEO quality rules.']
  };
}

export function providerSourceStatusLabel(status: ProviderSourceStatus): string {
  if (status === 'official_source_available') return 'Official source available';
  if (status === 'source_needs_confirmation') return 'Source needs confirmation';
  return 'Missing official URL';
}

export function providerDataCompletenessLabel(
  value: ProviderDataCompleteness
): string {
  if (value === 'strong') return 'Data: strong';
  if (value === 'partial') return 'Data: partial';
  return 'Data: weak';
}
