export type CountryOption = {
  code: string;
  label: string;
  aliases: string[];
};

const COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'US', label: 'United States', aliases: ['united states', 'usa', 'u.s.', 'u.s', 'american', 'united states of america'] },
  { code: 'CA', label: 'Canada', aliases: ['canada', 'canadian'] },
  { code: 'GB', label: 'United Kingdom', aliases: ['united kingdom', 'uk', 'u.k.', 'britain', 'british', 'england', 'scotland', 'wales'] },
  { code: 'CN', label: 'China', aliases: ['china', 'chinese'] },
  { code: 'IN', label: 'India', aliases: ['india', 'indian'] },
  { code: 'BR', label: 'Brazil', aliases: ['brazil', 'brazilian'] },
  { code: 'MX', label: 'Mexico', aliases: ['mexico', 'mexican'] },
  { code: 'KR', label: 'South Korea', aliases: ['south korea', 'korea, south', 'korean'] },
  { code: 'JP', label: 'Japan', aliases: ['japan', 'japanese'] },
  { code: 'TW', label: 'Taiwan', aliases: ['taiwan', 'taiwanese'] },
  { code: 'HK', label: 'Hong Kong', aliases: ['hong kong', 'hong kong sar'] },
  { code: 'PH', label: 'Philippines', aliases: ['philippines', 'philippine', 'filipino', 'filipina'] },
  { code: 'ID', label: 'Indonesia', aliases: ['indonesia', 'indonesian'] },
  { code: 'VN', label: 'Vietnam', aliases: ['vietnam', 'vietnamese'] },
  { code: 'MY', label: 'Malaysia', aliases: ['malaysia', 'malaysian'] },
  { code: 'TH', label: 'Thailand', aliases: ['thailand', 'thai'] },
  { code: 'SG', label: 'Singapore', aliases: ['singapore', 'singaporean'] },
  { code: 'PK', label: 'Pakistan', aliases: ['pakistan', 'pakistani'] },
  { code: 'BD', label: 'Bangladesh', aliases: ['bangladesh', 'bangladeshi'] },
  { code: 'NP', label: 'Nepal', aliases: ['nepal', 'nepali'] },
  { code: 'LK', label: 'Sri Lanka', aliases: ['sri lanka', 'sri lankan'] },
  { code: 'NG', label: 'Nigeria', aliases: ['nigeria', 'nigerian'] },
  { code: 'GH', label: 'Ghana', aliases: ['ghana', 'ghanaian'] },
  { code: 'KE', label: 'Kenya', aliases: ['kenya', 'kenyan'] },
  { code: 'ZA', label: 'South Africa', aliases: ['south africa', 'south african'] },
  { code: 'ET', label: 'Ethiopia', aliases: ['ethiopia', 'ethiopian'] },
  { code: 'EG', label: 'Egypt', aliases: ['egypt', 'egyptian'] },
  { code: 'CO', label: 'Colombia', aliases: ['colombia', 'colombian'] },
  { code: 'AU', label: 'Australia', aliases: ['australia', 'australian'] },
  { code: 'NZ', label: 'New Zealand', aliases: ['new zealand', 'new zealander'] },
  { code: 'DE', label: 'Germany', aliases: ['germany', 'german'] },
  { code: 'FR', label: 'France', aliases: ['france', 'french', 'frenchman'] },
  { code: 'IT', label: 'Italy', aliases: ['italy', 'italian'] },
  { code: 'ES', label: 'Spain', aliases: ['spain', 'spanish'] },
  { code: 'NL', label: 'Netherlands', aliases: ['netherlands', 'dutch'] },
  { code: 'IE', label: 'Ireland', aliases: ['ireland', 'irish'] },
  { code: 'CH', label: 'Switzerland', aliases: ['switzerland', 'swiss'] },
  { code: 'SE', label: 'Sweden', aliases: ['sweden', 'swedish'] },
  { code: 'NO', label: 'Norway', aliases: ['norway', 'norwegian'] },
  { code: 'DK', label: 'Denmark', aliases: ['denmark', 'danish'] },
  { code: 'FI', label: 'Finland', aliases: ['finland', 'finnish'] },
  { code: 'BE', label: 'Belgium', aliases: ['belgium', 'belgian'] },
  { code: 'PT', label: 'Portugal', aliases: ['portugal', 'portuguese'] },
  { code: 'PL', label: 'Poland', aliases: ['poland', 'polish'] },
  { code: 'UA', label: 'Ukraine', aliases: ['ukraine', 'ukrainian'] },
  { code: 'RU', label: 'Russia', aliases: ['russia', 'russian'] },
  { code: 'TR', label: 'Turkey', aliases: ['turkey', 'turkish'] },
  { code: 'KZ', label: 'Kazakhstan', aliases: ['kazakhstan', 'kazakhstani'] },
  { code: 'IL', label: 'Israel', aliases: ['israel', 'israeli'] },
  { code: 'AE', label: 'United Arab Emirates', aliases: ['united arab emirates', 'uae', 'emirati'] },
  { code: 'SA', label: 'Saudi Arabia', aliases: ['saudi arabia', 'saudi arabian'] },
  { code: 'AR', label: 'Argentina', aliases: ['argentina', 'argentine', 'argentinian'] },
  { code: 'CL', label: 'Chile', aliases: ['chile', 'chilean'] },
  { code: 'PE', label: 'Peru', aliases: ['peru', 'peruvian'] },
  { code: 'VE', label: 'Venezuela', aliases: ['venezuela', 'venezuelan'] },
  { code: 'CU', label: 'Cuba', aliases: ['cuba', 'cuban'] },
  { code: 'JM', label: 'Jamaica', aliases: ['jamaica', 'jamaican'] },
  { code: 'DO', label: 'Dominican Republic', aliases: ['dominican republic', 'dominican'] }
];

