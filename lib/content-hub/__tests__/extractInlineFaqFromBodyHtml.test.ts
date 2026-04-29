import assert from 'node:assert/strict';
import test from 'node:test';

import { extractInlineFaqFromBodyHtml } from '../extractInlineFaqFromBodyHtml';

test('parses paragraph FAQ title + mixed strong+answer rows (typical CMS)', () => {
  const html = `
<p><strong>FAQ: organizing scholarships by difficulty</strong></p>
<p><strong>What does difficulty level mean for a scholarship application?</strong> It refers to the overall challenge.</p>
<p><strong>Should I apply to easy scholarships first?</strong> Usually yes.</p>
<p>After unrelated content</p>
`.trim();

  const { items, sectionHeading, html: out } =
    extractInlineFaqFromBodyHtml(html);

  assert.match(sectionHeading ?? '', /^FAQ: organizing/i);
  assert.equal(items.length, 2);
  assert.ok(items[0]!.question.includes('difficulty level mean'));
  assert.ok(items[0]!.answer.includes('overall challenge'));
  assert.ok(items[1]!.question.includes('easy scholarships first'));
  assert.ok(!out.includes('FAQ: organizing'));
  assert.ok(out.includes('After unrelated content'));
});

test('still supports h2 FAQ + two-paragraph Q/A', () => {
  const html =
    '<h2>FAQ: Demo</h2><p><strong>Q one?</strong></p><p>A one.</p>';

  const { items, html: out } = extractInlineFaqFromBodyHtml(html);

  assert.equal(items.length, 1);
  assert.deepEqual(items[0], { question: 'Q one?', answer: 'A one.' });
  assert.equal(out.trim(), '');
});
