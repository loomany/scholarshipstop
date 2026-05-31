import { SITE_BRAND } from '@/lib/seo/siteTitle';
import { getURL } from '@/utils/helpers';

export const SCHEMA_ORG_CONTEXT = 'https://schema.org';

export type JsonLdBreadcrumbItem = {
  name: string;
  /** Site path (with or without leading slash) or absolute URL. */
  path: string;
};

export type JsonLdFaqItem = {
  question: string;
  answer: string;
};

export type JsonLdListItem = {
  name: string;
  url: string;
};

export type JsonLdArticleInput = {
  url: string;
  headline: string;
  description: string;
  datePublished?: string | null;
  dateModified?: string | null;
  imageUrls?: string[];
  /** Defaults to BlogPosting for resource articles; pass `Article` for essay guides. */
  type?: 'Article' | 'BlogPosting';
  about?: { name: string; url: string };
};

export type JsonLdOrganizationInput = {
  name: string;
  url: string;
  description?: string | null;
  sameAs?: string[];
};

export type JsonLdEducationalOrganizationInput = JsonLdOrganizationInput & {
  addressLocality?: string | null;
  addressRegion?: string | null;
};

export type JsonLdItemListInput = {
  name: string;
  description?: string | null;
  url: string;
  items: JsonLdListItem[];
};

export type JsonLdWebPageInput = {
  name: string;
  url: string;
  description?: string | null;
  dateModified?: string | null;
};

function absoluteUrl(pathOrUrl: string): string {
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return getURL();
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/+$/, '') || trimmed;
  return getURL(trimmed.replace(/^\/+/, ''));
}

/** Remove null/undefined and empty nested objects before serializing JSON-LD. */
export function pruneJsonLd<T extends Record<string, unknown>>(value: T): T {
  const result: Record<string, unknown> = {};

  for (const [key, raw] of Object.entries(value)) {
    if (raw == null) continue;
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (!trimmed || trimmed === 'undefined' || trimmed === 'null' || trimmed === 'NaN') {
        continue;
      }
      result[key] = trimmed;
      continue;
    }
    if (Array.isArray(raw)) {
      const next = raw
        .map((item) =>
          item != null && typeof item === 'object' && !Array.isArray(item)
            ? pruneJsonLd(item as Record<string, unknown>)
            : item
        )
        .filter((item) => item != null && item !== '');
      if (next.length === 0) continue;
      result[key] = next;
      continue;
    }
    if (typeof raw === 'object') {
      const next = pruneJsonLd(raw as Record<string, unknown>);
      if (Object.keys(next).length === 0) continue;
      result[key] = next;
      continue;
    }
    result[key] = raw;
  }

  return result as T;
}

export function buildBreadcrumbListJsonLd(
  items: JsonLdBreadcrumbItem[]
): Record<string, unknown> | null {
  const visible = items.filter((item) => item.name.trim() && item.path.trim());
  if (visible.length === 0) return null;

  return pruneJsonLd({
    '@context': SCHEMA_ORG_CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: visible.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name.trim(),
      item: absoluteUrl(item.path)
    }))
  });
}

export function buildWebPageJsonLd(input: JsonLdWebPageInput): Record<string, unknown> {
  return pruneJsonLd({
    '@context': SCHEMA_ORG_CONTEXT,
    '@type': 'WebPage',
    name: input.name.trim(),
    url: absoluteUrl(input.url),
    description: input.description?.trim() || undefined,
    dateModified: input.dateModified?.trim() || undefined
  });
}

export function buildArticleJsonLd(input: JsonLdArticleInput): Record<string, unknown> | null {
  const headline = input.headline.trim();
  const description = input.description.trim();
  const url = absoluteUrl(input.url);
  if (!headline || !description || !url) return null;

  const siteUrl = getURL().replace(/\/+$/, '');
  const orgId = `${siteUrl}#organization`;
  const type = input.type ?? 'BlogPosting';

  return pruneJsonLd({
    '@context': SCHEMA_ORG_CONTEXT,
    '@type': type,
    mainEntityOfPage: url,
    headline,
    description,
    url,
    datePublished: input.datePublished?.trim() || undefined,
    dateModified: input.dateModified?.trim() || input.datePublished?.trim() || undefined,
    ...(input.imageUrls?.length ? { image: input.imageUrls.map((u) => u.trim()).filter(Boolean) } : {}),
    author: {
      '@type': 'Organization',
      '@id': orgId,
      name: SITE_BRAND,
      url: siteUrl
    },
    publisher: {
      '@type': 'Organization',
      '@id': orgId,
      name: SITE_BRAND,
      url: siteUrl
    },
    ...(input.about
      ? {
          about: {
            '@type': 'Thing',
            name: input.about.name.trim(),
            url: absoluteUrl(input.about.url)
          }
        }
      : {})
  });
}

