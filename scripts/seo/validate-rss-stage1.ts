import {
  buildCategoriesRssItems,
  buildCompareRssItems,
  buildEssaysRssItems,
  buildMasterRssItems,
  buildResourcesRssItems
} from '../../lib/rss/stage1Feeds';
import {
  RSS_CONTENT_TYPE,
  RSS_MIME_TYPE,
  SITE_ORIGIN,
  isAllowedRssUrl,
  normalizeRssDate,
  renderRssFeed,
  type RssItem
} from '../../lib/rss/rssXml';

type FeedSpec = {
  path: string;
  title: string;
  description: string;
  build: () => Promise<RssItem[]> | RssItem[];
};

type FeedValidationResult = {
  path: string;
  itemCount: number;
  xmlBytes: number;
  errors: string[];
};

type LiveValidationResult = {
  url: string;
  status: number;
  contentType: string | null;
  itemCount: number;
  hasRssRoot: boolean;
  contentTypeOk: boolean;
  errors: string[];
};

const FEEDS: FeedSpec[] = [
  {
    path: '/rss.xml',
    title: 'ScholarshipTop RSS',
    description:
      'Curated ScholarshipTop resources, essay guides, comparison guides, and scholarship category pages for students planning applications.',
    build: buildMasterRssItems
  },
  {
    path: '/rss/resources.xml',
    title: 'ScholarshipTop Resources RSS',
    description:
      'ScholarshipTop guides and resources for scholarship search, application planning, deadlines, essays, and international student funding.',
    build: buildResourcesRssItems
  },
  {
    path: '/rss/essays.xml',
    title: 'ScholarshipTop Essay Guides RSS',
    description:
      'ScholarshipTop scholarship essay guides, examples, checklists, and prompt-specific writing support for stronger applications.',
    build: buildEssaysRssItems
  },
  {
    path: '/rss/compare.xml',
    title: 'ScholarshipTop Comparison Guides RSS',
    description:
      'ScholarshipTop comparison guides for scholarships, grants, award types, and application planning decisions.',
    build: buildCompareRssItems
  },
  {
    path: '/rss/categories.xml',
    title: 'ScholarshipTop Scholarship Categories RSS',
    description:
      'ScholarshipTop category pages for STEM, education, medical, arts, law, community, and other scholarship fields.',
    build: buildCategoriesRssItems
  }
];

function textBetweenAll(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'g');
  return [...xml.matchAll(re)].map((match) => match[1] ?? '');
}

function validateItems(items: RssItem[]): string[] {
  const errors: string[] = [];
  const links = new Set<string>();
  const guids = new Set<string>();

  for (const item of items) {
    const title = item.title.trim();
    const description = item.description.trim();
    const guid = item.guid?.trim() || item.link.trim();
    if (!title) errors.push(`Missing title for ${item.link}`);
    if (!description) errors.push(`Missing description for ${item.link}`);
    if (!guid) errors.push(`Missing guid for ${item.link}`);
    if (!isAllowedRssUrl(item.link)) errors.push(`Disallowed URL: ${item.link}`);
    if (!normalizeRssDate(item.pubDate)) errors.push(`Invalid pubDate: ${item.link}`);
    if (links.has(item.link)) errors.push(`Duplicate link: ${item.link}`);
    if (guids.has(guid)) errors.push(`Duplicate guid: ${guid}`);
    links.add(item.link);
    guids.add(guid);
  }

  return errors;
}

async function validateFeed(spec: FeedSpec): Promise<FeedValidationResult> {
  const items = await spec.build();
  const errors = validateItems(items);
  const xml = renderRssFeed({
    title: spec.title,
    description: spec.description,
    link: SITE_ORIGIN,
    feedUrl: `${SITE_ORIGIN}${spec.path}`,
    items
  });

  if (!xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('XML declaration missing');
  }
  if (!xml.includes('<rss version="2.0"')) errors.push('RSS root missing');
  if (!xml.includes('<channel>')) errors.push('RSS channel missing');
  const xmlItemCount = (xml.match(/<item>/g) ?? []).length;
  if (xmlItemCount !== items.length) {
    errors.push(`XML item count ${xmlItemCount} does not match builder count ${items.length}`);
  }
  for (const tag of ['title', 'link', 'description', 'pubDate', 'guid']) {
    const count = textBetweenAll(xml, tag).length;
    if (count < items.length) errors.push(`XML is missing item ${tag} values`);
  }
  if (/localhost|127\.0\.0\.1|staging|preview/i.test(xml)) {
    errors.push('XML contains disallowed local/staging/preview text');
  }

  return {
    path: spec.path,
    itemCount: items.length,
    xmlBytes: Buffer.byteLength(xml, 'utf8'),
    errors
  };
}

async function validateLive(baseUrl: string): Promise<LiveValidationResult[]> {
  const out: LiveValidationResult[] = [];
  for (const spec of FEEDS) {
    const url = `${baseUrl.replace(/\/+$/, '')}${spec.path}`;
    const res = await fetch(url, {
      headers: { 'user-agent': 'ScholarshipTopRSSStage1Validator/1.0' }
    });
    const text = await res.text();
    const contentType = res.headers.get('content-type');
    const itemCount = (text.match(/<item>/g) ?? []).length;
    const hasRssRoot = text.includes('<rss version="2.0"');
    const normalizedContentType = contentType?.toLowerCase() ?? '';
    const contentTypeOk =
      normalizedContentType.includes(RSS_CONTENT_TYPE) ||
      normalizedContentType.includes(RSS_MIME_TYPE);
    const errors: string[] = [];
    if (res.status !== 200) errors.push(`Expected 200, got ${res.status}`);
    if (!contentTypeOk) errors.push(`Unexpected content-type: ${contentType}`);
    if (!hasRssRoot) errors.push('RSS root missing from live response');
    if (itemCount === 0) errors.push('Live response has no RSS items');
    out.push({
      url,
      status: res.status,
      contentType,
      itemCount,
      hasRssRoot,
      contentTypeOk,
      errors
    });
  }
  return out;
}

async function main() {
  const results = await Promise.all(FEEDS.map(validateFeed));
  const liveArg = process.argv.find((arg) => arg.startsWith('--base-url='));
  const live = liveArg
    ? await validateLive(liveArg.slice('--base-url='.length))
    : undefined;
  const errors = results.flatMap((result) =>
    result.errors.map((error) => `${result.path}: ${error}`)
  );
  if (live) {
    errors.push(
      ...live.flatMap((result) =>
        result.errors.map((error) => `${result.url}: ${error}`)
      )
    );
  }

  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), results, live }, null, 2));
  if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
