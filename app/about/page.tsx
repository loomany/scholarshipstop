import type { Metadata } from 'next';
import Link from 'next/link';
import clsx from 'clsx';
import {
  BadgeDollarSign,
  HelpCircle,
  MessageCircleQuestion,
  ReceiptText,
  Scale,
  Shield
} from 'lucide-react';

import AboutResourceCard from '@/components/about/AboutResourceCard';
import { siteNavLink as nav } from '@/components/ui/nav/siteNavLink';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn how ScholarshipTop works, get help, and find Privacy Policy, Terms, and FAQ in one place.'
};

const CARDS = [
  {
    href: '/help',
    title: 'Help',
    shortText:
      'Learn how ScholarshipTop works and how to get support if you need help using the platform.',
    expandedText:
      'Find guidance on browsing scholarships, understanding matching, saving opportunities, and getting help with your account.',
    icon: HelpCircle
  },
  {
    href: '/privacy-policy',
    title: 'Privacy Policy',
    shortText:
      'Understand what information we collect, how we use it, and how we protect your data.',
    expandedText:
      'Review how ScholarshipTop handles profile details, account information, and limited technical data while you use the platform.',
    icon: Shield
  },
  {
    href: '/terms',
    title: 'Terms',
    shortText:
      'Read the rules, limitations, and conditions for using ScholarshipTop and its services.',
    expandedText:
      'See important information about acceptable use, scholarship listings, accounts, paid features, and service limitations.',
    icon: Scale
  },
  {
    href: '/faq',
    title: 'FAQ',
    shortText:
      'Find quick answers to common questions about scholarships, matching, and how ScholarshipTop works.',
    expandedText:
      'Explore answers about finding scholarships, improving matches, saving opportunities, and understanding how the platform is used.',
    icon: MessageCircleQuestion
  },
  {
    href: '/refund-policy',
    title: 'Refund Policy',
    shortText:
      'Review how free trials, subscription cancellations, and refund requests are handled.',
    expandedText:
      'See the 3-day trial terms, how to cancel your subscription, and when refund requests may be reviewed.',
    icon: ReceiptText
  },
  {
    href: '/subscription',
    title: 'Pricing',
    shortText:
      'See ScholarshipTop plans, free trial details, and which premium features are included.',
    expandedText:
      'Compare monthly, quarterly, and yearly pricing options and choose the plan that fits your scholarship search.',
    icon: BadgeDollarSign
  }
] as const;

export default function AboutPage() {
  return (
    <div className="min-h-[calc(100dvh-5rem)] bg-zinc-50 pb-16 pt-10 sm:pb-20 sm:pt-14">
      <div className="mx-auto max-w-5xl px-6">
        <Link href="/" className={clsx(nav.legal, 'mb-8')}>
          ← Back to home
        </Link>

        <header className="max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            About ScholarshipTop
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-zinc-600 sm:text-xl sm:leading-relaxed">
            Learn more about how ScholarshipTop works, how to get help, and
            where to find important information about using the platform.
          </p>
        </header>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {CARDS.map((card) => (
            <AboutResourceCard key={card.href} {...card} />
          ))}
        </div>

        <p className="mt-14 max-w-3xl text-left text-base leading-relaxed text-zinc-700 sm:mt-16">
          ScholarshipTop is built to make scholarship discovery easier, more
          organized, and more transparent for students.
        </p>

        <Link href="/" className={clsx(nav.legal, 'mt-8 inline-block sm:mt-10')}>
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
