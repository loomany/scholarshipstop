import { env } from "../config/env.js";
import { extractImageUrlFromFalJson } from "./extractImageUrlFromFalJson.js";
/** FLUX.1 [dev] — same model as ScholarshipTop Essay Hub / resource cover reference. */
const FAL_FLUX_DEV_MODEL_ID = "fal-ai/flux/dev";
const FAL_ENDPOINT = `https://fal.run/${FAL_FLUX_DEV_MODEL_ID}`;
export class FalTimeoutError extends Error {
    timeoutMs;
    constructor(timeoutMs) {
        super(`FAL request timeout after ${timeoutMs}ms`);
        this.name = "FalTimeoutError";
        this.timeoutMs = timeoutMs;
    }
}
function falMaxAttempts() {
    return Math.max(1, Math.min(5, env.FAL_HERO_MAX_ATTEMPTS));
}
/** Single HTTP attempt timeout (clamped 30s–300s), aligned with main-site Essay Hub. */
function falSingleRequestTimeoutMs() {
    const hero = env.FAL_HERO_REQUEST_TIMEOUT_MS;
    if (hero !== undefined && hero >= 30_000)
        return Math.min(hero, 300_000);
    const n = env.FAL_REQUEST_TIMEOUT_MS;
    return Math.min(Math.max(n, 30_000), 300_000);
}
function buildFluxDevImageBody(prompt) {
    const w = Math.max(256, Math.min(4096, env.FLUX_HERO_WIDTH));
    const h = Math.max(256, Math.min(4096, env.FLUX_HERO_HEIGHT));
    const steps = Math.max(12, Math.min(50, env.FLUX_HERO_INFERENCE_STEPS));
    return {
        prompt,
        image_size: { width: w, height: h },
        num_inference_steps: steps,
        guidance_scale: 3.5,
        num_images: 1,
        enable_safety_checker: env.FLUX_HERO_DISABLE_SAFETY_CHECKER === 0,
        output_format: "jpeg"
    };
}
function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
function shouldRetryFalAttempt(attemptIndex, maxAttempts, r) {
    if (attemptIndex >= maxAttempts - 1)
        return false;
    if (r.detail === "FAL_KEY missing")
        return false;
    if (r.url?.startsWith("http"))
        return false;
    const s = r.httpStatus;
    if (s === 401 || s === 402 || s === 403 || s === 400)
        return false;
    if (s === 429 || s === 408 || s === 502 || s === 503 || s === 504)
        return true;
    if (s === 0)
        return true;
    if (s === 200 && r.detail.includes("no image URL"))
        return true;
    return false;
}
async function postFluxDevImageOnce(fullImagePrompt) {
    const key = env.FAL_KEY?.trim();
    if (!key) {
        return { url: null, httpStatus: 0, detail: "FAL_KEY missing" };
    }
    const prompt = fullImagePrompt.trim().slice(0, 8000);
    const falBody = buildFluxDevImageBody(prompt);
    const timeoutMs = falSingleRequestTimeoutMs();
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);
    let response;
    try {
        response = await fetch(FAL_ENDPOINT, {
            method: "POST",
            headers: {
                Authorization: `Key ${key}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(falBody),
            signal: abortController.signal
        });
    }
    catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
            throw new FalTimeoutError(timeoutMs);
        }
        const msg = error instanceof Error ? error.message : String(error);
        return { url: null, httpStatus: 0, detail: `fetch error: ${msg}` };
    }
    finally {
        clearTimeout(timeoutId);
    }
    const json = (await response.json().catch(() => null));
    const raw = json && typeof json === "object" ? JSON.stringify(json).slice(0, 900) : String(json);
    if (!response.ok) {
        return {
            url: null,
            httpStatus: response.status,
            detail: `HTTP ${response.status} ${raw}`
        };
    }
    const url = extractImageUrlFromFalJson(json);
    if (!url) {
        return {
            url: null,
            httpStatus: response.status,
            detail: `200 but no image URL in JSON: ${raw}`
        };
    }
    return { url, httpStatus: response.status, detail: "ok" };
}
async function runFalImageAttemptLoop(attemptOne, logPrefix) {
    const maxAttempts = falMaxAttempts();
    let last = { url: null, httpStatus: 0, detail: "no attempts" };
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        last = await attemptOne();
        if (last.url?.startsWith("http"))
            return last;
        if (!shouldRetryFalAttempt(attempt, maxAttempts, last))
            break;
        const backoff = 1200 * 2 ** attempt + Math.floor(Math.random() * 400);
        console.error(`${logPrefix} FAL attempt ${attempt + 1}/${maxAttempts} failed; retry in ${backoff}ms`, { httpStatus: last.httpStatus, detail: last.detail.slice(0, 500) });
        await sleep(backoff);
    }
    console.error(`${logPrefix} FAL gave up after retries`, {
        attempts: maxAttempts,
        httpStatus: last.httpStatus,
        detail: last.detail.slice(0, 800)
    });
    return last;
}
/**
 * Cover image: Fal **FLUX.1 [dev]** only (not Nano Banana). Same contract as before — `{ url }` for download + sharp pipeline in `supabase.ts`.
 */
export async function generateImage(prompt) {
    const r = await runFalImageAttemptLoop(() => postFluxDevImageOnce(prompt), "[content-hub-cover]");
    if (!r.url?.startsWith("http")) {
        throw new Error(`FAL image generation failed after ${falMaxAttempts()} attempt(s). ${r.detail}`);
    }
    return { url: r.url };
}
