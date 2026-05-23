/** Auto-generated from i18n-10hour-scholarship-detail-candidates-2026-05-22.csv */

export const SCHOLARSHIP_SCALEUP_BATCH_1_SLUGS = [
  'brace-family-graduate-scholarship-in-electrical-and-computer-engineering-brace-family-graduate-scholarshi',
  'bits-rmit-phd-program-2024-29',
  'al-alfi-foundation-sustainable-development-fellowship-at-the-american-un-al-alfi-foundation-sustainable-d',
  'academic-excellence-scholarship-at-hult-international-business-school-ma-academic-excellence-scholarship-',
  'dollar-sense-scholarship-edelmanfinancialengines',
  'wellington-women-lawyers-association-scholarships-at-victoria-university-wellington-women-lawyers-associa',
  'mckenzie-postdoctoral-fellowships-at-the-university-of-melbourne-2026-mckenzie-postdoctoral-fellowship',
  'fujitsu-cyber-security-services-scholarships-at-victoria-university-of-w-fujitsu-cyber-security-services-',
  'early-payment-discount-postgraduate-september-at-university-of-surrey-20-early-payment-discount-postgradu',
  'd-f-mckenzie-award-at-victoria-university-of-wellington-2026-27-df-mckenzie-award-at-victoria-un',
] as const;

export const SCHOLARSHIP_SCALEUP_BATCH_2_SLUGS = [
  'charles-s-humphrey-graduate-fellowship-in-chemistry-at-university-of-wat-charles-s-humphrey-graduate-fell',
  'deoliveira-drs-daniel-anabell-maximize-your-potential-scholarship-endowm-deoliveira-drs-daniel-anabell-ma',
  'alpert-lynn-and-fredric-distinguished-education-scholarship-at-umass-dar-alpert-lynn-and-fredric-distingu',
  'adaskin-ethel-edward-scholarship-at-university-of-massachusetts-dartmout-adaskin-ethel-edward-scholarship',
  'beiling-wu-prize-in-writing-at-northwestern-university-2026-beiling-wu-prize-in-writing',
  'uts-academic-excellence-international-scholarship-2026-postgraduate-academic-excellence',
  'apache-corporation-endowed-scholarship-at-the-american-university-in-cai-apache-corporation-endowed-schol',
  'stevens-frank-s-scholarship-at-university-of-massachusetts-dartmouth-202-stevens-frank-s-scholarship-at-u',
  'ualbany-book-grant-transfer-at-university-at-albany-2026-ualbany-book-grant-transfer-at-u',
  'la-trobe-access-scholarship-at-la-trobe-university-2026-la-trobe-access-scholarship',
] as const;

export const SCHOLARSHIP_SCALEUP_BATCH_3_SLUGS = [
  'david-nimmo-english-graduate-scholarship-at-university-of-waterloo-2026-david-nimmo-english-graduate-sch',
  'david-holden-memorial-scholarship-at-university-of-waterloo-2026-david-holden-memorial-scholarshi',
  'smu-merit-scholarship-programme-2026-smu-merit-scholarship-programme',
  'shirin-fozdar-scholarship-at-smu-2026-shirin-fozdar-scholarship',
  'ng-kai-wa-scholarship-at-singapore-management-university-2026-ng-kai-wa-scholarship',
  'sids-scholarships-in-water-and-sustainable-development-at-ihe-delft-29181',
  'jlfo-lim-hoon-foundation-scholarship-at-singapore-management-university--lim-hoon-foundation-scholarship',
  'school-of-law-liberty-scholarships-at-university-of-leeds-2026-university-of-leeds-liberty-scho',
  'mangoletsi-potts-scholarship-at-univrsity-of-leeds-2026-mangoletsipotts-scholarship-at-u',
  'global-governance-doctoral-fellowship-at-university-of-waterloo-2026-global-governance-doctoral-fello',
] as const;

export const SCHOLARSHIP_SCALEUP_BATCH_4_SLUGS = [
  'carolyn-b-hayes-business-administration-scholarship-at-lucas-college-of--linda-f-morasch-business-scholar',
  'sir-edmund-hillary-scholarship-at-university-of-waikato-2026-sir-edmund-hillary-scholarship',
  'ifk-research-fellowships-at-international-research-center-for-cultural-s-ifk-research-fellowships',
  'ggc-top-honors-scholarship-2026-ggc-top-honors-scholarship-in-us',
  'breakthrough-junior-challenge-breakthrough-junior-challenge',
  'forever-surrey-scholarship-at-university-of-surrey-2026-forever-surrey-scholarship-at-un',
  'university-of-new-south-wales-unsw-international-scholarships-2026-in-australia',
  'financial-empowerment-scholarship-financial-empowerment-scholarshi',
  'milestone-trial-lawher-scholarship-2026-2026-05-18-milestone-trial-lawhe',
  'de-suantio-bursary-at-singapore-management-university-2026-de-suantio-scholarship',
] as const;

export const SCHOLARSHIP_SCALEUP_BATCH_5_SLUGS = [
  'david-gerard-conroy-engineering-graduate-scholarship-at-university-of-wa-david-gerard-conroy-engineering-',
  'david-beltz-memorial-award-at-university-of-waterloo-2026-david-beltz-memorial-award-at-un',
  'dan-watt-scholarship-at-university-of-waterloo-2026-dan-watt-scholarship-at-universi',
  'scholarship-in-aesthetics-at-bard-college-berlin-2026',
  'd-a-sprott-entrance-award-at-university-of-waterloo-2026-da-sprott-entrance-award-at-univ',
  'aacap-educational-outreach-program-for-child-and-adolescent-residents-20-aacap-educational-outreach-progr',
  'harvard-university-mba-scholarship-2026-boustany-foundation-harvard-univ',
  'john-w-and-brigid-g-miller-law-school-scholarship-at-university-of-wisco-john-w-and-brigid-g-miller-law-s',
  'university-of-auckland-top-achiever-scholarship-2026-university-of-auckland-top-achie',
  'parents-learning-allowance-at-university-of-hull-2026-university-of-hull-parents-learn',
] as const;

export const SCHOLARSHIP_SCALEUP_BATCH_SLUGS = [
  ...SCHOLARSHIP_SCALEUP_BATCH_1_SLUGS,
  ...SCHOLARSHIP_SCALEUP_BATCH_2_SLUGS,
  ...SCHOLARSHIP_SCALEUP_BATCH_3_SLUGS,
  ...SCHOLARSHIP_SCALEUP_BATCH_4_SLUGS,
  ...SCHOLARSHIP_SCALEUP_BATCH_5_SLUGS,
] as const;

export type ScholarshipScaleupBatchId = 1 | 2 | 3 | 4 | 5;

export function scaleupBatchSlugs(batch: ScholarshipScaleupBatchId): readonly string[] {
  switch (batch) {
    case 1: return SCHOLARSHIP_SCALEUP_BATCH_1_SLUGS;
    case 2: return SCHOLARSHIP_SCALEUP_BATCH_2_SLUGS;
    case 3: return SCHOLARSHIP_SCALEUP_BATCH_3_SLUGS;
    case 4: return SCHOLARSHIP_SCALEUP_BATCH_4_SLUGS;
    case 5: return SCHOLARSHIP_SCALEUP_BATCH_5_SLUGS;
    default: return [];
  }
}
