import type { Metadata } from 'next';
import Link from 'next/link';

import ResourceGuideShell from '@/components/content-hub/resourceGuides/ResourceGuideShell';
import { resourceGuideLinkClassName } from '@/lib/content-hub/resourceGuidePages';
import { resourceGuideHref } from '@/lib/scholarships/resourceGuideRoutes';
import { buildStage2EnglishPilotAlternates } from '@/lib/i18n/englishAlternates';
import { getCanonical } from '@/lib/seo/canonical';
import { DEFAULT_OPEN_GRAPH_IMAGES } from '@/lib/seo/socialImage';

const hrefApply = resourceGuideHref('how-to-apply-for-scholarships');
const hrefCombine = resourceGuideHref('combine-multiple-scholarships');
const canonical = getCanonical('/resources/scholarship-deadlines-explained');

export const metadata: Metadata = {
  title: "Scholarship Deadlines Explained: Don't Miss Your Chance",
  description:
    'Learn how scholarship deadlines really work—fixed vs rolling dates, when to start, how to track them, and habits so you do not miss important scholarship opportunities.',
  alternates: buildStage2EnglishPilotAlternates(
    '/resources/scholarship-deadlines-explained'
  ),
  openGraph: {
    title: "Scholarship Deadlines Explained: Don't Miss Your Chance",
    description:
      'Learn how scholarship deadlines really work—fixed vs rolling dates, when to start, how to track them, and habits so you do not miss important scholarship opportunities.',
    url: canonical,
    images: DEFAULT_OPEN_GRAPH_IMAGES
  }
};

export default function ScholarshipDeadlinesExplainedPage() {
  return (
    <ResourceGuideShell
      title="Scholarship Deadlines Explained"
      subtitle="Deadlines look simple until you mix postmarks, time zones, and rolling reviews. Here is a straight read on what “due” really means, when to start, and how to stay ahead without living in your inbox."
      faq={[
        {
          question: 'Can I apply after a deadline?',
          answer:
            'Usually no for fixed deadlines—late submissions are often auto-rejected. Rolling programs may stay open until funds run out, but that is not the same as “late is fine.” If you miss one, note the date for next year and move on to the next open award.'
        },
        {
          question: 'Are scholarship deadlines flexible?',
          answer:
            'Rarely. Some schools bundle aid deadlines with admission; a few portals allow grace for technical issues if you contact support immediately. Never assume flexibility—treat the published date as hard unless an officer tells you otherwise in writing.'
        }
      ]}
      endReading={[
        {
          href: hrefApply,
          title: 'How to Apply for Scholarships',
          blurb: 'practical steps to organize your application process'
        },
        {
          href: hrefCombine,
          title: 'Can You Combine Multiple Scholarships?',
          blurb: 'understand how stacking scholarships works in real life'
        }
      ]}
    >
      <>
        <p>
          Scholarship deadlines are not all the same beast. Some are hard stops
          at midnight local time. Others are “rolling,” meaning reviewers read
          applications as they arrive until money runs out. Knowing which type
          you are facing changes how aggressively you need to move.
        </p>

        <h2>Types of Deadlines</h2>
        <p>
          <strong>Fixed deadlines</strong> close on a set date and time. Miss
          them and you are out until the next cycle. <strong>Rolling</strong>{' '}
          deadlines reward early birds—waiting can mean fewer funds left.{' '}
          <strong>Priority deadlines</strong> (common for institutional aid)
          give better consideration if you apply by a first date, even if a
          later date still exists.
        </p>
        <ul>
          <li>Confirm the time zone on the official rules page.</li>
          <li>
            Check whether “received by” means submitted online or postmarked.
          </li>
          <li>Note if recommendations must arrive by the same cutoff.</li>
        </ul>

        <h2>When to Start Applying</h2>
        <p>
          Start earlier than feels comfortable—especially for essays and
          letters. A practical rhythm: map deadlines at least six weeks out,
          then work backward for drafts and recommenders. If you are also
          applying to college, align scholarship tasks with your{' '}
          <Link href={hrefApply} className={resourceGuideLinkClassName}>
            main application plan
          </Link>{' '}
          so you are not writing twelve unique essays in one weekend.
        </p>

        <h2>How to Track Deadlines</h2>
        <p>
          One calendar, one spreadsheet, or one notes doc—pick a system you will
          actually open. For each scholarship, log: name, portal link, due date
          and time, required materials, and status (not started / in progress /
          submitted). Set reminders three days and one day before the cutoff.
        </p>
        <p>
          If you use your phone calendar, add the scholarship name to the event
          title so you are not staring at “deadline” with no context at 10 p.m.
        </p>

        <h2>What Happens If You Miss a Deadline</h2>
        <p>
          Do not panic-spam the committee. For a true fixed deadline, shift your
          energy to the next open program. If the portal glitched, screenshot
          the error and email support the same night—polite, specific, with a
          timestamp. Some rolling awards may still accept you if funding
          remains; fixed awards usually will not.
        </p>

        <h2>Pro Tips</h2>
        <ul>
          <li>
            Batch similar applications on the same day so your brain stays in
            one “voice.”
          </li>
          <li>
            Pre-write a 150-word bio and a 250-word challenge story you can trim
            to fit prompts.
          </li>
          <li>
            Before you hit submit, skim our{' '}
            <Link href={hrefApply} className={resourceGuideLinkClassName}>
              how to apply for scholarships
            </Link>{' '}
            checklist—small fixes catch big mistakes.
          </li>
          <li>
            If you stack awards, confirm how each deadline interacts with school
            disbursement—see{' '}
            <Link href={hrefCombine} className={resourceGuideLinkClassName}>
              combining multiple scholarships
            </Link>
            .
          </li>
        </ul>
      </>
    </ResourceGuideShell>
  );
}
