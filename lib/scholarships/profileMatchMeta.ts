import { citizenshipLabelForValue } from '@/lib/constants/onboardingCitizenshipAndLocation';
import { schoolLevelLabelForValue } from '@/lib/constants/scholarshipProfileOptions';
import type { Database } from '@/types_db';

type ProfilesRow = Database['public']['Tables']['profiles']['Row'];

/** Hub / API: human-readable lines for “Why these scholarships?” */
export function profileMatchSummaryFromRow(p: ProfilesRow) {
  return {
    field:
      p.field_of_study_label?.trim() || p.field_of_study?.trim() || '—',
    level:
      schoolLevelLabelForValue(p.school_level ?? '') ||
      p.school_level?.trim() ||
      '—',
    gpa:
      p.gpa != null && String(p.gpa).trim() !== '' ? String(p.gpa) : '—',
    citizenship:
      citizenshipLabelForValue(p.citizenship_status ?? '') || '—',
    state: p.state_region?.trim() || '—'
  };
}
