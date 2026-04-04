export type SubjectCategoryNeedleRule = {
  needles: string[];
  l2: string;
  priority: number;
};

export type SubjectCategoryMapFile = {
  version: number;
  fallbackL2Slug: string;
  seoSubjectTagToL2: Record<string, string>;
  legacyUiCategoryIdToL2: Record<string, string>;
  /** Strong signals from title only (priorities usually 8–14). */
  titleKeywordRules?: SubjectCategoryNeedleRule[];
  fieldOfStudyRules: SubjectCategoryNeedleRule[];
  keywordRules: SubjectCategoryNeedleRule[];
};

export type SubjectCategoryAssignmentSource =
  | 'title_keyword'
  | 'field_of_study'
  | 'keyword'
  | 'seo_subject_tag'
  | 'legacy_category_slug'
  | 'fallback';
