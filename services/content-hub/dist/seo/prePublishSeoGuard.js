/**
 * Pre-publish SEO guard (warn-only). Keep behavior aligned with `lib/seo/*` in the app repo.
 * This file is self-contained because the content-hub package is compiled with `rootDir: src`.
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "node:url";
import { isSeoTelegramNotifyConfigured, isSeoTelegramNotifyEnabled, sendSeoTelegramNotification } from "./seoTelegramNotify.js";
const SEO_AUDIT_TITLE = { min: 25, max: 70 };
const SEO_AUDIT_META = { min: 120, max: 160 };
const SEO_IDEAL_TITLE = { min: 30, max: 65 };
const SEO_IDEAL_META = { min: 120, max: 160 };
function norm(s) {
    return (s ?? "").replace(/\s+/g, " ").trim();
}
function len(s) {
    return norm(s).length;
}
function inRange(n, min, max) {
    return n >= min && n <= max;
}
function clipEllipsis(s, maxLen) {
    const t = norm(s);
    if (t.length <= maxLen)
        return t;
    if (maxLen <= 1)
        return "…";
    return `${t.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}
export function normalizeSeoPayloadLocal(input) {
    let title = norm(input.title);
    let metaDescription = norm(input.metaDescription);
    if (title.length > SEO_AUDIT_TITLE.max)
        title = clipEllipsis(title, SEO_AUDIT_TITLE.max);
    if (title.length < SEO_AUDIT_TITLE.min && title.length > 0) {
        title = norm(`${title} — Scholarship guide`);
        if (title.length > SEO_AUDIT_TITLE.max)
            title = clipEllipsis(title, SEO_AUDIT_TITLE.max);
    }
    if (metaDescription.length > SEO_AUDIT_META.max) {
        metaDescription = clipEllipsis(metaDescription, SEO_AUDIT_META.max);
    }
    if (metaDescription.length > 0 && metaDescription.length < SEO_AUDIT_META.min) {
        const pad = " Details, eligibility context, and practical steps for applicants.";
        while (metaDescription.length < SEO_AUDIT_META.min) {
            metaDescription = norm(`${metaDescription}${pad}`);
        }
        if (metaDescription.length > SEO_AUDIT_META.max) {
            metaDescription = clipEllipsis(metaDescription, SEO_AUDIT_META.max);
        }
    }
    return { ...input, title, metaDescription };
}
export function validateSeoBeforePublishLocal(payload) {
    const issues = [];
    const warnings = [];
    let score = 100;
    const title = norm(payload.title);
    const meta = norm(payload.metaDescription);
    if (!title) {
        issues.push("title_empty");
        score -= 40;
    }
    else if (!inRange(len(title), SEO_AUDIT_TITLE.min, SEO_AUDIT_TITLE.max)) {
        issues.push("title_length_out_of_audit_range");
        score -= 25;
    }
    else if (!inRange(len(title), SEO_IDEAL_TITLE.min, SEO_IDEAL_TITLE.max)) {
        warnings.push("title_length_not_ideal_band");
        score -= 3;
    }
    if (!meta) {
        issues.push("meta_empty");
        score -= 40;
    }
    else if (!inRange(len(meta), SEO_AUDIT_META.min, SEO_AUDIT_META.max)) {
        issues.push("meta_length_out_of_audit_range");
        score -= 25;
    }
    else if (!inRange(len(meta), SEO_IDEAL_META.min, SEO_IDEAL_META.max)) {
        warnings.push("meta_length_not_ideal_band");
        score -= 3;
    }
    score = Math.max(0, Math.min(100, score));
    return { ok: issues.length === 0, score, issues, warnings };
}
function bucket(v) {
    if (v.score < 90)
        return "below90";
    if (v.warnings.length > 0)
        return "warnings";
    return "ok";
}
function repoRootFromHere() {
    const f = fileURLToPath(import.meta.url);
    // .../services/content-hub/src/seo/prePublishSeoGuard.ts -> four levels up to repo root
    return path.join(path.dirname(f), "..", "..", "..", "..");
}
const WARNINGS_RELATIVE = path.join("docs", "seo-new-content-warnings.json");
const MAX_TAIL = 200;
async function buildTelegramReportForGuardLocal(params) {
    const flagOn = isSeoTelegramNotifyEnabled();
    const credsOk = isSeoTelegramNotifyConfigured();
    const enabled = flagOn && credsOk;
    if (params.counts.warnings === 0 && params.counts.below90 === 0) {
        return { enabled, sent: false, reason: "all_ok" };
    }
    const dryBlocked = Boolean(params.dryRun && !params.notifyInDryRun);
    if (dryBlocked) {
        return { enabled, sent: false, reason: "dry_run" };
    }
    if (!flagOn) {
        return { enabled: false, sent: false, reason: "notify_disabled" };
    }
    if (!credsOk) {
        return { enabled: false, sent: false, reason: "missing_credentials" };
    }
    const level = params.counts.below90 > 0 ? "critical" : "warning";
    const title = params.counts.below90 > 0 ? "🔴 SEO Guard Alert" : "⚠️ SEO Guard Alert";
    const r = await sendSeoTelegramNotification({
        title,
        level,
        counts: params.counts,
        entries: [params.entry]
    });
    return {
        enabled: true,
        sent: r.sent,
        reason: r.sent ? undefined : r.reason,
        sentAt: r.sent ? new Date().toISOString() : undefined
    };
}
async function appendRun(run) {
    const fromEnv = process.env.SEO_NEW_CONTENT_WARNINGS_PATH?.trim();
    const filePath = fromEnv
        ? path.isAbsolute(fromEnv)
            ? fromEnv
            : path.resolve(fromEnv)
        : path.join(repoRootFromHere(), WARNINGS_RELATIVE);
    try {
        let existing = [];
        try {
            const raw = await fs.readFile(filePath, "utf-8");
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed))
                existing = parsed;
        }
        catch {
            existing = [];
        }
        const next = [...existing, run].slice(-MAX_TAIL);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
    }
    catch (e) {
        console.error("[seo-new-content-warnings]", e instanceof Error ? e.message : String(e));
    }
}
export async function runSeoPublishGuardWarnOnlyLocal(params) {
    const normalized = normalizeSeoPayloadLocal(params.payload);
    const validation = validateSeoBeforePublishLocal(normalized);
    const b = bucket(validation);
    console.log(`[seo-publish-guard] url=${normalized.url} type=${normalized.type} bucket=${b} score=${validation.score} issues=${validation.issues.join(";") || "-"} warnings=${validation.warnings.join(";") || "-"}`);
    const counts = b === "ok" ? { ok: 1, warnings: 0, below90: 0 } : b === "warnings" ? { ok: 0, warnings: 1, below90: 0 } : { ok: 0, warnings: 0, below90: 1 };
    const entry = {
        url: normalized.url,
        type: normalized.type,
        score: validation.score,
        issues: validation.issues,
        warnings: validation.warnings
    };
    const telegramNotification = await buildTelegramReportForGuardLocal({
        counts,
        entry,
        dryRun: params.dryRun,
        notifyInDryRun: params.notifyInDryRun
    });
    await appendRun({
        generatedAt: new Date().toISOString(),
        source: params.source,
        counts,
        entries: [entry],
        telegramNotification
    });
    return { normalized, validation };
}
