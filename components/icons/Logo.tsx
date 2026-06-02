import { GraduationCap } from 'lucide-react';

export type LogoProps = {
  variant?: 'header' | 'footer' | 'auth';
  className?: string;
};

/** Brand mark: orange cap + “Scholarship” (white) + “Top” (orange) — matches footer/header on dark. */
export default function Logo({
  variant = 'header',
  className = ''
}: LogoProps) {
  const capClass =
    variant === 'footer'
      ? 'h-8 w-8 shrink-0 text-orange-500 md:h-9 md:w-9'
      : variant === 'auth'
        ? 'h-9 w-9 shrink-0 text-orange-500 sm:h-10 sm:w-10'
        : 'h-8 w-8 shrink-0 text-orange-500 md:h-9 md:w-9';

  const textWrap =
    variant === 'auth'
      ? 'text-[0.9375rem] leading-none sm:text-lg'
      : variant === 'header'
        ? 'inline-flex text-[0.8125rem] leading-none sm:text-[0.95rem] md:text-base'
        : 'text-[0.9rem] leading-none sm:text-[0.95rem] md:text-base';

  const inner = (
    <>
      <GraduationCap className={capClass} strokeWidth={2.25} aria-hidden />
      <span
        className={`inline-flex items-baseline gap-0 font-bold tracking-tight ${textWrap}`}
      >
        <span className="text-white">Scholarship</span>
        <span className="text-orange-500">Top</span>
      </span>
    </>
  );

  if (variant === 'auth') {
    return (
      <span
        className={`inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 ring-1 ring-zinc-800 sm:gap-2.5 sm:px-5 sm:py-3 ${className}`.trim()}
        aria-label="ScholarshipTop"
      >
        {inner}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 md:gap-2.5 ${className}`.trim()}
      aria-label="ScholarshipTop"
    >
      {inner}
    </span>
  );
}
