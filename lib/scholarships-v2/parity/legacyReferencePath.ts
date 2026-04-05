import type { CanonicalLegacyLikeInput } from '@/lib/scholarships-v2/parity/types';
import type { SqlClause } from '@/lib/scholarships-v2/sqlSpec/types';
import { normalizeDeadlinePreset, parseCommaStateCodes } from '@/lib/scholarships-v2/normalization/legacy';
import { requirementTypesToDbColumns } from '@/lib/scholarships/requirementTypeMapping';

function addClause(out: SqlClause[], boolean: 'and' | 'or', sourceField: string, clause: string): void {
  out.push({ boolean, sourceField, clause });
}

export function buildLegacyReferenceClausesFromCanonicalInput(
  input: CanonicalLegacyLikeInput
): SqlClause[] {
  const sp = new URLSearchParams(input.searchParams);
  const out: SqlClause[] = [];
  const tab = sp.get('tab')?.trim();

  addClause(out, 'and', 'is_active', 'is_active.eq.true');

  const q = sp.get('q')?.trim();
  if (q) {
    addClause(out, 'or', 'catalog_text', `catalog_text.search.${q}`);
  }

  const categoryPage = sp.get('category_page')?.trim().toLowerCase() || null;
  const categoryRaw = sp.get('category')?.trim();
  if (categoryPage) {
    addClause(out, 'and', 'category_page', `category_page.eq.${categoryPage}`);
  } else if (categoryRaw) {
    const ids = categoryRaw
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    if (ids.length > 0) {
      addClause(
        out,
        'or',
        'category_ids',
        ids.flatMap((id) => [`category_slug.eq.${id}`, `tags.cs.["${id}"]`]).join(',')
      );
    }
  }

  const states = parseCommaStateCodes(sp.get('state')).slice().sort((a, b) => a.localeCompare(b));
  if (states.length > 0) {
    addClause(
      out,
      'or',
      'state_codes',
      states.map((code) => `state_codes.cs.["${code}"]`).join(',')
    );
  }

  const deadline = normalizeDeadlinePreset(sp.get('deadline') ?? input.moreFilters?.deadlinePreset ?? 'any');
  const deadlineBucketMap: Record<string, string> = {
    lt1d: 'lt_1d',
    d1_7: 'd1_7',
    w1_4: 'd8_28',
    gt4w: 'gt_28'
  };
  if (deadline !== 'any') {
    addClause(out, 'and', 'deadline_bucket', `deadline_bucket.in.(${deadlineBucketMap[deadline]})`);
  }

  const mf = input.moreFilters;
  if (!mf) return out;

  if (mf.includeEligibility.length > 0) {
    const eligibility = [...mf.includeEligibility].sort((a, b) => a.localeCompare(b));
    addClause(
      out,
      'or',
      'eligibility_tags',
      eligibility.map((id) => `eligibility_tags.cs.["${id}"]`).join(',')
    );
    if (eligibility.includes('first_generation')) {
      addClause(
        out,
        'or',
        'first_generation',
        ['title', 'summary_short', 'description', 'requirements_text']
          .map((c) => `${c}.ilike.%first generation%`)
          .join(',')
      );
    }
  }

  if (mf.includeGpaBuckets.length > 0) {
    const gpaBuckets = [...mf.includeGpaBuckets].sort((a, b) => a.localeCompare(b));
    addClause(out, 'and', 'gpa_bucket', `gpa_bucket.in.(${gpaBuckets.join(',')})`);
  }

  const requirementClauses = requirementTypesToDbColumns(mf.includeRequirementTypes)
    .map((field) => `${field}.eq.true`);
  if (requirementClauses.length > 0) {
    addClause(out, 'or', 'requirement_flags', requirementClauses.join(','));
  }

  addClause(
    out,
    'or',
    'applicants_count',
    `applicants_count.is.null,and(applicants_count.gte.${mf.applicantsMin},applicants_count.lte.${mf.applicantsMax})`
  );

  if (mf.includeEasyApply.length > 0) {
    const easy = [...mf.includeEasyApply].sort((a, b) => a.localeCompare(b));
    addClause(
      out,
      'or',
      'easy_apply_flags',
      easy.map((id) => `easy_apply_flags.cs.["${id}"]`).join(',')
    );
  }

  const comp: string[] = [];
  if (mf.dataCompleteness.verified) comp.push('is_verified.eq.true');
  if (mf.dataCompleteness.low) comp.push('listing_completeness_bucket.eq.basic');
  if (mf.dataCompleteness.medium) comp.push('listing_completeness_bucket.eq.standard');
  if (mf.dataCompleteness.high) comp.push('listing_completeness_bucket.eq.detailed');
  if (comp.length > 0) {
    addClause(out, 'or', 'listing_completeness', comp.join(','));
  }

  const payoutMap: Record<string, string> = {
    college: 'college',
    student: 'student',
    nonMonetary: 'non_monetary',
    notStated: 'not_stated'
  };
  const payout = Object.entries(mf.payout)
    .filter(([, on]) => on)
    .map(([key]) => payoutMap[key]);
  if (payout.length > 0) {
    addClause(out, 'or', 'payout_method', payout.map((v) => `payout_method.eq.${v}`).join(','));
  }

  const parseIds = (raw: string | null): string[] =>
    (raw ?? '')
      .split(',')
      .map((v) => v.trim())
      .filter((v) => /^[0-9a-f-]{36}$/i.test(v))
      .sort((a, b) => a.localeCompare(b));

  const savedIds = parseIds(sp.get('saved'));
  const ignoredIds = parseIds(sp.get('ignored'));
  const startedIds = parseIds(sp.get('started'));
  const submittedIds = parseIds(sp.get('submitted'));

  if (tab === 'saved') {
    addClause(out, 'and', 'id', `id.in.(${savedIds.join(',')})`);
  } else if (tab === 'ignored') {
    addClause(out, 'and', 'id', `id.in.(${ignoredIds.join(',')})`);
  } else if (tab === 'started') {
    addClause(out, 'and', 'id', `id.in.(${startedIds.join(',')})`);
  } else if (tab === 'submitted') {
    addClause(out, 'and', 'id', `id.in.(${submittedIds.join(',')})`);
  } else if (ignoredIds.length > 0) {
    addClause(out, 'and', 'id', `id.not.in.(${ignoredIds.join(',')})`);
  }

  return out;
}
