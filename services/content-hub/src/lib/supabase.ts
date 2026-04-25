import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { env } from "../config/env.js";
import { logger } from "./logger.js";
import { addWatermark, WATERMARK_TEXT } from "./image/addWatermark.js";
import { COVER_ASPECT_RATIO_DECIMAL, COVER_HEIGHT, COVER_WIDTH } from "./imageConfig.js";
import type { ContentTopic, RelatedArticle } from "./types.js";

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const MAX_SIZE_BYTES = 500 * 1024;
const JPEG_QUALITIES = [82, 78, 74] as const;

export interface UploadedImageResult {
  path: string;
  publicUrl: string;
  width: number;
  height: number;
  mimeType: "image/jpeg";
  sizeBytes: number;
  filename: string;
  original: {
    width: number | null;
    height: number | null;
    mimeType: string;
    sizeBytes: number;
  };
}

export interface ReusedEssayCoverResult {
  image: UploadedImageResult;
  sourceUrl: string;
  sourceType: "essay_hero";
  sourceTitle: string | null;
}

export type TopicFailureClass =
  | "expansion"
  | "metrics"
  | "openai"
  | "image"
  | "db"
  | "transient"
  | "stale_processing"
  | "other";

export interface TopicStatusMetadata {
  stage?: string;
  error?: string | null;
  failureClass?: TopicFailureClass | null;
}

export async function pickQueuedTopic(): Promise<ContentTopic | null> {
  const { data, error } = await supabase
    .from("content_topics")
    .select("*")
    .eq("status", "queued")
    .order("priority", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as ContentTopic | null;
}

function truncateNullable(value: string | null | undefined, maxLength: number): string | null {
  const clean = value?.trim();
  if (!clean) return null;
  return clean.length > maxLength ? clean.slice(0, maxLength) : clean;
}

export async function updateTopicStatus(
  topicId: string,
  status: "queued" | "processing" | "done" | "failed",
  metadata: TopicStatusMetadata = {}
) {
  const payload: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  const hasFailureMetadata = Boolean(metadata.error || metadata.stage || metadata.failureClass);

  if (status === "processing") {
    payload.last_attempt_at = new Date().toISOString();
  }

  if (status === "done") {
    payload.processed_at = new Date().toISOString();
    payload.last_error = null;
    payload.last_stage = null;
    payload.failure_class = null;
  } else if (hasFailureMetadata) {
    payload.last_error = truncateNullable(metadata.error, 4000);
    payload.last_stage = truncateNullable(metadata.stage, 120);
    payload.failure_class = metadata.failureClass ?? null;
  }

  if (status === "processing") {
    const { error } = await supabase.rpc("mark_content_topic_processing", { p_topic_id: topicId });
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("content_topics").update(payload).eq("id", topicId);
  if (error) throw error;
}

export async function fetchPublishedArticles(limit = 20): Promise<RelatedArticle[]> {
  const { data, error } = await supabase
    .from("content_posts")
    .select("slug,title")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as RelatedArticle[];
}

export async function fetchPublishedArticleSlugs(slugs: string[]): Promise<string[]> {
  if (slugs.length === 0) return [];

  const { data, error } = await supabase
    .from("content_posts")
    .select("slug")
    .eq("status", "published")
    .in("slug", slugs);

  if (error) throw error;
  return (data ?? []).map((row) => row.slug as string);
}

type EssayHeroCandidate = {
  title: string | null;
  slug: string | null;
  hero_image_url: string | null;
};

function normalizeTokens(input: string): Set<string> {
  return new Set(
    input
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/[\s-]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 4)
  );
}

function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function scoreEssayHeroCandidate(candidate: EssayHeroCandidate, topic: string, title: string): number {
  const targetTokens = normalizeTokens(`${topic} ${title}`);
  const candidateTokens = normalizeTokens(`${candidate.title ?? ""} ${candidate.slug ?? ""}`);
  let score = 0;
  for (const token of targetTokens) {
    if (candidateTokens.has(token)) score += 3;
  }
  for (const token of candidateTokens) {
    if (token.includes("essay")) score += 1;
    if (token.includes("scholarship")) score += 1;
    if (token.includes("student")) score += 1;
  }
  return score;
}

async function fetchRecentlyUsedCoverSourceUrls(limit = 36): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("content_posts")
    .select("cover_image_source_url, cover_image_url")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  const used = new Set<string>();
  for (const row of data ?? []) {
    const source = typeof row.cover_image_source_url === "string" ? row.cover_image_source_url.trim() : "";
    const cover = typeof row.cover_image_url === "string" ? row.cover_image_url.trim() : "";
    if (source) used.add(source);
    if (cover) used.add(cover);
  }
  return used;
}

