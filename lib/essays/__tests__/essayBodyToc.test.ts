import assert from 'node:assert/strict';
import test from 'node:test';

import { injectH2IdsAndExtractToc } from '@/lib/essays/essayBodyToc';

test('adds ids and extracts toc entries', () => {
  const html =
    '<p>x</p><h2>First Section</h2><p>a</p><h2>Second <em>Part</em></h2>';
  const { html: out, toc } = injectH2IdsAndExtractToc(html);
  assert.equal(toc.length, 2);
  assert.equal(toc[0]!.text, 'First Section');
  assert.equal(toc[1]!.text, 'Second Part');
  assert.ok(out.includes(`id="${toc[0]!.id}"`));
  assert.ok(out.includes(`id="${toc[1]!.id}"`));
});

test('preserves existing h2 id', () => {
  const html = '<h2 id="keep-me">Stable</h2>';
  const { toc } = injectH2IdsAndExtractToc(html);
  assert.deepEqual(toc, [{ id: 'keep-me', text: 'Stable' }]);
});
