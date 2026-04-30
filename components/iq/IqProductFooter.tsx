import Link from 'next/link';

import Logo from '@/components/icons/Logo';

const iqFooterLinks = [
  { href: '/iq', label: 'Home' },
  { href: '/iq/about', label: 'About' },
  { href: '/iq/help', label: 'Help' },
  { href: '/iq/privacy-policy', label: 'Privacy Policy' },
  { href: '/iq/terms', label: 'Terms of Service' },
  { href: '/iq/refund-policy', label: 'Refund Policy' },
  { href: '/iq/faq', label: 'FAQ' }
];

export default function IqProductFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 py-8 sm:flex-row sm:items-start sm:gap-8 sm:py-10">
        <div className="shrink-0">
          <Link
            href="/iq"
            className="inline-flex rounded-full bg-black px-4 py-2.5 ring-1 ring-gray-800 transition hover:ring-gray-600"
            aria-label="IQ Profile - Home"
          >
            <Logo variant="footer" />
          </Link>
        </div>

        <div className="min-w-0 flex-1 text-left">
          <nav
            className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-slate-700"
            aria-label="IQ product footer"
          >
            {iqFooterLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition hover:text-slate-950 hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <p className="mt-4 max-w-3xl text-xs leading-6 text-slate-500 sm:text-sm">
            IQ Profile provides an educational IQ-style cognitive report. It is
            not a clinical diagnosis, medical advice, or a substitute for a
            licensed psychological assessment.
          </p>
        </div>
      </div>
    </footer>
  );
}
