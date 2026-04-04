import { fieldOfStudySlug } from '@/lib/constants/scholarshipFieldOfStudyOptions';
import {
  normalizeUsStateToCanonical,
  US_STATE_NAME_TO_CODE
} from '@/lib/constants/usStates';
import { parseUserGpa, type ProfilesRow } from '@/lib/scholarships/scholarshipMatch';

function csLiteral(values: string[]): string {
  return JSON.stringify(values);
}

/**
 * Soft “profile fit” predicate for SQL listings. Mirrors key OR-signals from `matchScholarship`
 * without per-user id arrays. Combined with `applyTabScopeFixed` for best / recommended / matches / easy.
 */
export function applyPersonalizedProfileFitSql(q: any, profile: ProfilesRow): any {
  const userGpa = parseUserGpa(profile.gpa);
  if (userGpa != null) {
    q = q.or(`gpa_requirement_min.is.null,gpa_requirement_min.lte.${userGpa}`);
  }

  const orParts: string[] = [];

  let userField = profile.field_of_study?.trim().toLowerCase() ?? '';
  if (!userField && profile.field_of_study_label?.trim()) {
    userField = fieldOfStudySlug(profile.field_of_study_label) ?? '';
  }
  if (userField) {
    orParts.push(`field_of_study.cs.${csLiteral([userField])}`);
    const safe = userField.replace(/[%_]/g, '').slice(0, 64);
    if (safe.length > 0) {
      orParts.push(`title.ilike.%${safe}%`);
      orParts.push(`summary_short.ilike.%${safe}%`);
    }
  }

  const schoolVal = profile.school_level?.trim();
  if (schoolVal) {
    const tokens = new Set<string>([schoolVal]);
    if (schoolVal.startsWith('high_school')) {
      tokens.add('high school');
      tokens.add('high_school');
      tokens.add('secondary');
    }
    if (schoolVal.startsWith('college_')) {
      tokens.add('undergraduate');
      tokens.add('college');
    }
    if (schoolVal === 'graduate_student') {
      tokens.add('graduate');
      tokens.add('masters');
    }
    for (const t of Array.from(tokens)) {
      const slug = t.replace(/\s+/g, '_').toLowerCase();
      orParts.push(`study_levels.cs.${csLiteral([slug])}`);
      orParts.push(`catalog_education_levels.cs.${csLiteral([slug])}`);
      if (t.includes(' ')) {
        orParts.push(`study_levels.cs.${csLiteral([t])}`);
      }
    }
  }

  const stateCanon = normalizeUsStateToCanonical(profile.state_region?.trim() ?? '');
  if (stateCanon) {
    const code = US_STATE_NAME_TO_CODE[stateCanon];
    if (code) {
      orParts.push(`state_codes.cs.${csLiteral([code])}`);
    }
    const safe = stateCanon.replace(/[%_]/g, '').slice(0, 48);
    if (safe.length > 0) {
      orParts.push(`state_territory_text.ilike.%${safe}%`);
    }
  }

  const cit = profile.citizenship_status?.trim().toLowerCase() ?? '';
  if (cit === 'us_citizen' || cit === 'us_permanent_resident') {
    orParts.push(`citizenship_statuses.cs.${csLiteral(['us_citizen'])}`);
    orParts.push(`citizenship_statuses.cs.${csLiteral(['us'])}`);
    orParts.push(`citizenship_statuses.cs.${csLiteral(['domestic'])}`);
  } else if (cit === 'international_student') {
    orParts.push(`citizenship_statuses.cs.${csLiteral(['international'])}`);
    orParts.push(`citizenship_statuses.cs.${csLiteral(['international_students'])}`);
  }

  /** Quality floor so OR-profile clauses do not return the entire table when JSON facets are sparse. */
  orParts.push('ranking_score.gte.30');
  orParts.push('ai_match_score.gte.40');
  orParts.push('credibility_score.gte.65');

  if (orParts.length > 0) {
    q = q.or(orParts.join(','));
  }

  return q;
}
