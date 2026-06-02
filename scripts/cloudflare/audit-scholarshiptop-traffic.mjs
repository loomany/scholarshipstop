/**
 * READ-ONLY Cloudflare zone traffic audit (GraphQL Analytics API).
 * Token (read-only, never logged):
 *   1. process.env.CLOUDFLARE_API_TOKEN
 *   2. else repo-root `.env.cloudflare.local` (CLOUDFLARE_API_TOKEN=... only)
 *
 * Do not use `.env`, `.env.local`, or `.env.production`.
 *
 * Run:
 *   node scripts/cloudflare/audit-scholarshiptop-traffic.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const CLOUDFLARE_ENV_FILE = path.join(ROOT, '.env.cloudflare.local');

const ZONE_ID = '4ae5190bb1fe2adaefd3499cc6ff2d3d';
const DOMAIN = 'scholarshiptop.com';
const GRAPHQL_URL = 'https://api.cloudflare.com/client/v4/graphql';

const SEO_AI_BOTS = [
  'AhrefsBot',
  'SemrushBot',
  'MJ12bot',
  'Bytespider',
  'ClaudeBot',
  'GPTBot',
  'Amazonbot',
  'Googlebot',
  'Bingbot',
  'YandexBot',
  'Applebot',
  'PetalBot',
  'CCBot',
  'meta-externalagent',
];

const SUSPICIOUS_PATH_PATTERNS = [
  { label: '/.env', filter: { clientRequestPath_like: '%/.env%' } },
  { label: '/wp-admin', filter: { clientRequestPath_like: '%/wp-admin%' } },
  { label: '/xmlrpc.php', filter: { clientRequestPath_like: '%/xmlrpc.php%' } },
  { label: '/admin', filter: { clientRequestPath_like: '%/admin%' } },
  { label: '/phpmyadmin', filter: { clientRequestPath_like: '%/phpmyadmin%' } },
  { label: '/api/*', filter: { clientRequestPath_like: '%/api/%' } },
];

/** Datacenter / VPS ASNs often seen in scan traffic (not exhaustive). */
const SUSPICIOUS_ASN_HINTS = new Set([
  14061, // DigitalOcean
  16276, // OVH
  24940, // Hetzner
  20473, // Choopa/Vultr
  63949, // Linode/Akamai
  14618, // Amazon (flag only if huge non-bot share — handled in analysis)
  396982, // Google Cloud
  15169, // Google (usually legit)
  8075, // Microsoft Azure
]);

const DIMENSION_ATTEMPTS = [
  { key: 'countries', field: 'clientCountryName', limit: 80, orderBy: 'count_DESC' },
  { key: 'asns', field: 'clientASN', limit: 80, orderBy: 'count_DESC' },
  { key: 'asnsAlt', field: 'clientAsn', limit: 80, orderBy: 'count_DESC' },
  { key: 'statusCodes', field: 'edgeResponseStatus', limit: 30, orderBy: 'count_DESC' },
  { key: 'cacheStatus', field: 'cacheStatus', limit: 20, orderBy: 'count_DESC' },
  { key: 'methods', field: 'clientRequestHTTPMethod', limit: 15, orderBy: 'count_DESC' },
  { key: 'methodsAlt', field: 'clientRequestMethod', limit: 15, orderBy: 'count_DESC' },
  { key: 'hosts', field: 'clientRequestHTTPHost', limit: 30, orderBy: 'count_DESC' },
  { key: 'hostsAlt', field: 'clientRequestHost', limit: 30, orderBy: 'count_DESC' },
  { key: 'paths', field: 'clientRequestPath', limit: 100, orderBy: 'count_DESC' },
  { key: 'pathsAlt', field: 'uriPath', limit: 100, orderBy: 'count_DESC' },
  { key: 'userAgents', field: 'userAgent', limit: 150, orderBy: 'count_DESC' },
  { key: 'userAgentsAlt', field: 'clientRequestUserAgent', limit: 150, orderBy: 'count_DESC' },
  { key: 'botDecision', field: 'botManagementDecision', limit: 20, orderBy: 'count_DESC' },
  { key: 'botScoreBucket', field: 'botScoreBucketBy10', limit: 20, orderBy: 'count_DESC' },
  { key: 'verifiedBotCategory', field: 'verifiedBotCategory', limit: 30, orderBy: 'count_DESC' },
];

