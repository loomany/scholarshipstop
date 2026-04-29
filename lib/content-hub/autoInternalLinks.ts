/**
 * Deterministic HTML-aware internal autolinker for Content Hub (`content_posts.body_html`).
 * Lightweight linear scan over tags/text (does not mutate existing anchors, skips headings h1–h4
 * text, skips content from `<h2>Sources</h2>` onward).
 */

import defaultDictionaryJson from '@/data/internal-link-dictionary.json';

export type InternalLinkDictionaryEntry = {
  anchorPhrases: string[];
  targetUrl: string;
  priority: number;
  maxPerArticle: number;
};

export type AutoInternalLinkCandidate = {
  anchorPhrase: string;
  targetUrl: string;
  matchedText: string;
};

export type AutoInternalLinkOptions = {
  enabled?: boolean;
  dryRun?: boolean;
  maxLinksPerArticle?: number;
  /** Overrides bundled dictionary (used in tests). */
  rules?: InternalLinkDictionaryEntry[];
};

const SOURCES_HEADING_RE = /<h2\b[^>]*>\s*Sources\s*<\/h2\s*>/i;

const TRACKED_TAGS = new Set(['a', 'h1', 'h2', 'h3', 'h4']);

const VOID_HTML = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
]);

type FlattenedPhraseRule = {
  phrase: string;
  targetUrl: string;
  priority: number;
  maxPerArticle: number;
  ruleIndex: number;
};

type ProcessState = {
  flatRules: FlattenedPhraseRule[];
  maxLinksTotal: number;
  usedUrls: Set<string>;
  usedMatchedLower: Set<string>;
  usageByRule: Map<number, number>;
  inserted: number;
  candidates: AutoInternalLinkCandidate[];
};

function flattenAndSortRules(
  entries: InternalLinkDictionaryEntry[]
): FlattenedPhraseRule[] {
  const out: FlattenedPhraseRule[] = [];
  for (let r = 0; r < entries.length; r++) {
    const row = entries[r];
    if (!row) continue;
    const targetUrl = String(row.targetUrl ?? '').trim();
    if (!isAllowedInternalHref(targetUrl)) continue;
    const maxEach = Math.max(1, Math.floor(Number(row.maxPerArticle) || 1));
    const pr = Number.isFinite(row.priority) ? row.priority : 0;
    for (const phrase of row.anchorPhrases ?? []) {
      const p = phrase.trim();
      if (p.length < 2) continue;
      out.push({
        phrase: p,
        targetUrl,
        priority: pr,
        maxPerArticle: maxEach,
        ruleIndex: r
      });
    }
  }

  return out.slice().sort((a, b) => {
    if (b.phrase.length !== a.phrase.length) {
      return b.phrase.length - a.phrase.length;
    }
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    if (a.ruleIndex !== b.ruleIndex) {
      return a.ruleIndex - b.ruleIndex;
    }
    return a.phrase.localeCompare(b.phrase);
  });
}

