'use client';

import { toast } from '@/components/ui/Toasts/use-toast';

/** Same address as site-wide support (help, legal, partner requests). */
const SUPPORT_EMAIL = 'support@scholarshiptop.com';

const SUBJECT = 'Partner Account Request';

const BODY_PLAIN = `Hello ScholarshipTop Team,

We would like to request an organization account.

Organization Name: 
Official Website: 
Contact Person: 

Best regards,`;

const mailtoHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(BODY_PLAIN)}`;

const gmailComposeHref = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(SUPPORT_EMAIL)}&su=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(BODY_PLAIN)}`;

const buttonClass =
  'inline-flex w-full max-w-md items-center justify-center rounded-2xl bg-black px-8 py-4 text-center text-lg font-semibold text-white shadow-[0_6px_20px_-6px_rgba(0,0,0,0.45)] transition duration-200 ease-out hover:scale-[1.02] hover:bg-zinc-900 hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.45)] active:scale-[0.99] sm:w-auto sm:max-w-none sm:py-[1.125rem]';

/**
 * Primary action uses mailto; many environments (no mail app, embedded browsers)
 * ignore it silently — see fallback links below.
 */
export default function PartnerRequestAccess() {
  const copyTemplate = async () => {
    const text = `To: ${SUPPORT_EMAIL}\nSubject: ${SUBJECT}\n\n${BODY_PLAIN}`;
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied to clipboard',
        description: 'Paste the message into your email app.',
        duration: 5000
      });
    } catch {
      toast({
        title: 'Could not copy automatically',
        description: (
          <span>
            Email:{' '}
            <a
              href={mailtoHref}
              className="font-medium underline underline-offset-2"
            >
              {SUPPORT_EMAIL}
            </a>
          </span>
        ),
        variant: 'destructive',
        duration: 8000
      });
    }
  };

  return (
    <div className="mt-8 flex w-full flex-col items-center gap-4">
      <div className="flex w-full justify-center">
        <a href={mailtoHref} className={buttonClass}>
          Request Access
        </a>
      </div>
      <p className="max-w-md text-center text-sm leading-relaxed text-gray-600">
        If nothing opens (common without a desktop mail app), use Gmail in the
        browser or copy the template.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm font-medium">
        <a
          href={gmailComposeHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-600 underline decoration-orange-200 underline-offset-4 transition hover:text-orange-700 hover:decoration-orange-400"
        >
          Open in Gmail
        </a>
        <span className="text-gray-300" aria-hidden>
          ·
        </span>
        <button
          type="button"
          onClick={copyTemplate}
          className="text-orange-600 underline decoration-orange-200 underline-offset-4 transition hover:text-orange-700 hover:decoration-orange-400"
        >
          Copy email template
        </button>
      </div>
      <p className="text-center text-xs text-gray-500">
        Or email{' '}
        <a
          href={mailtoHref}
          className="font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900"
        >
          {SUPPORT_EMAIL}
        </a>
      </p>
    </div>
  );
}
