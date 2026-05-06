import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

type Confidence = "CONFIRMED" | "LIKELY" | "POSSIBLE" | "NOISE";
type IncidentType =
  | "cache_cookies_misuse"
  | "unstable_cache_violation"
  | "supabase_auth_misuse"
  | "reconnect_loop"
  | "telegram_failure"
  | "http_500"
  | "http_429"
  | "oom"
  | "parser_crash";

type ParsedLine = {
  source: string;
  service: string;
  timestampMs?: number;
  level: string;
  message: string;
  raw: string;
};

type Evidence = {
  source: string;
  timestamp?: string;
  message: string;
};

type Incident = {
  type: IncidentType;
  title: string;
  service: string;
  confidence: Confidence;
  severity: "low" | "medium" | "high";
  probableRootCause: string;
  recommendedFix: string;
  evidence: Evidence[];
};

type NoiseRecord = {
  token: string;
  source: string;
  message: string;
  reason: string;
};

const LOGS_DIR = join(process.cwd(), "logs");
const REPORTS_DIR = join(process.cwd(), "reports");
const LOG_ANALYSIS_REPORT = join(REPORTS_DIR, "log-analysis.md");
const CONFIRMED_REPORT = join(REPORTS_DIR, "confirmed-incidents.md");
const CURRENT_ISSUES_REPORT = join(REPORTS_DIR, "railway-current-issues.md");

const EXCLUSIONS = {
  email: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  uuid: /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  hash: /\b[a-f0-9]{24,}\b/i,
  queryParam: /[?&][^=\s]+=[^&\s]+/i,
  url: /https?:\/\/[^\s]+/i,
  base64: /\b[A-Za-z0-9+/]{24,}={0,2}\b/,
};

const INCIDENT_TITLES: Record<IncidentType, string> = {
  cache_cookies_misuse: "Cache/cookies misuse",
  unstable_cache_violation: "unstable_cache violation",
  supabase_auth_misuse: "Supabase auth misuse",
  reconnect_loop: "Repeated reconnect loop",
  telegram_failure: "Telegram notification failure",
  http_500: "HTTP 500 repeated failures",
  http_429: "HTTP 429 rate limits",
  oom: "Out-of-memory crash signal",
  parser_crash: "Parser crash/error",
};

const INCIDENT_META: Record<
  IncidentType,
  { severity: "low" | "medium" | "high"; rootCause: string; fix: string }
> = {
  cache_cookies_misuse: {
    severity: "high",
    rootCause: "Dynamic cookie access used inside cache scope.",
    fix: "Read cookies outside cache function and pass dynamic values as args.",
  },
  unstable_cache_violation: {
    severity: "high",
    rootCause: "Next.js unstable_cache runtime constraint violation.",
    fix: "Refactor cached path to avoid dynamic data APIs inside unstable_cache.",
  },
  supabase_auth_misuse: {
    severity: "medium",
    rootCause: "Auth/session flow likely misused in Supabase calls.",
    fix: "Audit getSession/getUser usage and token propagation for failing code path.",
  },
  reconnect_loop: {
    severity: "medium",
    rootCause: "Collector stream instability with repeated disconnects.",
    fix: "Add jittered backoff, monitor network/CLI stability, and track gap duration.",
  },
  telegram_failure: {
    severity: "medium",
    rootCause: "Missing recipient mapping/config for Telegram notifications.",
    fix: "Validate TELEGRAM_ADMIN_IDS/telegram_users mapping and add fallback recipients.",
  },
  http_500: {
    severity: "high",
    rootCause: "Server-side API failure under repeated requests.",
    fix: "Trace failing endpoint by reqId and add explicit structured error + status logging.",
  },
  http_429: {
    severity: "medium",
    rootCause: "Rate limiting on upstream/downstream API.",
    fix: "Tune retry/backoff and request burst behavior.",
  },
  oom: {
    severity: "high",
    rootCause: "Process memory pressure likely reached OOM threshold.",
    fix: "Capture heap/runtime memory metrics and investigate workload spikes.",
  },
  parser_crash: {
    severity: "medium",
    rootCause: "Parser path throws repeated errors/exceptions.",
    fix: "Add input guards and structured parser error handling.",
  },
};

function listLogFiles(dir: string): string[] {
  const out: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listLogFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".log")) {
      out.push(full);
    }
  }
  return out;
}

function inferServiceFromPath(filePath: string): string {
  const rel = relative(LOGS_DIR, filePath).replace(/\\/g, "/");
  if (rel.startsWith("live/")) {
    const parts = rel.split("/");
    return (parts[1] || "unknown").toLowerCase();
  }
  return rel.replace(/\.log$/i, "").toLowerCase();
}

