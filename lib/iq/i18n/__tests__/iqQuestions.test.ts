import assert from 'node:assert/strict';
import test from 'node:test';

import { cognitiveAssessmentQuestions } from '@/lib/cognitiveAssessmentQuestions';
import {
  assertLocalizedQuestionBankParity,
  getLocalizedIqQuestions
} from '@/lib/iq/i18n/getLocalizedIqQuestions';
import { getIqLanguageSwitcherItems } from '@/lib/iq/i18n/iqLocalizedHref';
import { scoreQuestionBank } from '@/components/iq/assessmentScoring';

test('English question bank has 30 items', () => {
  assert.equal(cognitiveAssessmentQuestions.length, 30);
});

test('ES and FR banks have 30 items with same ids and scoring', () => {
  const en = cognitiveAssessmentQuestions;
  for (const locale of ['es', 'fr'] as const) {
    const bank = getLocalizedIqQuestions(locale);
    assert.equal(bank.length, 30);
    for (let i = 0; i < en.length; i += 1) {
      assert.equal(bank[i]!.id, en[i]!.id);
      assert.equal(bank[i]!.correct_option, en[i]!.correct_option);
      assert.equal(bank[i]!.weight, en[i]!.weight);
      assert.ok(bank[i]!.prompt.trim().length > 0);
      for (const key of ['A', 'B', 'C', 'D'] as const) {
        assert.ok(bank[i]!.options[key].trim().length > 0);
      }
    }
  }
});

test('localized scoring matches English for same answers', () => {
  const answers = { AR01: 'A', NL01: 'C' } as const;
  const enScore = scoreQuestionBank(cognitiveAssessmentQuestions, answers);
  const esScore = scoreQuestionBank(getLocalizedIqQuestions('es'), answers);
  assert.equal(esScore, enScore);
});

test('assertLocalizedQuestionBankParity passes', () => {
  assertLocalizedQuestionBankParity();
});

test('language switcher preserves assessment path without /en', () => {
  const items = getIqLanguageSwitcherItems({
    pathname: '/es/assessment',
    onIqSubdomain: true
  });
  assert.equal(
    items.find((i) => i.locale === 'en')?.href,
    '/assessment'
  );
  assert.equal(
    items.find((i) => i.locale === 'es')?.href,
    '/es/assessment'
  );
  assert.equal(
    items.find((i) => i.locale === 'fr')?.href,
    '/fr/assessment'
  );
  assert.equal(
    items.some((i) => i.href === '/en' || i.href.startsWith('/en/')),
    false
  );
});
