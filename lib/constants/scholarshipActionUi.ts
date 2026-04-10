/**
 * Listing / filter primary actions — same emerald family as Save on `ScholarshipCard`
 * (`bg-emerald-500` / `hover:bg-emerald-600` / saved `bg-emerald-600`).
 */
export const SCHOLARSHIP_ACTION_FILL =
  'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700';

export const SCHOLARSHIP_ACTION_FILL_PRESSED =
  'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800';

export const SCHOLARSHIP_ACTION_FOCUS_VISIBLE =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-0';

/** Save (not yet saved) — matches card default CTA. */
export const scholarshipSaveButtonClass = `w-full rounded-xl px-4 py-2 text-center text-sm font-medium text-white transition ${SCHOLARSHIP_ACTION_FILL} ${SCHOLARSHIP_ACTION_FOCUS_VISIBLE}`;

/** Save when already saved. */
export const scholarshipSavedButtonClass = `w-full rounded-xl px-4 py-2 text-center text-sm font-medium text-white transition ${SCHOLARSHIP_ACTION_FILL_PRESSED} ${SCHOLARSHIP_ACTION_FOCUS_VISIBLE}`;

/** Not relevant — same emerald treatment as Save on listing cards. */
export const scholarshipNotRelevantButtonClass = scholarshipSaveButtonClass;

/** More filters footer — size unchanged from product. */
export const scholarshipSeeResultsButtonClass = `rounded-xl px-5 py-3 text-sm font-bold text-white shadow-sm transition ${SCHOLARSHIP_ACTION_FILL} ${SCHOLARSHIP_ACTION_FOCUS_VISIBLE}`;

/** More filters — Save filter (brand orange, paired with green See results). */
const SAVE_FILTER_FILL =
  'bg-[#FF7A1A] hover:bg-[#E6670C] active:bg-[#CC5508] disabled:hover:bg-[#FF7A1A]';
const SAVE_FILTER_FOCUS =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB27D] focus-visible:ring-offset-0';

export const scholarshipSaveFilterButtonClass = `inline-flex min-h-[2.75rem] shrink-0 items-center justify-center rounded-xl px-5 py-3 text-sm font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${SAVE_FILTER_FILL} ${SAVE_FILTER_FOCUS}`;

/** Categories panel Apply — size unchanged. */
export const scholarshipCategoriesApplyButtonClass = `rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-sm transition ${SCHOLARSHIP_ACTION_FILL} ${SCHOLARSHIP_ACTION_FOCUS_VISIBLE}`;

/**
 * `/account` primary CTAs — same emerald tokens as listing Save; pill shape + flat fill
 * (profile section Save buttons).
 */
export const accountPagePrimaryButtonClass = `inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 disabled:pointer-events-none ${SCHOLARSHIP_ACTION_FILL} ${SCHOLARSHIP_ACTION_FOCUS_VISIBLE}`;

/** Hex for native controls (slider thumbs in `styles/main.css`). = Tailwind emerald-500 */
export const SCHOLARSHIP_ACTION_GREEN_HEX = '#10b981';

/**
 * Brand orange — same hex as NEW chip (`bg-[#FF7A1A]` on cards / sidebar).
 * Lucide uses `currentColor` for stroke; we set both `color` and `stroke` so parent
 * `text-gray-*` / `hover:text-*` on rows does not wash out the contour.
 */
export const SCHOLARSHIP_BRAND_ORANGE_HEX = '#FF7A1A';

export const scholarshipBrandOrangeStrokeClass =
  'text-[#FF7A1A] stroke-[#FF7A1A]';

/**
 * Guest lock icons (sort, Filters, Categories).
 * Sidebar locks/idle nav icons use the same hex inline in `ScholarshipsSidebar.tsx`
 * so Tailwind JIT always sees `text-[#FF7A1A]` (see `tailwind.config.js` `content` + lib).
 */
export const scholarshipGuestLockIconClass = scholarshipBrandOrangeStrokeClass;

/** Sidebar selected row — black bar + white stripe, matches “My scholarships” header. */
export const scholarshipSidebarActiveRowClass =
  'border-white bg-black text-white';

/** Form controls in scholarship listing filters (accent + readable check color). */
export const scholarshipFilterControlAccentClass =
  'accent-emerald-500 text-emerald-700';
