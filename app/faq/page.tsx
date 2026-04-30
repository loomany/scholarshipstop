import type { Metadata } from 'next';
import Link from 'next/link';
import clsx from 'clsx';

import { siteNavLink as nav } from '@/components/ui/nav/siteNavLink';
import { getCanonical } from '@/lib/seo/canonical';

const faqDescription =
  'Answers to common questions about scholarships, how ScholarshipTop works, profile matching, saving scholarships, eligibility, and support.';

const faqCanonical = getCanonical('/faq');

export const metadata: Metadata = {
  title: 'FAQ',
  description: faqDescription,
  alternates: {
    canonical: faqCanonical
  },
  openGraph: {
    title: 'FAQ',
    description: faqDescription,
    url: faqCanonical,
    type: 'website',
    siteName: 'ScholarshipTop',
    locale: 'en_US',
    images: [
      {
        url: '/logo-preview.png',
        width: 1200,
        height: 630,
        alt: 'ScholarshipTop Logo'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FAQ',
    description: faqDescription,
    images: ['/logo-preview.png']
  }
};

const supportMailClass =
  'text-black font-normal no-underline decoration-transparent underline-offset-4 transition hover:underline hover:decoration-zinc-400';

const SUPPORT_QUESTION =
  'Where can I get help with scholarships or my account?';

const SUPPORT_ANSWER_PLAIN =
  'If you need help using ScholarshipTop or have questions about your account, you can contact support at support@scholarshiptop.com';

const faqItems: { question: string; answer: string }[] = [
  {
    question: 'What is ScholarshipTop and how does it help find scholarships?',
    answer:
      'ScholarshipTop is a platform designed to help students find scholarships more efficiently. Instead of manually searching through hundreds of websites, users can explore scholarship listings, filter opportunities, and discover scholarships that better match their profile and preferences.'
  },
  {
    question: 'How can I find scholarships that match me?',
    answer:
      'You can find scholarships by creating a profile and providing information such as your education level, interests, and background. ScholarshipTop uses this information to surface scholarships that are more relevant, helping you focus on opportunities that are a better fit.'
  },
  {
    question: 'Do I need an account to search for scholarships?',
    answer:
      'You can browse some scholarship listings without an account, but creating a profile allows you to access personalized scholarship matches, save opportunities, and improve your overall search experience.'
  },
  {
    question: 'Does ScholarshipTop guarantee that I will get a scholarship?',
    answer:
      'No. ScholarshipTop helps you find and organize scholarship opportunities, but it does not guarantee eligibility or acceptance. All scholarship decisions are made by the scholarship providers.'
  },
  {
    question: 'What does “Best recommendations” mean?',
    answer:
      'Best recommendations are scholarships chosen to align with your profile and filters. They are based on the information you provide, such as your academic level, interests, and preferences.'
  },
  {
    question: 'What are “easy scholarships to apply for”?',
    answer:
      'Easy scholarships are typically opportunities with fewer requirements or a simpler application process. These may include scholarships with no essays or minimal documentation.'
  },
  {
    question: 'Can I save scholarships and track them?',
    answer:
      'Yes. ScholarshipTop allows you to save scholarships so you can track them, revisit them later, and stay organized during your scholarship search process.'
  },
  {
    question: 'Why am I not seeing many scholarship matches?',
    answer:
      'If you are not seeing many relevant scholarships, your profile may be incomplete. Adding more accurate information can help improve your scholarship recommendations and increase match quality.'
  },
  {
    question: 'Are the scholarships on ScholarshipTop real and verified?',
    answer:
      'ScholarshipTop aims to provide real and useful scholarship listings. However, users should always verify scholarship details and requirements directly with the official provider before applying.'
  },
  {
    question: 'Can I apply for scholarships directly on the platform?',
    answer:
      'In most cases, ScholarshipTop helps you discover scholarships, but the application process is handled by the scholarship provider. You will typically apply through their official website or application system.'
  },
  {
    question: 'Is ScholarshipTop free?',
    answer:
      'ScholarshipTop offers free access to part of the scholarship catalog and some core discovery features. We also offer paid plans with additional tools such as advanced matching, precision filters, expanded organization features, and essay support. You can review current plan details on our Pricing page.'
  },
  {
    question: 'How do I increase my chances of getting a scholarship?',
    answer:
      'To improve your chances of getting a scholarship, focus on applying to relevant opportunities, completing your profile accurately, meeting all requirements, and applying early when possible.'
  }
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    ...faqItems.map(({ question, answer }) => ({
      '@type': 'Question' as const,
      name: question,
      acceptedAnswer: {
        '@type': 'Answer' as const,
        text: answer
      }
    })),
    {
      '@type': 'Question' as const,
      name: SUPPORT_QUESTION,
      acceptedAnswer: {
        '@type': 'Answer' as const,
        text: SUPPORT_ANSWER_PLAIN
      }
    }
  ]
};

const questionClass = 'text-lg font-semibold tracking-tight text-zinc-900';
const answerClass = 'mt-2 text-base leading-relaxed text-gray-600';
const itemClass = 'mb-10 scroll-mt-24';

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <article className="mx-auto max-w-[52rem] px-6 py-16 sm:py-20">
        <Link href="/" className={clsx(nav.legal, 'mb-6')}>
          ← Back to home
        </Link>

        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            FAQ
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-700">
            Find answers to common questions about scholarships, how
            ScholarshipTop works, and how to discover and apply for scholarships
            more effectively.
          </p>
        </header>

        <div>
          {faqItems.map(({ question, answer }, index) => (
            <section
              key={question}
              className={itemClass}
              aria-labelledby={`faq-q-${index}`}
            >
              <h3 id={`faq-q-${index}`} className={questionClass}>
                {question}
              </h3>
              <p className={answerClass}>{answer}</p>
            </section>
          ))}

          <section className={itemClass} aria-labelledby="faq-q-support">
            <h3 id="faq-q-support" className={questionClass}>
              {SUPPORT_QUESTION}
            </h3>
            <p className={answerClass}>
              If you need help using ScholarshipTop or have questions about your
              account, you can contact support at:{' '}
              <a
                href="mailto:support@scholarshiptop.com"
                className={supportMailClass}
              >
                support@scholarshiptop.com
              </a>
            </p>
          </section>

          <p className="mt-10 text-base leading-relaxed text-zinc-800 sm:mt-12">
            ScholarshipTop is built to make finding scholarships easier, faster,
            and more organized for students worldwide.
          </p>

          <Link href="/" className={clsx(nav.legal, 'mt-12 sm:mt-14')}>
            ← Back to home
          </Link>
        </div>
      </article>
    </>
  );
}
