/**
 * Shared canonical shape for SEO payloads across generators, fix scripts, and audits.
 * Not yet enforced at call sites — import when wiring Step 3+.
 */

export type SeoPageType =
  | 'listing'
  | 'scholarship'
  | 'provider'
  | 'essay'
  | 'article'
  | 'compare';

export type SeoFaqItem = { question: string; answer: string };

export type SeoPayload = {
  type: SeoPageType;
  url: string;
  title: string;
  metaDescription: string;
  h1?: string;
  faq?: SeoFaqItem[];
  overview?: string;
  eligibility?: string;
  internalLinks?: string[];
  canonical?: string;
  indexable?: boolean;
};

export function assertSeoPayloadShape(p: SeoPayload): void {
  if (!p.type) throw new Error('SeoPayload.type is required');
  if (!p.url?.trim()) throw new Error('SeoPayload.url is required');
  if (typeof p.title !== 'string') throw new Error('SeoPayload.title must be a string');
  if (typeof p.metaDescription !== 'string') {
    throw new Error('SeoPayload.metaDescription must be a string');
  }
}
