import 'server-only';

import { cache } from 'react';

import {
  fetchAllPublishedContentPostsListFields,
  type ContentPostListFields
} from '@/lib/content-hub/contentPostsServer';
import {
  fetchLatestPublishedEssayHubList,
  type EssayListFields
} from '@/lib/essays/essaysServer';

const DEFAULT_LIMIT = 3;
const ESSAY_POOL_LIMIT = 180;

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'at',
  'by',
  'for',
  'from',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
  'vs',
  'with',
  'university',
  'universities',
  'college',
  'colleges',
  'school',
  'schools',
  'state',
  'student',
  'students',
  'scholarship',
  'scholarships',
  'grant',
  'grants',
  'comparison',
  'compare'
]);

const RESOURCE_TOPIC_RE =
  /scholarship|financial aid|grant|deadline|essay|compare|vs|difference|application|merit|need|student|tuition|college|university/i;

const ESSAY_TOPIC_RE =
  /essay|personal statement|prompt|writing|brainstorm|outline|draft|revise|revision|story|leadership|why us|goals|career/i;

function timeMs(iso: string | null | undefined): number {
  if (!iso?.trim()) return 0;
  const ts = new Date(iso).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function normalizeText(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function stripHtml(raw: string): string {
  return raw.replace(/<[^>]+>/g, ' ');
}

function tokenize(raw: string): string[] {
  return normalizeText(raw)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function buildKeywordContext(input: {
  instAName: string;
  instBName: string;
  stateA?: string | null;
  stateB?: string | null;
  pageTitle?: string | null;
  aiVerdict?: string | null;
  bodyHtml?: string | null;
  essayTextA?: string | null;
  essayTextB?: string | null;
}) {
  const phrases = unique(
    [
      input.instAName,
      input.instBName,
      input.stateA ?? '',
      input.stateB ?? '',
      input.pageTitle ?? ''
    ]
      .map((value) => normalizeText(value))
      .filter(Boolean)
  );

  const topicSource = [
    input.instAName,
    input.instBName,
    input.stateA ?? '',
    input.stateB ?? '',
    input.pageTitle ?? '',
    input.aiVerdict ?? '',
    stripHtml(input.bodyHtml ?? ''),
    input.essayTextA ?? '',
    input.essayTextB ?? ''
  ].join(' ');

  const tokens = unique(tokenize(topicSource)).slice(0, 28);
  return { phrases, tokens };
}

function countTokenHits(bundle: string, tokens: string[]): number {
  let hits = 0;
  for (const token of tokens) {
    if (bundle.includes(token)) hits += 1;
  }
  return hits;
}

function countPhraseHits(bundle: string, phrases: string[]): number {
  let hits = 0;
  for (const phrase of phrases) {
    if (phrase && bundle.includes(phrase)) hits += 1;
  }
  return hits;
}

const fetchResourcePool = cache(async (): Promise<ContentPostListFields[]> => {
  return fetchAllPublishedContentPostsListFields();
});

const fetchEssayPool = cache(async (): Promise<EssayListFields[]> => {
  return fetchLatestPublishedEssayHubList(ESSAY_POOL_LIMIT);
});

export async function fetchCompareRelatedContent(input: {
  instAName: string;
  instBName: string;
  stateA?: string | null;
  stateB?: string | null;
  pageTitle?: string | null;
  aiVerdict?: string | null;
  bodyHtml?: string | null;
  essayTextA?: string | null;
  essayTextB?: string | null;
  limit?: number;
}): Promise<{
  resources: ContentPostListFields[];
  essays: EssayListFields[];
}> {
  const limit = Math.max(1, Math.min(6, Math.floor(input.limit ?? DEFAULT_LIMIT)));
  const keywords = buildKeywordContext(input);
  const [resourcePool, essayPool] = await Promise.all([
    fetchResourcePool(),
    fetchEssayPool()
  ]);

  const scoredResources = resourcePool
    .filter((row) => row.slug?.trim())
    .map((row) => {
      const bundle = normalizeText(
        `${row.title ?? ''} ${row.meta_description ?? ''} ${row.slug ?? ''}`
      );
      const phraseHits = countPhraseHits(bundle, keywords.phrases);
      const tokenHits = countTokenHits(bundle, keywords.tokens);
      let score = timeMs(row.published_at) / 1e14;
      if (RESOURCE_TOPIC_RE.test(bundle)) score += 7;
      if (/how to|guide|checklist|tips|difference|compare|vs\b|financial aid/i.test(bundle)) {
        score += 5;
      }
      score += phraseHits * 9;
      score += tokenHits * 1.35;
      return { row, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.row);

  const scoredEssays = essayPool
    .filter((row) => row.slug?.trim())
    .map((row) => {
      const bundle = normalizeText(`${row.title ?? ''} ${row.meta_description ?? ''}`);
      const phraseHits = countPhraseHits(bundle, keywords.phrases);
      const tokenHits = countTokenHits(bundle, keywords.tokens);
      let score = timeMs(row.created_at) / 1e14;
      if (ESSAY_TOPIC_RE.test(bundle)) score += 10;
      if (/how to|essay|outline|draft|prompt|personal statement/i.test(bundle)) {
        score += 6;
      }
      score += phraseHits * 6;
      score += tokenHits * 1.5;
      return { row, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.row);

  return {
    resources: scoredResources,
    essays: scoredEssays
  };
}
