export type ContentHubCategoryId =
  | 'guides'
  | 'applying'
  | 'scholarships'
  | 'grants'
  | 'finance';

export type ContentHubArticleSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type ContentHubArticle = {
  slug: string;
  title: string;
  category: ContentHubCategoryId;
  excerpt: string;
  /** ISO date YYYY-MM-DD */
  datePublished: string;
  readTimeMin: number;
  featured?: boolean;
  metaTitle: string;
  metaDescription: string;
  bodyIntro: string;
  sections: ContentHubArticleSection[];
  bodyOutro?: string;
};
