import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSeoGuardTelegramHtml,
  listSeoIssueCountsSorted
} from '@/lib/seo/seoTelegramNotify';

test('listSeoIssueCountsSorted dedupes per entry and sorts by count', () => {
  const rows = listSeoIssueCountsSorted([
    {
      url: '/a',
      type: 'essay',
      score: 80,
      issues: ['x', 'y'],
      warnings: ['x']
    },
    {
      url: '/b',
      type: 'essay',
      score: 70,
      issues: ['x'],
      warnings: []
    }
  ]);
  assert.equal(rows[0]?.code, 'x');
  assert.equal(rows[0]?.count, 2);
  assert.equal(rows[1]?.code, 'y');
  assert.equal(rows[1]?.count, 1);
});

test('buildSeoGuardTelegramHtml includes counts and examples', () => {
  const html = buildSeoGuardTelegramHtml({
    title: '⚠️ SEO Guard Alert',
    level: 'warning',
    counts: { ok: 0, warnings: 1, below90: 0 },
    entries: [
      {
        url: '/essays/example-slug',
        type: 'essay',
        score: 82,
        issues: ['meta_description_length_out_of_range'],
        warnings: []
      }
    ]
  });
  assert.match(html, /Below 90:/);
  assert.match(html, /example-slug/);
  assert.match(html, /meta_description_length_out_of_range/);
});
