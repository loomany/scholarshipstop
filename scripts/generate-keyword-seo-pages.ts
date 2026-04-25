import fs from 'node:fs/promises';
import path from 'node:path';

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

import type { Database, Json } from '@/types_db';
import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import { isScholarshipUSA } from '@/app/scholarships/scholarshipCategories';
import {
  computeFilterBounds,
  scholarshipPassesMoreFilters
} from '@/app/scholarships/moreFilters';
import { scholarshipsInTab } from '@/app/scholarships/scholarshipTabs';
import type {
  SeoScholarshipRouteFiltersJson,
  SeoScholarshipRouteManifestEntry,
  SeoScholarshipRoutesManifest
} from '@/lib/scholarships/seoScholarshipManifest';
import type { LongTailSlug } from '@/app/scholarships/scholarshipLongTailPresets';
import {
  buildListingBaseFilter,
  buildMoreFiltersForManifestEntry,
  getScholarshipsMatchingManifestEntry
} from '@/lib/scholarships/seoScholarshipListing';
import { fetchActiveScholarshipsForScript } from '@/lib/scholarships/supabase';
import { resourcesArticlePath } from '@/lib/content-hub/resourcesSection';
import { addToIndexingQueue } from '@/lib/seo/googleIndexingQueue';

const DEFAULT_TOPICS_PATH = 'data/manual-essay-guides/international-students-topics.txt';
const MANIFEST_PATH = 'data/seo-scholarship-routes.json';
const SEO_CONTENT_DIR = 'data/seo-scholarship-content';
const MIN_LISTING_MATCHES = 4;
const PROMPT_VERSION = 'keyword-seo-v1';

type PageKind = 'scholarship_listing' | 'resource_article';

type KeywordTopic = {
  line: number;
  keyword: string;
  slug: string;
};

type ListingPlan = {
  kind: 'scholarship_listing';
  topic: KeywordTopic;
  entry: SeoScholarshipRouteManifestEntry;
  matches: Scholarship[];
};

type ResourcePlan = {
  kind: 'resource_article';
  topic: KeywordTopic;
  resourceType: 'guide' | 'comparison' | 'safety' | 'tool';
  relatedScholarships: Scholarship[];
};

type KeywordPlan = ListingPlan | ResourcePlan;

type SeoBundle = {
  seo_title: string;
  seo_description: string;
  h1: string;
  intro: string;
  supporting: string;
  related_intro: string;
  how_to_use: string[];
  who_for: string[];
  faq: { question: string; answer: string }[];
  _meta: {
    canonicalPath: string;
    generatedAt: string;
    promptVersion: string;
    scholarshipsCount: number;
    model?: string;
    bodySource: 'ai' | 'deterministic';
    generationMode: 'rewrite';
  };
};

type ResourcePayload = {
  title: string;
  meta_title: string;
  meta_description: string;
  body_html: string;
  faq: { question: string; answer: string }[];
};

function requiredEnv(name: string): string {
  const primary = process.env[name]?.trim();
  const value =
    primary ||
    (name === 'NEXT_PUBLIC_SUPABASE_URL'
      ? process.env.SUPABASE_URL?.trim()
      : undefined);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function optionalIntArg(name: string, fallback: number): number {
  const raw = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  const n = Number(raw?.slice(name.length + 3) ?? '');
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 160);
}

function sentenceCase(value: string): string {
  const s = value.trim();
  if (!s) return s;
  return `${s[0]!.toUpperCase()}${s.slice(1)}`;
}

function humanKeyword(keyword: string): string {
  return keyword
    .replace(/\busa\b/gi, 'USA')
    .replace(/\bf1\b/gi, 'F-1')
    .replace(/\bphd\b/gi, 'PhD')
    .replace(/\bmba\b/gi, 'MBA')
    .replace(/\bai\b/gi, 'AI')
    .replace(/\bgpa\b/gi, 'GPA')
    .replace(/\bssn\b/gi, 'SSN')
    .trim();
}

function parseTopics(raw: string, fromLine: number, toLine: number): KeywordTopic[] {
  const out: KeywordTopic[] = [];
  const seen = new Set<string>();
  const lines = raw.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = i + 1;
    if (line < fromLine || line > toLine) continue;
    const keyword = (lines[i] ?? '').trim().replace(/^\d+[.)]\s*/, '');
    if (!keyword || keyword.startsWith('#')) continue;
    const key = keyword.toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ line, keyword, slug: slugify(keyword) });
  }
  return out;
}

