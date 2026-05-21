'use client';

import { AiMentorCtaLink } from '@/components/essay/AiMentorCtaLink';
import { AiMentorHowItWorksVideo } from '@/components/essay/AiMentorHowItWorksVideo';

/**
 * Desktop-only CTA under “My scholarships” on /scholarships — matches homepage mentor styling.
 */
export function ScholarshipsSidebarAiMentorCard({
  ctaLabel
}: {
  ctaLabel?: string;
}) {
  return (
    <section
      className="mt-4 hidden w-full max-w-none lg:block"
      aria-label="AI Essay Mentor"
    >
      <div className="overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-gray-100/90">
        <AiMentorHowItWorksVideo
          className="relative aspect-[5/4] w-full overflow-hidden rounded-none rounded-t-2xl bg-zinc-950 shadow-none ring-0"
          playButtonAriaLabel="Play video: How the AI Essay Mentor works"
        />
        <div className="border-t border-gray-100/90 bg-white p-3">
          <AiMentorCtaLink label={ctaLabel} />
        </div>
      </div>
    </section>
  );
}
