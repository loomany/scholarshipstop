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
  officialUrl: string | null;
  aiDescription: string | null;
  aiSources: string[];
  aiFaq: ProviderFaqItem[];
  isEnriched: boolean;
  totalScholarshipCount: number;
  scholarships: Scholarship[];
  similarProviders: SimilarProviderSummary[];
};