function filtersForKeyword(keyword: string): {
  legacyBaseSlugs: LongTailSlug[];
  filters: SeoScholarshipRouteFiltersJson;
} {
  const k = keyword.toLowerCase();
  const legacyBaseSlugs: LongTailSlug[] = ['international-students'];
  const filters: SeoScholarshipRouteFiltersJson = {};

  if (/no essay/.test(k)) legacyBaseSlugs.push('no-essay');
  if (/engineering/.test(k)) legacyBaseSlugs.push('engineering');
  if (/computer science|data science|cybersecurity|technology|tech /.test(k)) {
    legacyBaseSlugs.push('computer-science');
  }
  if (/nursing|medical|healthcare|public health/.test(k)) legacyBaseSlugs.push('nursing');
  if (/undergraduate/.test(k)) filters.includeEducationLevels = ['undergraduate'];
  if (/graduate|fellowship|fellowships|research grants/.test(k)) {
    filters.includeEducationLevels = Array.from(
      new Set([...(filters.includeEducationLevels ?? []), 'graduate'])
    );
  }
  if (/\bphd\b|doctoral/.test(k)) {
    filters.includeEducationLevels = Array.from(
      new Set([...(filters.includeEducationLevels ?? []), 'phd'])
    );
  }
  if (/financial need|need based/.test(k)) filters.includeEligibility = ['financial_need'];
  if (/women in stem|women/.test(k)) {
    filters.includeEligibility = Array.from(
      new Set([...(filters.includeEligibility ?? []), 'women'])
    );
  }
  if (/no gpa requirement/.test(k)) filters.includeGpaBuckets = ['no_gpa_requirement'];
  if (/last minute|august deadline|september deadline|october deadline|november deadline|december deadline|january deadline/.test(k)) {
    filters.deadlinePreset = 'w1_4';
  }
  return { legacyBaseSlugs: Array.from(new Set(legacyBaseSlugs)), filters };
}

function resourceTypeForKeyword(keyword: string): ResourcePlan['resourceType'] {
  const k = keyword.toLowerCase();
  if (/scam|legitimacy|verify/.test(k)) return 'safety';
  if (/ vs |alternatives|fastweb|scholarships\.com|search engine|sites|database|tools/.test(k)) {
    return 'comparison';
  }
  if (/track|checklist|interview|apply|find|how to|get scholarships|can |do /.test(k)) {
    return 'tool';
  }
  return 'guide';
}

function shouldBeResource(keyword: string): boolean {
  const k = keyword.toLowerCase();
  return (
    /^how to /.test(k) ||
    /scam|legitimacy|verify|taxable|affect f1|multiple scholarships/.test(k) ||
    /fastweb|scholarships\.com|alternatives|search engine|database|tools/.test(k) ||
    /application tips|interview tips|checklist|track scholarships|find scholarships/.test(k) ||
    /best way|best scholarship sites|best free/.test(k)
  );
}

function makeEntry(topic: KeywordTopic, countHint = 0): SeoScholarshipRouteManifestEntry {
  const { legacyBaseSlugs, filters } = filtersForKeyword(topic.keyword);
  const human = humanKeyword(topic.keyword);
  const title = sentenceCase(human);
  return {
    canonicalPath: topic.slug,
    seoId: `keyword:${topic.slug}`,
    pageKind: 'manifest',
    pageType: 'single',
    legacyBaseSlugs,
    ...(Object.keys(filters).length ? { filters } : {}),
    minCountSnapshot: countHint,
    scholarshipsCount: countHint,
    score: Math.min(100, 40 + countHint),
    indexable: countHint >= MIN_LISTING_MATCHES,
    source: 'manual',
    priorityBucket: countHint >= 10 ? 'high' : 'medium',
    manualLockedCopy: true,
    manualLockedIndexable: true,
    lastEvaluatedAt: new Date().toISOString(),
    qualityBucket: countHint >= MIN_LISTING_MATCHES ? 'GOOD' : 'THIN',
    reasonCodes: countHint >= MIN_LISTING_MATCHES ? ['good_route'] : ['thin_result_set'],
    h1Fallback: title,
    metaTitleFallback: `${title} | ScholarshipTop`,
    metaDescriptionFallback: `Browse ${human.toLowerCase()} in the USA. Compare deadlines, award amounts, eligibility, and official application links.`,
    notes: `Generated from keyword topic line ${topic.line}.`
  };
}

