/**
 * One-off: find unpublished Resources (`content_posts`) and Essay Hub (`essays`) rows and set published.
 *
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/publish-unpublished-content.ts
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/publish-unpublished-content.ts --dry-run
 */
import { createClient } from "@supabase/supabase-js";

import type { Database } from "../types_db";

const dryRun = process.argv.includes("--dry-run");

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient<Database>(url, key);

  const { data: posts, error: postsErr } = await supabase
    .from("content_posts")
    .select("id, slug, title, status, published_at, body_html")
    .neq("status", "published");

  if (postsErr) throw new Error(postsErr.message);

  const listablePosts = (posts ?? []).filter((p) => {
    const slug = p.slug?.trim();
    const body = p.body_html?.trim();
    return Boolean(slug && body && body.length > 50);
  });

  console.log(
    JSON.stringify(
      {
        content_posts_unpublished_total: posts?.length ?? 0,
        content_posts_will_publish: listablePosts.length,
        content_posts_skipped_empty: (posts?.length ?? 0) - listablePosts.length,
        slugs: listablePosts.map((p) => p.slug)
      },
      null,
      2
    )
  );

  const { data: essays, error: essaysErr } = await supabase
    .from("essays")
    .select("id, slug, title, is_published, hero_image_url, content_html")
    .eq("is_published", false);

  if (essaysErr) throw new Error(essaysErr.message);

  const listableEssays = (essays ?? []).filter((e) => {
    const slug = e.slug?.trim();
    const body = e.content_html?.trim();
    return Boolean(slug && body && body.length > 50);
  });

  console.log(
    JSON.stringify(
      {
        essays_unpublished_total: essays?.length ?? 0,
        essays_will_publish: listableEssays.length,
        essays_skipped_empty: (essays?.length ?? 0) - listableEssays.length,
        slugs: listableEssays.map((e) => e.slug)
      },
      null,
      2
    )
  );

  if (dryRun) {
    console.log("Dry run — no updates.");
    return;
  }

  for (const p of listablePosts) {
    const { error } = await supabase
      .from("content_posts")
      .update({
        status: "published",
        updated_at: new Date().toISOString()
      })
      .eq("id", p.id);
    if (error) console.error("content_posts update failed", p.slug, error.message);
    else console.log("published content_posts", p.slug);
  }

  for (const e of listableEssays) {
    const { error } = await supabase
      .from("essays")
      .update({
        is_published: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", e.id);
    if (error) console.error("essays update failed", e.slug, error.message);
    else console.log("published essays", e.slug);
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
