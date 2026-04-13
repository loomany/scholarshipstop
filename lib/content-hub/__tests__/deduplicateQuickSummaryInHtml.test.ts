import assert from 'node:assert/strict';
import test from 'node:test';

import { deduplicateQuickSummaryBlocksInHtml } from '../deduplicateQuickSummaryInHtml';

test('removes second identical Quick Summary div, keeps first', () => {
  const box = `<div style="border-left:4px solid #2563eb;padding:12px"><p><strong>📌 Quick Summary</strong></p><ul><li><strong>Key Point 1:</strong> A</li></ul></div>`;
  const html = `<p>Intro</p>${box}<h2>More</h2><p>x</p>${box}<p>Out</p>`;
  const out = deduplicateQuickSummaryBlocksInHtml(html);
  assert.equal((out.match(/Quick Summary/g) || []).length, 1);
  assert.ok(out.includes('Intro'));
  assert.ok(out.includes('Out'));
});

test('no-op when only one Quick Summary', () => {
  const html = `<div><p>📌 Quick Summary</p><ul><li>One</li></ul></div>`;
  assert.equal(deduplicateQuickSummaryBlocksInHtml(html), html.trim());
});

test('with three different Quick Summary blocks, removes the second', () => {
  const a =
    '<div style="border-left:4px solid #2563eb"><p><strong>📌 Quick Summary</strong></p><ul><li><strong>Key Point 1:</strong> First</li></ul></div>';
  const b =
    '<div style="border-left:4px solid #2563eb"><p><strong>📌 Quick Summary</strong></p><ul><li><strong>Key Point 1:</strong> Second</li></ul></div>';
  const c =
    '<div style="border-left:4px solid #2563eb"><p><strong>📌 Quick Summary</strong></p><ul><li><strong>Key Point 1:</strong> Third</li></ul></div>';
  const html = `<p>Intro</p>${a}<p>Middle</p>${b}<p>More</p>${c}`;
  const out = deduplicateQuickSummaryBlocksInHtml(html);
  assert.equal((out.match(/Quick Summary/g) || []).length, 2);
  assert.ok(out.includes('First'));
  assert.ok(!out.includes('Second'));
  assert.ok(out.includes('Third'));
});