function firstTitles(matches: Scholarship[], limit = 5): string[] {
  return matches
    .slice(0, limit)
    .map((s) => s.title?.trim())
    .filter((x): x is string => Boolean(x));
}

function listingMatchesForEntry(
  catalog: Scholarship[],
  entry: SeoScholarshipRouteManifestEntry
): Scholarship[] {
  const usaAll = catalog.filter((s) => isScholarshipUSA(s.country));
  const matches = scholarshipsInTab(usaAll, 'matches', {
    saved: [],
    ignored: [],
    started: [],
    submitted: []
  });
  const baseFilter = buildListingBaseFilter({
    type: 'manifest',
    canonicalPath: entry.canonicalPath,
    entry
  });
  const baseMatches = baseFilter ? matches.filter(baseFilter) : matches;
  const bounds = computeFilterBounds(baseMatches);
  const moreFilters = buildMoreFiltersForManifestEntry(bounds, entry);
  return baseMatches.filter((s) => scholarshipPassesMoreFilters(s, moreFilters));
}

function deterministicSeoBundle(
  topic: KeywordTopic,
  entry: SeoScholarshipRouteManifestEntry,
  matches: Scholarship[]
): SeoBundle {
  const human = humanKeyword(topic.keyword);
  const title = sentenceCase(human);
  const count = matches.length;
  const examples = firstTitles(matches, 4);
  return {
    seo_title: `${title} | Updated Scholarship List`,
    seo_description: `Explore ${count} USA scholarship opportunities for ${human.toLowerCase()}. Compare award amounts, deadlines, and eligibility before applying.`,
    h1: title,
    intro: `This page brings together scholarship opportunities related to ${human.toLowerCase()} and keeps the live list tied to ScholarshipTop's current catalog. Use it to compare award amounts, deadlines, eligibility details, and official application links without jumping between generic search results.`,
    supporting: `Start with the strongest fit, then verify the final rules on the official scholarship page. International applicants should pay close attention to citizenship language, visa wording, school location, award payout rules, and document requirements. ${examples.length ? `Examples currently surfaced in this topic include ${examples.join(', ')}.` : ''}`,
    related_intro: `If this page is too narrow, widen your search to international student scholarships or combine the filters with deadline and award amount pages.`,
    how_to_use: [
      'Sort the live scholarship list by deadline or match strength',
      'Open each official listing before preparing documents',
      'Check citizenship, visa, GPA, and school-level requirements',
      'Save strong matches so you can return before the deadline',
      'Use the related scholarship guides for application strategy'
    ],
    who_for: [
      'International students comparing USA scholarship options',
      'Applicants who want a filtered list instead of generic search results',
      'Students checking deadlines, award amounts, and eligibility before applying'
    ],
    faq: [
      {
        question: `Who should use this ${human.toLowerCase()} page?`,
        answer:
          'Use it if the topic matches your status, degree level, field, or application constraint. The list is built from current ScholarshipTop catalog data, but final eligibility always comes from the official provider.'
      },
      {
        question: 'Do international students qualify for every scholarship listed here?',
        answer:
          'No. Some scholarships are international-friendly while others have narrower school, visa, location, or citizenship rules. Open the official page and confirm before applying.'
      },
      {
        question: 'How often should I check this list?',
        answer:
          'Check weekly during application season. New scholarships, changed deadlines, and updated award details can affect which opportunities are worth prioritizing.'
      }
    ],
    _meta: {
      canonicalPath: entry.canonicalPath,
      generatedAt: new Date().toISOString(),
      promptVersion: PROMPT_VERSION,
      scholarshipsCount: count,
      bodySource: 'deterministic',
      generationMode: 'rewrite'
    }
  };
}

