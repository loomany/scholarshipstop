/**
 * Reads scripts/output/provider-partnerships-report.json and writes:
 * - scripts/output/provider-partnerships-emails-only.txt   — все уникальные адреса
 * - scripts/output/provider-partnerships-emails-clean.txt — без шаблонов/плейсхолдеров
 *
 * Usage: node scripts/extract-partnership-report-emails.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'output');
const jsonPath = path.join(outDir, 'provider-partnerships-report.json');
const pathAll = path.join(outDir, 'provider-partnerships-emails-only.txt');
const pathClean = path.join(outDir, 'provider-partnerships-emails-clean.txt');

const skipParseNoise = (e) =>
  /sentry|wixpress|example@|mysite|youremail@domain|@o\d+\.ingest\.sentry/i.test(e) ||
  e.includes('%20') ||
  /^u003e/i.test(e) ||
  /orgafscme$|comcooper$/i.test(e);

/** Host is obviously a placeholder site builder / demo domain. */
const junkHost = (host) =>
  /^(domain\.com|domain\.tld|domain\.ltd|example\.com|example\.org|example\.net|yoursite\.com|yourdomain\.com|mysite\.com|site\.com)$/i.test(
    host,
  ) || /\.(domain\.com|domain\.tld|domain\.ltd)$/i.test(host);

/** Local part is a generic demo / test identity. */
const junkLocal = (local) =>
  /^(email|user|test|tests|filler|sample|username|yourname|name|janedoe|johndoe|mailtoslk8332015)$/i.test(
    local,
  ) ||
  /^(noreply|no-reply|donotreply|no_reply)/i.test(local);

const exactJunk = new Set(
  [
    'filler@godaddy.com',
    'info@office.com',
    'thegem@domain.ltd',
    'janedoe@vjfamilyfoundation.com',
    'listserv@ls.sysadm.suny.edu',
    'support@wildapricot.com',
    'customerservice@shapeplus.com',
  ].map((x) => x.toLowerCase()),
);

function badHostShape(host) {
  if (!host) return true;
  if (host === 'gmail.co') return true;
  const parts = host.split('.');
  const tld = parts[parts.length - 1] || '';
  if (tld === 'og' && host.endsWith('.og')) return true;
  return false;
}

function isCleanEmail(e) {
  if (exactJunk.has(e)) return false;
  const at = e.lastIndexOf('@');
  if (at < 1) return false;
  const local = e.slice(0, at);
  const host = e.slice(at + 1);
  if (junkHost(host)) return false;
  if (junkLocal(local)) return false;
  if (badHostShape(host)) return false;
  return true;
}

/** Basic single-address shape (rejects glued pairs like x@y.orgz@w.com). */
const looksLikeOneEmail = (e) =>
  /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(e) && (e.match(/@/g) || []).length === 1;

function normalizeEmail(rawE) {
  let x = String(rawE).trim().toLowerCase();
  x = x.replace(/\u200b|\u200c|\u200d|\ufeff/g, '');
  try {
    x = decodeURIComponent(x);
  } catch {
    /* keep x */
  }
  x = x.replace(/\u200b|\u200c|\u200d|\ufeff/g, '').trim().toLowerCase();
  return x;
}

const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const set = new Set();

function addList(arr) {
  if (!Array.isArray(arr)) return;
  for (const rawE of arr) {
    const x = normalizeEmail(rawE);
    if (!x || !x.includes('@') || skipParseNoise(x) || !looksLikeOneEmail(x)) continue;
    set.add(x);
  }
}

for (const row of raw) {
  addList(row.emails);
  if (Array.isArray(row.evidence)) {
    for (const ev of row.evidence) addList(ev.emails);
  }
}

const sorted = [...set].sort();
fs.writeFileSync(pathAll, sorted.join('\n') + '\n', 'utf8');

const clean = sorted.filter(isCleanEmail);
fs.writeFileSync(pathClean, clean.join('\n') + '\n', 'utf8');

console.log(`Wrote ${sorted.length} -> ${pathAll}`);
console.log(`Wrote ${clean.length} (filtered) -> ${pathClean}`);
