import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RateLimitError } from 'openai';

import {
  isOpenAiQuotaBilling429Error,
  OPENAI_QUOTA_EXCEEDED_LOG_MARK
} from '@/lib/essays/openAiQuotaBillingError';

test('OPENAI_QUOTA_EXCEEDED_LOG_MARK is stable for log grep', () => {
  assert.equal(OPENAI_QUOTA_EXCEEDED_LOG_MARK, 'OPENAI_QUOTA_EXCEEDED');
});

test('detects typical billing quota 429 (message shape from OpenAI)', () => {
  const err = new RateLimitError(
    429,
    {
      message:
        'You exceeded your current quota, please check your plan and billing details.',
      type: 'insufficient_quota',
      param: null,
      code: 'insufficient_quota'
    },
    'You exceeded your current quota, please check your plan and billing details.',
    {} as import('openai/core').Headers
  );
  assert.equal(isOpenAiQuotaBilling429Error(err), true);
});

test('429 rate-limit style message without billing quota is not treated as billing quota', () => {
  const err = new RateLimitError(
    429,
    {
      message: 'Rate limit reached for gpt-5.4 in organization org on tokens per min (TPM): Limit 1000, Used 1000, Requested 500.',
      type: 'tokens',
      param: null,
      code: 'rate_limit_exceeded'
    },
    'Rate limit reached for gpt-5.4',
    {} as import('openai/core').Headers
  );
  assert.equal(isOpenAiQuotaBilling429Error(err), false);
});

test('non-429 errors are ignored', () => {
  assert.equal(isOpenAiQuotaBilling429Error(new Error('429 fake in text')), false);
});