function deterministicResourcePayload(
  plan: ResourcePlan
): ResourcePayload {
  const human = humanKeyword(plan.topic.keyword);
  const title = sentenceCase(human);
  const examples = firstTitles(plan.relatedScholarships, 4);
  const safety = plan.resourceType === 'safety';
  const comparison = plan.resourceType === 'comparison';
  const body = [
    `<p>${title} is a practical topic for international students because scholarship rules can vary by visa status, citizenship, school, deadline, and provider policy. This guide explains how to make a safer decision before you spend time on an application.</p>`,
    '<h2>Start with the real application requirement</h2>',
    '<p>Do not rely only on a search-result title or a copied scholarship list. Open the official provider page, find the eligibility section, and confirm who can apply, what documents are required, and whether international students are explicitly allowed.</p>',
    '<h2>Use ScholarshipTop as a shortlist, not the final authority</h2>',
    `<p>ScholarshipTop can help you discover relevant opportunities and compare deadlines quickly. ${examples.length ? `Current related examples include ${examples.join(', ')}.` : 'Use the scholarship catalog to find live opportunities related to this topic.'} Always verify the final details on the provider site.</p>`,
    comparison
      ? '<h2>Compare tools by coverage, freshness, and friction</h2><p>A useful scholarship tool should show clear deadlines, award amounts, eligibility signals, and official links. Be cautious with sites that hide source links, require unnecessary personal data, or keep expired listings live without clear labeling.</p>'
      : '<h2>Build a repeatable research checklist</h2><p>For each opportunity, track the provider name, official URL, deadline, award amount, required documents, essay prompts, citizenship wording, and whether you have already submitted the application.</p>',
    safety
      ? '<h2>Watch for scam signals</h2><p>Be careful with scholarships that ask for upfront fees, guarantee awards, request banking details too early, use a suspicious email domain, or pressure you to act immediately. Legitimate scholarships should have a verifiable organization and clear terms.</p>'
      : '<h2>Prioritize the applications with the best fit</h2><p>Strong fit usually matters more than applying everywhere. Focus first on scholarships where your background, field, school level, and story match the stated purpose of the award.</p>',
    '<h2>Next steps</h2><ul><li>Save promising scholarships in your account.</li><li>Check official eligibility before drafting essays.</li><li>Prepare reusable documents early.</li><li>Review deadlines every week until you submit.</li></ul>'
  ].join('\n');
  return {
    title,
    meta_title: `${title} | ScholarshipTop Guide`,
    meta_description: `A practical guide for international students: ${human.toLowerCase()}. Learn what to check, how to compare options, and how to avoid weak leads.`,
    body_html: body,
    faq: [
      {
        question: 'Can international students use this advice?',
        answer:
          'Yes. The guide is written for international students, but you should still confirm each scholarship’s official eligibility rules before applying.'
      },
      {
        question: 'Should I trust scholarship lists without official links?',
        answer:
          'Treat them as leads only. A reliable application decision should be based on the provider’s official page and current deadline.'
      },
      {
        question: 'What should I do after finding a promising scholarship?',
        answer:
          'Save the listing, verify the requirements, collect documents, and draft any essays early enough to revise before the deadline.'
      }
    ]
  };
}

async function openAiClient(): Promise<OpenAI | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

function parseJsonObject(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  const parsed = JSON.parse(cleaned) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('OpenAI response was not an object');
  }
  return parsed as Record<string, unknown>;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((x) => String(x).trim()).filter(Boolean).slice(0, 8);
}

function faqArray(value: unknown): { question: string; answer: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const question = typeof o.question === 'string' ? o.question.trim() : '';
      const answer = typeof o.answer === 'string' ? o.answer.trim() : '';
      return question && answer ? { question, answer } : null;
    })
    .filter((x): x is { question: string; answer: string } => Boolean(x))
    .slice(0, 5);
}

function validateSeoBundle(bundle: SeoBundle): void {
  if (bundle.seo_title.length < 30 || bundle.seo_title.length > 90) {
    throw new Error('SEO title length failed quality gate');
  }
  if (bundle.seo_description.length < 110 || bundle.seo_description.length > 180) {
    throw new Error('SEO description length failed quality gate');
  }
  if (bundle.intro.length < 180 || bundle.supporting.length < 180) {
    throw new Error('SEO body copy failed depth quality gate');
  }
  if (bundle.faq.length < 3) throw new Error('SEO FAQ quality gate failed');
}

