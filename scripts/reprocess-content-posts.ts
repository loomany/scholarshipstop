/**
 * Batch-reprocess published content_posts through the same matching pipeline as
 * POST /api/internal/resources/apply-article-matching (no HTTP).
 *
 *   npx tsx scripts/reprocess-content-posts.ts [options]
 *
 * Options:
 *   --dry-run              Run pipeline, log metrics, do not write to DB
 *   --all-published        Paginate until no rows (optional --limit caps total)
 *   --limit=N              Max posts to process (default: 100 if --all-published off)
 *   --offset=N             Start at 0-based row index (ordered by id); not with --after-id
 *   --after-id=UUID        Cursor: only rows with id > UUID (ordered by id); not with --offset
 *   --slug=SLUG            Process one published post with this exact slug (ignores limit/offset/after-id/all-published)
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (.env / .env.local).
 */

import fs from 'fs';
import path from 'path';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { runArticleScholarshipMatchingPipeline } from '../lib/content-hub/articleScholarshipMatching/runArticleScholarshipMatchingCore';
import { enqueueResourceUrlsForScript } from './lib/googleIndexing';
import type { Database } from '../types_db';

const BATCH = 100;

type ContentPostRow = Pick<
  Database['public']['Tables']['content_posts']['Row'],
  'id' | 'slug' | 'title' | 'meta_title' | 'meta_description' | 'body_html'
>;

