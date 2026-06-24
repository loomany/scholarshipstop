#!/usr/bin/env node
/** HTTPS --resolve smoke for Stage 6 SSL prep (no secrets). */
const HOST = 'scholarshiptop.com';
const IP = '213.155.22.74';
const paths = [
  '/',
  '/sitemap.xml',
  '/sitemaps/scholarships-0.xml',
  '/scholarships/no-essay',
  '/scholarships/closing-soon',
  '/scholarships/california',
];

async function fetchResolved(path) {
  const url = `https://${HOST}${path}`;
  const res = await fetch(url, {
    headers: { Host: HOST, 'User-Agent': 'Stage6HttpsResolve/1.0' },
    // Node fetch cannot --resolve; use Host header against IP via custom dispatcher
    // Fallback: call curl via child_process on Windows
  });
  return { path, status: res.status };
}

// Use curl for reliable --resolve on all platforms
import { spawnSync } from 'node:child_process';

const CURL = process.platform === 'win32' ? 'curl.exe' : 'curl';

function curlHead(path) {
  const url = `https://${HOST}${path}`;
  const r = spawnSync(
    CURL,
    ['-k', '-sS', '-m', '60', '-I', '--resolve', `${HOST}:443:${IP}`, url],
    { encoding: 'utf8' }
  );
  const out = r.stdout || '';
  const status = out.match(/^HTTP\/[\d.]+ (\d+)/m)?.[1] ?? '0';
  const robots =
    out.match(/x-robots-tag:\s*(.+)/i)?.[1] ??
    null;
  return { path, status: Number(status), ok: r.status === 0, robotsHeader: robots };
}

function curlBodyMeta(path) {
  const url = `https://${HOST}${path}`;
  const r = spawnSync(
    CURL,
    ['-k', '-sS', '-m', '90', '--resolve', `${HOST}:443:${IP}`, url],
    { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
  );
  const html = r.stdout || '';
  const robots =
    html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["']/i)?.[1] ??
    null;
  const locCount = path.includes('.xml') ? (html.match(/<loc>/g) ?? []).length : null;
  const validXml =
    path.endsWith('.xml') ? html.trimStart().startsWith('<?xml') || html.includes('<urlset') : null;
  return { path, robots, locCount, validXml, bytes: html.length };
}

const results = [];
for (const p of paths) {
  results.push({ head: curlHead(p), body: p.includes('scholarships') || p.includes('sitemap') ? curlBodyMeta(p) : null });
}
console.log(JSON.stringify({ ok: true, host: HOST, ip: IP, results }, null, 2));
