import 'server-only';

import { loadPremedTopicContextRecords } from './loadStaticEnrichment';
import type { PremedTopicContext } from './types';

let byTopicKeyCache: Map<string, PremedTopicContext> | null = null;
let byNormalizedTopicCache: Map<string, PremedTopicContext> | null = null;
let byTargetCache: Map<string, PremedTopicContext> | null = null;

function normalizeSlug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase()
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeTopic(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function targetKeys(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  const noQuery = trimmed.split(/[?#]/)[0] ?? trimmed;
  const parts = noQuery.split('/').filter(Boolean);
  const leaf = parts[parts.length - 1] ?? noQuery;
  return [
    noQuery.toLowerCase(),
    `/${noQuery.replace(/^\/+/, '').toLowerCase()}`,
    normalizeSlug(leaf),
    normalizeSlug(noQuery)
  ].filter(Boolean);
}

function ensureIndexes(): void {
  if (byTopicKeyCache && byNormalizedTopicCache && byTargetCache) return;

  byTopicKeyCache = new Map();
  byNormalizedTopicCache = new Map();
  byTargetCache = new Map();

  for (const row of loadPremedTopicContextRecords()) {
    byTopicKeyCache.set(row.topic_key.toLowerCase(), row);
    byNormalizedTopicCache.set(normalizeTopic(row.topic), row);

    for (const target of row.page_targets ?? []) {
      for (const key of targetKeys(target)) {
        if (!byTargetCache.has(key)) byTargetCache.set(key, row);
      }
    }
  }
}

export function getPremedTopicContext(
  topicOrSlug: string | null | undefined
): PremedTopicContext | null {
  const raw = topicOrSlug?.trim();
  if (!raw) return null;

  ensureIndexes();

  const lower = raw.toLowerCase();
  const slug = normalizeSlug(raw);
  const topic = normalizeTopic(raw);
  return (
    byTopicKeyCache!.get(lower) ??
    byTopicKeyCache!.get(slug) ??
    byTargetCache!.get(lower) ??
    byTargetCache!.get(slug) ??
    byNormalizedTopicCache!.get(topic) ??
    null
  );
}
