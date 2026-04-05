import type { QuerySpecPredicate, ScholarshipsQuerySpec } from '@/lib/scholarships-v2/querySpec/types';
import type { SqlClause, SqlTranslationResult, SqlTranslationStub } from '@/lib/scholarships-v2/sqlSpec/types';

function toJsonArrayLiteral(values: unknown[]): string {
  return JSON.stringify(values);
}

function mapPredicateToSql(predicate: QuerySpecPredicate): {
  clauses: SqlClause[];
  stubs: SqlTranslationStub[];
} {
  const clauses: SqlClause[] = [];
  const stubs: SqlTranslationStub[] = [];

  switch (predicate.field) {
    case 'is_active':
      clauses.push({ boolean: 'and', clause: `is_active.eq.${String(predicate.value)}`, sourceField: predicate.field });
      return { clauses, stubs };

    case 'eligibility_tags': {
      const vals = ((predicate.value as string[]) ?? []).slice().sort((a, b) => a.localeCompare(b));
      if (vals.length > 0) {
        clauses.push({
          boolean: 'or',
          clause: vals.map((v) => `eligibility_tags.cs.${toJsonArrayLiteral([v])}`).join(','),
          sourceField: predicate.field
        });
      }
      return { clauses, stubs };
    }

    case 'first_generation': {
      const cols = (predicate.value as string[]) ?? [];
      clauses.push({
        boolean: 'or',
        clause: cols.map((c) => `${c}.ilike.%first generation%`).join(','),
        sourceField: predicate.field
      });
      return { clauses, stubs };
    }

    case 'gpa_bucket': {
      const vals = ((predicate.value as string[]) ?? []).slice().sort((a, b) => a.localeCompare(b));
      clauses.push({
        boolean: 'and',
        clause: `gpa_bucket.in.(${vals.join(',')})`,
        sourceField: predicate.field
      });
      return { clauses, stubs };
    }

    case 'applicants_count': {
      const range = predicate.value as { min: number | null; max: number | null };
      const min = range.min ?? 0;
      const max = range.max ?? 999999999;
      clauses.push({
        boolean: 'or',
        clause: `applicants_count.is.null,and(applicants_count.gte.${min},applicants_count.lte.${max})`,
        sourceField: predicate.field
      });
      return { clauses, stubs };
    }

    case 'easy_apply_flags': {
      const vals = ((predicate.value as string[]) ?? []).slice().sort((a, b) => a.localeCompare(b));
      clauses.push({
        boolean: 'or',
        clause: vals.map((v) => `easy_apply_flags.cs.${toJsonArrayLiteral([v])}`).join(','),
        sourceField: predicate.field
      });
      return { clauses, stubs };
    }

    case 'listing_completeness': {
      const v = predicate.value as {
        low?: boolean;
        medium?: boolean;
        high?: boolean;
        verified?: boolean;
      };
      const parts: string[] = [];
      if (v.verified) parts.push('is_verified.eq.true');
      if (v.low) parts.push('listing_completeness_bucket.eq.basic');
      if (v.medium) parts.push('listing_completeness_bucket.eq.standard');
      if (v.high) parts.push('listing_completeness_bucket.eq.detailed');
      if (parts.length > 0) {
        clauses.push({ boolean: 'or', clause: parts.join(','), sourceField: predicate.field });
      }
      return { clauses, stubs };
    }

    case 'payout_method': {
      const vals = (predicate.value as string[]) ?? [];
      const mapped = vals.map((v) => {
        if (v === 'nonMonetary') return 'non_monetary';
        if (v === 'notStated') return 'not_stated';
        return v;
      });
      clauses.push({
        boolean: 'or',
        clause: mapped.map((v) => `payout_method.eq.${v}`).join(','),
        sourceField: predicate.field
      });
      return { clauses, stubs };
    }

    case 'state_codes': {
      const vals = ((predicate.value as string[]) ?? []).slice().sort((a, b) => a.localeCompare(b));
      clauses.push({
        boolean: 'or',
        clause: vals.map((v) => `state_codes.cs.${toJsonArrayLiteral([v])}`).join(','),
        sourceField: predicate.field
      });
      return { clauses, stubs };
    }

    case 'deadline_bucket': {
      const vals = ((predicate.value as string[]) ?? []).slice().sort((a, b) => a.localeCompare(b));
      clauses.push({
        boolean: 'and',
        clause: `deadline_bucket.in.(${vals.join(',')})`,
        sourceField: predicate.field
      });
      return { clauses, stubs };
    }

    case 'category_ids': {
      const vals = (predicate.value as string[]) ?? [];
      clauses.push({
        boolean: 'or',
        clause: vals
          .flatMap((v) => [`category_slug.eq.${v}`, `tags.cs.${toJsonArrayLiteral([v])}`])
          .join(','),
        sourceField: predicate.field
      });
      return { clauses, stubs };
    }

    case 'category_page':
      clauses.push({
        boolean: 'and',
        clause: `category_page.eq.${String(predicate.value)}`,
        sourceField: predicate.field
      });
      return { clauses, stubs };

    case 'scholarship_categories.category_id':
      clauses.push({
        boolean: 'and',
        clause: `scholarship_categories.category_id.eq.${String(predicate.value)}`,
        sourceField: predicate.field
      });
      return { clauses, stubs };

    case 'id':
      if (predicate.operator === 'idSet') {
        const ids = ((predicate.value as string[]) ?? []).slice().sort((a, b) => a.localeCompare(b));
        clauses.push({ boolean: 'and', clause: `id.in.(${ids.join(',')})`, sourceField: predicate.field });
      } else if (predicate.operator === 'not') {
        const ids = (((predicate.value as { in?: string[] })?.in ?? []) as string[]).slice().sort((a, b) => a.localeCompare(b));
        clauses.push({ boolean: 'and', clause: `id.not.in.(${ids.join(',')})`, sourceField: predicate.field });
      }
      return { clauses, stubs };

    case 'catalog_text':
      clauses.push({ boolean: 'or', clause: `catalog_text.search.${String(predicate.value)}`, sourceField: predicate.field });
      return { clauses, stubs };

    default:
      if (predicate.operator === 'not') {
        clauses.push({
          boolean: 'and',
          clause: `${predicate.field}.not.eq.${String(predicate.value)}`,
          sourceField: predicate.field
        });
      } else {
        stubs.push({
          key: `${predicate.field}:${predicate.operator}`,
          reason: 'No translator mapping implemented for this predicate.'
        });
      }
      return { clauses, stubs };
  }
}

export function buildSqlClausesFromQuerySpec(querySpec: ScholarshipsQuerySpec): SqlTranslationResult {
  const clauses: SqlClause[] = [];
  const stubs: SqlTranslationStub[] = [...querySpec.stubs.map((s) => ({ key: s.key, reason: s.reason }))];

  for (const predicate of querySpec.predicates) {
    const mapped = mapPredicateToSql(predicate);
    clauses.push(...mapped.clauses);
    stubs.push(...mapped.stubs);
  }

  return {
    clauses,
    stubs
  };
}
