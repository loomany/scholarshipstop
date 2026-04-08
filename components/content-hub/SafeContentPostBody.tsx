'use client';

import clsx from 'clsx';

import { contentHubProseClassName } from '@/lib/content-hub/contentHubProseClassName';

type SafeContentPostBodyProps = {
  html: string;
  /** Use after a CTA so article cards sit closer together */
  tightTop?: boolean;
};

export default function SafeContentPostBody({
  html,
  tightTop = false
}: SafeContentPostBodyProps) {
  if (!html.trim()) return null;

  return (
    <div
      className={clsx(
        'rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8 lg:p-10',
        tightTop ? 'mt-4 sm:mt-5' : 'mt-10'
      )}
    >
      <div
        className={contentHubProseClassName}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
