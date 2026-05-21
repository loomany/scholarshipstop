/** Stage 2 extension: public static non-DB pages (beyond original 26-path pilot). */
export const STAGE2_EXTENDED_STATIC_PATHS = [
  '/essays/outline',
  '/essays/leadership',
  '/essays/why-do-you-deserve-this-scholarship',
  '/essays/personal-statement',
  '/essays/stem',
  '/essays/no-essay-scholarships',
  '/resources/how-to-find-scholarships',
  '/resources/how-to-apply-for-scholarships-checklist',
  '/resources/no-essay-scholarships-guide',
  '/resources/easy-scholarships-guide',
  '/resources/stem-scholarships-guide',
  '/resources/scholarships-in-usa-for-international-students',
  '/resources/scholarships-for-high-school-seniors',
  '/resources/scholarship-eligibility-explained',
  '/resources/scholarship-documents-checklist',
  '/resources/how-to-apply-for-scholarships',
  '/resources/scholarship-deadlines-explained',
  '/resources/combine-multiple-scholarships',
  '/resources/medical-scholarships-guide',
  '/resources/scholarships-for-international-students-guide',
  '/terms',
  '/privacy-policy',
  '/refund-policy',
  '/help',
  '/faq',
  '/international-students',
  '/for-organizations',
  '/submit-grant'
] as const;

export type Stage2ExtendedStaticPath =
  (typeof STAGE2_EXTENDED_STATIC_PATHS)[number];
