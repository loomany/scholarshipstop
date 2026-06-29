import type { Metadata } from 'next';
import Link from 'next/link';

import ResourceGuideShell from '@/components/content-hub/resourceGuides/ResourceGuideShell';
import { resourceGuideLinkClassName } from '@/lib/content-hub/resourceGuidePages';
import { buildStage2EnglishPilotAlternates } from '@/lib/i18n/englishAlternates';
import { getCanonical } from '@/lib/seo/canonical';
import { DEFAULT_OPEN_GRAPH_IMAGES } from '@/lib/seo/socialImage';

const hrefInternationalHub = '/scholarships/hub/international-friendly';
const hrefMatches = '/scholarships/hub/matches';
const hrefEasyApply = '/scholarships/hub/easy-apply';
const hrefEssays = '/essays';
const hrefApplyGuide = '/resources/how-to-apply-for-scholarships';
const hrefDeadlines = '/resources/scholarship-deadlines-explained';
const canonical = getCanonical(
  '/resources/scholarships-for-international-students-guide'
);

export const metadata: Metadata = {
  title: 'Scholarships for International Students: Practical Guide',
  description:
    'A practical guide for international students looking for scholarships: eligibility checks, documents, essays, deadlines, and how to use international-friendly listings.',
  alternates: buildStage2EnglishPilotAlternates(
    '/resources/scholarships-for-international-students-guide'
  ),
  openGraph: {
    title: 'Scholarships for International Students: Practical Guide',
    description:
      'A practical guide for international students looking for scholarships: eligibility checks, documents, essays, deadlines, and how to use international-friendly listings.',
    url: canonical,
    images: DEFAULT_OPEN_GRAPH_IMAGES
  }
};