export const SCHOLARSHIP_COUNTRY_OPTIONS = COUNTRY_OPTIONS;

export const SCHOLARSHIP_COUNTRY_BY_CODE = Object.fromEntries(
  SCHOLARSHIP_COUNTRY_OPTIONS.map((country) => [country.code, country])
) as Record<string, CountryOption | undefined>;

const ALIAS_TO_CODE = new Map<string, string>();
for (const country of SCHOLARSHIP_COUNTRY_OPTIONS) {
  ALIAS_TO_CODE.set(country.code.toLowerCase(), country.code);
  ALIAS_TO_CODE.set(country.label.toLowerCase(), country.code);
  for (const alias of country.aliases) ALIAS_TO_CODE.set(alias.toLowerCase(), country.code);
}

export function countryLabelFromCode(code: string): string {
  const normalized = normalizeCountryCode(code);
  if (!normalized) return code.trim().toUpperCase();
  return SCHOLARSHIP_COUNTRY_BY_CODE[normalized]?.label ?? normalized;
}

export function normalizeCountryCode(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  const upper = t.toUpperCase();
  if (/^[A-Z]{2}$/.test(upper)) {
    return SCHOLARSHIP_COUNTRY_BY_CODE[upper] ? upper : null;
  }
  return ALIAS_TO_CODE.get(t.toLowerCase()) ?? null;
}

export function countryCodesFromText(raw: string): string[] {
  const text = raw.trim();
  if (!text) return [];
  const out = new Set<string>();
  for (const country of SCHOLARSHIP_COUNTRY_OPTIONS) {
    for (const alias of country.aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`\\b${escaped}\\b`, 'i').test(text)) {
        out.add(country.code);
        break;
      }
    }
  }
  return [...out].sort();
}

export function sanitizeCountryCodes(raw: Iterable<string>): string[] {
  const out = new Set<string>();
  for (const value of raw) {
    const code = normalizeCountryCode(value);
    if (code) out.add(code);
  }
  return [...out].sort();
}