function validateResourcePayload(payload: ResourcePayload): void {
  const h2Count = (payload.body_html.match(/<h2\b/gi) ?? []).length;
  if (payload.title.length < 25) throw new Error('Resource title too short');
  if (payload.meta_description.length < 110 || payload.meta_description.length > 180) {
    throw new Error('Resource meta description length failed quality gate');
  }
  if (payload.body_html.length < 1400 || h2Count < 4) {
    throw new Error('Resource body depth quality gate failed');
  }
  if (payload.faq.length < 3) throw new Error('Resource FAQ quality gate failed');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function bodyHtmlWithFaq(payload: ResourcePayload): string {
  const hasFaqHeading = /<h2[^>]*>\s*faq\s*<\/h2>/i.test(payload.body_html);
  if (hasFaqHeading) return payload.body_html;
  const faqHtml = payload.faq
    .map(
      (item) =>
        `<h3>${escapeHtml(item.question)}</h3>\n<p>${escapeHtml(item.answer)}</p>`
    )
    .join('\n');
  return `${payload.body_html}\n<h2>FAQ</h2>\n${faqHtml}`;
}

function plainTextFromHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function markdownFromHtml(html: string): string {
  return html
    .replace(/<h2[^>]*>(.*?)<\/h2>/gis, '\n\n## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gis, '\n\n### $1\n\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gis, '- $1\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function generateSeoBundleWithAi(
  plan: ListingPlan,
  client: OpenAI | null
): Promise<SeoBundle> {
  const fallback = deterministicSeoBundle(plan.topic, plan.entry, plan.matches);
  if (!client) return fallback;
  const model =
    process.env.OPENAI_SEO_MODEL?.trim() ||
    process.env.OPENAI_MODEL_SMART?.trim() ||
    'gpt-4o-mini';
  const keyword = humanKeyword(plan.topic.keyword);
  const examples = firstTitles(plan.matches, 8);
  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.35,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You write authoritative scholarship SEO landing page copy. Be useful, specific, non-spammy, and never invent exact counts beyond the supplied data. Return only JSON.'
        },
        {
          role: 'user',
          content: `Keyword: ${keyword}
Live scholarship count: ${plan.matches.length}
Example scholarship titles: ${examples.join('; ')}

Return JSON with:
{
  "seo_title": "45-75 chars",
  "seo_description": "120-160 chars",
  "h1": "clear H1",
  "intro": "120-180 words, practical and specific",
  "supporting": "120-220 words, includes eligibility/deadline/application advice",
  "related_intro": "one short paragraph",
  "how_to_use": ["5 short bullets"],
  "who_for": ["3 short bullets"],
  "faq": [{"question":"...","answer":"..."}]
}`
        }
      ]
    });
    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) return fallback;
    const j = parseJsonObject(raw);
    const generated: SeoBundle = {
      seo_title: String(j.seo_title ?? fallback.seo_title).trim(),
      seo_description: String(j.seo_description ?? fallback.seo_description).trim(),
      h1: String(j.h1 ?? fallback.h1).trim(),
      intro: String(j.intro ?? fallback.intro).trim(),
      supporting: String(j.supporting ?? fallback.supporting).trim(),
      related_intro: String(j.related_intro ?? fallback.related_intro).trim(),
      how_to_use: stringArray(j.how_to_use),
      who_for: stringArray(j.who_for),
      faq: faqArray(j.faq),
      _meta: {
        ...fallback._meta,
        model,
        bodySource: 'ai',
        generatedAt: new Date().toISOString()
      }
    };
    validateSeoBundle(generated);
    return generated;
  } catch (error) {
    console.warn('[keyword-seo] AI listing copy failed; using deterministic fallback', error);
    validateSeoBundle(fallback);
    return fallback;
  }
}

async function generateResourceWithAi(
  plan: ResourcePlan,
  client: OpenAI | null
): Promise<ResourcePayload> {
  const fallback = deterministicResourcePayload(plan);
  if (!client) return fallback;
  const model =
    process.env.OPENAI_SEO_MODEL?.trim() ||
    process.env.OPENAI_MODEL_SMART?.trim() ||
    'gpt-4o-mini';
  const keyword = humanKeyword(plan.topic.keyword);
  const examples = firstTitles(plan.relatedScholarships, 8);
  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You write expert scholarship resource articles for international students. Be neutral, practical, and trustworthy. Return semantic HTML, no h1, no markdown, no fake statistics.'
        },
        {
          role: 'user',
          content: `Topic: ${keyword}
Resource type: ${plan.resourceType}
Related live scholarships: ${examples.join('; ')}

Return JSON with:
{
  "title": "45-85 chars",
  "meta_title": "45-75 chars",
  "meta_description": "120-160 chars",
  "body_html": "900-1400 words, semantic HTML with 5-8 h2 sections, practical checklist, internal ScholarshipTop framing",
  "faq": [{"question":"...","answer":"..."}]
}`
        }
      ]
    });
    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) return fallback;
    const j = parseJsonObject(raw);
    const generated: ResourcePayload = {
      title: String(j.title ?? fallback.title).trim(),
      meta_title: String(j.meta_title ?? fallback.meta_title).trim(),
      meta_description: String(j.meta_description ?? fallback.meta_description).trim(),
      body_html: String(j.body_html ?? fallback.body_html).trim(),
      faq: faqArray(j.faq)
    };
    validateResourcePayload(generated);
    return generated;
  } catch (error) {
    console.warn('[keyword-seo] AI resource copy failed; using deterministic fallback', error);
    validateResourcePayload(fallback);
    return fallback;
  }
}

