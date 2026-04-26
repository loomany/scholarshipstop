/**
 * Generate scholarship detail SEO fields in bulk via GPT-5.4.
 *
 * Updates (when --apply):
 * - scholarships.title (normalized 30-65 chars)
 * - scholarships.seo_excerpt (120-160 chars)
 * - scholarships.seo_faq (3 short Q/A)
 *
 * Usage:
 *   npx dotenv -e .env.local -- npx tsx scripts/generate-scholarship-detail-seo-ai.ts --limit=200
 *   npx dotenv -e .env.local -- npx tsx scripts/generate-scholarship-detail-seo-ai.ts --limit=200 --apply
 */
import OpenAI from 'openai';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

import type { Database, Json } from '../types_db';

type Row = {
  id: string;
  slug: string | null;
  title: string | null;
  summary_short: string | null;
  seo_excerpt: string | null;
  seo_faq: Json | null;
  eligibility_text: string | null;
  deadline_text: string | null;
  requirements_text: string | null;
  is_active: boolean | null;
  updated_at: string | null;
};

type GenPayload = {
  title: string;
  metaDescription: string;
  faq: Array<{ question: string; answer: string }>;
};

function argFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function argNum(name: string, fallback: number): number {
  const raw = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!raw) return fallback;
  const parsed = Number(raw.slice(name.length + 3));
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function argString(name: string): string | null {
  const raw = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!raw) return null;
  const v = raw.slice(name.length + 3).trim();
  return v.length > 0 ? v : null;
}

function normalizeSpaces(v: string): string {
  return v.replace(/\s+/g, ' ').trim();
}

