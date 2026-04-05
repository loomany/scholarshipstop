import test from 'node:test';
import assert from 'node:assert/strict';

import { compareLegacyAndV2Clauses } from '@/lib/scholarships-v2/parity/compareClauses';

test('comparator returns machine-readable categories: missing/extra/mismatch/stubbed', () => {
  const report = compareLegacyAndV2Clauses({
    inputId: 'cmp-1',
    legacyClauses: [
      { boolean: 'and', sourceField: 'is_active', clause: 'is_active.eq.true' },
      { boolean: 'or', sourceField: 'eligibility_tags', clause: 'eligibility_tags.cs.["veterans"]' }
    ],
    v2Clauses: [
      { boolean: 'and', sourceField: 'is_active', clause: 'is_active.eq.true' },
      { boolean: 'or', sourceField: 'eligibility_tags', clause: 'eligibility_tags.cs.["women"]' },
      { boolean: 'and', sourceField: 'deadline_bucket', clause: 'deadline_bucket.in.(d1_7)' }
    ],
    v2Stubs: [{ key: 'catalog_text', reason: 'placeholder' }]
  });

  const categories = report.diffs.map((d) => d.category);
  assert.ok(categories.includes('mismatch'));
  assert.ok(categories.includes('extra'));
  assert.ok(categories.includes('stubbed'));
  assert.equal(report.summary.stubbed, 1);
  assert.equal(report.inputId, 'cmp-1');
});
