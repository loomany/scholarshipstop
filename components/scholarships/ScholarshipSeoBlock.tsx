'use client';

import type { LongTailSlug } from '@/app/scholarships/scholarshipLongTailPresets';

const SEO_BLOCKS: Partial<
  Record<LongTailSlug, { title: string; items: string[] }>
> = {
  'no-essay': {
    title: 'Why choose no essay scholarships?',
    items: [
      'Faster applications',
      'No writing required',
      'Ideal for quick submissions'
    ]
  },
  'closing-soon': {
    title: 'Why apply to closing soon scholarships?',
    items: [
      'Less competition',
      'Urgent opportunities',
      'Quick decisions'
    ]
  },
  'under-5000': {
    title: 'Benefits of smaller scholarships',
    items: [
      'Easier to qualify',
      'More available options',
      'Quick financial support'
    ]
  },
  undergraduate: {
    title: 'Why browse undergraduate scholarships?',
    items: [
      'Built for college-level study',
      'Stack awards across semesters',
      'Compare deadlines in one place'
    ]
  },
  'international-students': {
    title: 'Why explore international-friendly awards?',
    items: [
      'Programs that name global eligibility',
      'Clearer path than generic lists',
      'Official links for each listing'
    ]
  },
  'high-school': {
    title: 'Why look for high school scholarships?',
    items: [
      'Start funding before college',
      'Awards aimed at younger students',
      'Plan ahead for senior year'
    ]
  },
  engineering: {
    title: 'Why focus on engineering scholarships?',
    items: [
      'Field-aligned opportunities',
      'Strong overlap with STEM funding',
      'Filter-friendly browsing in one view'
    ]
  },
  'computer-science': {
    title: 'Why browse computer science scholarships?',
    items: [
      'CS and software-related awards together',
      'Easier to match your major path',
      'Explore and apply from official pages'
    ]
  },
  'under-10000': {
    title: 'Benefits of mid-size awards',
    items: [
      'Meaningful support per semester',
      'Broader pool than tiny grants alone',
      'Compare amounts side by side'
    ]
  }
};

export function ScholarshipSeoBlock({ slug }: { slug: LongTailSlug }) {
  const block = SEO_BLOCKS[slug];
  if (!block) return null;

  return (
    <div className="rounded-lg border border-slate-200/70 bg-slate-50/60 px-3 py-3 text-sm text-slate-700 shadow-none">
      <h2 className="text-base font-semibold text-zinc-900">{block.title}</h2>
      <ul className="mt-2 list-disc space-y-1 pl-4 leading-relaxed">
        {block.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