export default function ScholarshipsForInternationalStudentsGuidePage() {
  return (
    <ResourceGuideShell
      title="Scholarships for International Students"
      subtitle="International students can find scholarships, but the search is different: citizenship rules, visa status, school eligibility, document timing, and funding restrictions matter. This guide helps you read those details before you spend hours on the wrong application."
      faq={[
        {
          question: 'Can international students apply for U.S. scholarships?',
          answer:
            'Yes, some scholarships are open to international students, non-U.S. citizens, or students studying in the United States on a visa. Others are limited to U.S. citizens or permanent residents. The phrase international-friendly means an opportunity may be worth reviewing, not that every international student will qualify. Always confirm the official eligibility rules before applying.'
        },
        {
          question: 'What should international students check first?',
          answer:
            'Start with citizenship or residency rules, visa or enrollment requirements, eligible schools, field of study, school level, location, GPA, and whether funds can be paid to your institution. Also check whether the provider requires FAFSA information, a Social Security number, or U.S. tax documents. Those requirements can affect whether an otherwise promising scholarship is realistic.'
        },
        {
          question:
            'Do international scholarship applications require different essays?',
          answer:
            'The essay should still answer the prompt, but international students often need to explain context clearly: educational background, goals, why the program fits, and how funding changes what is possible. Avoid turning every essay into a visa story unless the prompt asks for it. Focus on fit, preparation, and the contribution you hope to make.'
        }
      ]}
      endReading={[
        {
          href: hrefInternationalHub,
          title: 'International-Friendly Scholarships',
          blurb:
            'review scholarship listings that may be relevant for international applicants'
        },
        {
          href: hrefEssays,
          title: 'Scholarship Essay Guides',
          blurb:
            'shape essays about goals, background, leadership, and study plans'
        },
        {
          href: hrefDeadlines,
          title: 'Scholarship Deadlines Explained',
          blurb:
            'plan around time zones, document requests, and school deadlines'
        }
      ]}
    >
      <>
        <p>
          Searching for scholarships as an international student can feel like
          reading fine print for a living. A scholarship title may sound open,
          but the rules may limit applicants by citizenship, permanent
          residency, school location, visa status, state, major, or financial
          aid form. The goal is not to apply everywhere. The goal is to identify
          the awards where your status and profile actually fit, then spend your
          writing time on those instead of chasing every open-looking form.
        </p>
        <p>
          Use this guide to understand the decision points, then browse the{' '}
          <Link
            href={hrefInternationalHub}
            className={resourceGuideLinkClassName}
          >
            international-friendly scholarships hub
          </Link>{' '}
          when you want current listings to review. ScholarshipTop can help you
          compare options, but the final eligibility call always comes from the
          provider's official rules.
        </p>

        <h2>Understand what international-friendly means</h2>
        <p>
          International-friendly does not mean guaranteed. It means the
          scholarship may be relevant to students who are not U.S. citizens or
          permanent residents, or to students with international backgrounds.
          Some providers explicitly welcome international applicants. Others
          allow any student enrolled at an eligible school. Some are silent and
          require a closer read.
        </p>
        <p>
          Watch for phrases such as U.S. citizens only, permanent residents
          only, eligible noncitizens, open to all enrolled students, visa
          holders may apply, or must be eligible for federal aid. These details
          matter more than the title. A broad scholarship for college students
          may still exclude you if it requires FAFSA eligibility or a U.S.
          Social Security number.
        </p>

        <h2>Start with school-based funding</h2>
        <p>
          For many international students, the best funding options start with
          the college or university. Admissions scholarships, departmental
          awards, honors programs, graduate assistantships, and international
          student grants may be more realistic than outside awards. Your school
          already knows your enrollment status, program, and cost of attendance,
          which can make eligibility easier to verify.
        </p>
        <p>
          Check the international admissions page, financial aid office,
          department site, graduate school funding page, and scholarship portal.
          If you are comparing schools, ask each one direct questions: Are
          international students considered for merit aid? Are awards renewable?
          Is need-based aid available? Are separate scholarship applications
          required after admission?
        </p>

        <h2>Separate admission aid from outside scholarships</h2>
        <p>
          International students often hear the word scholarship used for very
          different kinds of money. Admission merit aid is usually decided by
          the school. Department awards may depend on your major or academic
          record. Graduate assistantships may involve work. Outside scholarships
          may come from a foundation, employer, government, nonprofit, or
          private sponsor. Each type has different timing and rules.
        </p>
        <p>
          Keep these categories separate in your notes. If a school says you
          received a merit award, ask whether it renews and what GPA or
          enrollment status you must keep. If an outside provider offers money,
          ask whether it is paid to you or to the school. That one detail can
          affect billing, documentation, and whether the award fits your student
          account.
        </p>

        <h2>Use outside scholarships carefully</h2>
        <p>
          Outside scholarships can still be useful, especially those connected
          to your field, country, region, employer, foundation, professional
          association, or community. The challenge is that many outside awards
          are written for domestic applicants by default. Before writing an
          essay, confirm that the scholarship accepts your citizenship or visa
          situation.
        </p>
        <p>
          Build a quick screening habit. Read eligibility first, not the
          inspirational introduction. Look for citizenship, residency, school
          location, program level, eligible majors, award payment rules, and tax
          or identification requirements. If the rules are unclear and the award
          is a strong fit, contact the provider with a short, specific question
          before applying.
        </p>

        <h2>Check payment rules before you count the money</h2>
        <p>
          A scholarship can look perfect and still be hard to use if the payment
          rules do not match your situation. Some providers pay only U.S.
          institutions. Some require domestic tax forms, a mailing address, a
          school certification, or proof of enrollment before funds are
          released. Others reimburse expenses after you pay them yourself.
        </p>
        <p>
          Before treating an award as part of your budget, find out how the
          money is disbursed, when it arrives, and what documents the provider
          needs. If the rules mention tax reporting or identity verification,
          ask questions early. This is especially important if a deadline falls
          near a tuition due date or visa documentation deadline.
        </p>

        <h2>Documents to prepare before deadlines get close</h2>
        <p>
          International students often need more lead time for documents. You
          may need translated transcripts, credential evaluations, proof of
          enrollment, passport or visa details, test scores, recommendation
          letters, financial statements, or school-issued cost information. Some
          scholarships also ask for a resume, activity list, or essay about your
          academic and career goals.
        </p>
        <p>
          Save clean copies in one folder and track which documents are official
          versus unofficial. If a provider asks for official transcripts, do not
          assume a screenshot or student portal download is enough. If a
          document must come from your school, request it early. The{' '}
          <Link href={hrefDeadlines} className={resourceGuideLinkClassName}>
            scholarship deadlines guide
          </Link>{' '}
          can help you work backward from the due date.
        </p>

        <h2>How to write essays with enough context</h2>
        <p>
          Scholarship readers may not know your school system, grading scale,
          country context, or the path that brought you to your program. Your
          essay can explain that context without becoming a biography. Choose
          details that help the reviewer understand your preparation, your
          goals, and why the scholarship fits.
        </p>
        <p>
          Avoid generic lines about wanting to study abroad or needing financial
          help. Instead, connect your academic plan to evidence: coursework,
          research, service, leadership, work experience, family responsibility,
          community problems you want to address, or a career goal that depends
          on the education you are pursuing. If you need help shaping a prompt,
          start with the{' '}
          <Link href={hrefEssays} className={resourceGuideLinkClassName}>
            scholarship essay guides
          </Link>
          .
        </p>

        <h2>Balance broad searches with specific filters</h2>
        <p>
          A broad search can help you learn the landscape, but broad searches
          also create noise. Once you understand the common requirements, narrow
          by school level, major, country or region, location where you study,
          GPA, deadline, and application effort. If you are already enrolled in
          the U.S., include awards tied to your college or state when the rules
          allow international applicants.
        </p>
        <p>
          Start with{' '}
          <Link
            href={hrefInternationalHub}
            className={resourceGuideLinkClassName}
          >
            international-friendly listings
          </Link>
          , then broaden to{' '}
          <Link href={hrefMatches} className={resourceGuideLinkClassName}>
            scholarship matches
          </Link>{' '}
          if your profile has other strong signals such as STEM, healthcare,
          community service, leadership, arts, disability, first-generation
          status, or a specific state or school connection.
        </p>

        <h2>Be careful with no-essay and easy applications</h2>
        <p>
          Quick applications can be useful, but international students should be
          extra careful with eligibility. A short form may still require U.S.
          residency, a domestic mailing address, or payment to an eligible U.S.
          institution. Do not treat no-essay as no-rules. Read the provider page
          before sharing personal information.
        </p>
        <p>
          If you want lower-effort opportunities, use the{' '}
          <Link href={hrefEasyApply} className={resourceGuideLinkClassName}>
            easy apply scholarships hub
          </Link>{' '}
          as one part of your search, not the whole strategy. Pair simpler
          applications with targeted awards where your background, major, or
          school fit is much stronger.
        </p>

        <h2>Questions to ask before you submit</h2>
        <p>
          Before spending hours on an application, ask practical questions. Can
          international students apply? Does the scholarship require federal aid
          eligibility? Can the award be paid to my school? Is my visa or
          enrollment type accepted? Are foreign transcripts allowed? Does the
          provider require a U.S. tax form, address, or bank account? The answer
          to one of these questions can change your priority list.
        </p>
        <p>
          If you email a provider, keep it short. Include the scholarship name,
          your enrollment status, and the exact requirement you want clarified.
          Save the reply with your application notes. Written confirmation helps
          you avoid guessing and gives you a record if the portal instructions
          are vague.
        </p>

        <h2>A practical weekly search routine</h2>
        <p>
          Once a week, add new scholarships to your tracker, remove expired
          awards, and choose two or three realistic applications to advance.
          Label each one as school-based, outside, field-specific,
          country-specific, or broad. This prevents one giant list from becoming
          impossible to manage.
        </p>
        <p>
          For each scholarship, track the provider URL, deadline, eligibility
          notes, documents, essay prompt, recommendation status, and submission
          confirmation. The broader workflow in{' '}
          <Link href={hrefApplyGuide} className={resourceGuideLinkClassName}>
            how to apply for scholarships
          </Link>{' '}
          is useful, but international applicants should add a separate column
          for citizenship, visa, or enrollment restrictions.
        </p>

        <h2>Useful internal links</h2>
        <ul>
          <li>
            Browse{' '}
            <Link
              href={hrefInternationalHub}
              className={resourceGuideLinkClassName}
            >
              international-friendly scholarships
            </Link>{' '}
            when you are ready to compare listings.
          </li>
          <li>
            Use{' '}
            <Link href={hrefEssays} className={resourceGuideLinkClassName}>
              scholarship essay guides
            </Link>{' '}
            for prompts about goals, background, leadership, and study plans.
          </li>
          <li>
            Review{' '}
            <Link href={hrefDeadlines} className={resourceGuideLinkClassName}>
              scholarship deadlines
            </Link>{' '}
            before requesting transcripts, translations, or recommendations.
          </li>
          <li>
            Compare broader{' '}
            <Link href={hrefMatches} className={resourceGuideLinkClassName}>
              scholarship matches
            </Link>{' '}
            if your field, school level, or location gives you additional
            angles.
          </li>
        </ul>
      </>
    </ResourceGuideShell>
  );
}