export async function reuseEssayHeroCover(params: {
  topic: string;
  title: string;
  slug: string;
  fileName: string;
}): Promise<ReusedEssayCoverResult | null> {
  const { data, error } = await supabase
    .from("essays")
    .select("title,slug,hero_image_url")
    .eq("is_published", true)
    .eq("hero_is_real", true)
    .not("hero_image_url", "is", null)
    .neq("hero_image_url", "")
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(800);
  if (error) throw error;

  const seen = new Set<string>();
  const candidates = ((data ?? []) as EssayHeroCandidate[]).filter((candidate) => {
    const url = candidate.hero_image_url?.trim();
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
  if (candidates.length === 0) return null;

  const recentUsed = await fetchRecentlyUsedCoverSourceUrls();
  const ranked = candidates
    .map((candidate) => ({
      candidate,
      score: scoreEssayHeroCandidate(candidate, params.topic, params.title)
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ah = stableHash(`${params.slug}:${a.candidate.hero_image_url}`);
      const bh = stableHash(`${params.slug}:${b.candidate.hero_image_url}`);
      return ah - bh;
    });

  const picked =
    ranked.find(({ candidate }) => !recentUsed.has(candidate.hero_image_url!.trim()))?.candidate ??
    ranked[stableHash(params.slug) % ranked.length]?.candidate;
  const sourceUrl = picked?.hero_image_url?.trim();
  if (!sourceUrl) return null;

  const image = await uploadImageFromUrl({
    imageUrl: sourceUrl,
    fileName: params.fileName
  });

  return {
    image,
    sourceUrl,
    sourceType: "essay_hero",
    sourceTitle: picked.title ?? null
  };
}

export async function slugExists(slug: string): Promise<boolean> {
  const { data, error } = await supabase.from("content_posts").select("id").eq("slug", slug).limit(1);
  if (error) throw error;
  return Boolean(data && data.length > 0);
}

function mapFormatToMimeType(format?: string): string {
  switch (format) {
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "avif":
      return "image/avif";
    default:
      return "application/octet-stream";
  }
}

async function processToJpeg(
  sourceBuffer: Buffer,
  quality: number,
  shouldFlatten: boolean,
  copyright?: string
): Promise<Buffer> {
  let pipeline = sharp(sourceBuffer).rotate().resize(COVER_WIDTH, COVER_HEIGHT, {
    fit: "cover",
    position: "centre"
  });

  if (shouldFlatten) {
    pipeline = pipeline.flatten({ background: "#ffffff" });
  }

  if (copyright) {
    pipeline = pipeline.withMetadata({ copyright });
  }

  return pipeline
    .jpeg({
      quality,
      mozjpeg: true,
      chromaSubsampling: "4:2:0"
    })
    .toBuffer();
}

export async function uploadImageFromUrl(params: {
  imageUrl: string;
  fileName: string;
}): Promise<UploadedImageResult> {
  const response = await fetch(params.imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
  }

  const sourceBuffer = Buffer.from(await response.arrayBuffer());
  const watermarkEnabled = env.IMAGE_WATERMARK_ENABLED === 1;
  let sourceForProcessing = sourceBuffer;

  if (watermarkEnabled) {
    logger.info("watermark processing started", { imageUrl: params.imageUrl, fileName: params.fileName });
    sourceForProcessing = Buffer.from(await addWatermark(sourceBuffer));
    logger.info("watermark applied", {
      fileName: params.fileName,
      watermarkText: WATERMARK_TEXT
    });
  }

  const originalContentType = response.headers.get("content-type") ?? "application/octet-stream";
  const originalMetadata = await sharp(sourceBuffer).metadata();
  const sourceMetadata = await sharp(sourceForProcessing).metadata();
  const originalMimeType = originalContentType.includes("/")
    ? originalContentType.split(";")[0].trim().toLowerCase()
    : mapFormatToMimeType(originalMetadata.format);

  const shouldFlatten = Boolean(sourceMetadata.hasAlpha);

  let selectedBuffer: Buffer | null = null;
  let selectedQuality = JPEG_QUALITIES[JPEG_QUALITIES.length - 1];

  for (const quality of JPEG_QUALITIES) {
    const candidate = await processToJpeg(
      sourceForProcessing,
      quality,
      shouldFlatten,
      watermarkEnabled ? WATERMARK_TEXT : undefined
    );
    selectedBuffer = candidate;
    selectedQuality = quality;
    if (candidate.byteLength <= MAX_SIZE_BYTES) {
      break;
    }
  }

  if (!selectedBuffer) {
    throw new Error("Image processing failed: no output buffer generated");
  }

  const processedMetadata = await sharp(selectedBuffer).metadata();
  const processedWidth = processedMetadata.width ?? COVER_WIDTH;
  const processedHeight = processedMetadata.height ?? COVER_HEIGHT;
  const processedAspectRatio = processedWidth / processedHeight;

  if (Math.abs(processedAspectRatio - COVER_ASPECT_RATIO_DECIMAL) > 0.001) {
    throw new Error(
      `Image processing failed: expected 16:9 output, got ${processedWidth}x${processedHeight} (${processedAspectRatio.toFixed(4)})`
    );
  }

  const path = `content-hub/${new Date().toISOString().slice(0, 10)}/${params.fileName}`;

  const { error: uploadError } = await supabase.storage.from("content-images").upload(path, selectedBuffer, {
    upsert: false,
    contentType: "image/jpeg"
  });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("content-images").getPublicUrl(path);

  if (selectedBuffer.byteLength > MAX_SIZE_BYTES) {
    console.warn(
      JSON.stringify({
        level: "warn",
        message: "processed image still above max size; uploaded best effort result",
        targetMaxBytes: MAX_SIZE_BYTES,
        actualSizeBytes: selectedBuffer.byteLength,
        selectedQuality,
        path,
        ts: new Date().toISOString()
      })
    );
  }

  return {
    path,
    publicUrl: data.publicUrl,
    width: processedWidth,
    height: processedHeight,
    mimeType: "image/jpeg",
    sizeBytes: selectedBuffer.byteLength,
    filename: params.fileName,
    original: {
      width: originalMetadata.width ?? null,
      height: originalMetadata.height ?? null,
      mimeType: originalMimeType,
      sizeBytes: sourceBuffer.byteLength
    }
  };
}
