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

export async function updateTopicStatus(topicId: string, status: "queued" | "processing" | "done" | "failed") {
  const payload: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "done") {
    payload.processed_at = new Date().toISOString();
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