function planTopics(topics: KeywordTopic[], catalog: Scholarship[]): KeywordPlan[] {
  const internationalBase = makeEntry(
    { line: 0, keyword: 'scholarships for international students', slug: 'international-students' },
    0
  );
  const relatedInternational = getScholarshipsMatchingManifestEntry(catalog, internationalBase).slice(0, 8);
  const plans: KeywordPlan[] = [];
  for (const topic of topics) {
    if (shouldBeResource(topic.keyword)) {
      plans.push({
        kind: 'resource_article',
        topic,
        resourceType: resourceTypeForKeyword(topic.keyword),
        relatedScholarships: relatedInternational
      });
      continue;
    }
    const entryDraft = makeEntry(topic, 0);
    const listingMatches = listingMatchesForEntry(catalog, entryDraft);
    const count = listingMatches.length;
    const entry = makeEntry(topic, count);
    const matches = listingMatchesForEntry(catalog, entry);
    if (count >= MIN_LISTING_MATCHES) {
      plans.push({ kind: 'scholarship_listing', topic, entry, matches });
    } else {
      plans.push({
        kind: 'resource_article',
        topic,
        resourceType: resourceTypeForKeyword(topic.keyword),
        relatedScholarships: relatedInternational
      });
    }
  }
  return plans;
}

async function readManifest(): Promise<SeoScholarshipRoutesManifest> {
  const raw = await fs.readFile(path.resolve(MANIFEST_PATH), 'utf8');
  return JSON.parse(raw) as SeoScholarshipRoutesManifest;
}

async function writeManifest(manifest: SeoScholarshipRoutesManifest): Promise<void> {
  await fs.writeFile(
    path.resolve(MANIFEST_PATH),
    `${JSON.stringify({ ...manifest, generatedAt: new Date().toISOString() }, null, 2)}\n`,
    'utf8'
  );
}

async function upsertManifestEntry(entry: SeoScholarshipRouteManifestEntry): Promise<void> {
  const manifest = await readManifest();
  const index = manifest.routes.findIndex((r) => r.canonicalPath === entry.canonicalPath);
  if (index >= 0) manifest.routes[index] = { ...manifest.routes[index], ...entry };
  else manifest.routes.push(entry);
  await writeManifest(manifest);
}

