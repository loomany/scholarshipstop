/**
 * Pre-publish SEO guard (warn-only). Keep behavior aligned with `lib/seo/*` in the app repo.
 * This file is self-contained because the content-hub package is compiled with `rootDir: src`.
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "node:url";

const SEO_AUDIT_TITLE = { min: 25, max: 70 } as const;
const SEO_AUDIT_META = { min: 120, max: 160 } as const;
const SEO_IDEAL_TITLE = { min: 30, max: 65 } as const;
const SEO_IDEAL_META = { min: 120, max: 160 } as const;

export type SeoPageType = "listing" | "scholarship" | "provider" | "essay" | "article" | "compare";

export type SeoPayload = {
  type: SeoPageType;
  url: string;
  title: string;
  metaDescription: string;
};

function norm(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

function len(s: string | null | undefined): number {
  return norm(s).length;
}

function inRange(n: number, min: number, max: number): boolean {
  return n >= min && n <= max;
}

function clipEllipsis(s: string, maxLen: number): string {
  const t = norm(s);
  if (t.length <= maxLen) return t;
  if (maxLen <= 1) return "…";
  return `${t.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

export function normalizeSeoPayloadLocal(input: SeoPayload): SeoPayload {
  let title = norm(input.title);
  let metaDescription = norm(input.metaDescription);
  if (title.length > SEO_AUDIT_TITLE.max) title = clipEllipsis(title, SEO_AUDIT_TITLE.max);
  if (title.length < SEO_AUDIT_TITLE.min && title.length > 0) {
    title = norm(`${title} — Scholarship guide`);
    if (title.length > SEO_AUDIT_TITLE.max) title = clipEllipsis(title, SEO_AUDIT_TITLE.max);
  }
  if (metaDescription.length > SEO_AUDIT_META.max) {
    metaDescription = clipEllipsis(metaDescription, SEO_AUDIT_META.max);
  }
  if (metaDescription.length > 0 && metaDescription.length < SEO_AUDIT_META.min) {
    const pad =
      " Details, eligibility context, and practical steps for applicants.";
    while (metaDescription.length < SEO_AUDIT_META.min) {
      metaDescription = norm(`${metaDescription}${pad}`);
    }
    if (metaDescription.length > SEO_AUDIT_META.max) {
      metaDescription = clipEllipsis(metaDescription, SEO_AUDIT_META.max);
    }
  }
  return { ...input, title, metaDescription };
}

export function validateSeoBeforePublishLocal(payload: SeoPayload): {
  ok: boolean;
  score: number;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];
  let score = 100;
  const title = norm(payload.title);
  const meta = norm(payload.metaDescription);
  if (!title) {
    issues.push("title_empty");
    score -= 40;
  } else if (!inRange(len(title), SEO_AUDIT_TITLE.min, SEO_AUDIT_TITLE.max)) {
    issues.push("title_length_out_of_audit_range");
    score -= 25;
  } else if (!inRange(len(title), SEO_IDEAL_TITLE.min, SEO_IDEAL_TITLE.max)) {
    warnings.push("title_length_not_ideal_band");
    score -= 3;
  }
  if (!meta) {
    issues.push("meta_empty");
    score -= 40;
  } else if (!inRange(len(meta), SEO_AUDIT_META.min, SEO_AUDIT_META.max)) {
    issues.push("meta_length_out_of_audit_range");
    score -= 25;
  } else if (!inRange(len(meta), SEO_IDEAL_META.min, SEO_IDEAL_META.max)) {
    warnings.push("meta_length_not_ideal_band");
    score -= 3;
  }
  score = Math.max(0, Math.min(100, score));
  return { ok: issues.length === 0, score, issues, warnings };
}

function bucket(v: ReturnType<typeof validateSeoBeforePublishLocal>): "ok" | "warnings" | "below90" {
  if (v.score < 90) return "below90";
  if (v.warnings.length > 0) return "warnings";
  return "ok";
}

function repoRootFromHere(): string {
  const f = fileURLToPath(import.meta.url);
  // .../services/content-hub/src/seo/prePublishSeoGuard.ts -> four levels up to repo root
  return path.join(path.dirname(f), "..", "..", "..", "..");
}

const WARNINGS_RELATIVE = path.join("docs", "seo-new-content-warnings.json");
const MAX_TAIL = 200;

async function appendRun(run: {
  generatedAt: string;
  source: string;
  counts: { ok: number; warnings: number; below90: number };
  entries: Array<{
    url: string;
    type: string;
    score: number;
    issues: string[];
    warnings: string[];
  }>;
}): Promise<void> {
  const fromEnv = process.env.SEO_NEW_CONTENT_WARNINGS_PATH?.trim();
  const filePath = fromEnv
    ? path.isAbsolute(fromEnv)
      ? fromEnv
      : path.resolve(fromEnv)
    : path.join(repoRootFromHere(), WARNINGS_RELATIVE);
  try {
    let existing: unknown[] = [];
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) existing = parsed;
    } catch {
      existing = [];
    }
    const next = [...existing, run].slice(-MAX_TAIL);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
  } catch (e) {
    console.error("[seo-new-content-warnings]", e instanceof Error ? e.message : String(e));
  }
}

export async function runSeoPublishGuardWarnOnlyLocal(params: {
  source: string;
  payload: SeoPayload;
}): Promise<{ normalized: SeoPayload; validation: ReturnType<typeof validateSeoBeforePublishLocal> }> {
  const normalized = normalizeSeoPayloadLocal(params.payload);
  const validation = validateSeoBeforePublishLocal(normalized);
  const b = bucket(validation);
  console.log(
    `[seo-publish-guard] url=${normalized.url} type=${normalized.type} bucket=${b} score=${validation.score} issues=${validation.issues.join(";") || "-"} warnings=${validation.warnings.join(";") || "-"}`
  );
  const counts =
    b === "ok" ? { ok: 1, warnings: 0, below90: 0 } : b === "warnings" ? { ok: 0, warnings: 1, below90: 0 } : { ok: 0, warnings: 0, below90: 1 };
  await appendRun({
    generatedAt: new Date().toISOString(),
    source: params.source,
    counts,
    entries: [
      {
        url: normalized.url,
        type: normalized.type,
        score: validation.score,
        issues: validation.issues,
        warnings: validation.warnings
      }
    ]
  });
  return { normalized, validation };
}
