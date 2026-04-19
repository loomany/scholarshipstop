import type { Metadata } from 'next';
import Link from 'next/link';

import ScholarshipCatalogEntryLink from '@/components/scholarships/ScholarshipCatalogEntryLink';
import ResourceGuideShell from '@/components/content-hub/resourceGuides/ResourceGuideShell';
import { resourceGuideLinkClassName } from '@/lib/content-hub/resourceGuidePages';
import { resourceGuideHref } from '@/lib/scholarships/resourceGuideRoutes';

const hrefDeadlines = resourceGuideHref('scholarship-deadlines-explained');
const hrefCombine = resourceGuideHref('combine-multiple-scholarships');

export const metadata: Metadata = {
  title: 'How to Apply for Scholarships in 2026',
  description:
    'Step-by-step guide on how to apply for scholarships: where to look, what to prepare, mistakes to skip, and tips to submit stronger applications and improve your odds of funding.',
  alternates: {
    canonical: '/resources/how-to-apply-for-scholarships'
  },
  openGraph: {
    title: 'How to Apply for Scholarships in 2026',
    description:
      'Step-by-step guide on how to apply for scholarships: where to look, what to prepare, mistakes to skip, and tips to submit stronger applications and improve your odds of funding.'
  }
};

export default function HowToApplyForScholarshipsPage() {
  return (
    <ResourceGuideShell
      title="How to Apply for Scholarships"
      subtitle="Scholarships reward preparation more than luck. This guide walks you through where to look, what to gather, and how to submit applications that actually get read—without burning out."
      faq={[
        {
          question: 'Do I need perfect grades?',
          answer:
            'No. Many scholarships care about fit, story, need, or activities—not a 4.0. Strong grades help for merit awards, but plenty of programs use broader criteria. Apply where you honestly match the requirements.'
        },
        {
          question: 'How many scholarships should I apply to?',
          answer:
            'Start with a small set you can do well—think quality over dozens of rushed forms. Add more once your materials are reusable. Tracking deadlines matters more than raw volume; see our guide on scholarship deadlines for a simple system.'
        }
      ]}
      endReading={[
        {
          href: hrefDeadlines,
          title: 'Scholarship Deadlines Explained',
          blurb:
            'simple ways to manage deadlines and avoid missed opportunities'
        },
        {
          href: hrefCombine,
          title: 'Can You Combine Multiple Scholarships?',
          blurb:
            'understand how stacking scholarships works in real life'
        }
      ]}
    >
      <>
        <p>
          Most students lose scholarships in the boring middle: missed fields,
          weak essays pasted from other apps, or applications sent at the last
          minute. Treat applying like a project—same calendar, same file folder,
          same checklist—and your odds go up fast.
        </p>

        <h2>Where to Find Scholarships</h2>
        <p>
          Start with your school’s financial aid office and any major portals
          your counselor recommends. Then add national databases and{' '}
          <ScholarshipCatalogEntryLink className={resourceGuideLinkClassName}>
            browse scholarships by subject and state
          </ScholarshipCatalogEntryLink>{' '}
          so you are not only chasing the same huge national prizes everyone
          sees. Local clubs, employers, and professional associations often run
          smaller awards with fewer applicants.
        </p>
        <ul>
          <li>Check eligibility before you spend time on the essay.</li>
          <li>Save links and deadlines in one place—you’ll thank yourself later.</li>
          <li>
            Mix “reach,” “match,” and “safety” awards so you are not all-or-nothing.
          </li>
        </ul>

        <h2>Prepare Your Documents</h2>
        <p>
          Most applications ask for the same building blocks: transcript, résumé
          or activity list, proof of enrollment, and sometimes financial
          information. Build a master folder (PDFs, named clearly) so you are
          not hunting files at 11 p.m. the night before a deadline.
        </p>
        <p>
          Ask for recommendation letters early—two weeks is polite, more is
          better. Give recommenders a short bullet list of your goals and which
          scholarships you are targeting so their letter fits the prompt.
        </p>

        <h2>How to Write a Strong Scholarship Essay</h2>
        <p>
          Read the prompt twice. Answer the exact question, not the essay you
          wish they had assigned. Open with a specific moment (a class, a job, a
          challenge), then connect it to your goals. Skip clichés like “ever
          since I was young I’ve wanted to help people” unless you immediately
          back them up with evidence.
        </p>
        <p>
          Revise for clarity: short sentences, one idea per paragraph, no fancy
          words you would not use out loud. If a word limit is tight, cut
          background before you cut the part that shows impact.
        </p>

        <h2>Common Mistakes to Avoid</h2>
        <ul>
          <li>Ignoring word counts or required attachments.</li>
          <li>
            Using the wrong school name or scholarship title—copy-paste errors
            tank trust fast.
          </li>
          <li>
            Missing deadlines because you confused “postmark by” with “submit
            online by.” Our{' '}
            <Link href={hrefDeadlines} className={resourceGuideLinkClassName}>
              scholarship deadlines guide
            </Link>{' '}
            breaks down the difference.
          </li>
          <li>Ghosting your recommender—send a polite reminder, not panic at midnight.</li>
        </ul>

        <h2>Tips to Increase Your Chances</h2>
        <p>
          Reuse a strong core essay, but tailor the first and last paragraphs to
          each program. Mention how their mission lines up with yours—judges
          notice real fit. After you submit, keep a simple log: date, portal,
          confirmation email. That log pairs well with deadline habits from{' '}
          <Link href={hrefDeadlines} className={resourceGuideLinkClassName}>
            Scholarship Deadlines Explained
          </Link>
          .
        </p>
        <p>
          If you win multiple awards, know the stacking rules before you accept.
          Our overview of{' '}
          <Link href={hrefCombine} className={resourceGuideLinkClassName}>
            combining multiple scholarships
          </Link>{' '}
          explains what to ask the financial aid office so you do not accidentally
          over-award.
        </p>
      </>
    </ResourceGuideShell>
  );
}
