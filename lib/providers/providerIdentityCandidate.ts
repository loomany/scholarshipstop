export type ProviderIdentityConfidence = 'high' | 'medium' | 'low';

export type ProviderIdentityCandidate = {
  providerName: string;
  providerSlug: string;
  confidence: ProviderIdentityConfidence;
  reason: string;
};

export type ProviderIdentityInput = {
  providerName?: string | null;
  providerSlug?: string | null;
  providerMission?: string | null;
  source?: string | null;
  officialSourceName?: string | null;
};

const PROVIDER_MISSION_RE =
  /^(?:the\s+)?(.{2,100}?)\s+(?:has established|has created|is offering|offers|supports)\b/i;

const PROGRAM_NAME_RE =
  /\b(scholarship|program|application|award|grant|fellowship)\b/i;

const BLOCKED_PROVIDER_NAMES = new Set([
  'scholarship america',
  'scholars apply',
  'scholarsapply'
]);

export function providerIdentitySlugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function wordCount(value: string): number {
  return value.split(/\s+/).filter(Boolean).length;
}

function cleanCandidateName(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/^[“"'‘’]+|[“"'‘’.,;:]+$/g, '')
    .trim();
}

export function extractProviderNameFromProviderMission(
  mission: string | null | undefined
): string | null {
  const normalized = mission?.trim().replace(/\s+/g, ' ');
  if (!normalized) return null;

  const match = normalized.match(PROVIDER_MISSION_RE);
  if (!match) return null;

  const name = cleanCandidateName(match[1]);
  if (!name) return null;

  const lower = name.toLowerCase();
  if (BLOCKED_PROVIDER_NAMES.has(lower)) return null;
  if (PROGRAM_NAME_RE.test(name)) return null;

  const words = wordCount(name);
  if (words < 1 || words > 5) return null;

  return name;
}

export function generateProviderIdentityCandidate(
  input: ProviderIdentityInput
): ProviderIdentityCandidate | null {
  const existingName = input.providerName?.trim();
  const existingSlug = input.providerSlug?.trim();
  if (existingName || existingSlug) return null;

  const providerName = extractProviderNameFromProviderMission(
    input.providerMission
  );
  if (!providerName) return null;

  const providerSlug = providerIdentitySlugify(providerName);
  if (!providerSlug) return null;

  return {
    providerName,
    providerSlug,
    confidence: 'high',
    reason:
      'provider_mission starts with an organization-name phrase such as "X has established/offers/supports"'
  };
}
