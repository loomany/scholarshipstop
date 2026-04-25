import "dotenv/config";
import { z } from "zod";
const booleanFromEnv = z.preprocess((value) => {
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["1", "true", "yes", "on"].includes(normalized))
            return true;
        if (["0", "false", "no", "off"].includes(normalized))
            return false;
    }
    return value;
}, z.boolean());
const envSchema = z.object({
    OPENAI_API_KEY: z.string().min(1),
    OPENAI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(90000),
    OPENAI_MODEL_STANDARD: z.string().default("gpt-4.1-mini"),
    OPENAI_MODEL_SMART: z.string().default("gpt-4.1"),
    /** Chat Completions output cap (long articles + JSON). */
    OPENAI_MAX_COMPLETION_TOKENS: z.coerce.number().int().positive().default(16384),
    FAL_KEY: z.string().default(""),
    FAL_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(180000),
    /** FLUX.1 [dev] — generation size (default 704×16:9-style height, matches main-site Essay Hub). */
    FLUX_HERO_WIDTH: z.coerce.number().int().min(256).max(4096).default(704),
    FLUX_HERO_HEIGHT: z.coerce.number().int().min(256).max(4096).default(396),
    FLUX_HERO_INFERENCE_STEPS: z.coerce.number().int().min(12).max(50).default(28),
    /** 0 = safety checker on (default); 1 = off */
    FLUX_HERO_DISABLE_SAFETY_CHECKER: z.coerce.number().int().min(0).max(1).default(0),
    FAL_HERO_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(5).default(3),
    /** Optional override per attempt; 30s–300s. If unset, uses FAL_REQUEST_TIMEOUT_MS (clamped). */
    FAL_HERO_REQUEST_TIMEOUT_MS: z.preprocess((val) => {
        if (val === undefined || val === "")
            return undefined;
        const n = Number(val);
        if (!Number.isFinite(n) || n < 30_000)
            return undefined;
        return Math.min(n, 300_000);
    }, z.number().int().optional()),
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    METRICS_STRICTNESS: z.enum(["strict", "medium", "relaxed"]).default("strict"),
    PUBLICATION_INTERVAL_MINUTES: z.coerce.number().int().positive().default(360),
    CONTINUOUS_MODE: booleanFromEnv.default(false),
    RUN_REPROCESS_ON_START: booleanFromEnv.default(false),
    PROCESS_EXTERNAL_LINKS: booleanFromEnv.default(false),
    PROCESS_INTERNAL_LINKS: booleanFromEnv.default(false),
    PROCESS_FORCE_UPDATE: booleanFromEnv.default(false),
    SITE_URL: z.string().url().default("https://yourdomain.com"),
    CONTENT_ARTICLE_MATCH_PATH: z.string().default("/api/internal/resources/apply-article-matching"),
    CONTENT_ARTICLE_MATCH_SECRET: z.string().default(""),
    CONTENT_HUB_AUTO_PUBLISH: z.coerce.number().default(0),
    CONTENT_HUB_REQUIRE_COVER_FOR_PUBLISH: z.coerce.number().int().min(0).max(1).default(1),
    CONTENT_HUB_POSTS_PER_RUN: z.coerce.number().int().positive().default(1),
    CONTENT_HUB_MIN_WORDS: z.coerce.number().int().positive().default(1100),
    CONTENT_HUB_MIN_CHARS_NO_SPACES: z.coerce.number().int().positive().default(6500),
    CONTENT_HUB_LENGTH_MULTIPLIER: z.coerce.number().positive().max(1).default(0.5),
    CONTENT_HUB_ENABLE_SCHOLARSHIP_LINKING: z.coerce.number().int().min(0).max(1).default(1),
    CONTENT_HUB_ENABLE_FAQ_LINKS: z.coerce.number().int().min(0).max(1).default(1),
    CONTENT_HUB_ENABLE_RELATED_ARTICLES: z.coerce.number().int().min(0).max(1).default(1),
    CONTENT_HUB_ENABLE_EXTERNAL_LINKS: z.coerce.number().int().min(0).max(1).default(1),
    CONTENT_HUB_MAX_SCHOLARSHIP_LINKS: z.coerce.number().int().positive().default(4),
    CONTENT_HUB_MAX_FAQ_LINKS: z.coerce.number().int().positive().default(3),
    CONTENT_HUB_MAX_RELATED_ARTICLES: z.coerce.number().int().positive().default(4),
    CONTENT_HUB_MIN_RELATED_ARTICLES: z.coerce.number().int().positive().default(2),
    CONTENT_HUB_COVER_SOURCE: z.enum(["essay_reuse", "fal"]).default("essay_reuse"),
    CONTENT_HUB_FAL_FALLBACK: z.coerce.number().int().min(0).max(1).default(0),
    CONTENT_HUB_MAX_TOPIC_ATTEMPTS: z.coerce.number().int().positive().default(3),
    CONTENT_HUB_STALE_PROCESSING_HOURS: z.coerce.number().positive().default(2),
    IMAGE_WATERMARK_ENABLED: z.coerce.number().default(1),
    IMAGE_WATERMARK_TEXT: z.string().default("ScholarshipTop.com")
});
export const env = envSchema.parse(process.env);
