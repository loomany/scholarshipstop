import { env } from "../config/env.js";
import { logger } from "./logger.js";

type TriggerArticleMatchingParams = {
  postId?: string;
  slug?: string;
};

function getArticleMatchingEndpoint(): string | null {
  const route = env.CONTENT_ARTICLE_MATCH_PATH.trim();
  if (!route) return null;
  const normalizedRoute = route.startsWith("/") ? route : `/${route}`;
  return new URL(normalizedRoute, env.SITE_URL).toString();
}

export async function triggerArticleMatching(params: TriggerArticleMatchingParams): Promise<void> {
  const endpoint = getArticleMatchingEndpoint();
  const secret = env.CONTENT_ARTICLE_MATCH_SECRET.trim();

  if (!endpoint) {
    logger.info("article matching trigger skipped", { reason: "CONTENT_ARTICLE_MATCH_PATH is empty" });
    return;
  }

  if (!secret) {
    logger.info("article matching trigger skipped", { reason: "CONTENT_ARTICLE_MATCH_SECRET is empty" });
    return;
  }

  if (!params.postId && !params.slug) {
    logger.info("article matching trigger skipped", { reason: "missing postId and slug" });
    return;
  }

  const payload = params.postId ? { postId: params.postId } : { slug: params.slug };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const responseBody = await response.text();
      logger.error("article matching trigger failed", {
        endpoint,
        postId: params.postId,
        slug: params.slug,
        status: response.status,
        body: responseBody.slice(0, 500)
      });
      return;
    }

    logger.info("article matching trigger succeeded", {
      endpoint,
      postId: params.postId,
      slug: params.slug,
      status: response.status
    });
  } catch (error) {
    logger.error("article matching trigger error", {
      endpoint,
      postId: params.postId,
      slug: params.slug,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
