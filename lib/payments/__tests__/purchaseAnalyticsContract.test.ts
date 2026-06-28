import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import path from 'node:path';

test('the public success page does not emit an unverified purchase event', () => {
  const root = process.cwd();
  const page = readFileSync(
    path.join(root, 'app/subscription/success/page.tsx'),
    'utf8'
  );
  const content = readFileSync(
    path.join(root, 'components/subscription/SubscriptionSuccessContent.tsx'),
    'utf8'
  );

  assert.doesNotMatch(page, /purchase_success|PurchaseSuccessEvent/);
  assert.doesNotMatch(content, /purchase_success|PurchaseSuccessEvent/);
});
