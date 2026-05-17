'use client';

import { useState } from 'react';

type EssayGuideCardImageProps = {
  src?: string | null;
  alt: string;
  aspectClassName?: string;
  className?: string;
  imageClassName?: string;
  placeholderLabel?: string;
};

export function EssayGuideCardImage({
  src,
  alt,
  aspectClassName = 'aspect-[16/10]',
  className = '',
  imageClassName = '',
  placeholderLabel = 'Essay guide'
}: EssayGuideCardImageProps) {
  const [failed, setFailed] = useState(false);
  const safeSrc = src?.trim();
  const showImage = Boolean(safeSrc) && !failed;

  return (
    <div
      className={`relative w-full overflow-hidden bg-gray-100 ${aspectClassName} ${className}`.trim()}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={safeSrc}
          alt={alt}
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover transition duration-300 group-hover:scale-[1.03] ${imageClassName}`.trim()}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-50 via-white to-indigo-100 px-4 text-center text-sm font-semibold text-sky-800/80"
          aria-hidden
        >
          {placeholderLabel}
        </div>
      )}
    </div>
  );
}
