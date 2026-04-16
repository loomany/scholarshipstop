import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveRelatedScholarshipsForContentPost } from '../parseRelatedScholarshipsJson';

test('prefers related_scholarships when non-empty', () => {
  const related = [
    {
      slug: 'a',
      title: 'A',
      score: 1,
      reason: 'match',
      award_amount_text: '$1',
      deadline_text: 'Jan 1'
    }
  ];
  const legacy = [
    { title: 'B', slug: 'b', reason: 'legacy', url: '' }
  ];
  const out = resolveRelatedScholarshipsForContentPost(related, legacy);
  assert.equal(out.length, 1);
  assert.equal(out[0]!.slug, 'a');
});

test('falls back to internal scholarship_links when related_scholarships empty', () => {
  const legacy = [
    {
      title: 'STEM Grant',
      slug: 'stem-grant-us',
      reason: 'Matched intent'
    }
  ];
  const out = resolveRelatedScholarshipsForContentPost([], legacy);
  assert.equal(out.length, 1);
  assert.equal(out[0]!.slug, 'stem-grant-us');
  assert.equal(out[0]!.title, 'STEM Grant');
  assert.equal(out[0]!.reason, 'Matched intent');
});

test('skips external-only scholarship_links (no slug, non-catalog URL)', () => {
  const legacy = [
    {
      title: 'External',
      url: 'https://example.org/x',
      reason: 'ref'
    }
  ];
  const out = resolveRelatedScholarshipsForContentPost(null, legacy);
  assert.equal(out.length, 0);
});

test('Connect Hub legacy: full site URL + slug yields bottom-card rows', () => {
  const legacy = [
    {
      url: 'https://scholarshiptop.com/scholarships/foo-bar',
      slug: 'foo-bar',
      title: 'Foo',
      reason: 'intent'
    }
  ];
  const out = resolveRelatedScholarshipsForContentPost(null, legacy);
  assert.equal(out.length, 1);
  assert.equal(out[0]!.slug, 'foo-bar');
});