function parseLines(filePath: string): ParsedLine[] {
  const content = readFileSync(filePath, "utf8");
  const service = inferServiceFromPath(filePath);
  const rel = relative(process.cwd(), filePath).replace(/\\/g, "/");
  const lines = content.split(/\r?\n/).filter(Boolean);

  return lines.map((raw) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      return { source: rel, service, level: "info", message: "", raw: trimmed };
    }

    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const message = typeof parsed.message === "string" ? parsed.message : trimmed;
      const level = typeof parsed.level === "string" ? parsed.level.toLowerCase() : "info";
      const timestamp =
        typeof parsed.timestamp === "string" ? Date.parse(parsed.timestamp) : undefined;
      return {
        source: rel,
        service,
        timestampMs: Number.isFinite(timestamp) ? timestamp : undefined,
        level,
        message,
        raw: trimmed,
      };
    } catch {
      return { source: rel, service, level: "info", message: trimmed, raw: trimmed };
    }
  });
}

function isNoiseMatch(token: IncidentType, line: ParsedLine): { noisy: boolean; reason?: string } {
  const msg = line.message;
  if (token === "oom") {
    if (EXCLUSIONS.email.test(msg)) return { noisy: true, reason: "email token contains 'oom'" };
    if (/\bloom\b/i.test(msg)) return { noisy: true, reason: "substring token collision" };
  }
  if (token === "http_500" || token === "http_429") {
    const hasExplicitStatus =
      /\bhttp\s*(500|429)\b/i.test(msg) ||
      /\bresponse\s*(500|429)\b/i.test(msg) ||
      /\bstatus(?:Code)?["'\s:=]+\s*(500|429)\b/i.test(msg) ||
      /"httpStatus"\s*:\s*(500|429)\b/i.test(msg);
    if (!hasExplicitStatus && (EXCLUSIONS.url.test(msg) || EXCLUSIONS.queryParam.test(msg))) {
      return { noisy: true, reason: "numeric token in url/query without explicit status" };
    }
  }
  return { noisy: false };
}

function isHttp500(line: ParsedLine): boolean {
  const m = line.message;
  return (
    /\bhttp\s*500\b/i.test(m) ||
    /\bresponse\s*500\b/i.test(m) ||
    /\bstatus(?:Code)?["'\s:=]+\s*500\b/i.test(m) ||
    /"httpStatus"\s*:\s*500\b/i.test(m)
  );
}

function isHttp429(line: ParsedLine): boolean {
  const m = line.message;
  return (
    /\bhttp\s*429\b/i.test(m) ||
    /\bresponse\s*429\b/i.test(m) ||
    /\bstatus(?:Code)?["'\s:=]+\s*429\b/i.test(m) ||
    /"httpStatus"\s*:\s*429\b/i.test(m) ||
    /\brate limit(ed|ing)?\b/i.test(m)
  );
}

function proximityOk(lines: ParsedLine[]): boolean {
  const withTs = lines
    .map((l) => l.timestampMs)
    .filter((v): v is number => typeof v === "number")
    .sort((a, b) => a - b);
  if (withTs.length < 2) return false;
  return withTs[withTs.length - 1] - withTs[0] <= 10 * 60 * 1000;
}

function classify(lines: ParsedLine[], hasCorrelatedRestartCrash: boolean): Confidence {
  const evidence = lines.length;
  if (
    evidence >= 2 &&
    (proximityOk(lines) || hasCorrelatedRestartCrash || evidence >= 3)
  ) {
    return "CONFIRMED";
  }
  if (evidence >= 2) return "LIKELY";
  if (evidence === 1) return "POSSIBLE";
  return "NOISE";
}

function toEvidence(lines: ParsedLine[]): Evidence[] {
  return lines.slice(0, 5).map((line) => ({
    source: line.source,
    timestamp: line.timestampMs ? new Date(line.timestampMs).toISOString() : undefined,
    message: line.message.slice(0, 300),
  }));
}

function collectIncidents(lines: ParsedLine[]): { incidents: Incident[]; noise: NoiseRecord[] } {
  const grouped = new Map<string, ParsedLine[]>();
  const noise: NoiseRecord[] = [];

  for (const line of lines) {
    const msg = line.message;
    if (/oom/i.test(msg) && EXCLUSIONS.email.test(msg)) {
      noise.push({
        token: "OOM",
        source: line.source,
        message: line.message.slice(0, 240),
        reason: "downgraded: email contains 'oom' substring",
      });
    }

    const tokens: IncidentType[] = [];
    if (/cookies/i.test(msg) && /cache/i.test(msg)) tokens.push("cache_cookies_misuse");
    if (/unstable_cache/i.test(msg)) tokens.push("unstable_cache_violation");
    if (/supabase/i.test(msg) && /(auth|jwt|session|token|claims)/i.test(msg)) {
      tokens.push("supabase_auth_misuse");
    }
    if (/stream disconnected; reconnect #/i.test(msg) || /reconnect #\d+/i.test(msg)) {
      tokens.push("reconnect_loop");
    }
    if (/telegram/i.test(msg) && /(failed|error|no recipient|chat ids)/i.test(msg)) {
      tokens.push("telegram_failure");
    }
    if (/parser/i.test(msg) && /(crash|failed|exception|error)/i.test(msg)) {
      tokens.push("parser_crash");
    }
    if (isHttp500(line)) tokens.push("http_500");
    if (isHttp429(line)) tokens.push("http_429");
    if (/\bout of memory\b|\boom killer\b|killed process/i.test(msg)) tokens.push("oom");

    for (const token of tokens) {
      const noiseCheck = isNoiseMatch(token, line);
      if (noiseCheck.noisy) {
        noise.push({
          token: token.toUpperCase(),
          source: line.source,
          message: line.message.slice(0, 240),
          reason: noiseCheck.reason ?? "generic exclusion",
        });
        continue;
      }
      const key = `${line.service}::${token}`;
      const arr = grouped.get(key) ?? [];
      arr.push(line);
      grouped.set(key, arr);
    }
  }

  const incidents: Incident[] = [];
  for (const [key, bucket] of grouped) {
    const [service, typeRaw] = key.split("::");
    const type = typeRaw as IncidentType;
    const hasRestartCrash = bucket.some((line) =>
      /(restart|crash|deployment.*(failed|crash))/i.test(line.message),
    );
    const confidence = classify(bucket, hasRestartCrash);
    if (confidence === "NOISE") continue;
    incidents.push({
      type,
      title: INCIDENT_TITLES[type],
      service,
      confidence,
      severity: INCIDENT_META[type].severity,
      probableRootCause: INCIDENT_META[type].rootCause,
      recommendedFix: INCIDENT_META[type].fix,
      evidence: toEvidence(bucket),
    });
  }

  return { incidents, noise };
}

function buildUnstableRanking(incidents: Incident[]): Array<{ service: string; score: number }> {
  const scores = new Map<string, number>();
  const weight: Record<Confidence, number> = {
    CONFIRMED: 5,
    LIKELY: 3,
    POSSIBLE: 1,
    NOISE: 0,
  };
  for (const incident of incidents) {
    const sevBonus = incident.severity === "high" ? 2 : incident.severity === "medium" ? 1 : 0;
    const current = scores.get(incident.service) ?? 0;
    scores.set(incident.service, current + weight[incident.confidence] + sevBonus);
  }
  return [...scores.entries()]
    .map(([service, score]) => ({ service, score }))
    .sort((a, b) => b.score - a.score);
}

function buildConfirmedIncidentsReport(
  incidents: Incident[],
  noise: NoiseRecord[],
  ranking: Array<{ service: string; score: number }>,
): string {
  const byConfidence = (c: Confidence) => incidents.filter((i) => i.confidence === c);
  const section = (confidence: Confidence): string[] => {
    const rows = byConfidence(confidence);
    const out = [`# ${confidence === "NOISE" ? "Noise / ignored matches" : confidence}`, ""];
    if (confidence === "NOISE") {
      if (noise.length === 0) return [...out, "No ignored matches.", ""];
      for (const n of noise.slice(0, 20)) {
        out.push(`- \`${n.token}\` from \`${n.source}\`: ${n.reason}`);
        out.push(`  - ${n.message}`);
      }
      out.push("");
      return out;
    }
    if (rows.length === 0) return [...out, "No incidents.", ""];
    for (const incident of rows) {
      out.push(`- **${incident.title}** | service: \`${incident.service}\` | severity: ${incident.severity}`);
      out.push(`  - root cause: ${incident.probableRootCause}`);
      out.push(`  - fix: ${incident.recommendedFix}`);
      for (const ev of incident.evidence) {
        out.push(
          `  - evidence: [${ev.timestamp ?? "n/a"}] \`${ev.source}\` -> ${ev.message}`,
        );
      }
    }
    out.push("");
    return out;
  };

  const rankingRows =
    ranking.length === 0
      ? ["No service instability signals."]
      : ranking.map((r, idx) => `${idx + 1}. \`${r.service}\` - score ${r.score}`);

  return [
    "# Confirmed incidents analysis",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Top unstable services ranking",
    "",
    ...rankingRows,
    "",
    ...section("CONFIRMED"),
    ...section("LIKELY"),
    ...section("POSSIBLE"),
    ...section("NOISE"),
  ].join("\n");
}

function buildLogAnalysisReport(incidents: Incident[], noise: NoiseRecord[]): string {
  const byType = new Map<string, number>();
  for (const incident of incidents) {
    byType.set(incident.title, (byType.get(incident.title) ?? 0) + 1);
  }

  const totals = [
    "| metric | count |",
    "|---|---:|",
    `| incidents total | ${incidents.length} |`,
    `| confirmed | ${incidents.filter((i) => i.confidence === "CONFIRMED").length} |`,
    `| likely | ${incidents.filter((i) => i.confidence === "LIKELY").length} |`,
    `| possible | ${incidents.filter((i) => i.confidence === "POSSIBLE").length} |`,
    `| noise ignored | ${noise.length} |`,
  ];

  const typeRows = [...byType.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `| ${name} | ${count} |`);

  return [
    "# Railway Log Analysis",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    ...totals,
    "",
    "## Incident types",
    "",
    "| incident | count |",
    "|---|---:|",
    ...(typeRows.length > 0 ? typeRows : ["| none | 0 |"]),
    "",
  ].join("\n");
}

function buildCurrentIssuesReport(
  incidents: Incident[],
  noise: NoiseRecord[],
  ranking: Array<{ service: string; score: number }>,
): string {
  const confirmed = incidents.filter((i) => i.confidence === "CONFIRMED");
  const likely = incidents.filter((i) => i.confidence === "LIKELY");
  const possible = incidents.filter((i) => i.confidence === "POSSIBLE");

  const renderIncident = (i: Incident): string[] => [
    `### ${i.title}`,
    "",
    `- **Affected service:** \`${i.service}\``,
    `- **Severity:** ${i.severity}`,
    `- **Confidence:** ${i.confidence}`,
    `- **Probable root cause:** ${i.probableRootCause}`,
    `- **Recommended fix:** ${i.recommendedFix}`,
    "- **Evidence lines:**",
    ...i.evidence.map(
      (ev) => `  - [${ev.timestamp ?? "n/a"}] \`${ev.source}\` -> ${ev.message}`,
    ),
    "",
  ];

  return [
    "# Railway Current Issues",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Top unstable services ranking",
    "",
    ...(ranking.length > 0
      ? ranking.map((r, idx) => `${idx + 1}. \`${r.service}\` - score ${r.score}`)
      : ["No ranking data."]),
    "",
    "## Confirmed incidents",
    "",
    ...(confirmed.length > 0
      ? confirmed.flatMap(renderIncident)
      : ["No confirmed incidents.", ""]),
    "## Likely incidents",
    "",
    ...(likely.length > 0 ? likely.flatMap(renderIncident) : ["No likely incidents.", ""]),
    "## Possible incidents",
    "",
    ...(possible.length > 0
      ? possible.flatMap(renderIncident)
      : ["No possible incidents.", ""]),
    "## Noise / ignored matches",
    "",
    ...(noise.length > 0
      ? noise
          .slice(0, 20)
          .flatMap((n) => [`- \`${n.token}\` ignored: ${n.reason}`, `  - ${n.message}`])
      : ["No ignored matches."]),
    "",
  ].join("\n");
}

function main(): void {
  const files = listLogFiles(LOGS_DIR);
  if (files.length === 0) {
    throw new Error("No .log files found in /logs. Run logs:fetch or logs:collector first.");
  }

  const lines = files.flatMap((file) => parseLines(file));
  const { incidents, noise } = collectIncidents(lines);
  const ranking = buildUnstableRanking(incidents);

  mkdirSync(REPORTS_DIR, { recursive: true });
  writeFileSync(LOG_ANALYSIS_REPORT, buildLogAnalysisReport(incidents, noise), "utf8");
  writeFileSync(
    CONFIRMED_REPORT,
    buildConfirmedIncidentsReport(incidents, noise, ranking),
    "utf8",
  );
  writeFileSync(
    CURRENT_ISSUES_REPORT,
    buildCurrentIssuesReport(incidents, noise, ranking),
    "utf8",
  );

  console.log(
    `Analysis complete: reports/log-analysis.md, reports/confirmed-incidents.md, reports/railway-current-issues.md`,
  );
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`analyze-logs failed: ${message}`);
  process.exit(1);
}