function clampWithEllipsis(v: string, max: number): string {
  if (v.length <= max) return v;
  return `${v.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

function normalizeTitle(raw: string): string {
  let v = normalizeSpaces(raw);
  if (!/\b(scholarship|grant|funding)\b/i.test(v)) v = `${v} Scholarship`;
  if (!/\b(usa|u\.s\.)\b/i.test(v)) v = `${v} USA`;
  if (!/\b2026\b/.test(v)) v = `${v} 2026`;
  if (!/\b(apply|eligibility|deadline)\b/i.test(v)) v = `${v} Apply`;
  v = normalizeSpaces(v);
  if (v.length < 30) v = normalizeSpaces(`${v} Details`);
  return clampWithEllipsis(v, 65);
}

function normalizeMeta(raw: string): string {
  let v = normalizeSpaces(raw);
  if (!/\b(usa|u\.s\.)\b/i.test(v)) v = `USA scholarship: ${v}`;
  if (!/\b(apply|start|explore|check)\b/i.test(v)) v = `${v} Apply now.`;
  if (v.length < 120) {
    v = normalizeSpaces(
      `${v} Check eligibility, confirm the deadline, review requirements, and apply through the official listing page with confidence.`
    );
  }
  if (v.length < 120) v = normalizeSpaces(`${v} Explore this scholarship and apply today.`);
  return clampWithEllipsis(v, 160);
}

function normalizeFaq(
  faq: Array<{ question: string; answer: string }> | undefined
): Array<{ question: string; answer: string }> {
  const cleaned = (faq ?? [])
    .map((x) => ({
      question: normalizeSpaces(x.question),
      answer: normalizeSpaces(x.answer)
    }))
    .filter((x) => x.question.length > 8 && x.answer.length > 20)
    .slice(0, 5);
  if (cleaned.length >= 3) return cleaned;
  return [];
}

function defaultFaq(title: string): Array<{ question: string; answer: string }> {
  return [
    {
      question: `Who is eligible for ${title}?`,
      answer:
        'Review the eligibility section and official listing requirements carefully, then apply only if your profile matches the stated criteria.'
    },
    {
      question: `When is the deadline for ${title}?`,
      answer:
        'Use the listed deadline as guidance and always confirm the exact final date and timezone on the official scholarship page before submitting.'
    },
    {
      question: `How should I apply for ${title}?`,
      answer:
        'Prepare all required documents in advance, follow the official application steps, and submit through the verified program link after your final checks.'
    }
  ];
}

function needsUpdate(row: Row): boolean {
  const tLen = normalizeSpaces(row.title ?? '').length;
  const mLen = normalizeSpaces(row.seo_excerpt ?? '').length;
  const hasFaq =
    Array.isArray(row.seo_faq) &&
    row.seo_faq.length >= 3 &&
    row.seo_faq.every((x) => {
      if (!x || typeof x !== 'object') return false;
      const o = x as Record<string, unknown>;
      return typeof o.question === 'string' && typeof o.answer === 'string';
    });
  return tLen < 30 || tLen > 65 || mLen < 120 || mLen > 160 || !hasFaq;
}

function slugsFromAuditReport(pathArg: string | null): Set<string> | null {
  if (!pathArg) return null;
  const raw = fs.readFileSync(pathArg, 'utf8');
  const parsed = JSON.parse(raw) as {
    pages?: Array<{
      url?: string;
      type?: string;
      issueCodes?: string[];
    }>;
  };
  const set = new Set<string>();
  for (const page of parsed.pages ?? []) {
    if (page.type !== 'scholarship') continue;
    const issues = page.issueCodes ?? [];
    if (!issues.some((x) => x === 'faq_missing' || x === 'title_length_out_of_range')) continue;
    const url = page.url ?? '';
    const slug = url.replace(/^\/scholarships\//, '').trim();
    if (slug) set.add(slug);
  }
  return set;
}

function buildPrompt(row: Row): string {
  return [
    'Return JSON only with keys: title, metaDescription, faq.',
    'Rules:',
    '- Model output must be deterministic and practical, not creative fluff.',
    '- title length 30-65 chars, include keyword + intent + USA or 2026.',
    '- metaDescription length 120-160 chars, format: keyword + benefit + CTA.',
    '- faq: 3-5 short Q/A, MUST cover eligibility, deadline, application process.',
    '- Do not invent unsupported facts.',
    '',
    `Current title: ${row.title ?? ''}`,
    `Current summary: ${row.summary_short ?? ''}`,
    `Eligibility text: ${row.eligibility_text ?? ''}`,
    `Deadline text: ${row.deadline_text ?? ''}`,
    `Requirements text: ${row.requirements_text ?? ''}`
  ].join('\n');
}

async function generateForRow(client: OpenAI, row: Row): Promise<GenPayload> {
  const res = await client.chat.completions.create({
    model: 'gpt-5.4',
    temperature: 0.15,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You generate strict SEO JSON. Obey length limits and return valid JSON only.'
      },
      { role: 'user', content: buildPrompt(row) }
    ]
  });
  const raw = res.choices[0]?.message?.content?.trim() ?? '{}';
  const parsed = JSON.parse(raw) as {
    title?: string;
    metaDescription?: string;
    faq?: Array<{ question?: string; answer?: string }>;
  };
  const normalizedTitle = normalizeTitle(parsed.title || row.title || 'Scholarship');
  const normalizedMeta = normalizeMeta(
    parsed.metaDescription ||
      row.seo_excerpt ||
      `Find details about ${normalizedTitle}, check eligibility and deadline, and apply through the official scholarship source.`
  );
  const faqRaw = (parsed.faq ?? [])
    .map((x) => ({
      question: String(x.question ?? ''),
      answer: String(x.answer ?? '')
    }));
  const normalizedFaq = normalizeFaq(faqRaw);
  return {
    title: normalizedTitle,
    metaDescription: normalizedMeta,
    faq: normalizedFaq.length >= 3 ? normalizedFaq : defaultFaq(normalizedTitle)
  };
}

async function main() {
  const limit = argNum('limit', 200);
  const apply = argFlag('apply');
  const auditPath = argString('from-audit');

  const model = process.env.OPENAI_SEO_MODEL?.trim() || '';
  if (model !== 'gpt-5.4') {
    console.error(
      `OPENAI_SEO_MODEL must be exactly gpt-5.4 for detail SEO generation. Current value: ${model || '(empty)'}`
    );
    process.exit(1);
  }
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openaiKey) {
    console.error('OPENAI_API_KEY is required.');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    process.exit(1);
  }
  const db = createClient<Database>(url, serviceKey);
  const client = new OpenAI({ apiKey: openaiKey });
  const auditSlugs = slugsFromAuditReport(auditPath);

  const { data, error } = await db
    .from('scholarships')
    .select(
      'id, slug, title, summary_short, seo_excerpt, seo_faq, eligibility_text, deadline_text, requirements_text, is_active, updated_at'
    )
    .eq('is_active', true)
    .order('ranking_score', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  const rows = ((data ?? []) as unknown as Row[]).filter((row) => {
    if (!needsUpdate(row)) return false;
    if (!auditSlugs) return true;
    return Boolean(row.slug && auditSlugs.has(row.slug));
  });
  console.log(
    `[detail-seo] candidates=${rows.length} from_limit=${limit} apply=${apply} audit_filter=${auditSlugs ? auditSlugs.size : 0}`
  );

  let updated = 0;
  for (const row of rows) {
    try {
      const generated = await generateForRow(client, row);
      if (apply) {
        const { error: upErr } = await db
          .from('scholarships')
          .update({
            title: generated.title,
            seo_excerpt: generated.metaDescription,
            seo_faq: generated.faq as unknown as Json
          })
          .eq('id', row.id);
        if (upErr) {
          console.error(`[detail-seo] update failed ${row.id}: ${upErr.message}`);
          continue;
        }
      }
      updated += 1;
      console.log(`[detail-seo] ${apply ? 'updated' : 'would_update'} ${row.slug ?? row.id}`);
    } catch (e) {
      console.error(
        `[detail-seo] generate failed ${row.slug ?? row.id}:`,
        e instanceof Error ? e.message : String(e)
      );
    }
  }
  console.log(`[detail-seo] done ${updated}/${rows.length}`);
}

main().catch((e) => {
  console.error('[detail-seo] fatal', e instanceof Error ? e.message : String(e));
  process.exit(1);
});
