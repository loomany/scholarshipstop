import type { Metadata } from 'next';

import { getURL } from '@/utils/helpers';

const canonical = `${getURL().replace(/\/+$/, '')}/how-we-verify-scholarships`;

export const metadata: Metadata = {
  title: 'How we verify scholarships',
  description: 'How ScholarshipTop reviews scholarship listings.',
  alternates: { canonical }
};

export default function HowWeVerifyScholarshipsPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        How we verify scholarships
      </h1>
    </article>
  );
}