function isAllowedInternalHref(href: string): boolean {
  if (!href.startsWith('/')) return false;
  if (href.includes('://')) return false;
  return true;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** `^`-anchored: group 1 captures the matched phrase. */
function phraseToStartCapturingRegex(phrase: string): RegExp | null {
  const tokens = phrase.trim().split(/\s+/g).filter(Boolean).map(escapeRegex);
  if (!tokens.length) return null;

  const mid = tokens.join('\\s+');
  const body = `\\b${mid}\\b`;

  try {
    return new RegExp(`^(${body})`, 'im');
  } catch {
    return null;
  }
}

function escapeHrefAttr(url: string): string {
  return url.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function parseTag(raw: string): {
  name: string;
  kind: 'open' | 'close' | 'ignore';
  selfClosing: boolean;
} | null {
  const t = raw.trim();
  if (/^<\?|^<!/.test(t)) {
    return { name: '', kind: 'ignore', selfClosing: false };
  }

  const closeM = /^<\/\s*([a-zA-Z][a-zA-Z0-9:-]*)[^>]*>/i.exec(t);
  if (closeM?.[1]) {
    return {
      name: closeM[1].toLowerCase(),
      kind: 'close',
      selfClosing: false
    };
  }

  const openM = /^<\s*([a-zA-Z][a-zA-Z0-9:-]*)/i.exec(t);
  if (!openM?.[1]) return null;

  const name = openM[1].toLowerCase();
  let selfClosing = /\/>\s*$/.test(t.trim());
  if (!selfClosing && VOID_HTML.has(name)) selfClosing = true;

  return { name, kind: 'open', selfClosing };
}

function consumeCloseTracked(stack: string[], tag: string): void {
  if (!TRACKED_TAGS.has(tag)) return;

  while (stack.length > 0) {
    const last = stack[stack.length - 1]!;
    if (last === tag) {
      stack.pop();
      return;
    }
    stack.pop();
  }
}

function applyOpenTracked(
  stack: string[],
  name: string,
  selfClosing: boolean
): void {
  if (!TRACKED_TAGS.has(name) || selfClosing) return;
  stack.push(name);
}

function canModifyText(shardStack: string[]): boolean {
  if (shardStack.includes('a')) return false;
  const inHeading = shardStack.some((t) =>
    ['h1', 'h2', 'h3', 'h4'].includes(t)
  );
  return !inHeading;
}

function pickInsertionAtRemainder(
  remainder: string,
  state: ProcessState,
  reuseRegex: Map<string, RegExp>
): { rule: FlattenedPhraseRule; match: RegExpExecArray } | null {
  for (const rule of state.flatRules) {
    let re: RegExp | undefined = reuseRegex.get(rule.phrase);
    if (!re) {
      const built = phraseToStartCapturingRegex(rule.phrase);
      if (!built) continue;
      re = built;
      reuseRegex.set(rule.phrase, re);
    }

    const m = re.exec(remainder);
    if (!m || m.index !== 0 || !m[1]) continue;

    const matchedRaw = m[1];
    if (matchedRaw.length === 0) continue;

    const keyLower = matchedRaw.toLowerCase();
    if (state.usedMatchedLower.has(keyLower)) continue;

    const ruleUses = state.usageByRule.get(rule.ruleIndex) ?? 0;

    if (ruleUses >= rule.maxPerArticle) continue;

    if (state.usedUrls.has(rule.targetUrl)) continue;

    return { rule, match: m as RegExpExecArray };
  }

  return null;
}

function injectIntoPlainSegment(
  text: string,
  state: ProcessState,
  reuseRegex: Map<string, RegExp>,
  stackSnapshot: string[]
): string {
  if (
    text.length === 0 ||
    !canModifyText(stackSnapshot) ||
    state.inserted >= state.maxLinksTotal
  ) {
    return text;
  }

  let cursor = 0;

  let out = '';

  while (cursor < text.length && state.inserted < state.maxLinksTotal) {
    const remainder = text.slice(cursor);

    const pick = pickInsertionAtRemainder(remainder, state, reuseRegex);

    if (!pick) {
      out += remainder[0]!;

      cursor += 1;

      continue;
    }

    const { rule, match } = pick;

    const full = match[0]!;

    const inner = match[1]!;

    out +=
      remainder.slice(0, match.index) +
      `<a href="${escapeHrefAttr(rule.targetUrl)}">${inner}</a>`;

    state.inserted += 1;

    state.usedMatchedLower.add(inner.toLowerCase());

    state.usedUrls.add(rule.targetUrl);

    const prevRuleUse = state.usageByRule.get(rule.ruleIndex) ?? 0;

    state.usageByRule.set(rule.ruleIndex, prevRuleUse + 1);

    state.candidates.push({
      anchorPhrase: rule.phrase,
      targetUrl: rule.targetUrl,
      matchedText: inner
    });

    cursor += full.length;
  }

  out += text.slice(cursor);

  return out;
}

function traverseAndLink(htmlFragment: string, state: ProcessState): string {
  let i = 0;

  const stack: string[] = [];

  let out = '';

  const reuseRegex = new Map<string, RegExp>();

  while (i < htmlFragment.length) {
    const lt = htmlFragment.indexOf('<', i);

    if (lt === -1) {
      out += injectIntoPlainSegment(
        htmlFragment.slice(i),

        state,

        reuseRegex,

        stack
      );

      break;
    }

    if (lt > i) {
      out += injectIntoPlainSegment(
        htmlFragment.slice(i, lt),

        state,

        reuseRegex,

        stack
      );

      if (state.inserted >= state.maxLinksTotal) {
        out += htmlFragment.slice(lt);

        break;
      }
    }

    const gt = htmlFragment.indexOf('>', lt);

    if (gt === -1) {
      out += injectIntoPlainSegment(
        htmlFragment.slice(lt),

        state,

        reuseRegex,

        stack
      );

      break;
    }

    const rawTag = htmlFragment.slice(lt, gt + 1);

    out += rawTag;

    const parsed = parseTag(rawTag);

    if (parsed) {
      if (parsed.kind === 'close') {
        consumeCloseTracked(stack, parsed.name);
      } else if (parsed.kind === 'open') {
        applyOpenTracked(stack, parsed.name, parsed.selfClosing);
      }
    }

    i = gt + 1;

    if (state.inserted >= state.maxLinksTotal) {
      out += htmlFragment.slice(i);

      break;
    }
  }

  return out;
}

/** Trim before `<h2>Sources</h2>`; tail retains Sources heading onward (not passed to linker). */

function splitBeforeSources(html: string): [string, string] {
  const m = SOURCES_HEADING_RE.exec(html);

  if (!m) return [html, ''];

  const headEnd = m.index;

  return [html.slice(0, headEnd), html.slice(headEnd)];
}

function loadDictionary(
  opts?: AutoInternalLinkOptions
): InternalLinkDictionaryEntry[] {
  const raw =
    opts?.rules ??
    (defaultDictionaryJson as unknown as InternalLinkDictionaryEntry[]);

  return Array.isArray(raw) ? raw : [];
}

function deterministicSortCandidates(
  list: AutoInternalLinkCandidate[]
): AutoInternalLinkCandidate[] {
  return list.slice().sort((a, b) => {
    const ua = `${a.anchorPhrase}:${a.targetUrl}:${a.matchedText}`;

    const ub = `${b.anchorPhrase}:${b.targetUrl}:${b.matchedText}`;

    return ua.localeCompare(ub);
  });
}

function runAutoInternal(
  html: string,

  options?: AutoInternalLinkOptions
): {
  resultHtml: string;

  candidates: AutoInternalLinkCandidate[];
} {
  const dict = loadDictionary(options);

  const flat = flattenAndSortRules(dict);

  const state: ProcessState = {
    flatRules: flat,

    maxLinksTotal:
      typeof options?.maxLinksPerArticle === 'number'
        ? Math.max(0, Math.floor(options.maxLinksPerArticle))
        : 3,

    usedUrls: new Set<string>(),

    usedMatchedLower: new Set<string>(),

    usageByRule: new Map<number, number>(),

    inserted: 0,

    candidates: []
  };

  if (!html || state.flatRules.length === 0 || state.maxLinksTotal === 0) {
    return {
      resultHtml: html,

      candidates: []
    };
  }

  const [beforeSources, fromSourcesHeading] = splitBeforeSources(html);

  const processedHead =
    state.flatRules.length > 0
      ? traverseAndLink(beforeSources, state)
      : beforeSources;

  const resultHtml = `${processedHead}${fromSourcesHeading}`;

  return {
    resultHtml,

    candidates: deterministicSortCandidates(state.candidates)
  };
}

export function applyAutoInternalLinks(
  html: string,

  options?: AutoInternalLinkOptions
): string {
  if (options?.enabled === false) {
    return html;
  }

  const { resultHtml } = runAutoInternal(html, options);

  if (options?.dryRun) {
    return html;
  }

  return resultHtml;
}

export function getAutoInternalLinkCandidates(
  html: string,

  options?: AutoInternalLinkOptions
): AutoInternalLinkCandidate[] {
  if (options?.enabled === false) {
    return [];
  }

  const { candidates } = runAutoInternal(html, {
    ...options
  });

  return candidates;
}
