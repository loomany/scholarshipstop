import { BookOpen, Check, Heart, Layers, type LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

import { AiMentorCtaLink } from '@/components/essay/AiMentorCtaLink';
import { AiMentorHowItWorksVideo } from '@/components/essay/AiMentorHowItWorksVideo';

/** One orange for every icon (`currentColor` on the wrapper → uniform Lucide strokes). */
const STEP_ICON_WRAP = 'mt-0.5 inline-flex shrink-0 text-orange-500';
const STEP_ICON_SIZE = 'h-6 w-6 sm:h-7 sm:w-7';

const STEPS: {
  icon: LucideIcon;
  title: string;
  body: string;
}[] = [
  {
    icon: Heart,
    title: 'Personal Context Mining',
    body:
      'We start by analyzing your unique background, achievements, and scholarship goals to find the perfect angle for your story.'
  },
  {
    icon: Layers,
    title: 'Strategic Structuring',
    body:
      'The mentor builds a custom outline based on thousands of successful applications, ensuring a logical and winning flow.'
  },
  {
    icon: BookOpen,
    title: 'Human-Grade Drafting',
    body:
      'We generate a powerful, empathetic draft that sounds like you, while ensuring it remains 100% undetectable by AI scanners.'
  },
  {
    icon: Check,
    title: 'Final Polish',
    body:
      "Refine the details and finalize your essay with the mentor's help until it's ready to win."
  }
];

type AiMentorHowItWorksSectionProps = {
  className?: string;
};

export function AiMentorHowItWorksSection({
  className
}: AiMentorHowItWorksSectionProps) {
  return (
    <div
      role="region"
      aria-labelledby="ai-mentor-how-it-works-heading"
      className={cn('mt-10 sm:mt-12', className)}
    >
      <div className="grid grid-cols-1 gap-7 lg:grid-cols-2 lg:items-start lg:gap-11 xl:gap-14">
        {/* Video + CTA first in DOM → stacked on mobile */}
        <div className="flex min-w-0 flex-col gap-3 sm:gap-3.5">
          <AiMentorHowItWorksVideo />
          <AiMentorCtaLink />
        </div>

        <div className="min-w-0">
          <h2
            id="ai-mentor-how-it-works-heading"
            className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl"
          >
            How the AI Essay Mentor Works
          </h2>
          <ol className="mt-6 list-none space-y-5 sm:mt-7 sm:space-y-5">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="flex gap-4">
                  <span className={STEP_ICON_WRAP} aria-hidden>
                    <Icon className={STEP_ICON_SIZE} strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-zinc-900">{step.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-600 sm:text-base">
                      {step.body}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
