import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildArticleJsonLd,
  buildBreadcrumbListJsonLd,
  buildFaqPageJsonLd,
  pruneJsonLd,
  serializeJsonLd,
  validateJsonLdShape
} from '@/lib/seo/jsonLd';

describe('jsonLd helpers', () => {
  it('prunes undefined and invalid string values', () => {
    const result = pruneJsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Example',
      description: undefined,
      url: 'https://scholarshiptop.com/example'
    });

    assert.equal('description' in result, false);
    assert.equal(result.url, 'https://scholarshiptop.com/example');
  });

  it('builds breadcrumb list with absolute URLs', () => {
    const schema = buildBreadcrumbListJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Resources', path: '/resources' }
    ]);

    assert.ok(schema);
    assert.equal(schema?.['@type'], 'BreadcrumbList');
    const items = schema?.itemListElement as Array<Record<string, unknown>>;
    assert.match(String(items[1]?.item), /^https?:\/\//);
  });

  it('omits FAQPage when there are no visible questions', () => {
    assert.equal(buildFaqPageJsonLd([]), null);
  });

  it('serializes article JSON-LD without undefined fields', () => {
    const schema = buildArticleJsonLd({
      url: '/resources/example',
      headline: 'Example',
      description: 'Example article',
      type: 'Article'
    });

    assert.ok(schema);
    const parsed = JSON.parse(serializeJsonLd(schema!));
    assert.equal(parsed['@type'], 'Article');
    assert.equal(parsed.datePublished, undefined);
    assert.deepEqual(validateJsonLdShape(schema!), []);
  });
});
