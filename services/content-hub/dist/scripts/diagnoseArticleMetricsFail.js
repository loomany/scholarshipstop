import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
function parseFailedCheck(entry) {
    const match = entry.match(/^([^:]+):\s*expected\s+(.+?),\s*got\s+(.+)$/i);
    if (!match)
        return null;
    return { metric: match[1].trim(), expected: match[2].trim(), actual: match[3].trim() };
}
function isGeneralTopic(topic) {
    const normalized = topic.toLowerCase().trim();
    const words = normalized.split(/\s+/).filter(Boolean);
    const hasSpecificQualifier = /\b(for|in|by|with|without|for\s+[a-z]|international|undergraduate|graduate|stem|nursing|mba|state|country|deadline|essay|application)\b/.test(normalized);
    const isGenericHead = /^(scholarships?|financial aid|college funding|student aid)/.test(normalized);
    return (words.length <= 3 && !hasSpecificQualifier) || (isGenericHead && !hasSpecificQualifier);
}
function classifyFailure(topic, failedChecks) {
    const parsed = failedChecks.map(parseFailedCheck).filter((x) => Boolean(x));
    const failedMetrics = new Set(parsed.map((item) => item.metric));
    const structural = ["h2Count", "sectionCount", "paragraphCount", "introWordCount"].some((key) => failedMetrics.has(key));
    const depth = ["totalWordCount", "charCountNoSpaces"].some((key) => failedMetrics.has(key));
    if (isGeneralTopic(topic) && depth)
        return "too broad (generic topic scope led to shallow depth)";
    if (depth && !structural)
        return "too thin (insufficient content depth)";
    if (structural)
        return "structurally weak (insufficient sections/paragraph density)";
    return "mixed quality issue";
}
async function findLatestPayloadFile() {
    const dir = join(process.cwd(), "tmp", "article-metrics-validation");
    const files = await readdir(dir);
    const jsonFiles = files.filter((name) => name.endsWith(".json")).sort();
    if (jsonFiles.length === 0)
        return null;
    return join(dir, jsonFiles[jsonFiles.length - 1]);
}
async function getQueuedTopics() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
        return [];
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false }
    });
    const { data, error } = await supabase.from("content_topics").select("topic").eq("status", "queued").limit(300);
    if (error)
        throw error;
    return (data ?? []).map((row) => String(row.topic));
}
async function main() {
    const latestPayloadPath = await findLatestPayloadFile().catch(() => null);
    if (!latestPayloadPath) {
        console.log("No debug payloads found in tmp/article-metrics-validation/");
        process.exitCode = 1;
        return;
    }
    const raw = await readFile(latestPayloadPath, "utf8");
    const payload = JSON.parse(raw);
    const topic = payload.topic ?? "unknown";
    const failedChecks = payload.failedChecks ?? [];
    const parsedFailed = failedChecks.map(parseFailedCheck).filter((item) => Boolean(item));
    const diagnosis = classifyFailure(topic, failedChecks);
    let queuedTopics = [];
    try {
        queuedTopics = await getQueuedTopics();
    }
    catch (error) {
        console.warn(`Failed to query queued topics: ${error instanceof Error ? error.message : String(error)}`);
    }
    const queuedGeneralTopics = queuedTopics.filter(isGeneralTopic);
    const matchingGeneralTopicInQueue = queuedGeneralTopics.some((queuedTopic) => queuedTopic.toLowerCase() === topic.toLowerCase());
    console.log("=== Article metrics hard-fail diagnosis ===");
    console.log(`payload: ${latestPayloadPath}`);
    console.log(`topic: ${topic}`);
    console.log(`articleType: ${payload.articleType ?? "unknown"}`);
    console.log(`introStyle: ${payload.introStyle ?? "unknown"}`);
    console.log(`failedChecks: ${failedChecks.length > 0 ? failedChecks.join(" | ") : "none"}`);
    console.log(`thresholds: ${JSON.stringify(payload.thresholds ?? {}, null, 2)}`);
    console.log(`actualMetrics: ${JSON.stringify(payload.metrics ?? {}, null, 2)}`);
    console.log("--- summary ---");
    console.log(`why failed: ${failedChecks.length > 0 ? "hard validation checks not met" : "unknown"}`);
    for (const item of parsedFailed) {
        console.log(`below threshold: ${item.metric} (actual=${item.actual}, expected ${item.expected})`);
    }
    console.log(`topic quality signal: ${diagnosis}`);
    console.log(`is failing topic weak/general vs queue: ${matchingGeneralTopicInQueue ? "yes" : "no"}`);
    console.log(`weak/general queued topics count: ${queuedGeneralTopics.length}`);
    if (failedChecks.some((entry) => /totalWordCount|charCountNoSpaces|paragraphCount|sectionCount|h2Count/i.test(entry))) {
        console.log("retry action: use aggressive depth expansion prompt; if depth still does not increase, requeue/skip this topic.");
    }
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
