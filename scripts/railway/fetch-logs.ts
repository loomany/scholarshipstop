import { createWriteStream, mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { spawn, spawnSync } from "node:child_process";

type Service = {
  id: string;
  name: string;
};

type CliOptions = {
  lines: number;
  since?: string;
  service?: string;
  follow: boolean;
};

const LOGS_DIR = join(process.cwd(), "logs");
const RAILWAY_BIN = "railway";

function printHelp(): void {
  console.log(
    [
      "Usage: npx tsx scripts/railway/fetch-logs.ts [options]",
      "",
      "Options:",
      "  --lines <number>     Number of lines per service (default: 1500, clamped to 1000-3000)",
      "  --since <time>        Relative/ISO time Railway accepts (e.g. 30m, 2h, 2026-05-05T00:00:00Z)",
      "  --service <name|id>   Only fetch one service (name or ID)",
      "  --follow              Live mode: stream logs and append to local files",
      "  --help                Show this help",
    ].join("\n"),
  );
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    lines: 1500,
    follow: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
    if (arg === "--follow") {
      options.follow = true;
      continue;
    }
    if (arg === "--lines") {
      const next = argv[i + 1];
      if (!next) throw new Error("Missing value for --lines");
      const parsed = Number.parseInt(next, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`Invalid --lines value: ${next}`);
      }
      options.lines = Math.max(1000, Math.min(3000, parsed));
      i += 1;
      continue;
    }
    if (arg === "--since") {
      const next = argv[i + 1];
      if (!next) throw new Error("Missing value for --since");
      options.since = next;
      i += 1;
      continue;
    }
    if (arg === "--service") {
      const next = argv[i + 1];
      if (!next) throw new Error("Missing value for --service");
      options.service = next;
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function runRailwayCommand(args: string[]): string {
  const result = spawnSync(RAILWAY_BIN, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: true,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `railway ${args.join(" ")} failed:\n${result.stderr || result.stdout}`,
    );
  }
  return result.stdout;
}

function listServices(): Service[] {
  const stdout = runRailwayCommand(["service", "list", "--json"]);
  const parsed = JSON.parse(stdout) as Array<{ id: string; name: string }>;
  return parsed.map((service) => ({ id: service.id, name: service.name }));
}

function resolveServiceFilter(services: Service[], filter?: string): Service[] {
  if (!filter) return services;
  const target = filter.toLowerCase();
  const matched = services.filter(
    (service) =>
      service.id.toLowerCase() === target ||
      service.name.toLowerCase() === target ||
      service.name.toLowerCase().includes(target),
  );
  if (matched.length === 0) {
    throw new Error(
      `Service "${filter}" not found. Available services: ${services
        .map((s) => s.name)
        .join(", ")}`,
    );
  }
  return matched;
}

function toLogFileName(serviceName: string, serviceId: string): string {
  const sanitized = serviceName
    .trim()
    .toLowerCase()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
    .replace(/\s+/g, "-");

  const safeName = sanitized.length > 0 ? sanitized : serviceId;
  return `${safeName}.log`;
}

function ensureDirs(): void {
  mkdirSync(LOGS_DIR, { recursive: true });
}

function fetchOneServiceLogs(service: Service, options: CliOptions): void {
  const outputPath = join(LOGS_DIR, toLogFileName(service.name, service.id));
  const args = ["logs", "--service", service.id, "--json"];

  if (options.since) {
    args.push("--since", options.since);
  } else {
    args.push("--lines", String(options.lines));
  }

  const stdout = runRailwayCommand(args);
  writeFileSync(outputPath, stdout, "utf8");
  console.log(`Saved ${service.name} -> logs/${basename(outputPath)}`);
}

function followOneService(service: Service): void {
  const outputPath = join(LOGS_DIR, toLogFileName(service.name, service.id));
  const fileStream = createWriteStream(outputPath, { flags: "a" });

  const child = spawn(
    RAILWAY_BIN,
    ["logs", "--service", service.id, "--json"],
    {
      cwd: process.cwd(),
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  child.stdout.pipe(fileStream);
  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[${service.name}] ${String(chunk)}`);
  });

  child.on("exit", (code) => {
    console.log(`[${service.name}] stream stopped with code ${code ?? "null"}`);
    fileStream.end();
  });

  console.log(`[${service.name}] following -> logs/${basename(outputPath)}`);
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  ensureDirs();

  const services = resolveServiceFilter(listServices(), options.service);
  if (services.length === 0) {
    throw new Error("No services found in linked Railway environment.");
  }

  if (options.follow) {
    console.log(`Starting live follow for ${services.length} service(s)...`);
    services.forEach((service) => followOneService(service));
    return;
  }

  services.forEach((service) => fetchOneServiceLogs(service, options));
  console.log("Railway log fetch completed.");
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`fetch-logs failed: ${message}`);
  process.exit(1);
}
