import { env } from "../config/env.js";
import { supabase } from "../lib/supabase.js";
async function fetchAll(table, select, orderColumn = "created_at") {
    const out = [];
    const pageSize = 1000;
    for (let from = 0;; from += pageSize) {
        const { data, error } = await supabase
            .from(table)
            .select(select)
            .order(orderColumn, { ascending: false, nullsFirst: false })
            .range(from, from + pageSize - 1);
        if (error)
            throw error;
        out.push(...(data ?? []));
        if ((data ?? []).length < pageSize)
            break;
    }
    return out;
}
function countBy(rows, getKey) {
    return rows.reduce((acc, row) => {
        const key = getKey(row) ?? "null";
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
    }, {});
}
function isOlderThanHours(dateValue, hours) {
    if (!dateValue)
        return false;
    return new Date(dateValue).getTime() < Date.now() - hours * 60 * 60 * 1000;
}
async function main() {
    const [topics, posts] = await Promise.all([
        fetchAll("content_topics", "id,topic,status,updated_at,attempt_count,failure_class,last_stage,last_error"),
        fetchAll("content_posts", "id,topic_id,title,slug,status,published_at,cover_image_url,cover_image_source_url,word_count,metrics_debug")
    ]);
    const postTopicIds = new Set(posts.map((post) => post.topic_id));
    const staleProcessing = topics.filter((topic) => topic.status === "processing" && isOlderThanHours(topic.updated_at, env.CONTENT_HUB_STALE_PROCESSING_HOURS));
    const failedWithoutPost = topics.filter((topic) => topic.status === "failed" && !postTopicIds.has(topic.id));
    const doneWithoutPost = topics.filter((topic) => topic.status === "done" && !postTopicIds.has(topic.id));
    const published = posts.filter((post) => post.status === "published");
    const reviewNeeded = posts.filter((post) => post.status === "review_needed");
    console.log(JSON.stringify({
        generated_at: new Date().toISOString(),
        topics_total: topics.length,
        topic_status_counts: countBy(topics, (topic) => topic.status),
        topic_failure_class_counts: countBy(topics.filter((topic) => topic.status === "failed" || topic.failure_class), (topic) => topic.failure_class),
        posts_total: posts.length,
        post_status_counts: countBy(posts, (post) => post.status),
        failed_without_post: failedWithoutPost.length,
        stale_processing: staleProcessing.length,
        done_without_post: doneWithoutPost.length,
        review_needed: reviewNeeded.length,
        published_without_cover: published.filter((post) => !post.cover_image_url?.trim()).length,
        published_without_source_tracking: published.filter((post) => post.cover_image_url?.trim() && !post.cover_image_source_url?.trim()).length,
        published_low_words_lt_1100: published.filter((post) => Number(post.word_count ?? 0) < 1100).length,
        samples: {
            failed_without_post: failedWithoutPost.slice(0, 10).map((topic) => ({
                id: topic.id,
                topic: topic.topic,
                attempt_count: topic.attempt_count,
                failure_class: topic.failure_class,
                last_stage: topic.last_stage,
                last_error: topic.last_error?.slice(0, 240) ?? null,
                updated_at: topic.updated_at
            })),
            stale_processing: staleProcessing.slice(0, 10).map((topic) => ({
                id: topic.id,
                topic: topic.topic,
                attempt_count: topic.attempt_count,
                updated_at: topic.updated_at
            }))
        }
    }, null, 2));
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
