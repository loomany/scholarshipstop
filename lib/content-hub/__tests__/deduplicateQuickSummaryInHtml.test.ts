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

test('styled callout + plain heading section: removes plain, keeps styled', () => {
  const styled =
    '<div style="border-left:4px solid #2563eb;padding:12px"><p><strong>📌 Quick Summary</strong></p><ul><li><strong>Key Point 1:</strong> In card</li></ul></div>';
  const plain =
    '<h2>📌 Quick Summary</h2><ul><li><strong>Key Point 1:</strong> Duplicate body</li></ul>';
  const html = `<p>Intro</p>${styled}<p>Body</p>${plain}<p>Outro</p>`;
  const out = deduplicateQuickSummaryBlocksInHtml(html);
  assert.equal((out.match(/Quick Summary/g) || []).length, 1);
  assert.ok(out.includes('In card'));
  assert.ok(!out.includes('Duplicate body'));
});

test('two plain Quick Summary sections: keeps first, drops second', () => {
  const top =
    '<h2>📌 Quick Summary</h2><ul><li><strong>Key Point 1:</strong> Top</li></ul>';
  const bottom =
    '<h3>📌 Quick Summary</h3><ul><li><strong>Key Point 1:</strong> Bottom dup</li></ul>';
  const html = `<p>x</p>${top}<p>mid</p>${bottom}`;
  const out = deduplicateQuickSummaryBlocksInHtml(html);
  assert.equal((out.match(/Quick Summary/g) || []).length, 1);
  assert.ok(out.includes('Top'));
  assert.ok(!out.includes('Bottom dup'));
});