/**
 * CLOUDFLARE_API_TOKEN from process.env, else repo-root `.env.cloudflare.local` only.
 * Never reads `.env`, `.env.local`, or `.env.production`. Never logs the token.
 */
function loadCloudflareApiToken() {
  const fromEnv = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (fromEnv) return fromEnv;

  if (!fs.existsSync(CLOUDFLARE_ENV_FILE)) {
    return null;
  }

  const raw = fs.readFileSync(CLOUDFLARE_ENV_FILE, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^CLOUDFLARE_API_TOKEN=(.*)$/);
    if (!m) continue;
    let v = m[1].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    return v.trim() || null;
  }
  return null;
}

function isoNow() {
  return new Date().toISOString();
}

function window24h() {
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function reportDateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function formatBytes(n) {
  if (n == null || Number.isNaN(n)) return 'n/a';
  const b = Number(n);
  if (b >= 1e12) return `${(b / 1e12).toFixed(2)} TB`;
  if (b >= 1e9) return `${(b / 1e9).toFixed(2)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(2)} MB`;
  if (b >= 1e3) return `${(b / 1e3).toFixed(2)} KB`;
  return `${b} B`;
}

function formatNumber(n) {
  if (n == null || Number.isNaN(n)) return 'n/a';
  return Number(n).toLocaleString('en-US');
}

function pct(part, total) {
  if (!total) return '0%';
  return `${((part / total) * 100).toFixed(1)}%`;
}

function dimValue(dimensions, field) {
  if (!dimensions) return '(unknown)';
  return dimensions[field] ?? dimensions[Object.keys(dimensions)[0]] ?? '(unknown)';
}

async function gql(token, query, variables, alias = 'data') {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (HTTP ${res.status})`);
  }

  if (!res.ok) {
    const msg = json?.errors?.[0]?.message ?? text.slice(0, 300);
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }

  if (json.errors?.length) {
    return { ok: false, errors: json.errors, data: json.data, alias };
  }

  const zones = json.data?.viewer?.zones ?? [];
  const zone = zones[0];
  if (!zone) {
    return { ok: false, errors: [{ message: 'No zone data in response' }], data: json.data, alias };
  }

  return { ok: true, zone, data: json.data, alias };
}

function buildGroupsQuery(alias, dimensionField, limit, orderBy, sumFields) {
  const sumSelection = sumFields.join('\n          ');
  return `
    ${alias}: httpRequestsAdaptiveGroups(
      limit: ${limit}
      orderBy: [${orderBy}]
      filter: $filter
    ) {
      count
      sum {
        ${sumSelection}
      }
      dimensions {
        ${dimensionField}
      }
    }
  `;
}

async function fetchBreakdown(token, baseFilter, dimensionField, limit, orderBy, sumFields) {
  const alias = 'series';
  const sumList = sumFields.length ? sumFields : ['edgeResponseBytes', 'visits'];

  for (const sums of [sumList, ['edgeResponseBytes', 'visits'], ['edgeResponseBytes']]) {
    const query = `
      query ZoneBreakdown($zoneTag: string, $filter: ZoneHttpRequestsAdaptiveGroupsFilter!) {
        viewer {
          zones(filter: { zoneTag: $zoneTag }) {
            ${buildGroupsQuery(alias, dimensionField, limit, orderBy, sums)}
          }
        }
      }
    `;
    const result = await gql(token, query, { zoneTag: ZONE_ID, filter: baseFilter }, alias);
    if (result.ok) {
      return { ok: true, rows: result.zone[alias] ?? [], sumFieldsUsed: sums };
    }
    const errText = JSON.stringify(result.errors);
    if (!/sum|field|Unknown/i.test(errText)) {
      return { ok: false, errors: result.errors, rows: [] };
    }
  }

  const queryMinimal = `
    query ZoneBreakdown($zoneTag: string, $filter: ZoneHttpRequestsAdaptiveGroupsFilter!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          ${alias}: httpRequestsAdaptiveGroups(
            limit: ${limit}
            orderBy: [${orderBy}]
            filter: $filter
          ) {
            count
            dimensions { ${dimensionField} }
          }
        }
      }
    }
  `;
  const result = await gql(token, queryMinimal, { zoneTag: ZONE_ID, filter: baseFilter }, alias);
  if (result.ok) {
    return { ok: true, rows: result.zone[alias] ?? [], sumFieldsUsed: [] };
  }
  return { ok: false, errors: result.errors, rows: [] };
}

async function fetchTotals(token, baseFilter) {
  const alias = 'totals';
  const sumVariants = [
    ['edgeResponseBytes', 'visits', 'cachedBytes', 'cacheResponseBytes'],
    ['edgeResponseBytes', 'visits', 'cachedBytes'],
    ['edgeResponseBytes', 'visits'],
    ['edgeResponseBytes'],
  ];

  for (const sums of sumVariants) {
    const query = `
      query ZoneTotals($zoneTag: string, $filter: ZoneHttpRequestsAdaptiveGroupsFilter!) {
        viewer {
          zones(filter: { zoneTag: $zoneTag }) {
            ${alias}: httpRequestsAdaptiveGroups(limit: 1, filter: $filter) {
              count
              sum { ${sums.join('\n                ')} }
            }
          }
        }
      }
    `;
    const result = await gql(token, query, { zoneTag: ZONE_ID, filter: baseFilter }, alias);
    if (result.ok) {
      const row = (result.zone[alias] ?? [])[0];
      return {
        ok: true,
        count: row?.count ?? 0,
        sum: row?.sum ?? {},
        sumFieldsUsed: sums,
      };
    }
  }

  return { ok: false, errors: [{ message: 'Could not fetch zone totals' }] };
}

async function fetchFilteredCount(token, baseFilter, extraFilter) {
  const filter = { ...baseFilter, ...extraFilter };
  const totals = await fetchTotals(token, filter);
  if (!totals.ok) return { ok: false, count: 0, errors: totals.errors };
  return { ok: true, count: totals.count };
}

function aggregateRows(rows, dimensionField) {
  return rows
    .map((r) => ({
      label: String(dimValue(r.dimensions, dimensionField)),
      count: Number(r.count) || 0,
      bytes: Number(r.sum?.edgeResponseBytes) || 0,
      visits: Number(r.sum?.visits) || 0,
    }))
    .sort((a, b) => b.count - a.count);
}

function pickBotRows(userAgentRows) {
  const hits = [];
  for (const row of userAgentRows) {
    const ua = row.label;
    for (const bot of SEO_AI_BOTS) {
      if (ua.toLowerCase().includes(bot.toLowerCase())) {
        hits.push({ bot, ...row });
        break;
      }
    }
  }
  return hits.sort((a, b) => b.count - a.count);
}

function analyzeSuspicious({
  totalRequests,
  statusRows,
  cacheRows,
  pathRows,
  asnRows,
  suspiciousPathCounts,
  botHits,
}) {
  const findings = [];
  const status404 = statusRows.find((r) => r.label === '404');
  const status500 = statusRows.find((r) => r.label === '500');
  if (status404 && totalRequests && status404.count / totalRequests > 0.05) {
    findings.push(
      `High 404 rate: ${formatNumber(status404.count)} (${pct(status404.count, totalRequests)} of requests).`
    );
  } else if (status404?.count > 1000) {
    findings.push(`Notable 404 volume: ${formatNumber(status404.count)} requests.`);
  }
  if (status500?.count > 100) {
    findings.push(
      `Elevated 5xx: ${formatNumber(status500.count)} (${pct(status500.count, totalRequests)}). Possible origin/Railway stress.`
    );
  }

  const nonHit = cacheRows.filter((r) =>
    /miss|bypass|dynamic|expired|revalidated/i.test(r.label)
  );
  const nonHitCount = nonHit.reduce((s, r) => s + r.count, 0);
  if (totalRequests && nonHitCount / totalRequests > 0.75) {
    findings.push(
      `Cache mostly bypasses origin: ${pct(nonHitCount, totalRequests)} MISS/BYPASS/DYNAMIC/EXPIRED — aligns with ~20% cache hit dashboard.`
    );
  }

  for (const [label, count] of Object.entries(suspiciousPathCounts)) {
    if (count > 50) {
      findings.push(`Probe traffic to ${label}: ${formatNumber(count)} requests in 24h.`);
    }
  }

  const topAsn = asnRows.slice(0, 15);
  for (const row of topAsn) {
    const asn = parseInt(row.label, 10);
    if (SUSPICIOUS_ASN_HINTS.has(asn) && row.count > 5000) {
      findings.push(
        `Large volume from hosting/cloud ASN ${row.label}: ${formatNumber(row.count)} requests — review if not expected crawlers/API.`
      );
    }
  }

  const usRow = null; // filled externally
  if (botHits.length) {
    const topBot = botHits[0];
    findings.push(
      `Known crawler/bot UAs observed (${botHits.length} types). Top: ${topBot.bot} — ${formatNumber(topBot.count)} requests.`
    );
  }

  if (!findings.length) {
    findings.push('No strong anomaly signals from available GraphQL dimensions; validate against dashboard sampling.');
  }

  return { findings, nonHitCount, status404, status500 };
}

function mdTable(rows, columns) {
  if (!rows.length) return '_No data._\n';
  const header = `| ${columns.map((c) => c.header).join(' | ')} |`;
  const sep = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows
    .map((r) => `| ${columns.map((c) => c.render(r)).join(' | ')} |`)
    .join('\n');
  return `${header}\n${sep}\n${body}\n`;
}

function buildReport(ctx) {
  const {
    generatedAt,
    window,
    totals,
    totalsEyeball,
    breakdowns,
    unavailable,
    queryNotes,
    suspiciousPathCounts,
    botHits,
    analysis,
    executiveSummary,
  } = ctx;

  const totalReq = totals?.count ?? 0;
  const totalBytes = totals?.sum?.edgeResponseBytes;
  const cachedBytes =
    totals?.sum?.cachedBytes ?? totals?.sum?.cacheResponseBytes ?? null;

  const countries = breakdowns.countries?.rows ?? [];
  const asns = breakdowns.asns?.rows ?? breakdowns.asnsAlt?.rows ?? [];
  const statusRows = breakdowns.statusCodes?.rows ?? [];
  const cacheRows = breakdowns.cacheStatus?.rows ?? [];
  const methods =
    breakdowns.methods?.rows ?? breakdowns.methodsAlt?.rows ?? [];
  const hosts = breakdowns.hosts?.rows ?? breakdowns.hostsAlt?.rows ?? [];
  const paths = breakdowns.paths?.rows ?? breakdowns.pathsAlt?.rows ?? [];
  const userAgents =
    breakdowns.userAgents?.rows ?? breakdowns.userAgentsAlt?.rows ?? [];

  let md = `# Cloudflare traffic audit — ${DOMAIN}\n\n`;
  md += `> **READ-ONLY** — no Cloudflare settings were changed.\n\n`;
  md += `- **Generated:** ${generatedAt}\n`;
  md += `- **Zone ID:** \`${ZONE_ID}\`\n`;
  md += `- **Window:** ${window.start} → ${window.end} (last 24 hours)\n\n`;

  md += `## Executive summary\n\n${executiveSummary}\n\n`;

  md += `## Last 24h totals\n\n`;
  md += `| Metric | Value |\n| --- | --- |\n`;
  md += `| Total requests (all sources) | ${formatNumber(totalReq)} |\n`;
  md += `| Edge response bytes | ${formatBytes(totalBytes)} |\n`;
  if (cachedBytes != null) {
    md += `| Cached bytes (if reported) | ${formatBytes(cachedBytes)} |\n`;
  }
  if (totals?.sum?.visits != null) {
    md += `| Visits (GraphQL sum) | ${formatNumber(totals.sum.visits)} |\n`;
  }
  if (totalsEyeball?.ok) {
    md += `| Requests (eyeball / client only) | ${formatNumber(totalsEyeball.count)} |\n`;
  }
  md += `\n_Note: Dashboard “unique visitors” may use a different metric than GraphQL \`visits\`; compare qualitatively._\n\n`;

  md += `## Top countries\n\n`;
  md += mdTable(countries.slice(0, 25), [
    { header: 'Country', render: (r) => r.label },
    { header: 'Requests', render: (r) => formatNumber(r.count) },
    { header: '%', render: (r) => pct(r.count, totalReq) },
    { header: 'Bytes', render: (r) => formatBytes(r.bytes) },
  ]);

  md += `## Top ASNs\n\n`;
  if (asns.length) {
    md += mdTable(asns.slice(0, 25), [
      { header: 'ASN', render: (r) => r.label },
      { header: 'Requests', render: (r) => formatNumber(r.count) },
      { header: '%', render: (r) => pct(r.count, totalReq) },
      { header: 'Bytes', render: (r) => formatBytes(r.bytes) },
    ]);
  } else {
    md += `_Not available in this zone/plan._\n\n`;
  }

  md += `## Status codes\n\n`;
  md += mdTable(statusRows, [
    { header: 'Status', render: (r) => r.label },
    { header: 'Requests', render: (r) => formatNumber(r.count) },
    { header: '%', render: (r) => pct(r.count, totalReq) },
    { header: 'Bytes', render: (r) => formatBytes(r.bytes) },
  ]);

  md += `## Cache status\n\n`;
  if (cacheRows.length) {
    const hit = cacheRows.find((r) => /^hit$/i.test(r.label));
    md += `| Status | Requests | % of total | Bytes |\n| --- | --- | --- | --- |\n`;
    for (const r of cacheRows) {
      md += `| ${r.label} | ${formatNumber(r.count)} | ${pct(r.count, totalReq)} | ${formatBytes(r.bytes)} |\n`;
    }
    if (hit) {
      md += `\n**Approx. cache hit share (HIT only):** ${pct(hit.count, totalReq)}\n\n`;
    }
  } else {
    md += `_Not available._\n\n`;
  }

  md += `## HTTP methods\n\n`;
  md += mdTable(methods, [
    { header: 'Method', render: (r) => r.label },
    { header: 'Requests', render: (r) => formatNumber(r.count) },
    { header: '%', render: (r) => pct(r.count, totalReq) },
  ]);

  md += `## Hosts\n\n`;
  md += mdTable(hosts.slice(0, 20), [
    { header: 'Host', render: (r) => r.label },
    { header: 'Requests', render: (r) => formatNumber(r.count) },
    { header: '%', render: (r) => pct(r.count, totalReq) },
  ]);

  md += `## Top paths\n\n`;
  if (paths.length) {
    md += mdTable(paths.slice(0, 40), [
      { header: 'Path', render: (r) => `\`${r.label.slice(0, 120)}\`` },
      { header: 'Requests', render: (r) => formatNumber(r.count) },
      { header: '%', render: (r) => pct(r.count, totalReq) },
    ]);
  } else {
    md += `_Not available (clientRequestPath / uriPath)._ \n\n`;
  }

  md += `## Top user agents\n\n`;
  if (userAgents.length) {
    md += mdTable(userAgents.slice(0, 30), [
      {
        header: 'User-Agent (truncated)',
        render: (r) =>
          `\`${r.label.replace(/\|/g, '/').slice(0, 100)}${r.label.length > 100 ? '…' : ''}\``,
      },
      { header: 'Requests', render: (r) => formatNumber(r.count) },
      { header: '%', render: (r) => pct(r.count, totalReq) },
    ]);
  } else {
    md += `_Not available._\n\n`;
  }

  md += `## Bot / SEO / AI crawler notes\n\n`;
  if (breakdowns.botDecision?.rows?.length) {
    md += `### botManagementDecision\n\n`;
    md += mdTable(breakdowns.botDecision.rows, [
      { header: 'Decision', render: (r) => r.label },
      { header: 'Requests', render: (r) => formatNumber(r.count) },
    ]);
  }
  if (breakdowns.botScoreBucket?.rows?.length) {
    md += `### botScoreBucketBy10\n\n`;
    md += mdTable(breakdowns.botScoreBucket.rows, [
      { header: 'Bucket', render: (r) => r.label },
      { header: 'Requests', render: (r) => formatNumber(r.count) },
    ]);
  }
  if (breakdowns.verifiedBotCategory?.rows?.length) {
    md += `### verifiedBotCategory\n\n`;
    md += mdTable(breakdowns.verifiedBotCategory.rows, [
      { header: 'Category', render: (r) => r.label },
      { header: 'Requests', render: (r) => formatNumber(r.count) },
    ]);
  }
  if (botHits.length) {
    md += `### Matched known crawler UAs\n\n`;
    md += mdTable(botHits.slice(0, 20), [
      { header: 'Bot', render: (r) => r.bot },
      { header: 'Requests', render: (r) => formatNumber(r.count) },
      { header: '%', render: (r) => pct(r.count, totalReq) },
    ]);
  } else if (!userAgents.length) {
    md += `_Bot Management dimensions and user-agent breakdown unavailable on this token/plan._\n\n`;
  } else {
    md += `_No major SEO/AI bot signatures in top UAs; crawlers may be below top-N or unlabeled._\n\n`;
  }

  md += `## Suspicious patterns\n\n`;
  for (const f of analysis.findings) {
    md += `- ${f}\n`;
  }
  md += `\n### Sensitive path probes (24h)\n\n`;
  md += `| Pattern | Requests |\n| --- | --- |\n`;
  for (const [label, count] of Object.entries(suspiciousPathCounts)) {
    md += `| ${label} | ${formatNumber(count)} |\n`;
  }
  md += `\n`;

  md += `## Safe recommendations\n\n`;
  md += '- Treat **~20% cache hit** as expected for a dynamic Next.js/Railway origin unless static assets are on a CDN cache rule; tune Cache-Control for public static paths first.\n';
  md += `- If **404/scan paths** are high, add origin-agnostic 404 handling and block obvious probe paths at WAF (see suggestions below) — test in log mode first.\n`;
  md += `- Separate **API** rate limits from HTML if \`/api/*\` volume is material.\n`;
  md += `- Use **Bot Management** / AI Crawl Control only after reviewing verified bot allowlists (Google/Bing).\n`;
  md += `- Correlate spikes with **Railway origin CPU** and Supabase connection metrics for the same window.\n\n`;

  md += `## Suggested WAF / rate-limit rules (text only — DO NOT APPLY)\n\n`;
  md += '```\n';
  md += '# Block common probe paths (customize after reviewing top paths)\n';
  md += '(http.request.uri.path contains "/.env") or\n';
  md += '(http.request.uri.path contains "/wp-admin") or\n';
  md += '(http.request.uri.path contains "/xmlrpc.php") or\n';
  md += '(http.request.uri.path contains "/phpmyadmin")\n';
  md += '→ Action: Block (or Managed Challenge)\n\n';
  md += '# Rate limit aggressive ASNs (example — tune thresholds)\n';
  md += 'ip.geoip.asnum in {14061 16276 24940} and not cf.client.bot\n';
  md += '→ Action: Rate limit 100 req/min\n\n';
  md += '# Protect API\n';
  md += 'http.request.uri.path starts_with "/api/" and not cf.client.bot\n';
  md += '→ Action: Rate limit per IP\n';
  md += '```\n\n';

  md += `## Unavailable GraphQL fields\n\n`;
  if (unavailable.length) {
    for (const u of unavailable) {
      md += `- **${u.field}** (${u.key}): ${u.reason}\n`;
    }
  } else {
    md += `_All attempted dimensions returned data._\n`;
  }
  md += `\n`;

  md += `## Raw query notes\n\n`;
  for (const n of queryNotes) {
    md += `- ${n}\n`;
  }
  md += `\n`;

  md += `## Run command\n\n`;
  md += '```powershell\n';
  md += '# Token in repo-root .env.cloudflare.local (CLOUDFLARE_API_TOKEN=...) or $env:CLOUDFLARE_API_TOKEN\n';
  md += 'node scripts/cloudflare/audit-scholarshiptop-traffic.mjs\n';
  md += '```\n';

  return md;
}

