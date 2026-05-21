import type { Metadata } from 'next';
import Link from 'next/link';

import ResourceGuideShell from '@/components/content-hub/resourceGuides/ResourceGuideShell';
import { resourceGuideLinkClassName } from '@/lib/content-hub/resourceGuidePages';
import { resourceGuideHref } from '@/lib/scholarships/resourceGuideRoutes';
import { buildStage2EnglishPilotAlternates } from '@/lib/i18n/englishAlternates';
import { getCanonical } from '@/lib/seo/canonical';

const hrefApply = resourceGuideHref('how-to-apply-for-scholarships');
const hrefDeadlines = resourceGuideHref('scholarship-deadlines-explained');
const canonical = getCanonical('/resources/combine-multiple-scholarships');

export const metadata: Metadata = {
  title: 'Can You Combine Multiple Scholarships?',
  description:
    'Find out whether you can combine multiple scholarships, how stacking works with school policy, what limitations apply, and which questions to ask before accepting several awards.',
  alternates: buildStage2EnglishPilotAlternates('/resources/combine-multiple-scholarships'),
  openGraph: {
    title: 'Can You Combine Multiple Scholarships?',
    description:
      'Find out whether you can combine multiple scholarships, how stacking works with school policy, what limitations apply, and which questions to ask before accepting several awards.',
    url: canonical
  }
};

export default function CombineMultipleScholarshipsPage() {
  return (
    <ResourceGuideShell
      title="Can You Combine Multiple Scholarships?"
      subtitle="Yes—often—but not always. “Stacking” depends on each award’s rules, your school’s policy, and whether the money is labeled for tuition only. Here is how to think about it without guessing your way into a financial aid mess."
      faq={[
        {
          question: 'Is it legal to combine scholarships?',
          answer:
            'In most cases, yes, as long as you follow each provider’s terms and your school’s aid rules. Problems show up when total aid exceeds the cost of attendance or when a scholarship forbids stacking. Read the fine print and confirm with the financial aid office.'
        },
        {
          question: 'Can one scholarship cancel another?',
          answer:
            'Sometimes institutional aid adjusts when outside scholarships arrive—that is not the same as “canceled,” but your net out-of-pocket may not drop dollar-for-dollar. Ask how external awards apply to grants, loans, and work-study so you understand the order funds are applied.'
        }
      ]}
      endReading={[
        {
          href: hrefApply,
          title: 'How to Apply for Scholarships',
          blurb:
            'practical steps to organize your application process'
        },
        {
          href: hrefDeadlines,
          title: 'Scholarship Deadlines Explained',
          blurb:
            'simple ways to manage deadlines and avoid missed opportunities'
        }
      ]}
    >
      <>
        <p>
          Stacking scholarships sounds like free money math, but schools and
          donors both have guardrails. Some awards are designed to fill unmet
          need; others are capped so recipients do not receive more than the
          published cost of attendance. The honest answer is: combine when the
          rules allow, and verify in writing when money is large or overlapping.
        </p>

        <h2>How Scholarship Stacking Works</h2>
        <p>
          Stacking means holding more than one scholarship at the same time.
          Private donors, states, and your college may each send funds to the
          school’s billing office, which then applies them to tuition, fees,
          room, board, or other allowed costs—depending on policy. The order
          matters: some grants reduce loans first; others reduce institutional
          aid.
        </p>
        <ul>
          <li>Ask: Is this scholarship sent to the school or to me directly?</li>
          <li>Ask: Does it renew automatically or require a new application yearly?</li>
          <li>Ask: Is it restricted to tuition, or can it cover other costs?</li>
        </ul>

        <h2>Rules and Limitations</h2>
        <p>
          Read each award letter for phrases like “not stackable,” “last dollar,”
          or “may adjust other aid.” Federal rules and school policy both cap
          total aid relative to your cost of attendance. If you are close to
          the cap, a new scholarship might replace part of an existing grant
          rather than add on top—frustrating but normal.
        </p>
        <p>
          Keep a simple table: scholarship name, amount, restrictions, and who
          to email with questions. Update it whenever a new offer arrives.
        </p>

        <h2>Private vs University Scholarships</h2>
        <p>
          Outside scholarships often arrive with their own rules; university
          scholarships may be tuned to enrollment goals or need. Your financial
          aid office reconciles both. Bring them a list of outside awards early
          so they can show you a projected package before you accept loans you
          might not need.
        </p>

        <h2>How to Maximize Funding</h2>
        <p>
          Apply to a mix of awards with different eligibility angles—merit,
          major-specific, local, and employer-based—so you are not competing for
          the same single pot. Strong organization helps: follow the timeline in{' '}
          <Link href={hrefDeadlines} className={resourceGuideLinkClassName}>
            Scholarship Deadlines Explained
          </Link>{' '}
          and reuse polished materials from{' '}
          <Link href={hrefApply} className={resourceGuideLinkClassName}>
            How to Apply for Scholarships
          </Link>{' '}
          so you can hit more deadlines without rushing.
        </p>

        <h2>Things to Watch Out For</h2>
        <ul>
          <li>
            Tax reporting: some awards have reporting implications—ask the
            provider or a tax pro when amounts are large.
          </li>
          <li>
            Refund timing: overpayment may become a credit or refund; know your
            school’s schedule.
          </li>
          <li>
            Renewal rules: losing one scholarship next year can change stacking
            more than you expect—plan renewals in the same tracker you use for{' '}
            <Link href={hrefDeadlines} className={resourceGuideLinkClassName}>
              deadlines
            </Link>
            .
          </li>
        </ul>
      </>
    </ResourceGuideShell>
  );
}
