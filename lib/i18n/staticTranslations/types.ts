import type { TranslationStatus } from '@/lib/i18n/types';
import type { Stage2PilotLocale } from '@/lib/i18n/pilotRoutes';

export type LocalizedPilotPageBucket =
  | 'core'
  | 'essays'
  | 'compare'
  | 'resources';

export type LocalizedProseBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'ul'; items: string[] };

export type LocalizedPilotPageKind =
  | 'home'
  | 'hub'
  | 'trust'
  | 'essay'
  | 'compare'
  | 'resource'
  | 'resourceShell'
  | 'legal'
  | 'marketing';

export type LocalizedEndReadingLink = {
  href: string;
  title: string;
  blurb: string;
};

export type LocalizedPilotSection = {
  title: string;
  body: string;
  bullets?: string[];
};

export type LocalizedPilotCard = {
  title: string;
  body: string;
  href?: string;
};

export type LocalizedPilotFaq = {
  question: string;
  answer: string;
};

export type LocalizedPilotTable = {
  columns: [string, string, string];
  rows: Array<{ factor: string; left: string; right: string }>;
};

export type LocalizedPilotPage = {
  locale: Stage2PilotLocale;
  canonicalPath: string;
  localizedPath: string;
  bucket: LocalizedPilotPageBucket;
  kind: LocalizedPilotPageKind;
  status: Extract<TranslationStatus, 'published'>;
  qualityScore: number;
  title: string;
  metaDescription: string;
  h1: string;
  eyebrow: string;
  intro: string;
  oneSentence?: string;
  updatedAt: string;
  sections: LocalizedPilotSection[];
  cards?: LocalizedPilotCard[];
  checklist?: string[];
  doDont?: Array<{ do: string; dont: string }>;
  examples?: string[];
  table?: LocalizedPilotTable;
  chooseLeft?: string[];
  chooseRight?: string[];
  links: Array<{ href: string; label: string }>;
  faq: LocalizedPilotFaq[];
  disclaimer: string;
  subtitle?: string;
  proseBlocks?: LocalizedProseBlock[];
  endReading?: LocalizedEndReadingLink[];
  lastUpdatedLabel?: string;
};

export type PageDraft = Omit<
  LocalizedPilotPage,
  'locale' | 'canonicalPath' | 'localizedPath' | 'status' | 'qualityScore' | 'updatedAt'
>;
