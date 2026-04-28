import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';

/**
 * If HTML→text primary source is shorter than this, load extra facts from `scholarships`
 * for the same `provider_slug` (never exposed as user-facing sources).
 */
export const PROVIDER_ENRICH_SCHOLARSHIP_SUPPLEMENT_THRESHOLD_CHARS = 2200;

function clamp(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

/** Word-bag overlap: skip chunk if it mostly repeats primary (reduces GPT echoing). */
function normalizeWordish(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function wordTokens(s: string): string[] {
  return normalizeWordish(s).split(/\s+/).filter((w) => w.length >= 4);
}

/**
 * True if the supplement chunk largely reuses the same wording as primary
 * (so it would not add new facts—only repetition for the model).
 */
export function scholarshipChunkMostlyDuplicatesPrimary(
  chunk: string,
  primaryText: string
): boolean {
  const chunkT = chunk.trim();
  const primaryT = primaryText.trim();
  if (!chunkT || !primaryT) return false;

  const words = wordTokens(chunk);
  if (words.length < 14) return false;

  const primarySet = new Set(wordTokens(primaryT));
  let hit = 0;
  for (const w of words) {
    if (primarySet.has(w)) hit += 1;
  }
  const ratio = hit / words.length;
  return ratio >= 0.8;
}

function stripHtmlToPlain(html: string, max: number): string {
  const plain = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return clamp(plain, max);
}

function scholarshipRowToFactChunk(row: {
  title: string | null;
  description: string | null;
  summary_short: string | null;
  summary_long: string | null;
  requirements_text: string | null;
  requirements_text_clean: string | null;
  eligibility_text: string | null;
  who_can_apply: string | null;
  description_html: string | null;
}): string {
  const parts: string[] = [];
  if (row.title?.trim()) parts.push(`Scholarship: ${row.title.trim()}`);
  const sum =
    (row.summary_long && row.summary_long.trim()) ||
    (row.summary_short && row.summary_short.trim());
  if (sum) parts.push(`Summary: ${clamp(sum, 2000)}`);
  const descPlain = row.description?.trim();
  const descFromHtml =
    !descPlain && row.description_html?.trim()
      ? stripHtmlToPlain(row.description_html, 5000)
      : '';
  const desc = descPlain || descFromHtml;
  if (desc) parts.push(`Description: ${clamp(desc, 2500)}`);
  const req =
    (row.requirements_text_clean && row.requirements_text_clean.trim()) ||
    (row.requirements_text && row.requirements_text.trim());
  if (req) parts.push(`Requirements: ${clamp(req, 2000)}`);
  if (row.eligibility_text?.trim()) {
    parts.push(`Eligibility: ${clamp(row.eligibility_text, 1500)}`);
  }
  if (row.who_can_apply?.trim()) {
    parts.push(`Who can apply: ${clamp(row.who_can_apply, 1000)}`);
  }
  return parts.length ? parts.join('\n') : '';
}

/**
 * Loads plain-text facts from 1–2 active scholarship rows (no URLs) to enrich
 * provider org descriptions when the primary fetched page is thin.
 */
export async function fetchScholarshipSupplementFactsForProvider(
  providerSlug: string,
  options?: {
    maxScholarships?: number;
    maxTotalChars?: number;
    /** When set, drop scholarship rows whose text mostly repeats this (primary fetched page). */
    primarySourceText?: string;
  }
): Promise<string | null> {
  const maxRows = options?.maxScholarships ?? 2;
  const maxTotal = options?.maxTotalChars ?? 9000;
  const primary = options?.primarySourceText?.trim() ?? '';

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key || !providerSlug.trim()) return null;

  const supabase = createClient<Database>(url, key);
  const { data, error } = await supabase
    .from('scholarships')
    .select(
      'title, description, summary_short, summary_long, requirements_text, requirements_text_clean, eligibility_text, who_can_apply, description_html'
    )
    .eq('provider_slug', providerSlug.trim())
    .or('is_active.eq.true,is_active.is.null')
    .order('updated_at', { ascending: false })
    .limit(maxRows);

  if (error || !data?.length) return null;

  const blocks: string[] = [];
  let total = 0;
  for (const row of data) {
    const chunk = scholarshipRowToFactChunk(row);
    if (!chunk) continue;
    if (
      primary &&
      scholarshipChunkMostlyDuplicatesPrimary(chunk, primary)
    ) {
      continue;
    }
    const sep = blocks.length ? '\n\n' : '';
    const nextLen = total + sep.length + chunk.length;
    if (nextLen > maxTotal) break;
    blocks.push(chunk);
    total = nextLen;
  }

  return blocks.length ? blocks.join('\n\n') : null;
}
