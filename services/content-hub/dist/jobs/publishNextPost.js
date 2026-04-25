import { logger } from "../lib/logger.js";
import { supabase } from "../lib/supabase.js";
import { triggerArticleMatching } from "../lib/articleMatchingNotifier.js";
const STATUS_PRIORITY = ["review_needed", "draft"];
async function findCandidateByStatus(status) {
    const { data, error } = await supabase
        .from("content_posts")
        .select("id,slug")
        .eq("status", status)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
    if (error) {
        throw error;
    }
    return data ?? null;
}
async function findPublishCandidate() {
    for (const status of STATUS_PRIORITY) {
        const candidate = await findCandidateByStatus(status);
        if (candidate) {
            return candidate;
        }
    }
    return null;
}
async function main() {
    const candidate = await findPublishCandidate();
    if (!candidate) {
        logger.info("no unpublished posts available");
        return;
    }
    logger.info("publish candidate found", { id: candidate.id, slug: candidate.slug });
    const { error: updateError } = await supabase
        .from("content_posts")
        .update({
        status: "published",
        published_at: new Date().toISOString()
    })
        .eq("id", candidate.id);
    if (updateError) {
        throw updateError;
    }
    logger.info("post published", { id: candidate.id, slug: candidate.slug });
    await triggerArticleMatching({ postId: candidate.id, slug: candidate.slug });
}
main().catch((error) => {
    logger.error("fatal", { error: error instanceof Error ? error.message : String(error) });
    process.exitCode = 1;
});
