import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isMetaLengthAuditOk,
  isMetaLengthIdeal,
  isMetaLengthRelaxedOk,
  isTitleLengthAuditOk,
  isTitleLengthIdeal,
  normalizeSeoWhitespace,
  SEO_AUDIT_META_LENGTH,
  SEO_AUDIT_TITLE_LENGTH,
  SEO_IDEAL_META_LENGTH,
  SEO_IDEAL_TITLE_LENGTH,
  SEO_RELAXED_META_LENGTH,
  seoTextLength
} from '@/lib/seo/seoQualityRules';

test('normalizeSeoWhitespace collapses whitespace', () => {
  assert.equal(normalizeSeoWhitespace('  a \n\t b  '), 'a b');
});

test('audit title length mirrors 25–70', () => {
  assert.equal(SEO_AUDIT_TITLE_LENGTH.min, 25);
  assert.equal(SEO_AUDIT_TITLE_LENGTH.max, 70);
  assert.equal(isTitleLengthAuditOk('x'.repeat(24)), false);
  assert.equal(isTitleLengthAuditOk('x'.repeat(25)), true);
  assert.equal(isTitleLengthAuditOk('x'.repeat(70)), true);
  assert.equal(isTitleLengthAuditOk('x'.repeat(71)), false);
});

test('ideal title band is 30–65', () => {
  assert.equal(SEO_IDEAL_TITLE_LENGTH.min, 30);
  assert.equal(SEO_IDEAL_TITLE_LENGTH.max, 65);
  assert.equal(isTitleLengthIdeal('x'.repeat(29)), false);
  assert.equal(isTitleLengthIdeal('x'.repeat(30)), true);
});

test('audit meta length mirrors 120–160', () => {
  assert.deepEqual(SEO_AUDIT_META_LENGTH, SEO_IDEAL_META_LENGTH);
  assert.equal(isMetaLengthAuditOk('m'.repeat(119)), false);
  assert.equal(isMetaLengthAuditOk('m'.repeat(120)), true);
  assert.equal(isMetaLengthAuditOk('m'.repeat(160)), true);
  assert.equal(isMetaLengthAuditOk('m'.repeat(161)), false);
});

test('relaxed meta band is 100–170', () => {
  assert.equal(SEO_RELAXED_META_LENGTH.min, 100);
  assert.equal(SEO_RELAXED_META_LENGTH.max, 170);
  assert.equal(isMetaLengthRelaxedOk('m'.repeat(99)), false);
  assert.equal(isMetaLengthRelaxedOk('m'.repeat(100)), true);
  assert.equal(isMetaLengthRelaxedOk('m'.repeat(170)), true);
});

test('seoTextLength uses normalized string', () => {
  assert.equal(seoTextLength('  hello  '), 5);
});
