/**
 * Presentation-only tokens for `/scholarships/[slug]` detail pages.
 * Layout is a single centered column (`scholarshipDetailShellClass`); no sidebar.
 */

export const scholarshipDetailPageBgClass =
  'min-h-screen bg-[#f7f8fb] text-zinc-900 antialiased';

/**
 * Single-column detail shell: centered, no sidebar column.
 * `max-w-6xl` (~72rem) reads well for long grant pages without edge-to-edge blur.
 */
export const scholarshipDetailShellClass = 'mx-auto w-full max-w-6xl min-w-0';

/**
 * Top hero: title, badges, intro only. Save / Not relevant / Apply live in the
 * Official source trust card (`ScholarshipDetailPageClient`), not in the hero.
 */
export const scholarshipDetailHeroSurfaceClass =
  'rounded-2xl border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] p-5 shadow-[0_22px_58px_-42px_rgba(15,23,42,0.72)] ring-1 ring-slate-100/80 sm:p-6 md:p-8';

/** Primary factual blocks (eligibility, quick facts, award, requirements, etc.). */
export const scholarshipDetailCardPrimaryClass =
  'rounded-2xl border border-slate-200/85 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] p-5 shadow-[0_16px_44px_-34px_rgba(15,23,42,0.65)] ring-1 ring-slate-100/70 sm:p-6 md:p-8';

/** Denser primary card (quick facts grid). */
export const scholarshipDetailCardCompactClass =
  'rounded-2xl border border-slate-200/85 bg-white p-4 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.65)] ring-1 ring-slate-100/70 sm:p-5';

/** Supporting / narrative sections (overview, provider shell). */
export const scholarshipDetailCardSupportClass =
  'rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_14px_38px_-32px_rgba(15,23,42,0.6)] ring-1 ring-slate-100/70 sm:p-6 md:p-8';

/** Official source / trust emphasis (Apply + Save + Not relevant row). */
export const scholarshipDetailCardTrustClass =
  'rounded-2xl border border-emerald-200/80 bg-white p-5 shadow-[0_18px_48px_-34px_rgba(15,23,42,0.72)] ring-1 ring-emerald-100/70 sm:p-6 md:p-8';
