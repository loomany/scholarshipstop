import assert from 'node:assert/strict';
import test from 'node:test';

import {
  injectH2H3IdsAndExtractToc,
  RESOURCE_ARTICLE_TOC_OPTIONS
} from '../resourceArticleBodyToc';

test('resource TOC: h2 only, excludes FAQ and Quick Summary', () => {
  const html = `
<h2>Quick Answer</h2><p>Intro</p>
<h2>Compared</h2><p>x</p>
<h2>FAQ: Picking sites</h2>
<h3>What is best?</h3><p>a</p>
<h3 style="margin-top: 0;">Quick Summary</h3><p>s</p>
<h2>See scholarships you may qualify for</h2><p>cta</p>
`;
  const { toc } = injectH2H3IdsAndExtractToc(html, RESOURCE_ARTICLE_TOC_OPTIONS);
  const labels = toc.map((t) => t.text);
  assert.deepEqual(labels, ['Quick Answer', 'Compared']);
});
