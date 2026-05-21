import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getLocalizedCategoryLabel,
  getLocalizedCategoryPageH1,
  getLocalizedCountryLabel
} from '@/lib/i18n/taxonomyLabels';

describe('taxonomyLabels', () => {
  it('localizes category labels for es and fr without changing ids', () => {
    assert.equal(getLocalizedCategoryLabel('safety', 'en'), 'Safety');
    assert.equal(getLocalizedCategoryLabel('safety', 'es'), 'Seguridad');
    assert.equal(getLocalizedCategoryLabel('safety', 'fr'), 'Sécurité');
    assert.equal(getLocalizedCategoryLabel('music', 'es'), 'Música');
    assert.equal(getLocalizedCategoryLabel('disability', 'fr'), 'Handicap');
    assert.equal(getLocalizedCategoryLabel('miscellaneous', 'es'), 'Varios');
  });

  it('builds localized category H1', () => {
    assert.equal(getLocalizedCategoryPageH1('stem', '', 'en'), 'STEM Scholarships');
    assert.equal(getLocalizedCategoryPageH1('stem', '', 'es'), 'Becas STEM');
    assert.equal(getLocalizedCategoryPageH1('stem', '', 'fr'), 'Bourses STIM');
  });

  it('localizes country display from ISO code', () => {
    const usEs = getLocalizedCountryLabel('US', 'es');
    assert.ok(usEs.length > 0);
    assert.notEqual(usEs, 'US');
    const usEn = getLocalizedCountryLabel('US', 'en');
    assert.ok(usEn.length > 0);
  });
});
