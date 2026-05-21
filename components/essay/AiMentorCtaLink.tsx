import Link from 'next/link';

const ESSAY_AI_MENTOR_PATH = '/essay';

/** White pill CTA — dark label, orange arrow (used under hero video on /essays and /). */
export function AiMentorCtaLink({ label = 'Try Essay Mentor' }: { label?: string }) {
  return (
    <Link
      href={ESSAY_AI_MENTOR_PATH}
      className="group flex w-full items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-3 text-center text-[13px] font-semibold leading-snug tracking-tight text-gray-900 shadow-[0_8px_28px_-14px_rgba(15,23,42,0.16)] ring-1 ring-gray-100 transition duration-200 ease-out hover:-translate-y-0.5 hover:border-orange-200/90 hover:bg-gradient-to-b hover:from-white hover:to-orange-50/95 hover:text-orange-900 hover:shadow-[0_12px_32px_-16px_rgba(15,23,42,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/75 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:py-3.5 sm:text-[15px]"
    >
      <span>{label}</span>
      <span
        className="text-orange-600 transition group-hover:translate-x-0.5 group-hover:text-orange-700"
        aria-hidden
      >
        →
      </span>
    </Link>
  );
}
