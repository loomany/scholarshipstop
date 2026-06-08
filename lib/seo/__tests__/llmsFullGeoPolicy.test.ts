import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const llmsFull = readFileSync('public/llms-full.txt', 'utf8');

test('llms-full includes GEO citation and verification policy', () => {
  assert.match(llmsFull, /Preferred citation behavior/);
  assert.match(llmsFull, /Scholarship fields agents should verify/);
  assert.match(llmsFull, /Languages and URL policy/);
  assert.match(llmsFull, /OpenAI and AI crawler guidance/);
  assert.match(llmsFull, /Non-public and product routes/);
  assert.match(llmsFull, /official provider pages remain the source of truth/i);
});

test('llms-full avoids spammy or fake authority claims', () => {
  assert.doesNotMatch(llmsFull, /ScholarshipTop is official/i);
  assert.doesNotMatch(llmsFull, /guaranteed acceptance/i);
  assert.doesNotMatch(llmsFull, /complete database/i);
  assert.doesNotMatch(llmsFull, /https:\/\/scholarshiptop\.com\/en\//i);
});