function loadEnvFiles() {
  const root = path.resolve(__dirname, '..');
  for (const name of ['.env', '.env.local']) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    for (const line of text.split('\n')) {
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

type CliOptions = {
  dryRun: boolean;
  allPublished: boolean;
  limit?: number;
  offset?: number;
  afterId?: string;
  slug?: string;
};

function parseCli(argv: string[]): CliOptions {
  const out: CliOptions = {
    dryRun: false,
    allPublished: false
  };

  for (const arg of argv) {
    if (arg === '--dry-run') out.dryRun = true;
    else if (arg === '--all-published') out.allPublished = true;
    else if (arg.startsWith('--limit=')) {
      const n = Number.parseInt(arg.slice('--limit='.length), 10);
      if (!Number.isNaN(n) && n >= 0) out.limit = n;
    } else if (arg.startsWith('--offset=')) {
      const n = Number.parseInt(arg.slice('--offset='.length), 10);
      if (!Number.isNaN(n) && n >= 0) out.offset = n;
    } else if (arg.startsWith('--after-id=')) {
      const id = arg.slice('--after-id='.length).trim();
      if (id) out.afterId = id;
    } else if (arg.startsWith('--slug=')) {
      const s = arg.slice('--slug='.length).trim();
      if (s) out.slug = s;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: npx tsx scripts/reprocess-content-posts.ts [options]

  --dry-run           Simulate: run pipeline, log results, skip DB updates
  --all-published     Keep paging until no rows (use --limit to cap)
  --limit=N           Max posts to process
  --offset=N          0-based index into id-ordered list (not with --after-id)
  --after-id=UUID     Process rows with id > UUID (not with --offset)
  --slug=SLUG         One published post only (exact slug; batch flags ignored)
`);
      process.exit(0);
    }
  }

  return out;
}

function baseSelect(supabase: SupabaseClient<Database>) {
  return supabase
    .from('content_posts')
    .select('id, slug, title, meta_title, meta_description, body_html')
    .eq('status', 'published')
    .not('slug', 'is', null)
    .neq('slug', '');
}

async function processPost(
  supabase: SupabaseClient<Database>,
  post: ContentPostRow,
  dryRun: boolean
): Promise<
  | { kind: 'skip_empty' }
  | { kind: 'ok'; inlineLinksInserted: number; inlineFallbackUsed: boolean; relatedCount: number }
  | { kind: 'err'; message: string }
> {
  const slug = post.slug?.trim() || '(no slug)';
  const bodyHtml = post.body_html?.trim() ?? '';
  if (!bodyHtml) {
    console.log(
      JSON.stringify({
        slug,
        ok: false,
        skip: 'empty body_html',
        inlineLinksInserted: null,
        inlineFallbackUsed: null,
        relatedCount: null
      })
    );
    return { kind: 'skip_empty' };
  }

  try {
    const result = await runArticleScholarshipMatchingPipeline(supabase, {
      title: post.title?.trim() || 'Article',
      metaTitle: post.meta_title,
      metaDescription: post.meta_description,
      bodyHtml
    });

    if (!dryRun) {
      const { error: upErr } = await supabase
        .from('content_posts')
        .update({
          body_html: result.bodyHtml,
          related_scholarships: result.relatedJson,
          article_match_diagnostics: result.diagnosticsJson,
          scholarship_links: null
        })
        .eq('id', post.id);

      if (upErr) throw new Error(upErr.message);
      if (post.slug?.trim()) {
        const queue = await enqueueResourceUrlsForScript(
          [post.slug.trim()],
          'script:reprocess-content-posts'
        );
        console.log(
          JSON.stringify({
            slug,
            indexingQueued: queue.enqueued,
            indexingQueueTotal: queue.total
          })
        );
      }
    }

    console.log(
      JSON.stringify({
        slug,
        ok: true,
        dryRun,
        inlineLinksInserted: result.diagnostics.inlineLinksInserted,
        inlineFallbackUsed: result.diagnostics.inlineFallbackUsed,
        relatedCount: result.relatedScholarships.length
      })
    );
    return {
      kind: 'ok',
      inlineLinksInserted: result.diagnostics.inlineLinksInserted,
      inlineFallbackUsed: result.diagnostics.inlineFallbackUsed,
      relatedCount: result.relatedScholarships.length
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(
      JSON.stringify({
        slug,
        ok: false,
        err: msg,
        inlineLinksInserted: null,
        inlineFallbackUsed: null,
        relatedCount: null
      })
    );
    return { kind: 'err', message: msg };
  }
}

async function main() {
  loadEnvFiles();
  const opts = parseCli(process.argv.slice(2));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.'
    );
    process.exit(1);
  }

  const supabase = createClient<Database>(url, serviceKey);

  let processed = 0;
  let skippedEmptyBody = 0;
  let errors = 0;
  /** Set only in batch mode; undefined lets single-`--slug` runs process the row. */
  let maxTotal: number | undefined;

  const consume = async (rows: ContentPostRow[]) => {
    for (const post of rows) {
      if (maxTotal !== undefined && processed >= maxTotal) return;
      const r = await processPost(supabase, post, opts.dryRun);
      if (r.kind === 'skip_empty') skippedEmptyBody += 1;
      else if (r.kind === 'err') errors += 1;
      else processed += 1;
    }
  };

  const slugArg = opts.slug?.trim();
  if (slugArg) {
    const { data, error } = await baseSelect(supabase)
      .eq('slug', slugArg)
      .maybeSingle();

    if (error) {
      console.error('Query error:', error.message);
      process.exit(1);
    }
    if (!data) {
      console.error(
        JSON.stringify({
          ok: false,
          reason:
            'No published content_post found with this slug (check status=published and non-empty slug).',
          slug: slugArg
        })
      );
      process.exit(1);
    }

    await consume([data as ContentPostRow]);

    console.log(
      JSON.stringify({
        summary: {
          updatedOrSimulated: processed,
          skippedEmptyBody,
          errors,
          dryRun: opts.dryRun,
          slug: slugArg,
          single: true
        }
      })
    );
    return;
  }

  if (opts.offset != null && opts.afterId) {
    console.error('Use either --offset or --after-id, not both.');
    process.exit(1);
  }

  const defaultLimit = opts.allPublished ? undefined : 100;
  maxTotal = opts.limit ?? defaultLimit;
  if (maxTotal === 0) {
    console.log('limit=0, nothing to do.');
    return;
  }

  if (opts.afterId) {
    let lastId = opts.afterId;
    while (true) {
      if (maxTotal !== undefined && processed >= maxTotal) break;
      const remaining =
        maxTotal !== undefined ? maxTotal - processed : BATCH;
      const take =
        maxTotal !== undefined ? Math.min(BATCH, Math.max(0, remaining)) : BATCH;
      if (take <= 0) break;

      const { data, error } = await baseSelect(supabase)
        .gt('id', lastId)
        .order('id', { ascending: true })
        .limit(take);

      if (error) {
        console.error('Query error:', error.message);
        process.exit(1);
      }
      const rows = (data ?? []) as ContentPostRow[];
      if (rows.length === 0) break;

      await consume(rows);
      lastId = rows[rows.length - 1]!.id;
      if (rows.length < take) break;
    }
  } else {
    let from = opts.offset ?? 0;
    let doneInMode = false;

    while (!doneInMode) {
      if (maxTotal !== undefined && processed >= maxTotal) break;
      const remaining =
        maxTotal !== undefined ? maxTotal - processed : BATCH;
      const take =
        maxTotal !== undefined ? Math.min(BATCH, Math.max(0, remaining)) : BATCH;
      if (take <= 0) break;

      const to = from + take - 1;
      const { data, error } = await baseSelect(supabase)
        .order('id', { ascending: true })
        .range(from, to);

      if (error) {
        console.error('Query error:', error.message);
        process.exit(1);
      }
      const rows = (data ?? []) as ContentPostRow[];
      if (rows.length === 0) break;

      await consume(rows);
      from += rows.length;
      if (!opts.allPublished) doneInMode = true;
      if (rows.length < take) doneInMode = true;
      if (maxTotal !== undefined && processed >= maxTotal) doneInMode = true;
    }
  }

  console.log(
    JSON.stringify({
      summary: {
        updatedOrSimulated: processed,
        skippedEmptyBody,
        errors,
        dryRun: opts.dryRun,
        allPublished: opts.allPublished
      }
    })
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
