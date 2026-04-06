/** Stored in `profiles.citizenship_status` / `citizenship_status_label`. */
export const CITIZENSHIP_OPTIONS = [
  { value: 'us_citizen', label: 'U.S. Citizen' },
  { value: 'us_permanent_resident', label: 'U.S. Permanent Resident (Green Card)' },
  { value: 'international_student', label: 'International Student' }
] as const;

export function citizenshipLabelForValue(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  const hit = CITIZENSHIP_OPTIONS.find((o) => o.value === v);
  return hit?.label ?? null;
}

export const USA_COUNTRY_CODE = 'US';

/** Compact country list (ISO 3166-1 alpha-2). Extend later if needed. */
export const COUNTRY_SELECT_OPTIONS: { value: string; label: string }[] = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'MX', label: 'Mexico' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'IN', label: 'India' },
  { value: 'CN', label: 'China' },
  { value: 'KR', label: 'South Korea' },
  { value: 'JP', label: 'Japan' },
  { value: 'PH', label: 'Philippines' },
  { value: 'VN', label: 'Vietnam' },
  { value: 'NG', label: 'Nigeria' },
  { value: 'BR', label: 'Brazil' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'IT', label: 'Italy' },
  { value: 'ES', label: 'Spain' },
  { value: 'AU', label: 'Australia' },
  { value: 'NZ', label: 'New Zealand' },
  { value: 'PK', label: 'Pakistan' },
  { value: 'BD', label: 'Bangladesh' },
  { value: 'EG', label: 'Egypt' },
  { value: 'KE', label: 'Kenya' },
  { value: 'GH', label: 'Ghana' },
  { value: 'CO', label: 'Colombia' },
  { value: 'AR', label: 'Argentina' },
  { value: 'PL', label: 'Poland' },
  { value: 'UA', label: 'Ukraine' },
  { value: 'TR', label: 'Turkey' },
  { value: 'SA', label: 'Saudi Arabia' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'OTHER', label: 'Other' }
];

export const US_STATE_OPTIONS: { value: string; label: string }[] = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'DC', label: 'District of Columbia' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' }
];

const CITIZENSHIP_VALUES: Set<string> = new Set(
  CITIZENSHIP_OPTIONS.map((o) => o.value)
);
const COUNTRY_VALUES: Set<string> = new Set(
  COUNTRY_SELECT_OPTIONS.map((o) => o.value)
);

export function isValidCitizenshipSlug(v: string): boolean {
  return CITIZENSHIP_VALUES.has(v);
}

export function isValidCountryCode(v: string): boolean {
  return COUNTRY_VALUES.has(v);
}

export function countryLabel(code: string): string | null {
  return COUNTRY_SELECT_OPTIONS.find((c) => c.value === code)?.label ?? null;
}
