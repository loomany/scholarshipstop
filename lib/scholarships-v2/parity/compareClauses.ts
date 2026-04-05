import type { ClauseDiffEntry, ClauseParityReport } from '@/lib/scholarships-v2/parity/types';
import type { SqlClause, SqlTranslationStub } from '@/lib/scholarships-v2/sqlSpec/types';

function keyOf(clause: SqlClause): string {
  return `${clause.boolean}|${clause.sourceField}`;
}

export function compareLegacyAndV2Clauses(input: {
  inputId: string;
  legacyClauses: SqlClause[];
  v2Clauses: SqlClause[];
  v2Stubs?: SqlTranslationStub[];
}): ClauseParityReport {
  const diffs: ClauseDiffEntry[] = [];
  const v2Stubs = input.v2Stubs ?? [];

  const legacyByKey = new Map<string, SqlClause[]>();
  const v2ByKey = new Map<string, SqlClause[]>();

  for (const clause of input.legacyClauses) {
    const key = keyOf(clause);
    const list = legacyByKey.get(key) ?? [];
    list.push(clause);
    legacyByKey.set(key, list);
  }
  for (const clause of input.v2Clauses) {
    const key = keyOf(clause);
    const list = v2ByKey.get(key) ?? [];
    list.push(clause);
    v2ByKey.set(key, list);
  }

  const keys = new Set([...legacyByKey.keys(), ...v2ByKey.keys()]);

  for (const key of keys) {
    const legacyList = legacyByKey.get(key) ?? [];
    const v2List = v2ByKey.get(key) ?? [];

    if (legacyList.length === 0 && v2List.length > 0) {
      for (const c of v2List) {
        diffs.push({ category: 'extra', key, v2Clause: c.clause });
      }
      continue;
    }

    if (v2List.length === 0 && legacyList.length > 0) {
      for (const c of legacyList) {
        diffs.push({ category: 'missing', key, legacyClause: c.clause });
      }
      continue;
    }

    const legacySet = new Set(legacyList.map((c) => c.clause));
    const v2Set = new Set(v2List.map((c) => c.clause));

    for (const clause of legacySet) {
      if (!v2Set.has(clause)) {
        diffs.push({ category: 'mismatch', key, legacyClause: clause });
      }
    }
    for (const clause of v2Set) {
      if (!legacySet.has(clause)) {
        diffs.push({ category: 'mismatch', key, v2Clause: clause });
      }
    }
  }

  for (const stub of v2Stubs) {
    diffs.push({ category: 'stubbed', key: stub.key, reason: stub.reason });
  }

  const summary = {
    missing: diffs.filter((d) => d.category === 'missing').length,
    extra: diffs.filter((d) => d.category === 'extra').length,
    mismatch: diffs.filter((d) => d.category === 'mismatch').length,
    stubbed: diffs.filter((d) => d.category === 'stubbed').length,
    parityScore: 0
  };

  const penalty = summary.missing + summary.extra + summary.mismatch + summary.stubbed;
  const base = Math.max(1, input.legacyClauses.length + input.v2Clauses.length);
  summary.parityScore = Math.max(0, Math.round((1 - penalty / base) * 100));

  return {
    inputId: input.inputId,
    summary,
    diffs,
    legacyClauses: input.legacyClauses,
    v2Clauses: input.v2Clauses,
    v2Stubs
  };
}
