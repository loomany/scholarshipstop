import { mkdirSync, existsSync, statSync, appendFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";

type Service = { id: string; name: string };

type StreamStatus = "connecting" | "active" | "disconnected";

type ServiceState = {
  service: Service;
  status: StreamStatus;
  reconnectCount: number;
  reconnectDelayMs: number;
  child?: ChildProcessWithoutNullStreams;
  startedAt: number;
  activeSince?: number;
  disconnectedSince?: number;
  lastLogAt?: number;
  fileDate: string;
  part: number;
  bytesInCurrentFile: number;
  buffer: string;
  anomalyWindows: Record<string, number[]>;
};

const RAILWAY_BIN = "railway";
const maxMb = Number.parseInt(process.env.RAILWAY_COLLECTOR_MAX_MB ?? "50", 10);
const MAX_FILE_SIZE = Math.max(1, Number.isFinite(maxMb) ? maxMb : 50) * 1024 * 1024;
const HEALTH_REPORT_PATH = join(process.cwd(), "reports", "live-health.md");
const LOGS_ROOT = join(process.cwd(), "logs", "live");
const BASE_RECONNECT_MS = 1500;
const MAX_RECONNECT_MS = 60000;

const ANOMALIES = [
  { key: "error_spike", label: "burst ERROR spikes", pattern: /"level":"error"|error/i, windowMs: 60_000, threshold: 12 },
  { key: "repeated_500", label: "repeated 500", pattern: /\b500\b|status[:=]\s*500/i, windowMs: 120_000, threshold: 6 },
  { key: "repeated_oom", label: "repeated OOM", pattern: /\boom\b|out of memory|killed process/i, windowMs: 180_000, threshold: 2 },
  { key: "restart_loops", label: "restart loops", pattern: /restart|starting container|deployment .* (failed|crashed)/i, windowMs: 180_000, threshold: 4 },
  { key: "webhook_failures", label: "repeated webhook failures", pattern: /webhook/i, extra: /failed|error|timeout|signature/i, windowMs: 180_000, threshold: 4 },
  { key: "supabase_spikes", label: "supabase spikes", pattern: /supabase/i, extra: /429|rate limit|timeout|egress|error/i, windowMs: 180_000, threshold: 5 },
  { key: "deployment_crash", label: "deployment crash", pattern: /deployment/i, extra: /crash|failed|error|oom/i, windowMs: 300_000, threshold: 2 },
  { key: "parser_crash", label: "parser crash", pattern: /parser/i, extra: /crash|failed|exception|error/i, windowMs: 300_000, threshold: 2 },
] as const;

let stopping = false;
const states = new Map<string, ServiceState>();
let healthTimer: NodeJS.Timeout | undefined;

function printHelp(): void {
  console.log(
    [
      "Usage: npx tsx scripts/railway/collector.ts [options]",
      "",
      "Options:",
      "  --service <name|id>    Run collector for one service only",
      "  --help                 Show this help",
      "",
      "Behavior:",
      "  - Starts railway log streams for all services by default",
      "  - Writes logs/live/{service}/{YYYY-MM-DD}[.partN].log",
      "  - Rotates at 50MB per file",
      "  - Auto-reconnect with exponential backoff",
      "  - Writes reports/live-health.md every 30s",
    ].join("\n"),
  );
}

function parseArgs(argv: string[]): { service?: string } {
  let service: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
    if (arg === "--service") {
      service = argv[i + 1];
      if (!service) throw new Error("Missing value for --service");
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return { service };
}

function runRailway(args: string[]): string {
  const result = spawnSync(RAILWAY_BIN, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `railway ${args.join(" ")} failed`);
  }
  return result.stdout;
}

function listServices(): Service[] {
  const output = runRailway(["service", "list", "--json"]);
  const parsed = JSON.parse(output) as Array<{ id: string; name: string }>;
  return parsed.map((s) => ({ id: s.id, name: s.name }));
}

function safeName(serviceName: string): string {
  return serviceName.replace(/[<>:"/\\|?*\x00-\x1f]/g, "-").trim();
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function getLogPath(state: ServiceState): string {
  const folder = join(LOGS_ROOT, safeName(state.service.name));
  mkdirSync(folder, { recursive: true });
  if (state.part <= 1) {
    return join(folder, `${state.fileDate}.log`);
  }
  return join(folder, `${state.fileDate}.part${state.part}.log`);
}

function refreshCurrentFile(state: ServiceState): void {
  const nowDate = today();
  if (state.fileDate !== nowDate) {
    state.fileDate = nowDate;
    state.part = 1;
  }
  const path = getLogPath(state);
  state.bytesInCurrentFile = existsSync(path) ? statSync(path).size : 0;
}

function rotateIfNeeded(state: ServiceState, incomingBytes: number): void {
  refreshCurrentFile(state);
  if (state.bytesInCurrentFile + incomingBytes <= MAX_FILE_SIZE) return;
  state.part += 1;
  state.bytesInCurrentFile = 0;
}

function appendLogLine(state: ServiceState, line: string): void {
  const withNewline = `${line}\n`;
  const bytes = Buffer.byteLength(withNewline, "utf8");
  rotateIfNeeded(state, bytes);
  const path = getLogPath(state);
  appendFileSync(path, withNewline, "utf8");
  state.bytesInCurrentFile += bytes;
  state.lastLogAt = Date.now();
}

function appendCollectorEvent(
  state: ServiceState,
  level: "info" | "warn" | "error",
  message: string,
): void {
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    source: "collector",
    level,
    message,
  });
  appendLogLine(state, payload);
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
}

function alertLine(level: "WARN" | "ALERT", message: string): void {
  const line = `[${level}] ${message}`;
  if (level === "ALERT") {
    console.error(line);
  } else {
    console.warn(line);
  }
}

function desktopNotify(title: string, message: string): void {
  if (process.platform === "win32") {
    const escapedTitle = title.replace(/'/g, "''");
    const escapedMessage = message.replace(/'/g, "''");
    const script = [
      "[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null",
      "[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] > $null",
      "$template = @\"",
      `<toast><visual><binding template='ToastGeneric'><text>${escapedTitle}</text><text>${escapedMessage}</text></binding></visual></toast>`,
      "\"@",
      "$xml = New-Object Windows.Data.Xml.Dom.XmlDocument",
      "$xml.LoadXml($template)",
      "$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)",
      "$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('ScholarshipTop')",
      "$notifier.Show($toast)",
    ].join(";");
    spawn("powershell", ["-NoProfile", "-Command", script], {
      stdio: "ignore",
      detached: true,
      shell: true,
    }).unref();
    return;
  }

  if (process.platform === "darwin") {
    spawn("osascript", ["-e", `display notification "${message}" with title "${title}"`], {
      stdio: "ignore",
      detached: true,
      shell: true,
    }).unref();
    return;
  }

  spawn("notify-send", [title, message], {
    stdio: "ignore",
    detached: true,
    shell: true,
  }).unref();
}

function registerAnomaly(state: ServiceState, key: string, now: number): number {
  const arr = state.anomalyWindows[key] ?? [];
  arr.push(now);
  state.anomalyWindows[key] = arr;
  return arr.length;
}

function compactAnomalyWindow(state: ServiceState, key: string, windowMs: number, now: number): number {
  const arr = state.anomalyWindows[key] ?? [];
  const filtered = arr.filter((ts) => now - ts <= windowMs);
  state.anomalyWindows[key] = filtered;
  return filtered.length;
}

function inspectAnomalies(state: ServiceState, line: string): void {
  const now = Date.now();
  for (const anomaly of ANOMALIES) {
    const primary = anomaly.pattern.test(line);
    const secondary = anomaly.extra ? anomaly.extra.test(line) : true;
    if (!primary || !secondary) {
      compactAnomalyWindow(state, anomaly.key, anomaly.windowMs, now);
      continue;
    }

    registerAnomaly(state, anomaly.key, now);
    const count = compactAnomalyWindow(state, anomaly.key, anomaly.windowMs, now);
    if (count < anomaly.threshold) continue;

    const msg = `${state.service.name}: ${anomaly.label} (${count} events / ${Math.floor(
      anomaly.windowMs / 1000,
    )}s)`;
    alertLine("ALERT", msg);

    const mustNotify =
      anomaly.key === "repeated_oom" ||
      anomaly.key === "repeated_500" ||
      anomaly.key === "deployment_crash" ||
      anomaly.key === "parser_crash";
    if (mustNotify) {
      desktopNotify("Railway Log Alert", msg);
    }

    // Reset after alert to avoid notification floods.
    state.anomalyWindows[anomaly.key] = [];
  }
}

function consumeChunk(state: ServiceState, chunk: Buffer): void {
  state.buffer += chunk.toString("utf8");
  const lines = state.buffer.split(/\r?\n/);
  state.buffer = lines.pop() ?? "";

  for (const line of lines) {
    if (!line.trim()) continue;
    appendLogLine(state, line);
    inspectAnomalies(state, line);
  }
}

function scheduleReconnect(state: ServiceState): void {
  if (stopping) return;
  state.status = "disconnected";
  state.disconnectedSince = Date.now();
  state.reconnectCount += 1;
  const delay = state.reconnectDelayMs;
  alertLine(
    "WARN",
    `${state.service.name}: stream disconnected, reconnect #${state.reconnectCount} in ${Math.round(
      delay / 1000,
    )}s`,
  );
  appendCollectorEvent(
    state,
    "warn",
    `stream disconnected; reconnect #${state.reconnectCount} in ${Math.round(delay / 1000)}s`,
  );

  setTimeout(() => {
    startStream(state);
  }, delay);

  state.reconnectDelayMs = Math.min(state.reconnectDelayMs * 2, MAX_RECONNECT_MS);
}

function startStream(state: ServiceState): void {
  if (stopping) return;

  state.status = "connecting";
  const child = spawn(
    RAILWAY_BIN,
    ["logs", "--service", state.service.id, "--json"],
    {
      cwd: process.cwd(),
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  state.child = child;
  state.startedAt = Date.now();

  child.stdout.on("data", (chunk: Buffer) => {
    if (state.status !== "active") {
      state.status = "active";
      state.activeSince = Date.now();
      state.disconnectedSince = undefined;
      state.reconnectDelayMs = BASE_RECONNECT_MS;
      alertLine("WARN", `${state.service.name}: stream active`);
      appendCollectorEvent(state, "info", "stream active");
    }
    consumeChunk(state, chunk);
  });

  child.stderr.on("data", (chunk: Buffer) => {
    const text = chunk.toString("utf8").trim();
    if (!text) return;
    alertLine("WARN", `${state.service.name}: stderr ${text}`);
    appendCollectorEvent(state, "warn", `stderr: ${text}`);
  });

  child.on("error", (err) => {
    alertLine("WARN", `${state.service.name}: process error ${err.message}`);
    appendCollectorEvent(state, "error", `process error: ${err.message}`);
  });

  child.on("exit", () => {
    state.child = undefined;
    if (state.buffer.trim()) {
      appendLogLine(state, state.buffer.trim());
      state.buffer = "";
    }
    scheduleReconnect(state);
  });
}

function writeHealthReport(): void {
  const rows: string[] = [];
  const now = Date.now();
  let active = 0;
  let disconnected = 0;

  for (const state of states.values()) {
    if (state.status === "active") active += 1;
    if (state.status === "disconnected") disconnected += 1;

    const uptime = formatDuration(now - state.startedAt);
    const lastLog = state.lastLogAt ? new Date(state.lastLogAt).toISOString() : "n/a";
    rows.push(
      `| ${state.service.name} | ${state.status} | ${state.reconnectCount} | ${lastLog} | ${uptime} |`,
    );
  }

  const body = [
    "# Live Collector Health",
    "",
    `Generated: ${new Date(now).toISOString()}`,
    `Active streams: ${active}`,
    `Disconnected streams: ${disconnected}`,
    "",
    "| service | state | reconnect count | last log timestamp | stream uptime |",
    "|---|---|---:|---|---|",
    ...rows,
    "",
  ].join("\n");

  mkdirSync(join(process.cwd(), "reports"), { recursive: true });
  writeFileSync(HEALTH_REPORT_PATH, body, "utf8");
}

function initState(service: Service): ServiceState {
  const initial: ServiceState = {
    service,
    status: "connecting",
    reconnectCount: 0,
    reconnectDelayMs: BASE_RECONNECT_MS,
    startedAt: Date.now(),
    fileDate: today(),
    part: 1,
    bytesInCurrentFile: 0,
    buffer: "",
    anomalyWindows: {},
  };
  refreshCurrentFile(initial);
  appendCollectorEvent(initial, "info", "collector initialized");
  return initial;
}

function shutdown(): void {
  if (stopping) return;
  stopping = true;
  if (healthTimer) clearInterval(healthTimer);
  for (const state of states.values()) {
    state.child?.kill();
  }
  writeHealthReport();
  console.log("Collector stopped.");
  process.exit(0);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  mkdirSync(LOGS_ROOT, { recursive: true });
  mkdirSync(join(process.cwd(), "reports"), { recursive: true });

  const allServices = listServices();
  const services = args.service
    ? allServices.filter(
        (s) =>
          s.id === args.service ||
          s.name.toLowerCase() === args.service!.toLowerCase() ||
          s.name.toLowerCase().includes(args.service!.toLowerCase()),
      )
    : allServices;

  if (services.length === 0) {
    throw new Error("No matching Railway services found.");
  }

  for (const service of services) {
    const state = initState(service);
    states.set(service.id, state);
    startStream(state);
  }

  writeHealthReport();
  healthTimer = setInterval(writeHealthReport, 30_000);

  console.log(`Collector running for ${services.length} service(s). Press Ctrl+C to stop.`);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

try {
  main();
} catch (error) {
  console.error(
    `collector failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}
