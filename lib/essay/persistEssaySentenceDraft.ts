/**
 * Persists unsaved sentence-level edits (green / humanize markers) for the essay editor
 * so a reload or brief disconnect does not lose work before Merge & re-check.
 */

const PREFIX = 'essay_sentence_draft_v1:';

export type EssayRowLite = { id: string; content: string };

export function fingerprintContent(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${s.length}:${(h >>> 0).toString(16)}`;
}

type RowDraft = {
  contentFingerprint: string;
  sentenceUserEdits: Record<string, string>;
  humanizeIndices: number[];
};

type StoredV1 = {
  v: 1;
  updatedAt: number;
  hasManualSnippetTouch: boolean;
  rows: Record<string, RowDraft>;
};

function storageKey(chainKey: string): string {
  return `${PREFIX}${chainKey}`;
}

function normalizeEdits(raw: Record<string, string>): Record<number, string> {
  const out: Record<number, string> = {};
  for (const k of Object.keys(raw)) {
    const n = Number(k);
    if (Number.isFinite(n)) out[n] = raw[k]!;
  }
  return out;
}

export function clearEssaySentenceDraft(chainKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(storageKey(chainKey));
  } catch {
    /* quota / private mode */
  }
}

export function saveEssaySentenceDraft(
  chainKey: string,
  versions: EssayRowLite[],
  sentenceUserEdits: Record<string, Record<number, string>>,
  humanizeSourceByRow: Record<string, Set<number>>,
  hasManualSnippetTouch: boolean
): void {
  if (typeof window === 'undefined') return;
  const byId = new Map(versions.map((v) => [v.id, v]));
  const rows: Record<string, RowDraft> = {};
  const rowIds = new Set<string>([
    ...Object.keys(sentenceUserEdits),
    ...Object.keys(humanizeSourceByRow)
  ]);

  for (const id of rowIds) {
    const row = byId.get(id);
    if (!row) continue;
    const ed = sentenceUserEdits[id];
    const hz = humanizeSourceByRow[id];
    const hasEd = ed && Object.keys(ed).length > 0;
    const hasHz = hz && hz.size > 0;
    if (!hasEd && !hasHz) continue;
    rows[id] = {
      contentFingerprint: fingerprintContent(row.content),
      sentenceUserEdits: hasEd
        ? Object.fromEntries(
            Object.entries(ed!).map(([k, v]) => [String(k), v])
          )
        : {},
      humanizeIndices: hasHz ? [...hz!] : []
    };
  }

  if (Object.keys(rows).length === 0 && !hasManualSnippetTouch) {
    clearEssaySentenceDraft(chainKey);
    return;
  }

  const payload: StoredV1 = {
    v: 1,
    updatedAt: Date.now(),
    hasManualSnippetTouch,
    rows: Object.keys(rows).length > 0 ? rows : {}
  };

  try {
    localStorage.setItem(storageKey(chainKey), JSON.stringify(payload));
  } catch {
    /* quota */
  }
}

export function loadEssaySentenceDraft(
  chainKey: string,
  versions: EssayRowLite[]
): {
  sentenceUserEdits: Record<string, Record<number, string>>;
  humanizeSourceByRow: Record<string, Set<number>>;
  hasManualSnippetTouch: boolean;
} | null {
  if (typeof window === 'undefined') return null;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(storageKey(chainKey));
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: StoredV1;
  try {
    parsed = JSON.parse(raw) as StoredV1;
  } catch {
    return null;
  }
  if (parsed.v !== 1 || !parsed.rows || typeof parsed.rows !== 'object') {
    return null;
  }

  const byId = new Map(versions.map((v) => [v.id, v]));
  const sentenceUserEdits: Record<string, Record<number, string>> = {};
  const humanizeSourceByRow: Record<string, Set<number>> = {};
  let any = false;

  for (const [rowId, draft] of Object.entries(parsed.rows)) {
    const row = byId.get(rowId);
    if (!row) continue;
    if (fingerprintContent(row.content) !== draft.contentFingerprint) {
      continue;
    }
    if (draft.sentenceUserEdits && typeof draft.sentenceUserEdits === 'object') {
      const norm = normalizeEdits(draft.sentenceUserEdits as Record<string, string>);
      if (Object.keys(norm).length > 0) {
        sentenceUserEdits[rowId] = norm;
        any = true;
      }
    }
    if (Array.isArray(draft.humanizeIndices) && draft.humanizeIndices.length > 0) {
      humanizeSourceByRow[rowId] = new Set(
        draft.humanizeIndices.filter((n) => typeof n === 'number' && Number.isFinite(n))
      );
      any = true;
    }
  }

  const touch = Boolean(parsed.hasManualSnippetTouch);
  if (!any && !touch) return null;

  return {
    sentenceUserEdits,
    humanizeSourceByRow,
    hasManualSnippetTouch: touch
  };
}
