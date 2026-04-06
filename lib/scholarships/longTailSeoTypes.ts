import type { SeoListingPageData } from '@/lib/scholarships/seoScholarshipPageData';

export type LongTailSeoBundle = {
  seo_title: string;
  seo_description: string;
  intro: string;
  h1?: string;
  supporting?: string;
  /** Optional paragraph before related links / mid-page (AI). */
  related_intro?: string;
  /** Bullet list (preferred) or legacy single paragraph. */
  how_to_use?: string | string[];
  who_for?: string | string[];
  faq?: { question: string; answer: string }[];
  page_data?: SeoListingPageData;
  /** Script-only: skip regeneration when fresh (ignored by page reader). */
  _meta?: {
    canonicalPath: string;
    generatedAt: string;
    promptVersion: string;
    scholarshipsCount: number;
    model?: string;
    /** Set by generate-seo-scholarship-ai.ts when body QA passes vs template fallback. */
    bodySource?: 'ai' | 'deterministic';
    /** Last OpenAI pass: full write vs light refresh (safe for ranked URLs). */
    generationMode?: 'rewrite' | 'enhance';
  };
};
