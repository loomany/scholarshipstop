import Link from 'next/link';

import {
  ARTICLE_AUTHOR_NAME,
  ARTICLE_AUTHOR_TITLE,
  ARTICLE_REVIEWER_NAME
} from '@/lib/seo/articleTrust';

type ArticleTrustBylineProps = {
  dateLine?: string | null;
  className?: string;
};

export default function ArticleTrustByline({
  dateLine,
  className = ''
}: ArticleTrustBylineProps) {
  return (
    <div
      className={`space-y-1 text-xs leading-relaxed text-gray-600 sm:text-sm ${className}`}
    >
      <p>
        By{' '}
        <Link
          href="/about#founder"
          className="font-semibold text-gray-800 underline-offset-2 hover:text-gray-950 hover:underline"
        >
          {ARTICLE_AUTHOR_NAME}
        </Link>
        , {ARTICLE_AUTHOR_TITLE}
      </p>
      <p>
        Reviewed by{' '}
        <Link
          href="/scholarship-verification-methodology"
          className="font-semibold text-gray-800 underline-offset-2 hover:text-gray-950 hover:underline"
        >
          {ARTICLE_REVIEWER_NAME}
        </Link>
        {dateLine ? ` · ${dateLine}` : null}
      </p>
    </div>
  );
}