export function buildFaqPageJsonLd(
  items: JsonLdFaqItem[],
  url?: string | null
): Record<string, unknown> | null {
  const mainEntity = items
    .filter((item) => item.question.trim() && item.answer.trim())
    .map((item) => ({
      '@type': 'Question',
      name: item.question.trim(),
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer.trim()
      }
    }));

  if (mainEntity.length === 0) return null;

  return pruneJsonLd({
    '@context': SCHEMA_ORG_CONTEXT,
    '@type': 'FAQPage',
    ...(url?.trim() ? { url: absoluteUrl(url) } : {}),
    mainEntity
  });
}

export function buildOrganizationJsonLd(
  input: JsonLdOrganizationInput
): Record<string, unknown> | null {
  const name = input.name.trim();
  const url = absoluteUrl(input.url);
  if (!name || !url) return null;

  const sameAs = (input.sameAs ?? []).map((href) => href.trim()).filter(Boolean);

  return pruneJsonLd({
    '@context': SCHEMA_ORG_CONTEXT,
    '@type': 'Organization',
    name,
    url,
    mainEntityOfPage: url,
    description: input.description?.trim() || undefined,
    ...(sameAs.length ? { sameAs } : {})
  });
}

export function buildEducationalOrganizationJsonLd(
  input: JsonLdEducationalOrganizationInput
): Record<string, unknown> | null {
  const base = buildOrganizationJsonLd(input);
  if (!base) return null;

  const locality = input.addressLocality?.trim();
  const region = input.addressRegion?.trim();

  return pruneJsonLd({
    ...base,
    '@type': 'EducationalOrganization',
    ...(locality || region
      ? {
          address: pruneJsonLd({
            '@type': 'PostalAddress',
            ...(locality ? { addressLocality: locality } : {}),
            ...(region ? { addressRegion: region } : {})
          })
        }
      : {})
  });
}

export function buildItemListJsonLd(
  input: JsonLdItemListInput
): Record<string, unknown> | null {
  const name = input.name.trim();
  const url = absoluteUrl(input.url);
  const items = input.items.filter((item) => item.name.trim() && item.url.trim());
  if (!name || !url || items.length === 0) return null;

  return pruneJsonLd({
    '@context': SCHEMA_ORG_CONTEXT,
    '@type': 'ItemList',
    name,
    description: input.description?.trim() || undefined,
    url,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name.trim(),
      url: absoluteUrl(item.url)
    }))
  });
}

export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(pruneJsonLd(data));
}

function walkJsonLd(value: unknown, issues: string[], path = '$'): void {
  if (value == null) {
    issues.push(`${path}: null/undefined value`);
    return;
  }
  if (Array.isArray(value)) {
    if (value.length === 0 && path.endsWith('itemListElement')) {
      issues.push(`${path}: empty itemListElement`);
    }
    value.forEach((item, index) => walkJsonLd(item, issues, `${path}[${index}]`));
    return;
  }
  if (typeof value !== 'object') {
    if (typeof value === 'string' && (!value.trim() || value === 'undefined' || value === 'null')) {
      issues.push(`${path}: invalid string ${JSON.stringify(value)}`);
    }
    return;
  }

  const record = value as Record<string, unknown>;
  for (const [key, nested] of Object.entries(record)) {
    walkJsonLd(nested, issues, `${path}.${key}`);
  }
}

/** Lightweight shape checks for local validation scripts. */
export function validateJsonLdShape(data: Record<string, unknown>): string[] {
  const issues: string[] = [];

  if (!data['@context']) {
    issues.push('missing @context');
  }
  if (!data['@type'] && !data['@graph']) {
    issues.push('missing @type/@graph');
  }

  if (Array.isArray(data['@graph'])) {
    data['@graph'].forEach((node, index) => {
      if (node && typeof node === 'object') {
        const typed = node as Record<string, unknown>;
        if (!typed['@type']) {
          issues.push(`@graph[${index}]: missing @type`);
        }
      }
      walkJsonLd(node, issues, `@graph[${index}]`);
    });
  } else {
    walkJsonLd(data, issues, '$');
  }

  const urlFields = ['url', 'mainEntityOfPage'] as const;
  for (const field of urlFields) {
    const raw = data[field];
    if (typeof raw === 'string' && !/^https?:\/\//i.test(raw.trim())) {
      issues.push(`${field}: expected absolute URL`);
    }
  }

  return issues;
}
