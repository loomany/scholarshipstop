/**
 * US states (50) — full names only. Used for onboarding + account profile.
 * Persisted on `public.profiles.state_region` (canonical full name, e.g. California).
 */

/** Shared placeholder for onboarding state step and account eligibility field. */
export const US_STATE_AUTOCOMPLETE_PLACEHOLDER = 'Start typing a state…';

/** Short helper under the state field on the account profile (optional). */
export const US_STATE_PROFILE_HELPER_TEXT =
  'Optional — helps us narrow scholarships by state.';

export const US_STATE_NAMES = [
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Pennsylvania',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virginia',
  'Washington',
  'West Virginia',
  'Wisconsin',
  'Wyoming'
] as const;

const LOWER_SET = new Set(US_STATE_NAMES.map((s) => s.toLowerCase()));

/** Full name → USPS abbreviation (for matching catalog `state_codes`). */
export const US_STATE_NAME_TO_CODE: Record<string, string> = {
  Alabama: 'AL',
  Alaska: 'AK',
  Arizona: 'AZ',
  Arkansas: 'AR',
  California: 'CA',
  Colorado: 'CO',
  Connecticut: 'CT',
  Delaware: 'DE',
  Florida: 'FL',
  Georgia: 'GA',
  Hawaii: 'HI',
  Idaho: 'ID',
  Illinois: 'IL',
  Indiana: 'IN',
  Iowa: 'IA',
  Kansas: 'KS',
  Kentucky: 'KY',
  Louisiana: 'LA',
  Maine: 'ME',
  Maryland: 'MD',
  Massachusetts: 'MA',
  Michigan: 'MI',
  Minnesota: 'MN',
  Mississippi: 'MS',
  Missouri: 'MO',
  Montana: 'MT',
  Nebraska: 'NE',
  Nevada: 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  Ohio: 'OH',
  Oklahoma: 'OK',
  Oregon: 'OR',
  Pennsylvania: 'PA',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  Tennessee: 'TN',
  Texas: 'TX',
  Utah: 'UT',
  Vermont: 'VT',
  Virginia: 'VA',
  Washington: 'WA',
  'West Virginia': 'WV',
  Wisconsin: 'WI',
  Wyoming: 'WY'
};

export function filterUsStateNames(query: string, limit = 8): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const starts: string[] = [];
  const contains: string[] = [];

  for (const name of US_STATE_NAMES) {
    const low = name.toLowerCase();
    if (low.startsWith(q)) starts.push(name);
    else if (low.includes(q)) contains.push(name);
  }

  const merged = [...starts, ...contains];
  return merged.slice(0, limit);
}

/**
 * Returns canonical full state name if `raw` matches a known state (case-insensitive).
 * Otherwise null — treat as unset (optional field).
 */
export function normalizeUsStateToCanonical(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const low = t.toLowerCase();
  if (!LOWER_SET.has(low)) return null;
  return US_STATE_NAMES.find((n) => n.toLowerCase() === low) ?? null;
}
