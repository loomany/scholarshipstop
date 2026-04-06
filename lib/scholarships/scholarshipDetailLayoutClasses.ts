/**
 * Presentation-only tokens for `/scholarships/[slug]` detail pages.
 * Layout is a single centered column (`scholarshipDetailShellClass`); no sidebar.
 */

export const scholarshipDetailPageBgClass =
  'min-h-screen bg-zinc-50 text-zinc-900 antialiased';

/**
 * Single-column detail shell: centered, no sidebar column.
 * `max-w-6xl` (~72rem) reads well for long grant pages without edge-to-edge blur.
 */
export const scholarshipDetailShellClass =
  'mx-auto w-full max-w-6xl min-w-0';

/**
 * Top hero: title, badges, intro only. Save / Not relevant / Apply live in the
 * Official source trust card (`ScholarshipDetailPageClient`), not in the hero.
 */
export const scholarshipDetailHeroSurfaceClass =
  'rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.1)] ring-1 ring-zinc-100/80 sm:p-6 md:p-8';

/** Primary factual blocks (eligibility, quick facts, award, requirements, etc.). */
export const scholarshipDetailCardPrimaryClass =
  'rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm ring-1 ring-zinc-100/50 sm:p-6 md:p-8';

/** Denser primary card (quick facts grid). */
export const scholarshipDetailCardCompactClass =
  'rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm ring-1 ring-zinc-100/50 sm:p-5';

/** Supporting / narrative sections (overview, provider shell). */
export const scholarshipDetailCardSupportClass =
  'rounded-2xl border border-zinc-200/70 bg-zinc-50/40 p-5 shadow-sm ring-1 ring-zinc-100/40 sm:p-6 md:p-8';

/** Official source / trust emphasis (Apply + Save + Not relevant row). */
export const scholarshipDetailCardTrustClass =
  'rounded-2xl border border-zinc-300/70 bg-white p-5 shadow-md ring-1 ring-zinc-200/60 sm:p-6 md:p-8';
