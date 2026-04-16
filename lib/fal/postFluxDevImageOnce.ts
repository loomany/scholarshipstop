import { extractImageUrlFromFalJson } from '@/lib/fal/extractImageUrlFromFalJson';
import type { FalImageAttemptResult } from '@/lib/fal/falAttemptTypes';
import { falRequestTimeoutMs } from '@/lib/fal/falAttemptRetry';

/** FLUX.1 [dev] — used for Essay Hub heroes and Content Hub resource covers (16:9). */
export const FAL_FLUX_DEV_MODEL_ID = 'fal-ai/flux/dev' as const;

export function buildFluxDevImageBody(prompt: string): Record<string, unknown> {
  const w = Math.max(
    256,
    Math.min(4096, Number.parseInt(process.env.FLUX_HERO_WIDTH?.trim() || '704', 10) || 704)
  );
  const h = Math.max(
    256,
    Math.min(4096, Number.parseInt(process.env.FLUX_HERO_HEIGHT?.trim() || '396', 10) || 396)
  );
  const steps = Math.max(
    12,
    Math.min(50, Number.parseInt(process.env.FLUX_HERO_INFERENCE_STEPS?.trim() || '28', 10) || 28)
  );
  return {
    prompt,
    image_size: { width: w, height: h },
    num_inference_steps: steps,
    guidance_scale: 3.5,
    num_images: 1,
    enable_safety_checker:
      process.env.FLUX_HERO_DISABLE_SAFETY_CHECKER?.trim() === '1' ? false : true,
    output_format: 'jpeg'
  };
}

/**
 * Single `POST https://fal.run/fal-ai/flux/dev` — no retries (see `runFalImageAttemptLoop`).
 */
export async function postFluxDevImageOnce(fullImagePrompt: string): Promise<FalImageAttemptResult> {
  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return { url: null, httpStatus: 0, detail: 'FAL_KEY missing' };
  }

  const endpoint = `https://fal.run/${FAL_FLUX_DEV_MODEL_ID}`;
  const prompt = fullImagePrompt.trim().slice(0, 8000);
  const falBody = buildFluxDevImageBody(prompt);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Key ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(falBody),
      signal: AbortSignal.timeout(falRequestTimeoutMs())
    });
    const json = (await res.json().catch(() => null)) as unknown;
    const raw =
      json && typeof json === 'object'
        ? JSON.stringify(json).slice(0, 900)
        : String(json);
    if (!res.ok) {
      return {
        url: null,
        httpStatus: res.status,
        detail: `HTTP ${res.status} ${raw}`
      };
    }
    const url = extractImageUrlFromFalJson(json);
    if (!url) {
      return {
        url: null,
        httpStatus: res.status,
        detail: `200 but no image URL in JSON: ${raw}`
      };
    }
    return { url, httpStatus: res.status, detail: 'ok' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { url: null, httpStatus: 0, detail: `fetch error: ${msg}` };
  }
}
