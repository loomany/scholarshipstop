import assert from 'node:assert/strict';
import fs from 'fs/promises';
import os from 'node:os';
import path from 'path';
import test from 'node:test';

import { appendSeoNewContentWarningRun } from '@/lib/seo/seoNewContentWarnings';

test('appendSeoNewContentWarningRun writes JSON array tail', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'seo-warn-'));
  const filePath = path.join(dir, 'warnings.json');
  process.env.SEO_NEW_CONTENT_WARNINGS_PATH = filePath;
  try {
    await appendSeoNewContentWarningRun({
      generatedAt: '2026-01-01T00:00:00.000Z',
      source: 'test',
      counts: { ok: 1, warnings: 0, below90: 0 },
      entries: [{ url: '/x', type: 'essay', score: 95, issues: [], warnings: [] }],
      telegramNotification: {
        enabled: false,
        sent: false,
        reason: 'all_ok'
      }
    });
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown[];
    assert.equal(parsed.length, 1);
    assert.equal((parsed[0] as { source: string }).source, 'test');
  } finally {
    delete process.env.SEO_NEW_CONTENT_WARNINGS_PATH;
    await fs.rm(dir, { recursive: true, force: true });
  }
});
