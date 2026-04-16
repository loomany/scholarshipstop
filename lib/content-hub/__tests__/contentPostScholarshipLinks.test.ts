import assert from 'node:assert/strict';
import test from 'node:test';

import { parseContentPostScholarshipLinks } from '../contentPostScholarshipLinks';

test('Connect Hub: absolute site scholarship URL + slug is internal (not external)', () => {
  const raw = [
    {
      url: 'https://scholarshiptop.com/scholarships/dr-terri-stahlman-endowed-fellowship-07zejosknucr',
      slug: 'dr-terri-stahlman-endowed-fellowship-07zejosknucr',
      title: 'Dr. Terri Stahlman Endowed Fellowship',
      reason: 'matched by intent'
    }
  ];
  const out = parseContentPostScholarshipLinks(raw);
  assert.equal(out.length, 1);
  assert.equal(out[0]!.kind, 'internal');
  if (out[0]!.kind === 'internal') {
    assert.equal(out[0].slug, 'dr-terri-stahlman-endowed-fellowship-07zejosknucr');
  }
});

test('absolute third-party URL without slug stays external', () => {
  const raw = [
    {
      url: 'https://example.org/grant',
      title: 'Example',
      reason: 'ref'
    }
  ];
  const out = parseContentPostScholarshipLinks(raw);
  assert.equal(out.length, 1);
  assert.equal(out[0]!.kind, 'external');
});

test('derives slug from site URL when slug field missing', () => {
  const raw = [
    {
      url: 'https://scholarshiptop.com/scholarships/my-slug',
      title: 'T',
      reason: 'r'
    }
  ];
  const out = parseContentPostScholarshipLinks(raw);
  assert.equal(out.length, 1);
  assert.equal(out[0]!.kind, 'internal');
  if (out[0]!.kind === 'internal') assert.equal(out[0].slug, 'my-slug');
});
