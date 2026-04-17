import type { Metadata } from 'next';

import { getURL } from '@/utils/helpers';

const canonical = `${getURL().replace(/\/+$/, '')}/listing-review-policy`;

export const metadata: Metadata = {
  title: 'Listing review policy',
  description: 'ScholarshipTop listing review policy.',
  alternates: { canonical }
};

export default function ListingReviewPolicyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        Listing review policy
      </h1>
    </article>
  );
}
