import type { Metadata } from 'next';

import { getURL } from '@/utils/helpers';

const canonical = `${getURL().replace(/\/+$/, '')}/how-ai-is-used`;

export const metadata: Metadata = {
  title: 'How AI is used',
  description: 'How ScholarshipTop uses AI.',
  alternates: { canonical }
};

export default function HowAiIsUsedPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        How AI is used
      </h1>
    </article>
  );
}
