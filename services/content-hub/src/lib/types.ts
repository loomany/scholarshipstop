import type { z } from "zod";
import type {
  anchorSuggestionSchema,
  articleSchema,
  faqItemSchema,
  internalLinkSchema,
  relatedArticleLinkSchema,
  scholarshipLinkSchema,
  scholarshipMatchHintsSchema,
  seoBriefSchema
} from "./validators.js";
import type { ArticleType, CompositionVariant, ImageStyle, IntroStyle, SelectedScene } from "./variation.js";

export type TopicStatus = "queued" | "processing" | "done" | "failed";
export type PostStatus = "draft" | "review_needed" | "published";

export interface ContentTopic {
  id: string;
  topic: string;
  status: TopicStatus;
  priority: number;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
  last_error: string | null;
  last_stage: string | null;
  failure_class: string | null;
  attempt_count: number;
  last_attempt_at: string | null;
}

export interface RelatedArticle {
  slug: string;
  title: string;
}

export type InternalLink = z.infer<typeof internalLinkSchema>;
export type RelatedArticleLink = z.infer<typeof relatedArticleLinkSchema>;
export type ScholarshipLink = z.infer<typeof scholarshipLinkSchema>;
export type ScholarshipMatchHints = z.infer<typeof scholarshipMatchHintsSchema>;
export type FaqItem = z.infer<typeof faqItemSchema>;
export type AnchorSuggestion = z.infer<typeof anchorSuggestionSchema>;
export type SeoBrief = z.infer<typeof seoBriefSchema>;
export type GeneratedArticle = z.infer<typeof articleSchema>;

export interface ArticleContext {
  scholarships: InternalLink[];
  faqPages: InternalLink[];
  relatedArticles: RelatedArticle[];
}

export interface ArticleGenerationOptions {
  articleType: ArticleType;
  introStyle: IntroStyle;
  allowExternalLinks?: boolean;
}

export interface ImageGenerationOptions {
  articleType: ArticleType;
  imageStyle: ImageStyle;
  scene: SelectedScene;
  composition: CompositionVariant;
}
