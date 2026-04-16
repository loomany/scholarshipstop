/**
 * Content Hub — `content_posts` cover images (`cover_image_url`).
 * Always uses **FLUX.1 [dev]** (`fal-ai/flux/dev`) — same model family as Essay Hub heroes.
 * (which only switches Essay Hub /essay heroes between FLUX and Nano Banana).
 *
 * Wire this into the job or script that generates resource article covers before INSERT into `content_posts`.
 */
import { runFalImageAttemptLoop } from '@/lib/fal/falAttemptRetry';
import type { FalImageAttemptResult } from '@/lib/fal/falAttemptTypes';
import {
  FAL_FLUX_DEV_MODEL_ID,
  postFluxDevImageOnce
} from '@/lib/fal/postFluxDevImageOnce';

export { FAL_FLUX_DEV_MODEL_ID as CONTENT_RESOURCE_COVER_FAL_MODEL };

export type ResourceCoverResolveMeta = {
  url: string | null;
  detail: string;
  httpStatus: number;
};

/**
 * FLUX-only cover URL with the same retry policy as Essay Hub FLUX (`FAL_HERO_MAX_ATTEMPTS`, etc.).
 */
export async function tryResolveResourceCoverImageUrlWithMeta(
  fullImagePrompt: string
): Promise<ResourceCoverResolveMeta> {
  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return { url: null, detail: 'FAL_KEY missing', httpStatus: 0 };
  }

  const r: FalImageAttemptResult = await runFalImageAttemptLoop(
    () => postFluxDevImageOnce(fullImagePrompt),
    '[content-resource-cover]'
  );
  return {
    url: r.url?.startsWith('http') ? r.url : null,
    detail: r.detail,
    httpStatus: r.httpStatus
  };
}

export async function tryResolveResourceCoverImageUrl(
  fullImagePrompt: string
): Promise<string | null> {
  const { url } = await tryResolveResourceCoverImageUrlWithMeta(fullImagePrompt);
  return url;
}
