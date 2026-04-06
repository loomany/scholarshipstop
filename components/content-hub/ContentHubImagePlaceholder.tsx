import { BookOpen } from 'lucide-react';
import clsx from 'clsx';

type ContentHubImagePlaceholderProps = {
  className?: string;
  /** `featured` uses a larger icon; both use 16:9 frame for real images. */
  variant?: 'card' | 'featured';
};

export default function ContentHubImagePlaceholder({
  className,
  variant = 'card'
}: ContentHubImagePlaceholderProps) {
  return (
    <div
      className={clsx(
        'flex aspect-video w-full items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50',
        className
      )}
      aria-hidden
    >
      <BookOpen
        className={clsx(
          'text-orange-200/90',
          variant === 'featured' ? 'h-16 w-16 sm:h-20 sm:w-20' : 'h-10 w-10 sm:h-12 sm:w-12'
        )}
        strokeWidth={1.25}
      />
    </div>
  );
}
