/** Auto-generated from i18n-stage5e-scholarship-detail-next-candidates-2026-05-23.csv */

/** Scale-up batch 6 */
export const SCHOLARSHIP_SCALEUP_BATCH_1_SLUGS = [
  'tryon-riding-hunt-club-scholarship-54xbrwgayvcn',
  'women-who-dared-scholarship-2rz0itorqhmf',
  'polk-county-community-foundation-special-scholarships-1tszfieevnqw',
  'marjorie-s-community-scholarship-12qbkh4suyyz',
  'margery-w-bain-franklin-scholarship-0wf0oqfbztbo',
  'thomas-a-quinn-do-osteopathic-scholarship-d2dmabryqdg0',
  'deborah-e-trautman-future-nurse-leader-scholarship-cclcsl8prwdo',
  'mn-international-association-of-special-investigation-units-police-scien-p2qjquhseofe',
  'aacn2-pathway-to-critical-care-nursing-scholarship-lmr1yd8ybsgy',
  'pagels-engineering-scholarship-6shes9oyugcg',
] as const;

/** Scale-up batch 7 */
export const SCHOLARSHIP_SCALEUP_BATCH_2_SLUGS = [
  'bob-baunhauser-scholarship-lex0fvrnp3g1',
  'nophnrcse-scholarship-wcrzwxuql1vs',
  'martha-guerra-arteaga-scholarship-pkds7jravfsy',
  'we-communications-scholarship-hem6qmsfqifj',
  'neachmm-student-scholarship-mf4k4nfoy3qm',
  'account-spark-stem-scholarship-ckmq8fzocdl3',
  'neachmm-family-scholarship-cxncpcusw6br',
  'union-plus-scholarship-kl6bevrgell6',
  'women-s-health-advocacy-scholarship-kucfahbc6ptd',
  '70th-infantry-division-association-ellis-family-education-scholarship-1fnufdyrvzxe',
] as const;

/** Scale-up batch 8 */
export const SCHOLARSHIP_SCALEUP_BATCH_3_SLUGS = [
  'wisconsin-chapter-american-public-works-association-scholarship-pza6vgg6vyd2',
  'at-t-the-network-bicp-lewis-latimer-scholarship-8d2h7dyqz4wg',
  'm-moo-young-biochemical-engineering-at-university-of-waterloo-2026-m-mooyoung-biochemical-engineeri',
  'lynn-cope-conroy-graduate-scholarship-for-women-in-science-at-university-lynn-cope-conroy-graduate-schola',
  'international-bright-futures-scholarship-at-london-metropolitan-universi-london-metropolitan-university-i',
  'iet-india-scholarship-award-2026-iet-india-scholarship-award',
  'donald-j-clough-memorial-award-at-university-of-waterloo-2026-donald-j-clough-memorial-award-a',
  'donald-geraldine-beam-award-at-university-of-waterloo-2026-donald-geraldine-beam-award-at-u',
  'dimarco-graduate-scholarship-in-computational-rhetoric-at-university-of--dimarco-graduate-scholarship-in-',
  'desmond-fonn-contact-lens-research-award-at-university-of-waterloo-2026-desmond-fonn-contact-lens-resear',
] as const;

/** Scale-up batch 9 */
export const SCHOLARSHIP_SCALEUP_BATCH_4_SLUGS = [
  'fox-family-scholarship-vjp0ku0i0p3u',
  'bryce-boothby-family-scholarship-v7egm4ie3lrr',
  'beulah-short-memorial-scholarship-twk88byvy8vt',
  'all-god-s-children-community-choir-scholarship-ti2tbeqyxz4o',
  'st-joseph-class-of-1970-scholarship-shp7u6tqojhr',
  'leslie-g-ames-scholarship-sbpkkttbwz0t',
  'sophia-l-waldbauer-scholarship-re1saboedceh',
  'marion-and-dan-crossman-scholarship-r793gryit7ju',
  'bob-emerson-scholarship-p45kwpnol7xb',
  'david-paul-petro-scholarship-n7p16jh8a37f',
] as const;

/** Scale-up batch 10 */
export const SCHOLARSHIP_SCALEUP_BATCH_5_SLUGS = [
  'justin-jubbs-kosak-memorial-award-mlrpaseo8kts',
  'howard-d-merchant-memorial-scholarship-mh15pxeog1xm',
  'coach-u-scholarship-lb3sv3w5kwxs',
  'drews-scholarship-kylpi7q8yzyi',
  'felland-scholarship-kf8qwdjabwfv',
  'amsterdam-merit-scholarship-ams-2026',
  'porritt-family-memorial-scholarship-for-curious-kids-kcqags8b8yr8',
  'jon-and-chenai-gillispie-trades-scholarship-kcnuh3jlh5uh',
  'dunn-scholarship-jxkrszsgjczc',
  'zonta-club-of-flint-i-scholarship-iik0yshl43yy',
] as const;

export const SCHOLARSHIP_SCALEUP_BATCH_V2_SLUGS = [
  ...SCHOLARSHIP_SCALEUP_BATCH_1_SLUGS,
  ...SCHOLARSHIP_SCALEUP_BATCH_2_SLUGS,
  ...SCHOLARSHIP_SCALEUP_BATCH_3_SLUGS,
  ...SCHOLARSHIP_SCALEUP_BATCH_4_SLUGS,
  ...SCHOLARSHIP_SCALEUP_BATCH_5_SLUGS,
] as const;

export type ScholarshipScaleupBatchV2Id = 1 | 2 | 3 | 4 | 5;

/** @param batch Local index 1-5 maps to global batches 6-10 */
export function scaleupBatchSlugsV2(batch: ScholarshipScaleupBatchV2Id): readonly string[] {
  switch (batch) {
    case 1: return SCHOLARSHIP_SCALEUP_BATCH_1_SLUGS;
    case 2: return SCHOLARSHIP_SCALEUP_BATCH_2_SLUGS;
    case 3: return SCHOLARSHIP_SCALEUP_BATCH_3_SLUGS;
    case 4: return SCHOLARSHIP_SCALEUP_BATCH_4_SLUGS;
    case 5: return SCHOLARSHIP_SCALEUP_BATCH_5_SLUGS;
    default: return [];
  }
}

export function globalBatchNumber(v2: ScholarshipScaleupBatchV2Id): number {
  return v2 + 5;
}
