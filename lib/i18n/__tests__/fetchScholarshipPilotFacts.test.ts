import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatScholarshipDeadline,
  sanitizePilotDeadlineText
} from '@/lib/i18n/scholarshipPilot/fetchScholarshipPilotFacts';

describe('sanitizePilotDeadlineText', () => {
  it('keeps DAAD deadline dates and drops scraped boilerplate', () => {
    const raw =
      '15 January and 15 July of each year Application requirements Contact E-Mail: x@y.de Copy this link: daad.de/go/en/stipa10000132 Print as PDF';
    assert.equal(sanitizePilotDeadlineText(raw), '15 January and 15 July of each year');
  });

  it('formatScholarshipDeadline prefers sanitized deadline_text over date', () => {
    const deadline = formatScholarshipDeadline({
      slug: 'test',
      title: 'Test',
      provider_name: 'DAAD',
      award_amount_text: null,
      award_amount_min: null,
      award_amount_max: null,
      currency: null,
      deadline_text:
        '15 January and 15 July of each year Application requirements Copy this link: daad.de/go/en/stipa10000132',
      deadline_date: '2026-01-15'
    });
    assert.equal(deadline, '15 January and 15 July of each year');
  });
});
