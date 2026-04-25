import { env } from "../config/env.js";
import { supabase } from "../lib/supabase.js";
const args = new Set(process.argv.slice(2));
const write = args.has("--write");
const includeFailed = !args.has("--skip-failed");
const includeProcessing = !args.has("--skip-processing");
const includeDoneWithoutPost = args.has("--include-done-without-post");
async function fetchAll(table, select) {
    const out = [];
    const pageSize = 1000;
    for (let from = 0;; from += pageSize) {
        const { data, error } = await supabase
            .from(table)
            .select(select)
            .order("updated_at", { ascending: false, nullsFirst: false })
            .range(from, from + pageSize - 1);
        if (error)
            throw error;
        out.push(...(data ?? []));
        if ((data ?? []).length < pageSize)
            break;
    }
    return out;
}
function isStaleProcessing(topic) {
    return (topic.status === "processing" &&
        new Date(topic.updated_at).getTime() < Date.now() - env.CONTENT_HUB_STALE_PROCESSING_HOURS * 60 * 60 * 1000);
}
async function main() {
    const [topics, posts] = await Promise.all([
        fetchAll("content_topics", "id,topic,status,updated_at"),
        fetchAll("content_posts", "topic_id")
    ]);
    const postTopicIds = new Set(posts.map((post) => post.topic_id));
    const candidates = topics.filter((topic) => {
        if (includeFailed && topic.status === "failed" && !postTopicIds.has(topic.id))
            return true;
        if (includeProcessing && isStaleProcessing(topic))
            return true;
        if (includeDoneWithoutPost && topic.status === "done" && !postTopicIds.has(topic.id))
            return true;
        return false;
    });
    console.log(JSON.stringify({
        mode: write ? "write" : "dry-run",
        selected_count: candidates.length,
        includeFailed,
        includeProcessing,
        includeDoneWithoutPost,
        sample: candidates.slice(0, 20).map((topic) => ({
            id: topic.id,
            topic: topic.topic,
            status: topic.status,
            updated_at: topic.updated_at
        }))
    }, null, 2));
    if (!write || candidates.length === 0)
        return;
    const now = new Date().toISOString();
    const ids = candidates.map((topic) => topic.id);
    const chunkSize = 200;
    for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const { error } = await supabase
            .from("content_topics")
            .update({
            status: "queued",
            updated_at: now,
            last_error: null,
            last_stage: null,
            failure_class: null
        })
            .in("id", chunk);
        if (error)
            throw error;
        console.log(`Requeued ${Math.min(i + chunkSize, ids.length)}/${ids.length}`);
    }
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