function buildExecutiveSummary({
  totalReq,
  totalBytes,
  countries,
  cacheRows,
  botHits,
  analysis,
  totalsEyeball,
}) {
  const us = countries.find((c) => c.label === 'US');
  const usShare = us && totalReq ? pct(us.count, totalReq) : 'n/a';
  const hit = cacheRows.find((r) => /^hit$/i.test(r.label));
  const hitShare = hit && totalReq ? pct(hit.count, totalReq) : '~20% (dashboard)';

  let trafficType = 'mixed traffic';
  if (botHits.length && botHits[0].count > totalReq * 0.15) {
    trafficType = 'SEO/AI crawler-heavy';
  } else if (analysis.status404?.count > totalReq * 0.1) {
    trafficType = 'probe/scanner-heavy (high 404)';
  } else if (totalReq > 1_000_000) {
    trafficType = 'very high volume — likely crawlers + users + assets';
  }

  let cacheVerdict =
    'Cache/origin: low edge cache ratio — most requests likely DYNAMIC/MISS to Railway origin.';
  if (hit && totalReq && hit.count / totalReq > 0.4) {
    cacheVerdict = 'Cache/origin: moderate edge caching.';
  }

  return [
    `**${trafficType}** over the last 24h (~${formatNumber(totalReq)} GraphQL-counted requests, ${formatBytes(totalBytes)} edge bytes).`,
    `**US share:** ${usShare}${us ? ` (${formatNumber(us.count)} US requests)` : ''} — compare to dashboard ~105k if sampling differs.`,
    totalsEyeball?.ok
      ? `**Eyeball-only requests:** ${formatNumber(totalsEyeball.count)} (excludes some Cloudflare internal traffic).`
      : '',
    `**Edge cache (HIT):** ${hitShare}. ${cacheVerdict}`,
    botHits.length
      ? `**Crawlers:** detected ${botHits.length} known bot UA families in top agents.`
      : '**Crawlers:** not dominant in top UAs or UA dimension unavailable.',
    `**Risk:** ${analysis.findings[0] ?? 'Review Suspicious patterns section.'}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

async function main() {
  const token = loadCloudflareApiToken();
  if (!token) {
    console.error(
      'Missing CLOUDFLARE_API_TOKEN.\n' +
        '  Set $env:CLOUDFLARE_API_TOKEN, or create repo-root .env.cloudflare.local with:\n' +
        '  CLOUDFLARE_API_TOKEN=your_token_here'
    );
    process.exit(1);
  }

  const tokenSource = process.env.CLOUDFLARE_API_TOKEN?.trim()
    ? 'environment'
    : '.env.cloudflare.local';
  console.log(`Using Cloudflare API token from ${tokenSource}.`);

  const window = window24h();
  const baseFilter = {
    datetime_geq: window.start,
    datetime_leq: window.end,
  };
  const eyeballFilter = { ...baseFilter, requestSource: 'eyeball' };

  const unavailable = [];
  const queryNotes = [];
  const breakdowns = {};

  console.log(`Auditing ${DOMAIN} (zone ${ZONE_ID})`);
  console.log(`Window: ${window.start} → ${window.end}`);

  const totals = await fetchTotals(token, baseFilter);
  if (!totals.ok) {
    const err = totals.errors?.[0];
    console.error('Failed to fetch totals:', err?.message ?? 'unknown error');
    if (err?.extensions?.code === 'authz') {
      console.error(
        'API token lacks Zone Analytics Read for this zone. ' +
          'Create a new Read-only token with: Zone → Analytics → Read (or Account Analytics Read).'
      );
    }
    process.exit(1);
  }
  queryNotes.push(
    `Totals query sum fields: ${totals.sumFieldsUsed?.join(', ') || 'count only'}`
  );

  const totalsEyeball = await fetchTotals(token, eyeballFilter);
  if (totalsEyeball.ok) {
    queryNotes.push('Eyeball filter (requestSource: eyeball) applied for comparison totals.');
  }

  const seenDimensions = new Set();
  for (const spec of DIMENSION_ATTEMPTS) {
    if (seenDimensions.has(spec.field)) continue;
    // Skip alt if primary succeeded
    if (spec.key.endsWith('Alt')) {
      const primaryKey = spec.key.replace(/Alt$/, '');
      if (breakdowns[primaryKey]?.ok) continue;
    }

    process.stdout.write(`Fetching ${spec.field}… `);
    const result = await fetchBreakdown(
      token,
      baseFilter,
      spec.field,
      spec.limit,
      spec.orderBy,
      ['edgeResponseBytes', 'visits']
    );

    if (result.ok && result.rows.length) {
      console.log(`ok (${result.rows.length} groups)`);
      breakdowns[spec.key] = {
        ok: true,
        field: spec.field,
        rows: aggregateRows(result.rows, spec.field),
      };
      seenDimensions.add(spec.field);
      queryNotes.push(
        `${spec.field}: limit=${spec.limit}, orderBy=${spec.orderBy}, sum=[${result.sumFieldsUsed.join(', ')}]`
      );
    } else {
      const reason =
        result.errors?.map((e) => e.message).join('; ') || 'empty or unsupported';
      console.log('unavailable');
      unavailable.push({ key: spec.key, field: spec.field, reason });
    }
  }

  // Merge alt keys into primary for downstream
  for (const [alt, primary] of [
    ['asnsAlt', 'asns'],
    ['methodsAlt', 'methods'],
    ['hostsAlt', 'hosts'],
    ['pathsAlt', 'paths'],
    ['userAgentsAlt', 'userAgents'],
  ]) {
    if (!breakdowns[primary]?.ok && breakdowns[alt]?.ok) {
      breakdowns[primary] = breakdowns[alt];
    }
  }

  const suspiciousPathCounts = {};
  for (const pat of SUSPICIOUS_PATH_PATTERNS) {
    const res = await fetchFilteredCount(token, baseFilter, pat.filter);
    suspiciousPathCounts[pat.label] = res.ok ? res.count : 0;
    if (!res.ok) {
      unavailable.push({
        key: `filter:${pat.label}`,
        field: JSON.stringify(pat.filter),
        reason: res.errors?.[0]?.message ?? 'filter failed',
      });
    }
  }

  const userAgentRows = breakdowns.userAgents?.rows ?? [];
  const botHits = pickBotRows(userAgentRows);

  const analysis = analyzeSuspicious({
    totalRequests: totals.count,
    statusRows: breakdowns.statusCodes?.rows ?? [],
    cacheRows: breakdowns.cacheStatus?.rows ?? [],
    pathRows: breakdowns.paths?.rows ?? [],
    asnRows: breakdowns.asns?.rows ?? [],
    suspiciousPathCounts,
    botHits,
  });

  const executiveSummary = buildExecutiveSummary({
    totalReq: totals.count,
    totalBytes: totals.sum?.edgeResponseBytes,
    countries: breakdowns.countries?.rows ?? [],
    cacheRows: breakdowns.cacheStatus?.rows ?? [],
    botHits,
    analysis,
    totalsEyeball,
  });

  const report = buildReport({
    generatedAt: isoNow(),
    window,
    totals,
    totalsEyeball,
    breakdowns,
    unavailable,
    queryNotes,
    suspiciousPathCounts,
    botHits,
    analysis,
    executiveSummary,
  });

  const outDir = path.join(ROOT, 'reports', 'cloudflare');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(
    outDir,
    `scholarshiptop-traffic-audit-${reportDateStamp()}.md`
  );
  fs.writeFileSync(outPath, report, 'utf8');

  console.log(`\nReport written: ${outPath}`);
  console.log('\n--- Brief verdict ---');
  console.log(executiveSummary.replace(/\n\n/g, '\n'));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
