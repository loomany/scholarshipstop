import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';

import { SUCCESS_STORIES } from '@/lib/home/successStories';

const testimonialClaimPattern =
  /\$[\d,]+|\bwon\b|\bawarded\b|\bwinner\b|\brecipient\b|changed my life|full tuition|full ride|coca-cola scholar/i;

test('home workflow examples avoid unverifiable testimonial claims', () => {
  const combined = SUCCESS_STORIES.flatMap((story) => [
    story.name,
    story.label,
    story.headline,
    story.body
  ]).join('\n');

  assert.doesNotMatch(combined, testimonialClaimPattern);
});

test('home workflow carousel avoids synthetic review presentation', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'components/home/SuccessStoriesCarousel.tsx'),
    'utf8'
  );

  assert.doesNotMatch(
    source,
    /Stories of Real Students|What students say|5 out of 5 stars|successStoryAvatarSrc|ui-avatars|generate-success-stories-avatars|testimonial/i
  );
});
