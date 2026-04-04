/**
 * L2 slugs seeded in migration `20260421130000_scholarship_subject_categories.sql`.
 * Keep in sync with `data/scholarship-subject-category-map.json` targets.
 */
export const SUBJECT_L2_SLUGS = [
  'engineering',
  'computer_science',
  'stem_general',
  'medicine',
  'nursing_allied_health',
  'biology_life_sciences',
  'public_health',
  'business_general',
  'finance_economics',
  'law_pre_law',
  'public_policy_government',
  'education_k12_higher',
  'visual_arts',
  'performing_arts_music',
  'media_design_communication',
  'humanities',
  'social_sciences',
  'agriculture_food',
  'environment_sustainability',
  'skilled_trades',
  'technical_vocational',
  'community_nonprofit',
  'protective_services',
  'sports_recreation',
  'hobbies_personal',
  'interdisciplinary',
  'open_subject'
] as const;

export type SubjectL2Slug = (typeof SUBJECT_L2_SLUGS)[number];

export const SUBJECT_L2_SLUG_SET: ReadonlySet<string> = new Set(SUBJECT_L2_SLUGS);

/** Fallback L2 when no subject signal matches — always show in browse UI, never treat as “error”. */
export const OPEN_SUBJECT_L2_SLUG: SubjectL2Slug = 'open_subject';

/** Short labels for L2 browse chips / filters (keep aligned with `categories.label` in DB). */
export const SUBJECT_L2_LABELS: Record<SubjectL2Slug, string> = {
  engineering: 'Engineering',
  computer_science: 'Computer science',
  stem_general: 'STEM (general)',
  medicine: 'Medicine & pre-med',
  nursing_allied_health: 'Nursing & allied health',
  biology_life_sciences: 'Biology & life sciences',
  public_health: 'Public health',
  business_general: 'Business',
  finance_economics: 'Finance & economics',
  law_pre_law: 'Law & pre-law',
  public_policy_government: 'Public policy & government',
  education_k12_higher: 'Education',
  visual_arts: 'Visual arts',
  performing_arts_music: 'Performing arts & music',
  media_design_communication: 'Media & communication',
  humanities: 'Humanities',
  social_sciences: 'Social sciences',
  agriculture_food: 'Agriculture & food',
  environment_sustainability: 'Environment & sustainability',
  skilled_trades: 'Skilled trades',
  technical_vocational: 'Technical & vocational',
  community_nonprofit: 'Community & nonprofit',
  protective_services: 'Public safety & service',
  sports_recreation: 'Sports & recreation',
  hobbies_personal: 'Hobbies & personal',
  interdisciplinary: 'Interdisciplinary',
  open_subject: 'General'
};
