import type { Scholarship } from '@/app/scholarships/scholarshipsData';

export type ProviderFaqItem = { question: string; answer: string };

export type SimilarProviderSummary = {
  slug: string;
  displayName: string;
  scholarshipCount: number;
};

export type ProviderProfilePayload = {
  providerId: string | null;
  slug: string;
  displayName: string;
  /** USPS state code when known (US HQ), from `providers.state`. */
  hqState: string | null;
  officialUrl: string | null;
  aiDescription: string | null;
  aiSources: string[];
  aiFaq: ProviderFaqItem[];
  isEnriched: boolean;
  totalScholarshipCount: number;
  totalAwardAmount: number | null;
  knownAwardAmountCount: number;
  lastUpdatedAt: string | null;
  scholarships: Scholarship[];
  similarProviders: SimilarProviderSummary[];
};
