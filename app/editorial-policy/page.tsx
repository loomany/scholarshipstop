import type { Metadata } from 'next';

import { getURL } from '@/utils/helpers';

const canonical = `${getURL().replace(/\/+$/, '')}/editorial-policy`;

export const metadata: Metadata = {
  title: 'Editorial policy',
  description: 'ScholarshipTop editorial policy.',
  alternates: { canonical }
};

export default function EditorialPolicyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        Editorial policy
      </h1>
    </article>
  );
}
