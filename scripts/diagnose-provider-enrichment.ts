/**
 * One-off diagnostics for provider enrichment (no DB writes, no stats sync).
 *
 *   npx tsx scripts/diagnose-provider-enrichment.ts
 *   npx tsx scripts/diagnose-provider-enrichment.ts --slug=my-org --slug=other
 */

import fs from 'fs';
import path from 'path';

import { createClient } from '@supabase/supabase-js';

import {
  diagnoseProviderEnrichment
} from '../lib/providers/enrichProviderDataCore';
import {
  fetchProviderOfficialUrlsBySlug,
  fetchProviderSourceUrlsBySlug
} from '../lib/providers/providerOfficialUrl';
import type { Database } from '../types_db';

function loadEnvFiles() {
  const root = path.resolve(__dirname, '..');
  for (const name of ['.env', '.env.local']) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    for (const line of text.split(/\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i <= 0) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (process.env[k] === undefined) process.env[k] = v;
    }
  }
}

const DEFAULT_SLUGS = [
  'ice-skating-institute-of-america',
  'aroc',
  'elizabeth-schmaltz',
  'richard-turner-jr-musical-gifts-inc',
  'the-social-change-fund-united'
];

function parseSlugArgs(): string[] {
  const raw = process.argv.filter((a) => a.startsWith('--slug='));
  if (raw.length === 0) return DEFAULT_SLUGS;
  const out: string[] = [];
  for (const x of raw) {
    const v = x.slice('--slug='.length).trim();
    if (v.includes(',')) {
      out.push(...v.split(',').map((s) => s.trim()).filter(Boolean));
    } else if (v) {
      out.push(v);
    }
  }
  return out.length ? out : DEFAULT_SLUGS;
}

async function main(): Promise<void> {
  loadEnvFiles();
  const slugList = parseSlugArgs();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.'
    );
    process.exit(1);
  }

  const supabase = createClient<Database>(url, key);

  const officialUrlsBySlug = await fetchProviderOfficialUrlsBySlug(
    supabase,
    slugList
  );
  const sourceUrlsBySlug =
    await fetchProviderSourceUrlsBySlug(supabase, slugList);

  const { data: rows, error } = await supabase
    .from('providers')
    .select('id, slug, display_name')
    .in('slug', slugList);

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  const rowBySlug = new Map(
    (rows ?? []).map((r) => [r.slug?.trim() ?? '', r])
  );

  console.log('=== provider enrichment diagnostics (read-only) ===\n');

  for (const slugRaw of slugList) {
    const slug = slugRaw.trim();
    const row = rowBySlug.get(slug);
    const name = row?.display_name?.trim() || slug.replace(/-/g, ' ');
    const officialUrl = officialUrlsBySlug.get(slug) ?? null;
    const extraSources = sourceUrlsBySlug.get(slug) ?? [];
    const sourceUrls = [
      ...(officialUrl ? [officialUrl] : []),
      ...extraSources
    ];

    console.log(`--- slug: ${slug} ---`);
    console.log(`display_name: ${name}`);
    console.log(`candidate sourceUrls (${sourceUrls.length}):\n${sourceUrls.map((u) => `  - ${u}`).join('\n') || '  (none)'}`);

    const { result, diagnostics } = await diagnoseProviderEnrichment(name, {
      officialWebsiteUrl: officialUrl,
      providerSlug: slug,
      sourceUrls
    });

    console.log('\n[fetch attempts]');
    for (const a of diagnostics.sourceFetchAttempts) {
      console.log(`  url: ${a.url}`);
      console.log(`    fetchAttempted: ${a.fetchAttempted}`);
      console.log(`    gotResponse: ${a.gotResponse}`);
      if (a.httpStatus != null) console.log(`    httpStatus: ${a.httpStatus}`);
      if (a.contentType != null) console.log(`    contentType: ${a.contentType}`);
      console.log(`    extractedText: ${a.extractedText}`);
      console.log(`    textLength: ${a.textLength}`);
      if (a.error) console.log(`    error: ${a.error}`);
      console.log(`    preview500:\n${a.textPreview500.slice(0, 500)}${a.textPreview500.length > 500 ? '\n…' : ''}`);
    }

    console.log('\n[summary]');
    console.log(`gate: ${diagnostics.gate}`);
    console.log(`configured OPENAI_PROVIDER_ENRICH_MODEL: ${diagnostics.configuredModelLabel}`);
    console.log(`required model: ${diagnostics.requiredModel}`);
    console.log(`usedSourceUrl: ${diagnostics.usedSourceUrl ?? '(none)'}`);
    console.log(`promptMode: ${diagnostics.promptMode}`);
    console.log(`passesCatalogCompletenessCheck: ${diagnostics.passesCatalogCompletenessCheck}`);
    console.log(`completenessGap: ${diagnostics.completenessGap ?? '(none)'}`);
    console.log(`${diagnostics.postQualityNote}: see enrich CLI / separate module when wired`);

    console.log('\n[raw OpenAI JSON string]');
    const raw = diagnostics.rawOpenAiResponse;
    if (raw == null) {
      console.log('(null)');
    } else {
      console.log(raw.length > 8000 ? `${raw.slice(0, 8000)}\n… [truncated ${raw.length - 8000} chars]` : raw);
    }

    if (diagnostics.openAiTransportError) {
      console.log('\n[OpenAI transport error]');
      console.log(diagnostics.openAiTransportError);
    }

    console.log('\n[parse]');
    console.log(`parseSucceeded: ${diagnostics.parseSucceeded}`);
    console.log(`parseFailureDetail: ${diagnostics.parseFailureDetail ?? '(none)'}`);

    console.log('\n[result object returned to catalog script]');
    console.log(
      JSON.stringify(
        {
          descriptionLen: result.description?.length ?? 0,
          sourcesCount: result.sources.length,
          sources: result.sources,
          state: result.state,
          postQualityPassed: result.postQualityPassed
        },
        null,
        2
      )
    );

    console.log('\n');
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
