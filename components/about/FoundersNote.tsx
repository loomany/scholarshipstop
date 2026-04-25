import Image from 'next/image';
import { Mail } from 'lucide-react';

const FOUNDER_PARAGRAPHS = [
  'Hi everyone, my name is Daur.',
  'I know firsthand how overwhelming it can be to balance your studies, work a part-time job, and spend endless hours hunting for grants and scholarships. The application process often feels like a full-time job itself — confusing, scattered, and exhausting.',
  "That's exactly why I built ScholarshipTop. I wanted to create a space that does the heavy lifting for you. A platform that makes discovering funding opportunities easier, more organized, and completely transparent. My goal is to save you time and energy, so you can focus on what truly matters: your education and your future.",
  'We are constantly working to improve this platform for you. If you have any questions, feedback, or just want to say hi, I’d love to hear from you.'
] as const;

const CONTACT_EMAIL = 'support@scholarshiptop.com';

export default function FoundersNote() {
  return (
    <section
      className="mt-10 max-w-3xl sm:mt-12"
      aria-labelledby="founders-note-heading"
    >
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center shadow-sm sm:flex-row sm:items-start sm:gap-8 sm:p-8 sm:text-left">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-zinc-100 ring-1 ring-zinc-200/80 sm:h-32 sm:w-32">
          <Image
            src="/images/founder-daur.png"
            alt="Daur, founder of ScholarshipTop"
            fill
            sizes="(max-width: 640px) 96px, 128px"
            className="object-cover object-center"
            quality={90}
            priority={false}
          />
        </div>

        <div className="min-w-0 flex-1">
          <h2
            id="founders-note-heading"
            className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl"
          >
            A Message from the Founder
          </h2>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-gray-600">
            {FOUNDER_PARAGRAPHS.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>

          <p className="mt-6 flex flex-wrap items-center justify-center gap-2 text-left text-base text-gray-600 sm:justify-start">
            <Mail
              className="h-4 w-4 shrink-0 text-zinc-500"
              aria-hidden
              strokeWidth={2}
            />
            <span>Reach out to me:</span>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium text-orange-600 underline-offset-2 transition-colors hover:text-orange-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