async function writeSeoBundle(canonicalPath: string, bundle: SeoBundle): Promise<void> {
  await fs.mkdir(path.resolve(SEO_CONTENT_DIR), { recursive: true });
  const safe = canonicalPath.replace(/\//g, '__');
  await fs.writeFile(
    path.join(process.cwd(), SEO_CONTENT_DIR, `${safe}.json`),
    `${JSON.stringify(bundle, null, 2)}\n`,
    'utf8'
  );
}

function resourceRelatedScholarshipsJson(scholarships: Scholarship[]): Json {
  return scholarships.slice(0, 8).map((s) => ({
    slug: s.slug,
    title: s.title,
    awardAmount: s.awardAmount ?? s.amount ?? null,
    deadline: s.deadline ?? null
  })) as unknown as Json;
}

async function upsertResourcePost(
  supabase: ReturnType<typeof createClient<Database>>,
  plan: ResourcePlan,
  payload: ResourcePayload
): Promise<void> {
  const now = new Date().toISOString();
  const html = bodyHtmlWithFaq(payload);
  const plain = plainTextFromHtml(html);
  const row = {
    title: payload.title,
    h1: payload.title,
    slug: plan.topic.slug,
    excerpt: payload.meta_description,
    meta_title: payload.meta_title,
    meta_description: payload.meta_description,
    body_html: html,
    body_markdown: markdownFromHtml(html),
    cover_image_alt: `Illustration for ${payload.title}`,
    status: 'published',
    published_at: now,
    primary_keyword: plan.topic.keyword,
    secondary_keywords: [plan.resourceType, 'international students'],
    word_count: plain ? plain.split(/\s+/).length : null,
    char_count: plain.length || null,
    faq_items: payload.faq as unknown as Json,
    related_scholarships: resourceRelatedScholarshipsJson(plan.relatedScholarships),
    article_match_diagnostics: {
      source: 'keyword-seo-pages',
      keyword: plan.topic.keyword,
      line: plan.topic.line,
      resourceType: plan.resourceType
    } as unknown as Json,
    updated_at: now
  } as Database['public']['Tables']['content_posts']['Insert'] & Record<string, unknown>;
  const { data: existing, error: selectError } = await supabase
    .from('content_posts')
    .select('id')
    .eq('slug', plan.topic.slug)
    .maybeSingle();
  if (selectError) throw new Error(selectError.message);
  if (existing?.id) {
    const { error } = await supabase.from('content_posts').update(row).eq('id', existing.id);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase.from('content_posts').insert(row);
  if (error) throw new Error(error.message);
}

async function enqueueIndexing(url: string, kind: 'resource' | 'page'): Promise<void> {
  await addToIndexingQueue(url, {
    kind,
    source: 'keyword-seo-pages'
  }).catch((error) => {
    console.warn('[keyword-seo] indexing queue failed', error);
  });
}

function scholarshipPageUrl(canonicalPath: string): string {
  return `${(process.env.NEXT_PUBLIC_SITE_URL || 'https://scholarshiptop.com').replace(/\/+$/, '')}/scholarships/${canonicalPath}`;
}

function resourcePageUrl(slug: string): string {
  return `${(process.env.NEXT_PUBLIC_SITE_URL || 'https://scholarshiptop.com').replace(/\/+$/, '')}${resourcesArticlePath(slug)}`;
}

async function main() {
  const fromLine = optionalIntArg('from-line', 141);
  const toLine = optionalIntArg('to-line', 240);
  const limit = optionalIntArg('limit', 10);
  const dryRun = hasFlag('dry-run') || !hasFlag('publish');
  const publish = hasFlag('publish');
  const topicsPathArg = process.argv.find((arg) => arg.startsWith('--file='));
  const topicsPath = path.resolve(topicsPathArg?.slice('--file='.length) || DEFAULT_TOPICS_PATH);
  const raw = await fs.readFile(topicsPath, 'utf8');
  const topics = parseTopics(raw, fromLine, toLine).slice(0, limit);
  const catalog = await fetchActiveScholarshipsForScript();
  const plans = planTopics(topics, catalog);
  const client = publish ? await openAiClient() : null;
  const supabase = publish
    ? createClient<Database>(
        requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
        requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
        { auth: { persistSession: false } }
      )
    : null;
  const results: Record<string, unknown>[] = [];

  for (const plan of plans) {
    if (plan.kind === 'scholarship_listing') {
      const bundle = publish
        ? await generateSeoBundleWithAi(plan, client)
        : deterministicSeoBundle(plan.topic, plan.entry, plan.matches);
      validateSeoBundle(bundle);
      if (publish && !dryRun) {
        await upsertManifestEntry(plan.entry);
        await writeSeoBundle(plan.entry.canonicalPath, bundle);
        await enqueueIndexing(scholarshipPageUrl(plan.entry.canonicalPath), 'page');
      }
      results.push({
        line: plan.topic.line,
        keyword: plan.topic.keyword,
        kind: plan.kind,
        slug: plan.entry.canonicalPath,
        matches: plan.matches.length,
        url: `/scholarships/${plan.entry.canonicalPath}`,
        published: publish && !dryRun
      });
    } else {
      const payload = publish
        ? await generateResourceWithAi(plan, client)
        : deterministicResourcePayload(plan);
      validateResourcePayload(payload);
      if (publish && !dryRun) {
        if (!supabase) throw new Error('Supabase client was not initialized');
        await upsertResourcePost(supabase, plan, payload);
        await enqueueIndexing(resourcePageUrl(plan.topic.slug), 'resource');
      }
      results.push({
        line: plan.topic.line,
        keyword: plan.topic.keyword,
        kind: plan.kind,
        resourceType: plan.resourceType,
        slug: plan.topic.slug,
        url: `/resources/${plan.topic.slug}`,
        published: publish && !dryRun
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        file: topicsPath,
        from_line: fromLine,
        to_line: toLine,
        limit,
        dry_run: dryRun,
        processed: results.length,
        results
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
