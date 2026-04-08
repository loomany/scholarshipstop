import type { SupabaseClient } from '@supabase/supabase-js';

import { runArticleScholarshipMatchingPipeline } from '@/lib/content-hub/articleScholarshipMatching';
import type { Database } from '@/types_db';

type ContentPostRow = Database['public']['Tables']['content_posts']['Row'];

export async function applyArticleMatchingToPost(
  supabase: SupabaseClient<Database>,
  post: ContentPostRow
) {
  const title = post.title?.trim() || 'Article';
  const bodyHtml = post.body_html?.trim() ?? '';
  if (!bodyHtml) throw new Error('Post has empty body_html');

  const result = await runArticleScholarshipMatchingPipeline(supabase, {
    title,
    metaTitle: post.meta_title,
    metaDescription: post.meta_description,
    bodyHtml
  });

  const patch = {
    body_html: result.bodyHtml,
    related_scholarships: result.relatedJson,
    article_match_diagnostics: result.diagnosticsJson,
    scholarship_links: null
  };

  const { error: upErr } = await supabase
    .from('content_posts')
    .update(patch)
    .eq('id', post.id);

  if (upErr) throw new Error(upErr.message);

  return {
    postId: post.id,
    inlineLinksInserted: result.diagnostics.inlineLinksInserted,
    inlineFallbackUsed: result.diagnostics.inlineFallbackUsed,
    relatedCount: result.relatedScholarships.length
  };
}
