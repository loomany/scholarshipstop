'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check,
  ChevronDown,
  Copy,
  FileDown,
  FilePenLine,
  FileText,
  Gauge,
  Loader2,
  MessageSquare,
  RotateCcw,
  ScrollText,
  Settings,
  Wand2
} from 'lucide-react';

import {
  EssayCheckOrHumanizeSlot,
  EssayContentHighlighted,
  EssayHumanizeEntireDraftSlot,
  type EssayAiDetectorChoice,
  GptZeroResultPanel
} from '@/components/essay/EssayResult';
import type { UndetectableHumanizeModelId } from '@/lib/essay/undetectableHumanizeModels';
import { useToast } from '@/components/ui/Toasts/use-toast';
import type { GptZeroSentenceScore } from '@/lib/essay/parseGptZeroRichResponse';
import { getRiskySentenceIndicesForEssay } from '@/lib/essay/riskySentenceIndices';
import {
  applySentenceEdits,
  getEssaySentenceSegmentsExact
} from '@/lib/essay/splitEssaySentences';
import { essayRowHasFullDraftHumanize } from '@/lib/essay/essayMergeMarkers';
import {
  friendlyUndetectableError,
  UNDETECTABLE_MIN_CONTENT_CHARS
} from '@/lib/essay/undetectableUserMessages';
import {
  TRIAL_CHAT_DIALOGUE_LIMIT,
  TRIAL_FEATURE_LIMIT,
  trialQuotasAllExhausted,
  type TrialFeatureQuotaSnapshot
} from '@/lib/payments/trialFeatureQuotas';
import {
  clearEssayBrowserStorage,
  clearEssaySessionStorageCaches
} from '@/lib/essay/clearEssayBrowserStorage';
import { downloadEssayAsPdf } from '@/lib/essay/downloadEssayAsPdf';
import { INTERVIEW_DRAFT_STRONG_MIN_PERCENT } from '@/lib/essay/interviewDraftProgressGate';
import EssaySendForAiCheckButton from '@/components/essay/EssaySendForAiCheckButton';
import type { EssaySendForAiDetectorChoice } from '@/components/essay/EssaySendForAiCheckButton';
import ManualGreenCoverageModal from '@/components/essay/ManualGreenCoverageModal';
import ScholarshipSubscriptionOfferModal from '@/components/scholarships/ScholarshipSubscriptionOfferModal';
import {
  getManualGreenCoverageRatio,
  MANUAL_GREEN_COVERAGE_THRESHOLD
} from '@/lib/essay/manualGreenCoverage';
import {
  clearEssaySentenceDraft,
  loadEssaySentenceDraft,
  saveEssaySentenceDraft
} from '@/lib/essay/persistEssaySentenceDraft';
import { cn } from '@/utils/cn';
import type { EssayVersionRow } from './page';

type GptSnapshot = {
  humanScore: number | null;
  /** Highlighting for UI and for batch “humanize all” — user-visible content only. */
  sentences: GptZeroSentenceScore[] | null;
  /** Which detector produced the last check (legacy snapshots without this field default to GPTZero). */
  detector?: EssayAiDetectorChoice | null;
};

/** Completed GPTZero check in this session (score and/or sentence map). */
function hasCompletedAiCheck(snap: GptSnapshot | undefined): boolean {
  if (!snap) return false;
  if (snap.humanScore !== null) return true;
  return Boolean(snap.sentences && snap.sentences.length > 0);
}

type Props = {
  currentEssay: EssayVersionRow;
  essayVersions: EssayVersionRow[];
  /** One version chain (response_id / essay_chat_id / standalone essay). */
  essayChainKey: string;
  /** Early short interview draft (topic scores below 85%). */
  draftQualityTier?: 'preview' | 'standard' | null;
  /**
   * Current mentor-chat progress from DB: all topics ≥ 85%. Hides stale “Early draft” when the draft
   * was generated before the chat caught up.
   */
  mentorChatMeetsStrongDraft?: boolean;
  essayChatId?: string | null;
  /** Active subscription or trial — otherwise Humanize entire draft shows the paywall. */
  hasSubscription: boolean;
  /** Per-feature limits during the 3-day trial (from server). */
  trialFeatureQuota?: TrialFeatureQuotaSnapshot | null;
};

/** Server rows win by id; client-only rows are kept until a stale refresh drops them. */
function mergeEssayVersionsById(
  server: EssayVersionRow[],
  client: EssayVersionRow[]
): EssayVersionRow[] {
  const byId = new Map<string, EssayVersionRow>();
  for (const v of client) byId.set(v.id, v);
  for (const v of server) byId.set(v.id, v);
  return [...byId.values()].sort((a, b) => a.version - b.version);
}

const SESSION_PREVIEW_FIRST_ONLY = 'essay_dev_preview_first_only';

function previewFirstOnlyStorageKey(chainKey: string): string {
  return `${SESSION_PREVIEW_FIRST_ONLY}:${chainKey}`;
}

function readPreviewFirstOnlyFromStorage(chainKey: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(previewFirstOnlyStorageKey(chainKey)) === '1';
  } catch {
    return false;
  }
}

function writePreviewFirstOnlyToStorage(chainKey: string, on: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    const k = previewFirstOnlyStorageKey(chainKey);
    if (on) sessionStorage.setItem(k, '1');
    else sessionStorage.removeItem(k);
  } catch {
    /* quota / private mode */
  }
}

/** Until RSC returns the new row after humanize, keep it client-side (avoids reverting after replace). */
function pendingRowStorageKey(chainKey: string): string {
  return `essay_pending_row:${chainKey}`;
}

function readPendingRow(chainKey: string): EssayVersionRow | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(pendingRowStorageKey(chainKey));
    if (!raw) return null;
    return JSON.parse(raw) as EssayVersionRow;
  } catch {
    return null;
  }
}

function writePendingRow(chainKey: string, row: EssayVersionRow | null): void {
  if (typeof window === 'undefined') return;
  try {
    const k = pendingRowStorageKey(chainKey);
    if (row) sessionStorage.setItem(k, JSON.stringify(row));
    else sessionStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

function gptZeroStorageKey(essayId: string): string {
  return `essay_gpt_zero:${essayId}`;
}

function chainHasFullHumanize(rows: EssayVersionRow[]): boolean {
  return rows.some((v) => essayRowHasFullDraftHumanize(v.grinder_notes));
}

/** Source / Corrections tabs: ≥2 versions and the chain includes a full-draft humanize. Toolbar AI check targets the latest version (Corrections). */
function canShowEssayVersionTabs(
  sortedFullLength: number,
  originalRow: EssayVersionRow | null,
  sortedFull: EssayVersionRow[]
): boolean {
  if (sortedFullLength < 2 || !originalRow) return false;
  return chainHasFullHumanize(sortedFull);
}

/** After `router.replace` to a new essay version the component remounts — without this, Source would reopen. */
function editorOpenCorrectionsStorageKey(chainKey: string): string {
  return `essay_editor_open_corrections:${chainKey}`;
}

function initialEditorViewForEssay(chainKey: string): 'original' | 'corrections' {
  if (typeof window !== 'undefined') {
    try {
      const k = editorOpenCorrectionsStorageKey(chainKey);
      if (sessionStorage.getItem(k) === '1') {
        sessionStorage.removeItem(k);
        return 'corrections';
      }
    } catch {
      /* ignore */
    }
  }
  return 'original';
}

type EssaySaveApiPayload = {
  error?: string;
  id?: string;
  version?: number;
  content?: string;
  created_at?: string;
  grinder_notes?: string | null;
  humanScore?: number | null;
  sentences?: GptZeroSentenceScore[];
  gptZeroError?: string | null;
};

function sanitizeErrorDescription(s: string): string {
  const t = s.trim();
  if (
    /<!doctype\s+html/i.test(t) ||
    /<html[\s>]/i.test(t) ||
    (t.startsWith('<!--') && t.includes('<html'))
  ) {
    return 'The server returned HTML instead of an error message. Check your GPTZero key and API availability.';
  }
  return t.length > 450 ? `${t.slice(0, 447)}…` : t;
}

function EssayActionBar(props: {
  copied: boolean;
  copyLoading: boolean;
  checkLoading: boolean;
  mergeLoading: boolean;
  batchUndetectAllLoading: boolean;
  fullHumanizeLoading: boolean;
  pdfLoading: boolean;
  showCheckHumanize: boolean;
  aiCheckLabel: string;
  showHumanizeEntireDraft: boolean;
  downloadPdfDisabled: boolean;
  hasSubscription: boolean;
  onHumanizePremiumBlocked: () => void;
  onCopy: () => void;
  onCheckAi: (detector: EssayAiDetectorChoice) => void;
  onHumanizeEntireDraft: (model: UndetectableHumanizeModelId) => void;
  onDownloadPdf: () => void;
  /** Mentor chat deep link (`/essay?chat=…`) so “Back to AI chat” opens the same thread. */
  mentorChatHref?: string;
  /** Inside the article card header — no extra outer chrome. */
  variant?: 'standalone' | 'inArticle';
}) {
  const {
    copied,
    copyLoading,
    checkLoading,
    mergeLoading,
    batchUndetectAllLoading,
    fullHumanizeLoading,
    pdfLoading,
    showCheckHumanize,
    aiCheckLabel,
    showHumanizeEntireDraft,
    downloadPdfDisabled,
    hasSubscription,
    onHumanizePremiumBlocked,
    onCopy,
    onCheckAi,
    onHumanizeEntireDraft,
    onDownloadPdf,
    mentorChatHref = '/essay',
    variant = 'standalone'
  } = props;
  const busy =
    copyLoading ||
    checkLoading ||
    mergeLoading ||
    batchUndetectAllLoading ||
    fullHumanizeLoading;
  const inArticle = variant === 'inArticle';

  return (
    <div
      className={
        inArticle
          ? 'w-full'
          : 'rounded-2xl border border-zinc-200/90 bg-white p-2 shadow-sm ring-1 ring-black/[0.04] sm:p-3'
      }
    >
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-nowrap sm:items-stretch sm:justify-center sm:gap-3">
        <Link
          href={mentorChatHref}
          className="inline-flex min-h-[48px] w-full shrink-0 items-center justify-center gap-2.5 rounded-xl border border-zinc-200/95 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04] transition hover:border-zinc-300 hover:bg-zinc-50/90 hover:shadow-[0_4px_14px_-6px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A1A]/35 focus-visible:ring-offset-2 sm:min-w-[9.5rem] sm:w-auto"
        >
          <MessageSquare
            className="h-[1.125rem] w-[1.125rem] shrink-0 text-[#FF7A1A]"
            strokeWidth={2}
            aria-hidden
          />
          Back to AI chat
        </Link>
        <button
          type="button"
          onClick={onCopy}
          disabled={busy}
          className="inline-flex min-h-[48px] w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-200/95 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04] transition hover:border-zinc-300 hover:bg-zinc-50/90 hover:shadow-[0_4px_14px_-6px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A1A]/35 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[6.5rem]"
        >
          {copyLoading ? (
            <Loader2
              className="h-[1.125rem] w-[1.125rem] shrink-0 animate-spin text-[#FF7A1A]"
              aria-hidden
            />
          ) : copied ? (
            <Check
              className="h-[1.125rem] w-[1.125rem] shrink-0 text-[#FF7A1A]"
              strokeWidth={2}
              aria-hidden
            />
          ) : (
            <Copy
              className="h-[1.125rem] w-[1.125rem] shrink-0 text-[#FF7A1A]"
              strokeWidth={2}
              aria-hidden
            />
          )}
          Copy
        </button>
        {showCheckHumanize ? (
          <EssayCheckOrHumanizeSlot
            checkLabel={aiCheckLabel}
            checkLoading={checkLoading}
            disabled={busy}
            onCheckAi={(detector) => onCheckAi(detector)}
          />
        ) : null}
        {showHumanizeEntireDraft ? (
          <EssayHumanizeEntireDraftSlot
            humanizeLoading={fullHumanizeLoading}
            disabled={busy}
            onHumanize={onHumanizeEntireDraft}
            premiumLocked={!hasSubscription}
            onPremiumBlocked={onHumanizePremiumBlocked}
          />
        ) : null}
        <button
          type="button"
          onClick={onDownloadPdf}
          disabled={busy || pdfLoading || downloadPdfDisabled}
          title="Download the current essay text as a PDF (same content as Copy)."
          className="inline-flex min-h-[48px] w-full shrink-0 items-center justify-center gap-2.5 rounded-xl border border-zinc-200/95 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04] transition hover:border-zinc-300 hover:bg-zinc-50/90 hover:shadow-[0_4px_14px_-6px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A1A]/35 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[9.5rem] sm:w-auto"
        >
          {pdfLoading ? (
            <Loader2
              className="h-[1.125rem] w-[1.125rem] shrink-0 animate-spin text-[#FF7A1A]"
              aria-hidden
            />
          ) : (
            <FileDown
              className="h-[1.125rem] w-[1.125rem] shrink-0 text-[#FF7A1A]"
              strokeWidth={2}
              aria-hidden
            />
          )}
          Download PDF
        </button>
      </div>
    </div>
  );
}

function essayBodyClassName() {
  return 'font-sans text-[17px] leading-relaxed text-zinc-900';
}

export default function EssayResultClient({
  currentEssay: _currentEssay,
  essayVersions,
  essayChainKey,
  draftQualityTier = null,
  mentorChatMeetsStrongDraft = false,
  essayChatId = null,
  hasSubscription,
  trialFeatureQuota = null
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [subscriptionOfferOpen, setSubscriptionOfferOpen] = useState(false);
  const [preAiCheckPromoOpen, setPreAiCheckPromoOpen] = useState(false);
  const [manualCoverageModalOpen, setManualCoverageModalOpen] = useState(false);
  const pendingTextEditorDetectorRef = useRef<EssaySendForAiDetectorChoice | null>(
    null
  );
  const [draftPersistenceReady, setDraftPersistenceReady] = useState(false);
  const restoredSentenceDraftChainRef = useRef<string | null>(null);
  const essaySentenceDraftPersistRef = useRef<{
    chainKey: string;
    rows: EssayVersionRow[];
    sentenceUserEdits: Record<string, Record<number, string>>;
    humanizeSourceByRow: Record<string, Set<number>>;
    hasManualSnippetTouch: boolean;
  } | null>(null);
  /** User saved a snippet after manual input in the pop-up (step 2), not only via Humanize. */
  const [hasManualSnippetTouch, setHasManualSnippetTouch] = useState(false);

  const mentorChatHref =
    essayChatId != null && essayChatId !== ''
      ? `/essay?chat=${encodeURIComponent(essayChatId)}`
      : '/essay';

  /** Stored tier can stay `preview` after the user later brings all topics ≥85% in the chat. */
  const previewInterviewNagActive = useMemo(
    () =>
      draftQualityTier === 'preview' &&
      Boolean(essayChatId) &&
      !mentorChatMeetsStrongDraft,
    [draftQualityTier, essayChatId, mentorChatMeetsStrongDraft]
  );

  const [versions, setVersions] = useState<EssayVersionRow[]>(essayVersions);

  const versionKey = essayVersions.map((v) => v.id).join('|');
  const chainKeyRef = useRef(essayChainKey);
  const prevLatestEssayIdRef = useRef<string | null>(null);

  useEffect(() => {
    const pending = readPendingRow(essayChainKey);

    if (chainKeyRef.current !== essayChainKey) {
      chainKeyRef.current = essayChainKey;
      let next = [...essayVersions];
      if (pending && !next.some((v) => v.id === pending.id)) {
        next = mergeEssayVersionsById([pending], next);
      } else if (pending && next.some((v) => v.id === pending.id)) {
        writePendingRow(essayChainKey, null);
      }
      setVersions(next);
      return;
    }

    setVersions((prev) => {
      let merged = mergeEssayVersionsById(essayVersions, prev);
      if (pending && !merged.some((v) => v.id === pending.id)) {
        merged = mergeEssayVersionsById([pending], merged);
      } else if (pending && essayVersions.some((v) => v.id === pending.id)) {
        writePendingRow(essayChainKey, null);
      }
      return merged;
    });
  }, [essayChainKey, versionKey, essayVersions]);

  const sortedFull = useMemo(
    () => [...versions].sort((a, b) => a.version - b.version),
    [versions]
  );

  /** First saved row in the chain (Source) — unchanged when new versions are added. */
  const originalEssayRow = useMemo(() => sortedFull[0] ?? null, [sortedFull]);
  const originalEssayContent = originalEssayRow?.content ?? '';

  /** Local: show only the first chain version (fresh-essay feel), no 1…N variant UI. Set in sessionStorage after “Full reset”. */
  const [devPreviewFirstOnly, setDevPreviewFirstOnly] = useState(false);
  const [essayDevToolsOpen, setEssayDevToolsOpen] = useState(false);

  const showEssayDevTools = process.env.NODE_ENV === 'development';

  useLayoutEffect(() => {
    if (!showEssayDevTools) {
      setDevPreviewFirstOnly(false);
      return;
    }
    setDevPreviewFirstOnly(readPreviewFirstOnlyFromStorage(essayChainKey));
  }, [essayChainKey, showEssayDevTools]);

  useEffect(() => {
    if (!essayDevToolsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEssayDevToolsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [essayDevToolsOpen]);

  const sorted = useMemo(() => {
    if (devPreviewFirstOnly && sortedFull.length > 0) {
      return [sortedFull[0]!];
    }
    return sortedFull;
  }, [sortedFull, devPreviewFirstOnly]);

  const latest = sorted[sorted.length - 1]!;

  const [editorView, setEditorView] = useState<'original' | 'corrections'>(() =>
    initialEditorViewForEssay(essayChainKey)
  );

  const [gptById, setGptById] = useState<Record<string, GptSnapshot>>({});

  const mergeGpt = useCallback((essayId: string, snap: GptSnapshot) => {
    setGptById((prev) => ({ ...prev, [essayId]: snap }));
    try {
      sessionStorage.setItem(gptZeroStorageKey(essayId), JSON.stringify(snap));
    } catch {
      /* ignore */
    }
  }, []);

  const gptSnapshotIdsKey = useMemo(
    () => [...versions].sort((a, b) => a.version - b.version).map((v) => v.id).join('|'),
    [versions]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setGptById((prev) => {
      const next = { ...prev };
      for (const id of gptSnapshotIdsKey.split('|').filter(Boolean)) {
        if (hasCompletedAiCheck(next[id])) continue;
        try {
          const raw = sessionStorage.getItem(gptZeroStorageKey(id));
          if (!raw) continue;
          const snap = JSON.parse(raw) as GptSnapshot;
          if (hasCompletedAiCheck(snap)) next[id] = snap;
        } catch {
          /* ignore */
        }
      }
      return next;
    });
  }, [gptSnapshotIdsKey]);

  const gptLatest = gptById[latest.id];
  const humanScoreLatest = gptLatest?.humanScore ?? null;

  const gptOriginal = originalEssayRow ? gptById[originalEssayRow.id] : undefined;
  const humanScoreOriginal = gptOriginal?.humanScore ?? null;

  const showVersionTabs = canShowEssayVersionTabs(
    sortedFull.length,
    originalEssayRow,
    sortedFull
  );

  /** After merge / humanize / new version — open Corrections when tabs are available. */
  useEffect(() => {
    if (
      prevLatestEssayIdRef.current !== null &&
      prevLatestEssayIdRef.current !== latest.id
    ) {
      if (showVersionTabs) {
        setEditorView('corrections');
      }
    }
    prevLatestEssayIdRef.current = latest.id;
  }, [latest.id, showVersionTabs]);

  /** Always the latest chain version: one Source in the editor, no “Version N” tabs. */
  const displayed = useMemo(
    () => ({
      row: latest,
      content: latest.content,
      essayIdForApi: latest.id,
      humanScore: humanScoreLatest,
      sentences: gptLatest?.sentences ?? null,
      showHighlights: Boolean(gptLatest?.sentences && gptLatest.sentences.length > 0),
      emptyHint: null as string | null
    }),
    [latest, gptLatest, humanScoreLatest]
  );

  /** Matches the score under the editor: without tabs and ≥2 versions, show Source → Source score. */
  const panelHumanScore = (() => {
    if (showVersionTabs) {
      return editorView === 'original' ? humanScoreOriginal : humanScoreLatest;
    }
    if (sortedFull.length >= 2) {
      return hasCompletedAiCheck(gptOriginal) ? humanScoreOriginal : null;
    }
    return humanScoreLatest;
  })();

  /** Detector shown on the Human Score card for the active tab / version. */
  const panelDetectorLabel = ((): string => {
    if (showVersionTabs) {
      const d =
        editorView === 'original' ? gptOriginal?.detector : gptLatest?.detector;
      return d === 'undetectable' ? 'Undetectable.AI' : 'GPTZero';
    }
    if (sortedFull.length >= 2) {
      const d = hasCompletedAiCheck(gptOriginal)
        ? gptOriginal?.detector
        : gptLatest?.detector;
      return d === 'undetectable' ? 'Undetectable.AI' : 'GPTZero';
    }
    return gptLatest?.detector === 'undetectable' ? 'Undetectable.AI' : 'GPTZero';
  })();

  const aiCheckToolbarLabel = hasCompletedAiCheck(gptLatest)
    ? 'Re-run AI check'
    : 'Run AI check';

  /**
   * Toolbar actions are mutually exclusive:
   * no GPTZero check on the latest version → Run AI check;
   * check complete → Humanize entire draft; after humanizing, the new version
   * has no check yet → Run AI check again.
   */
  const gptCheckCompleteOnLatest = hasCompletedAiCheck(gptLatest);
  const showToolbarAiCheck = !gptCheckCompleteOnLatest;
  const showToolbarHumanize = gptCheckCompleteOnLatest;

  /** Source tab: manual edits + Run AI check only, no Humanize. */
  const aiCheckToolbarLabelResolved =
    showVersionTabs && editorView === 'original'
      ? hasCompletedAiCheck(gptOriginal)
        ? 'Re-run AI check'
        : 'Run AI check'
      : aiCheckToolbarLabel;
  const showToolbarAiCheckResolved =
    showVersionTabs && editorView === 'original' ? true : showToolbarAiCheck;
  const showToolbarHumanizeResolved =
    showVersionTabs && editorView === 'original' ? false : showToolbarHumanize;

  const [copied, setCopied] = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [mergeLoading, setMergeLoading] = useState(false);
  const [batchUndetectAllLoading, setBatchUndetectAllLoading] = useState(false);
  const [fullHumanizeLoading, setFullHumanizeLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewCheckOpen, setPreviewCheckOpen] = useState(false);
  const [humanizeSourceByRow, setHumanizeSourceByRow] = useState<
    Record<string, Set<number>>
  >({});
  const [accordionOpen, setAccordionOpen] = useState(false);

  /** Manual sentence edits by essay row id (GPTZero sentence indices). */
  const [sentenceUserEdits, setSentenceUserEdits] = useState<
    Record<string, Record<number, string>>
  >({});

  const busy =
    copyLoading ||
    checkLoading ||
    mergeLoading ||
    batchUndetectAllLoading ||
    fullHumanizeLoading;

  const hasGptSentenceHighlights = Boolean(
    displayed.showHighlights && displayed.sentences && displayed.sentences.length > 0
  );

  const hasOriginalGptHighlights = Boolean(
    originalEssayRow &&
      gptOriginal?.sentences &&
      gptOriginal.sentences.length > 0
  );

  /** Essay row used for merge math, Copy, and Merge (Source or latest version). */
  const activeMergeRow =
    showVersionTabs && editorView === 'original' && originalEssayRow
      ? originalEssayRow
      : latest;

  const mergedEssayText = useMemo(
    () =>
      applySentenceEdits(
        activeMergeRow.content,
        sentenceUserEdits[activeMergeRow.id] ?? {}
      ),
    [activeMergeRow.content, activeMergeRow.id, sentenceUserEdits]
  );

  const onSaveUserSentenceEdit = useCallback(
    (sentenceIndex: number, newText: string) => {
      const rowId =
        showVersionTabs && editorView === 'original' && originalEssayRow
          ? originalEssayRow.id
          : displayed.row.id;
      setHumanizeSourceByRow((prev) => {
        const cur = prev[rowId];
        if (!cur?.has(sentenceIndex)) return prev;
        const nextSet = new Set(cur);
        nextSet.delete(sentenceIndex);
        return { ...prev, [rowId]: nextSet };
      });
      setSentenceUserEdits((prev) => ({
        ...prev,
        [rowId]: { ...(prev[rowId] ?? {}), [sentenceIndex]: newText }
      }));
    },
    [displayed.row.id, editorView, originalEssayRow, showVersionTabs]
  );

  const sentenceEditUiActive =
    ((!showVersionTabs || editorView === 'corrections') &&
      hasGptSentenceHighlights) ||
    (showVersionTabs && editorView === 'original' && hasOriginalGptHighlights);

  const hasActiveSentenceEdits = useMemo(
    () =>
      Object.keys(sentenceUserEdits[activeMergeRow.id] ?? {}).length > 0,
    [activeMergeRow.id, sentenceUserEdits]
  );

  const hasHighlightsForMergeUi =
    showVersionTabs && editorView === 'original'
      ? hasOriginalGptHighlights
      : hasGptSentenceHighlights;

  const showStickyMergeFooter = hasHighlightsForMergeUi && hasActiveSentenceEdits;

  /** Green “Send for AI check” button: only after manual input in the snippet pop-up and when GPTZero highlights exist. */
  const showTextEditorSendForAiCheck =
    hasManualSnippetTouch &&
    sentenceEditUiActive &&
    (showVersionTabs && editorView === 'original'
      ? hasOriginalGptHighlights
      : hasGptSentenceHighlights);

  /** Share of risky text covered by manual edits (green snippets) — for the button label. */
  const manualGreenCoveragePercent = useMemo(() => {
    const scores =
      showVersionTabs && editorView === 'original' && gptOriginal?.sentences
        ? gptOriginal.sentences
        : displayed.sentences;
    const ratio = getManualGreenCoverageRatio(
      activeMergeRow.content,
      scores ?? null,
      sentenceUserEdits[activeMergeRow.id],
      humanizeSourceByRow[activeMergeRow.id]
    );
    return Math.min(100, Math.max(0, Math.round(ratio * 100)));
  }, [
    activeMergeRow.content,
    activeMergeRow.id,
    displayed.sentences,
    editorView,
    gptOriginal?.sentences,
    humanizeSourceByRow,
    sentenceUserEdits,
    showVersionTabs
  ]);

  useEffect(() => {
    restoredSentenceDraftChainRef.current = null;
    setDraftPersistenceReady(false);
  }, [essayChainKey]);

  useEffect(() => {
    if (sortedFull.length === 0) return;
    if (restoredSentenceDraftChainRef.current === essayChainKey) {
      setDraftPersistenceReady(true);
      return;
    }
    const loaded = loadEssaySentenceDraft(essayChainKey, sortedFull);
    if (loaded) {
      setSentenceUserEdits((prev) => {
        const next = { ...prev };
        for (const [id, ed] of Object.entries(loaded.sentenceUserEdits)) {
          next[id] = { ...(next[id] ?? {}), ...ed };
        }
        return next;
      });
      setHumanizeSourceByRow((prev) => {
        const next = { ...prev };
        for (const [id, set] of Object.entries(loaded.humanizeSourceByRow)) {
          const acc = new Set<number>(next[id] ?? []);
          for (const x of set) acc.add(x);
          next[id] = acc;
        }
        return next;
      });
      if (loaded.hasManualSnippetTouch) {
        setHasManualSnippetTouch(true);
      }
    }
    restoredSentenceDraftChainRef.current = essayChainKey;
    setDraftPersistenceReady(true);
  }, [essayChainKey, sortedFull]);

  useLayoutEffect(() => {
    essaySentenceDraftPersistRef.current = {
      chainKey: essayChainKey,
      rows: sortedFull,
      sentenceUserEdits,
      humanizeSourceByRow,
      hasManualSnippetTouch
    };
  }, [
    essayChainKey,
    sortedFull,
    sentenceUserEdits,
    humanizeSourceByRow,
    hasManualSnippetTouch
  ]);

  useEffect(() => {
    if (!draftPersistenceReady) return;
    const t = window.setTimeout(() => {
      saveEssaySentenceDraft(
        essayChainKey,
        sortedFull,
        sentenceUserEdits,
        humanizeSourceByRow,
        hasManualSnippetTouch
      );
    }, 450);
    return () => window.clearTimeout(t);
  }, [
    draftPersistenceReady,
    essayChainKey,
    sortedFull,
    sentenceUserEdits,
    humanizeSourceByRow,
    hasManualSnippetTouch
  ]);

  useEffect(() => {
    const flush = () => {
      const p = essaySentenceDraftPersistRef.current;
      if (!p) return;
      saveEssaySentenceDraft(
        p.chainKey,
        p.rows,
        p.sentenceUserEdits,
        p.humanizeSourceByRow,
        p.hasManualSnippetTouch
      );
    };
    window.addEventListener('beforeunload', flush);
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const riskyHighlightCount = useMemo(() => {
    if (!displayed.sentences?.length) return 0;
    return getRiskySentenceIndicesForEssay(
      displayed.row.content,
      displayed.sentences
    ).length;
  }, [displayed.row.content, displayed.sentences]);

  const applyUndetectableToAllHighlights = useCallback(async () => {
    const scores = displayed.sentences;
    const content = displayed.row.content;
    const essayRowId = displayed.row.id;
    if (!scores?.length) {
      toast({
        variant: 'destructive',
        title: 'Run AI check first',
        description: 'GPTZero sentence highlights are required.'
      });
      return;
    }
    const indices = getRiskySentenceIndicesForEssay(content, scores);
    if (indices.length === 0) {
      toast({ title: 'No highlights', description: 'Nothing to process.' });
      return;
    }
    const parts = getEssaySentenceSegmentsExact(content);
    const editsSnapshot = { ...(sentenceUserEdits[essayRowId] ?? {}) };
    setBatchUndetectAllLoading(true);
    const patch: Record<number, string> = {};
    let done = 0;
    let skippedShort = 0;
    try {
      for (const idx of indices) {
        const raw = editsSnapshot[idx] ?? parts[idx] ?? '';
        const t = raw.trim();
        if (t.length < UNDETECTABLE_MIN_CONTENT_CHARS) {
          skippedShort++;
          continue;
        }
        const res = await fetch('/api/essay/undetectable-humanize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: t })
        });
        const data = (await res.json()) as { output?: string; error?: string };
        if (!res.ok) {
          throw new Error(
            friendlyUndetectableError(data.error || `Error ${res.status}`)
          );
        }
        if (typeof data.output === 'string' && data.output.trim()) {
          patch[idx] = data.output.trim();
          done++;
        }
      }
      if (Object.keys(patch).length > 0) {
        setSentenceUserEdits((prev) => ({
          ...prev,
          [essayRowId]: { ...(prev[essayRowId] ?? {}), ...patch }
        }));
        setHumanizeSourceByRow((prev) => {
          const next = new Set(prev[essayRowId] ?? []);
          for (const k of Object.keys(patch)) next.add(Number(k));
          return { ...prev, [essayRowId]: next };
        });
        setEditorView('corrections');
      }
      toast({
        title: 'Done',
        description: `Rewrote ${done} snippet(s). Skipped (shorter than ${UNDETECTABLE_MIN_CONTENT_CHARS} chars): ${skippedShort}. Review the text and use Merge & re-check if needed.`
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Undetectable.AI',
        description:
          e instanceof Error
            ? friendlyUndetectableError(e.message)
            : 'Request failed'
      });
    } finally {
      setBatchUndetectAllLoading(false);
    }
  }, [
    displayed.row.content,
    displayed.row.id,
    displayed.sentences,
    sentenceUserEdits,
    toast
  ]);

  const copyEssay = async () => {
    if (busy) return;
    setCopyLoading(true);
    try {
      const textToCopy = mergedEssayText;
      if (
        displayed.emptyHint &&
        !mergedEssayText.trim() &&
        (!showVersionTabs || editorView === 'corrections')
      ) {
        toast({
          variant: 'destructive',
          title: 'Nothing to copy',
          description: displayed.emptyHint
        });
        return;
      }
      if (!textToCopy.trim()) {
        toast({
          variant: 'destructive',
          title: 'Nothing to copy',
          description:
            showVersionTabs && editorView === 'original'
              ? 'No original text.'
              : 'Nothing to copy yet.'
        });
        return;
      }
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast({ title: 'Copied', description: 'Essay text is in your clipboard.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Couldn’t copy',
        description: 'Allow clipboard access in your browser.'
      });
    } finally {
      setCopyLoading(false);
    }
  };

  const downloadPdfDisabled = !mergedEssayText.trim();

  const downloadEssayPdf = useCallback(() => {
    if (busy || pdfLoading) return;
    const text = mergedEssayText.trim();
    if (!text) {
      toast({
        variant: 'destructive',
        title: 'Nothing to export',
        description:
          showVersionTabs && editorView === 'original'
            ? 'No Source text to download yet.'
            : 'Add essay text before downloading a PDF.'
      });
      return;
    }
    setPdfLoading(true);
    try {
      downloadEssayAsPdf({
        body: text,
        title: 'Scholarship essay',
        fileBaseName: 'scholarship-essay'
      });
      toast({
        title: 'PDF downloaded',
        description: 'Check your downloads folder for the file.'
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not create PDF',
        description:
          e instanceof Error ? e.message : 'Try again or use Copy and print to PDF.'
      });
    } finally {
      setPdfLoading(false);
    }
  }, [busy, pdfLoading, mergedEssayText, toast, showVersionTabs, editorView]);

  const checkAiForEssayId = useCallback(
    async (
      essayId: string,
      detector: EssayAiDetectorChoice = 'gptzero',
      /** Text the user sees (same as Copy / active tab), so we do not send a stale DB string. */
      textForDetector?: string
    ) => {
      const ac = new AbortController();
      const clientTimeoutMs = 180_000;
      const tid = window.setTimeout(() => ac.abort(), clientTimeoutMs);
      try {
        const trimmed = textForDetector?.trim() ?? '';
        const res = await fetch('/api/essay/check-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            essay_id: essayId,
            detector,
            ...(trimmed.length > 0 ? { content: trimmed } : {})
          }),
          signal: ac.signal
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          detail?: string;
          humanScore?: number;
          sentences?: GptZeroSentenceScore[];
          detector?: string;
        };
        if (!res.ok) {
          if (res.status === 402) {
            throw new Error(
              data.error?.trim() ||
                'Trial limit reached for this feature. Upgrade to a paid plan on the subscription page.'
            );
          }
          const raw =
            [data.detail, data.error].find((s) => typeof s === 'string' && s.trim()) ??
            `Error ${res.status}`;
          throw new Error(raw);
        }
        const hs = typeof data.humanScore === 'number' ? data.humanScore : null;
        const sent = Array.isArray(data.sentences) ? data.sentences : null;
        const det: EssayAiDetectorChoice =
          data.detector === 'undetectable' ? 'undetectable' : 'gptzero';
        mergeGpt(essayId, { humanScore: hs, sentences: sent, detector: det });
      } finally {
        window.clearTimeout(tid);
      }
    },
    [mergeGpt]
  );

  const applyNewEssayVersionFromResponse = useCallback(
    async (
      data: EssaySaveApiPayload,
      sourceEssayId: string,
      opts: {
        checkFailTitle: string;
        checkFailDescription: string;
        successTitle: string;
        successDescription: string;
        /** Do not run GPTZero on the client after save (user runs the check themselves). */
        skipAutoAiCheck?: boolean;
        clientCheckDetector?: EssayAiDetectorChoice;
        onMerged?: () => void;
      }
    ) => {
      if (
        !data.id ||
        typeof data.content !== 'string' ||
        typeof data.version !== 'number'
      ) {
        toast({
          variant: 'destructive',
          title: 'Invalid server response',
          description: 'Please try again.'
        });
        return;
      }

      clearEssaySentenceDraft(essayChainKey);

      const newRow: EssayVersionRow = {
        id: data.id,
        content: data.content,
        version: data.version,
        created_at: data.created_at ?? new Date().toISOString(),
        grinder_notes: data.grinder_notes ?? null
      };

      writePendingRow(essayChainKey, newRow);

      setVersions((prev) =>
        [...prev.filter((v) => v.id !== newRow.id), newRow].sort(
          (a, b) => a.version - b.version
        )
      );

      setSentenceUserEdits((prev) => {
        const next = { ...prev };
        delete next[sourceEssayId];
        return next;
      });

      setHumanizeSourceByRow((prev) => {
        const next = { ...prev };
        delete next[sourceEssayId];
        return next;
      });

      if (typeof data.humanScore === 'number') {
        mergeGpt(data.id, {
          humanScore: data.humanScore,
          sentences: Array.isArray(data.sentences) ? data.sentences : [],
          detector: 'gptzero'
        });
      } else {
        mergeGpt(data.id, { humanScore: null, sentences: null, detector: null });
      }

      const hasServerHighlights =
        typeof data.humanScore === 'number' &&
        Array.isArray(data.sentences) &&
        data.sentences.length > 0;

      if (opts.clientCheckDetector) {
        setCheckLoading(true);
        try {
          await checkAiForEssayId(
            data.id,
            opts.clientCheckDetector,
            data.content
          );
        } catch {
          toast({
            variant: 'destructive',
            title: opts.checkFailTitle,
            description: opts.checkFailDescription
          });
        } finally {
          setCheckLoading(false);
        }
      } else if (!opts.skipAutoAiCheck && !hasServerHighlights) {
        setCheckLoading(true);
        try {
          await checkAiForEssayId(data.id, 'gptzero', data.content);
        } catch {
          toast({
            variant: 'destructive',
            title: opts.checkFailTitle,
            description: opts.checkFailDescription
          });
        } finally {
          setCheckLoading(false);
        }
      }

      opts.onMerged?.();

      setDevPreviewFirstOnly(false);
      writePreviewFirstOnlyToStorage(essayChainKey, false);
      if (opts.skipAutoAiCheck || opts.clientCheckDetector) {
        try {
          sessionStorage.setItem(
            editorOpenCorrectionsStorageKey(essayChainKey),
            '1'
          );
        } catch {
          /* ignore */
        }
      }
      router.replace(`/essays/u/${data.id}`);

      toast({
        title: opts.successTitle,
        description: opts.successDescription
      });

      if (data.gptZeroError) {
        toast({
          title: 'GPTZero check',
          description: data.gptZeroError
        });
      }
    },
    [essayChainKey, mergeGpt, checkAiForEssayId, router, toast]
  );

  const AI_CHECK_CLIENT_TIMEOUT_MS = 180_000;

  const runAiCheckFlow = async (detector: EssayAiDetectorChoice = 'gptzero') => {
    if (showVersionTabs) setEditorView('corrections');
    setCheckLoading(true);
    try {
      /** Latest version only (Corrections text); do not send Source from the toolbar to GPTZero. */
      await checkAiForEssayId(latest.id, detector, mergedEssayText);
      setHasManualSnippetTouch(false);
      setSentenceUserEdits((prev) => {
        const next = { ...prev };
        delete next[latest.id];
        return next;
      });
    } catch (err) {
      const aborted =
        err != null &&
        typeof err === 'object' &&
        'name' in err &&
        (err as { name: string }).name === 'AbortError';
      if (aborted) {
        toast({
          variant: 'destructive',
          title: 'Check failed',
          description: `Timed out after ~${Math.round(AI_CHECK_CLIENT_TIMEOUT_MS / 1000)}s. Try again or check your connection.`
        });
      } else {
        const raw =
          err instanceof Error ? err.message : 'Check your connection and try again.';
        toast({
          variant: 'destructive',
          title: 'Check failed',
          description: sanitizeErrorDescription(raw)
        });
      }
    } finally {
      setCheckLoading(false);
    }
  };

  const runOriginalAiCheckFlow = async (
    detector: EssayAiDetectorChoice = 'gptzero'
  ) => {
    if (!originalEssayRow) return;
    setEditorView('original');
    setCheckLoading(true);
    try {
      const merged = applySentenceEdits(
        originalEssayRow.content,
        sentenceUserEdits[originalEssayRow.id] ?? {}
      );
      if (merged !== originalEssayRow.content) {
        const res = await fetch('/api/essay/save-essay-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            essay_id: originalEssayRow.id,
            content: merged
          })
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          throw new Error(data.error || `Error ${res.status}`);
        }
        setVersions((prev) =>
          prev.map((v) =>
            v.id === originalEssayRow.id ? { ...v, content: merged } : v
          )
        );
        setSentenceUserEdits((prev) => {
          const next = { ...prev };
          delete next[originalEssayRow.id];
          return next;
        });
        setHumanizeSourceByRow((prev) => {
          const next = { ...prev };
          delete next[originalEssayRow.id];
          return next;
        });
      }
      await checkAiForEssayId(originalEssayRow.id, detector, mergedEssayText);
      setHasManualSnippetTouch(false);
    } catch (err) {
      const aborted =
        err != null &&
        typeof err === 'object' &&
        'name' in err &&
        (err as { name: string }).name === 'AbortError';
      if (aborted) {
        toast({
          variant: 'destructive',
          title: 'Check failed',
          description: `Timed out after ~${Math.round(AI_CHECK_CLIENT_TIMEOUT_MS / 1000)}s. Try again or check your connection.`
        });
      } else {
        const raw =
          err instanceof Error ? err.message : 'Check your connection and try again.';
        toast({
          variant: 'destructive',
          title: 'Check failed',
          description: sanitizeErrorDescription(raw)
        });
      }
    } finally {
      setCheckLoading(false);
    }
  };

  const checkAi = async (detector: EssayAiDetectorChoice = 'gptzero') => {
    if (busy) return;
    if (showVersionTabs && editorView === 'original') {
      if (previewInterviewNagActive) {
        setPreviewCheckOpen(true);
        return;
      }
      await runOriginalAiCheckFlow(detector);
      return;
    }
    /** /check-ai sends GPTZero only `essay_results.content` from the DB, not the merged on-screen draft. */
    const pendingLatest = sentenceUserEdits[latest.id];
    if (pendingLatest && Object.keys(pendingLatest).length > 0) {
      toast({
        title: 'Save your edits first',
        description:
          'AI check uses the text stored in the database, not unsaved on-screen edits. Use Merge & re-check at the bottom to save a new version first (a check can take up to a minute).'
      });
      return;
    }
    if (previewInterviewNagActive) {
      setPreviewCheckOpen(true);
      return;
    }
    await runAiCheckFlow(detector);
  };

  const smartMerge = async () => {
    if (busy) return;
    const sourceEssayId = activeMergeRow.id;
    setMergeLoading(true);
    try {
      const res = await fetch('/api/essay/smart-merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          essay_id: sourceEssayId,
          mergedText: mergedEssayText
        })
      });
      const data = (await res.json().catch(() => ({}))) as EssaySaveApiPayload;
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Couldn’t save version',
          description: data.error ?? `Error ${res.status}`
        });
        return;
      }
      await applyNewEssayVersionFromResponse(data, sourceEssayId, {
        checkFailTitle: 'Check after merge',
        checkFailDescription:
          'Couldn’t auto-run GPTZero on the new text. Click Run AI check.',
        successTitle: 'Version saved',
        successDescription:
          typeof data.humanScore === 'number'
            ? 'Text saved as-is and checked again with GPTZero.'
            : 'Text saved without AI changes. Run AI check if needed.',
        onMerged: () => setHasManualSnippetTouch(false)
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Network error',
        description: 'Check your connection and try again.'
      });
    } finally {
      setMergeLoading(false);
    }
  };

  const runSendFromTextEditorForAiCheck = useCallback(
    async (detector: EssaySendForAiDetectorChoice) => {
      const d = detector as EssayAiDetectorChoice;
      const sourceEssayId = activeMergeRow.id;
      setMergeLoading(true);
      try {
        const res = await fetch('/api/essay/smart-merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            essay_id: sourceEssayId,
            mergedText: mergedEssayText
          })
        });
        const data = (await res.json().catch(() => ({}))) as EssaySaveApiPayload;
        if (!res.ok) {
          toast({
            variant: 'destructive',
            title: 'Couldn’t save version',
            description: data.error ?? `Error ${res.status}`
          });
          return;
        }
        await applyNewEssayVersionFromResponse(data, sourceEssayId, {
          checkFailTitle: 'Check after save',
          checkFailDescription:
            'Couldn’t run the AI check on the new text. Use Run AI check in the toolbar.',
          successTitle: 'Saved and checked',
          successDescription:
            'Your merged text was saved and sent for an AI review with the detector you chose.',
          clientCheckDetector: d,
          onMerged: () => setHasManualSnippetTouch(false)
        });
      } catch {
        toast({
          variant: 'destructive',
          title: 'Network error',
          description: 'Check your connection and try again.'
        });
      } finally {
        setMergeLoading(false);
      }
    },
    [
      activeMergeRow.id,
      applyNewEssayVersionFromResponse,
      mergedEssayText,
      toast
    ]
  );

  const sendFromTextEditorForAiCheck = useCallback(
    async (detector: EssaySendForAiDetectorChoice) => {
      if (busy || mergeLoading || checkLoading) return;
      if (previewInterviewNagActive) {
        setPreviewCheckOpen(true);
        return;
      }
      const scores =
        showVersionTabs && editorView === 'original' && gptOriginal?.sentences
          ? gptOriginal.sentences
          : displayed.sentences;
      const ratio = getManualGreenCoverageRatio(
        activeMergeRow.content,
        scores ?? null,
        sentenceUserEdits[activeMergeRow.id],
        humanizeSourceByRow[activeMergeRow.id]
      );
      if (ratio < MANUAL_GREEN_COVERAGE_THRESHOLD) {
        setManualCoverageModalOpen(true);
        return;
      }
      if (!hasSubscription && typeof window !== 'undefined') {
        try {
          if (
            sessionStorage.getItem(
              `essay_pre_ai_check_trial_promo:${essayChainKey}`
            ) !== '1'
          ) {
            pendingTextEditorDetectorRef.current = detector;
            setPreAiCheckPromoOpen(true);
            return;
          }
        } catch {
          pendingTextEditorDetectorRef.current = detector;
          setPreAiCheckPromoOpen(true);
          return;
        }
      }
      await runSendFromTextEditorForAiCheck(detector);
    },
    [
      activeMergeRow.content,
      activeMergeRow.id,
      busy,
      checkLoading,
      mergeLoading,
      displayed.sentences,
      editorView,
      essayChainKey,
      gptOriginal?.sentences,
      hasSubscription,
      humanizeSourceByRow,
      previewInterviewNagActive,
      runSendFromTextEditorForAiCheck,
      sentenceUserEdits,
      showVersionTabs
    ]
  );

  const humanizeEntireEssay = async (model: UndetectableHumanizeModelId) => {
    if (busy) return;
    if (!hasSubscription) {
      setSubscriptionOfferOpen(true);
      return;
    }
    const text = mergedEssayText.trim();
    if (text.length < UNDETECTABLE_MIN_CONTENT_CHARS) {
      toast({
        variant: 'destructive',
        title: 'Text too short',
        description: `Undetectable.AI needs at least ${UNDETECTABLE_MIN_CONTENT_CHARS} characters.`
      });
      return;
    }
    const pendingLatest = sentenceUserEdits[latest.id];
    if (pendingLatest && Object.keys(pendingLatest).length > 0) {
      toast({
        title: 'Save your edits first',
        description:
          'Use Merge & re-check to save your editor changes to the database before running Humanize entire draft.'
      });
      return;
    }
    if (showVersionTabs) setEditorView('corrections');
    setFullHumanizeLoading(true);
    try {
      const res = await fetch('/api/essay/undetectable-humanize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, model, full_draft: true })
      });
      const und = (await res.json()) as { output?: string; error?: string };
      if (!res.ok) {
        if (res.status === 402) {
          toast({
            variant: 'destructive',
            title: 'Trial limit',
            description:
              und.error?.trim() ||
              'You have used all trial runs for this feature. Upgrade to a paid plan on the subscription page.'
          });
          return;
        }
        if (res.status === 403) {
          setSubscriptionOfferOpen(true);
          return;
        }
        toast({
          variant: 'destructive',
          title: 'Undetectable.AI',
          description: friendlyUndetectableError(und.error || `Error ${res.status}`)
        });
        return;
      }
      const output = typeof und.output === 'string' ? und.output.trim() : '';
      if (!output) {
        toast({
          variant: 'destructive',
          title: 'Undetectable.AI',
          description: 'The service returned an empty response. Please try again.'
        });
        return;
      }
      const mergeRes = await fetch('/api/essay/smart-merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          essay_id: displayed.row.id,
          mergedText: output,
          skipGptZero: true,
          merge_kind: 'full_humanize'
        })
      });
      const data = (await mergeRes.json().catch(() => ({}))) as EssaySaveApiPayload;
      if (!mergeRes.ok) {
        toast({
          variant: 'destructive',
          title: 'Couldn’t save version',
          description: data.error ?? `Error ${mergeRes.status}`
        });
        return;
      }
      await applyNewEssayVersionFromResponse(data, displayed.row.id, {
        checkFailTitle: 'Check after humanize',
        checkFailDescription:
          'Couldn’t auto-run GPTZero on the new text. Click Run AI check in the toolbar.',
        successTitle: 'Draft updated',
        successDescription:
          'Text replaced with Undetectable.AI output. Run an AI check if needed.',
        skipAutoAiCheck: true
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Humanize entire draft',
        description:
          e instanceof Error
            ? friendlyUndetectableError(e.message)
            : 'Request could not be completed'
      });
    } finally {
      setFullHumanizeLoading(false);
    }
  };

  const notes = displayed.row.grinder_notes?.trim();

  const resetLocalDevSession = () => {
    clearEssaySessionStorageCaches();
    setGptById({});
    setAccordionOpen(false);
    setCopied(false);
    setDevPreviewFirstOnly(true);
    writePreviewFirstOnlyToStorage(essayChainKey, true);
    toast({
      title: 'Full local reset',
      description:
        'Like first load: original text only, no AI check. GPTZero cache and essay storage cleared. Show full chain exits preview mode.'
    });
  };

  const hardReloadAfterClearEssayStorage = () => {
    clearEssayBrowserStorage();
    window.location.reload();
  };

  return (
    <div
      className={`min-h-screen bg-zinc-50 px-4 py-8 text-left text-zinc-900 sm:px-5 sm:py-12 md:py-12 lg:px-8 ${
        showStickyMergeFooter ? 'pb-32' : ''
      }`}
    >
      <ScholarshipSubscriptionOfferModal
        open={subscriptionOfferOpen}
        onClose={() => setSubscriptionOfferOpen(false)}
      />
      <ScholarshipSubscriptionOfferModal
        open={preAiCheckPromoOpen}
        onClose={() => setPreAiCheckPromoOpen(false)}
        onSecondaryAction={() => {
          try {
            sessionStorage.setItem(
              `essay_pre_ai_check_trial_promo:${essayChainKey}`,
              '1'
            );
          } catch {
            /* ignore */
          }
          const det = pendingTextEditorDetectorRef.current;
          pendingTextEditorDetectorRef.current = null;
          if (det) void runSendFromTextEditorForAiCheck(det);
        }}
        onPrimaryClick={() => {
          try {
            sessionStorage.setItem(
              `essay_pre_ai_check_trial_promo:${essayChainKey}`,
              '1'
            );
          } catch {
            /* ignore */
          }
          pendingTextEditorDetectorRef.current = null;
        }}
      />
      <ManualGreenCoverageModal
        open={manualCoverageModalOpen}
        onClose={() => setManualCoverageModalOpen(false)}
      />
      {previewCheckOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="essay-preview-check-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl ring-1 ring-black/5">
            <h3
              id="essay-preview-check-title"
              className="text-lg font-semibold tracking-tight text-zinc-900"
            >
              Early draft — run check anyway?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              For a stronger result, we recommend finishing the mentor chat and bringing each topic to
              at least {INTERVIEW_DRAFT_STRONG_MIN_PERCENT}%, then generating again. You can still run
              GPTZero on this draft.
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/45 focus-visible:ring-offset-2"
                onClick={() => setPreviewCheckOpen(false)}
              >
                Back to editing
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="mx-auto max-w-3xl">
        {previewInterviewNagActive ? (
          <div className="mb-6 flex w-full flex-col items-center rounded-2xl border border-emerald-200/90 bg-emerald-50 px-4 py-5 text-center text-emerald-950 shadow-sm ring-1 ring-emerald-500/10 sm:px-6">
            <p className="w-full text-xl font-bold tracking-tight text-emerald-950 sm:text-2xl">
              Early draft
            </p>
            <p className="mt-3 w-full max-w-2xl text-balance text-xs leading-relaxed text-emerald-900/95 sm:text-[13px]">
              Below is a shortened draft from your answers — not the full depth of a finished essay.
              To strengthen it, bring <span className="font-medium">each</span> topic in the mentor chat
              to at least {INTERVIEW_DRAFT_STRONG_MIN_PERCENT}%, then tap Generate Draft again in the
              chat.
            </p>
            <Link
              href="/essay"
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/45 focus-visible:ring-offset-2"
            >
              Back to mentor chat
            </Link>
          </div>
        ) : null}
        {sorted.length >= 1 ? (
          <>
            {essayDevToolsOpen ? (
              <button
                type="button"
                className="fixed inset-0 z-[45] cursor-default bg-zinc-900/20"
                aria-label="Close panel"
                onClick={() => setEssayDevToolsOpen(false)}
              />
            ) : null}
            <div className="fixed bottom-5 right-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2 sm:bottom-8 sm:right-6">
              {essayDevToolsOpen ? (
                <div
                  id="essay-local-dev-panel"
                  className="mb-0 w-[min(100%,20rem)] rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-900 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.18)] ring-1 ring-black/5"
                  role="dialog"
                  aria-label="Editor options"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="mb-2 font-semibold text-zinc-900">Editor</p>
                  <button
                    type="button"
                    disabled={
                      batchUndetectAllLoading ||
                      !displayed.showHighlights ||
                      riskyHighlightCount === 0
                    }
                    title={
                      !displayed.showHighlights
                        ? 'Run AI check first'
                        : riskyHighlightCount === 0
                          ? 'No highlighted fragments on screen'
                          : `Only highlighted fragments in the text (${UNDETECTABLE_MIN_CONTENT_CHARS}+ chars)`
                    }
                    onClick={() => void applyUndetectableToAllHighlights()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2.5 text-xs font-semibold text-orange-950 shadow-sm transition hover:bg-orange-100/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {batchUndetectAllLoading ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                    ) : (
                      <Wand2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    )}
                    Humanize all highlights
                  </button>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
                    Only what is highlighted in the essay (same as the editor). Shorter than{' '}
                    {UNDETECTABLE_MIN_CONTENT_CHARS} characters — skipped.
                  </p>

                  {showEssayDevTools ? (
                    <div className="mt-3 border-t border-dashed border-amber-300/80 pt-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-900/90">
                        Local debug
                      </p>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={resetLocalDevSession}
                          title="Reset GPTZero highlights and preview mode — work from source again"
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-400 bg-amber-50/90 px-3 py-2 text-xs font-semibold text-amber-950 shadow-sm transition hover:bg-amber-100/80"
                        >
                          <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          Full reset (source)
                        </button>
                        <button
                          type="button"
                          onClick={hardReloadAfterClearEssayStorage}
                          title="Remove all essay_* storage keys and reload (clean client for this URL)"
                          className="rounded-lg border border-zinc-400 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50"
                        >
                          Clear storage + reload
                        </button>
                        {devPreviewFirstOnly ? (
                          <button
                            type="button"
                            onClick={() => {
                              setDevPreviewFirstOnly(false);
                              writePreviewFirstOnlyToStorage(essayChainKey, false);
                              toast({
                                title: 'Full chain',
                                description:
                                  'Full version history is visible again — as before source-only mode.'
                              });
                            }}
                            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50"
                          >
                            Show full chain
                          </button>
                        ) : null}
                      </div>
                      {devPreviewFirstOnly && sortedFull.length > 1 ? (
                        <p className="mt-2 text-xs leading-relaxed text-amber-900/85">
                          Preview mode: only the first version in the UI. The database still has{' '}
                          {sortedFull.length} version(s). Show full chain exits this mode.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => setEssayDevToolsOpen((o) => !o)}
                aria-expanded={essayDevToolsOpen}
                aria-controls="essay-local-dev-panel"
                title="Editor options"
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border bg-white shadow-md ring-1 ring-black/5 transition hover:shadow-lg',
                  showEssayDevTools
                    ? 'border-amber-400/90 text-amber-900 hover:bg-amber-50'
                    : 'border-zinc-300 text-zinc-800 hover:bg-zinc-50'
                )}
              >
                <Settings className="h-6 w-6" aria-hidden />
              </button>
            </div>
          </>
        ) : null}

        <article
          className="mx-auto w-full max-w-[min(100%,48rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_12px_40px_-16px_rgba(15,23,42,0.12)] ring-1 ring-gray-100"
          style={{ minHeight: '70vh' }}
        >
          {sorted.length >= 1 ? (
            <div className="border-b border-zinc-200/90 bg-white px-3 py-4 sm:px-5 sm:py-5">
              <div className="flex flex-col items-center gap-3 text-center">
                <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl sm:leading-snug">
                  Your essay is ready
                </h1>
                {trialFeatureQuota?.applies ? (
                  <div className="flex w-full max-w-xl flex-col items-center gap-2">
                    {trialQuotasAllExhausted(trialFeatureQuota) ? (
                      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-3">
                        <p className="text-sm font-medium text-zinc-700">
                          Subscribe to keep going
                        </p>
                        <Link
                          href="/start"
                          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-zinc-900 bg-zinc-900 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-zinc-800"
                        >
                          Get started
                        </Link>
                      </div>
                    ) : trialFeatureQuota.chatRemaining === TRIAL_CHAT_DIALOGUE_LIMIT &&
                      trialFeatureQuota.aiRemaining === TRIAL_FEATURE_LIMIT &&
                      trialFeatureQuota.humanizeRemaining === TRIAL_FEATURE_LIMIT ? (
                      <p className="max-w-lg text-xs font-semibold leading-relaxed text-zinc-800 sm:text-sm">
                        Trial includes 1 AI mentor conversation · {TRIAL_FEATURE_LIMIT} AI authenticity
                        checks · {TRIAL_FEATURE_LIMIT} full-draft humanize runs (whole essay at once).
                      </p>
                    ) : (
                      <p className="max-w-lg text-xs font-medium leading-relaxed text-zinc-600 sm:text-sm">
                        Trial uses left — Essay mentor chat: {trialFeatureQuota.chatRemaining} · AI
                        authenticity check: {trialFeatureQuota.aiRemaining} · Full-draft humanize
                        (whole essay at once): {trialFeatureQuota.humanizeRemaining}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="border-b border-zinc-100/90 bg-white px-3 py-3 sm:px-5 sm:py-4">
            <EssayActionBar
              variant="inArticle"
              mentorChatHref={mentorChatHref}
              copied={copied}
              copyLoading={copyLoading}
              checkLoading={checkLoading}
              mergeLoading={mergeLoading}
              batchUndetectAllLoading={batchUndetectAllLoading}
              fullHumanizeLoading={fullHumanizeLoading}
              pdfLoading={pdfLoading}
              showCheckHumanize={showToolbarAiCheckResolved}
              aiCheckLabel={aiCheckToolbarLabelResolved}
              showHumanizeEntireDraft={showToolbarHumanizeResolved}
              downloadPdfDisabled={downloadPdfDisabled}
              hasSubscription={hasSubscription}
              onHumanizePremiumBlocked={() => setSubscriptionOfferOpen(true)}
              onCopy={copyEssay}
              onCheckAi={checkAi}
              onHumanizeEntireDraft={(model) => void humanizeEntireEssay(model)}
              onDownloadPdf={downloadEssayPdf}
            />
          </div>
          {sorted.length >= 1 ? (
            <div className="border-b border-zinc-200/90 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 md:items-stretch md:divide-x md:divide-zinc-200/95">
                <section
                  className="flex min-h-0 min-w-0 flex-col justify-start px-5 py-5 text-left sm:px-6 sm:py-6"
                  aria-label="Human Score"
                >
                  {panelHumanScore !== null ? (
                    <div>
                      <GptZeroResultPanel humanScore={panelHumanScore} variant="embedded" />
                      <p className="mt-2 text-[12px] font-medium leading-snug text-zinc-500 sm:text-[13px]">
                        Checked with {panelDetectorLabel}
                      </p>
                      {showVersionTabs ? (
                        <p className="mt-3 max-w-[28rem] text-[13px] leading-relaxed text-zinc-600 sm:text-sm">
                          {panelDetectorLabel === 'Undetectable.AI' ? (
                            <>
                              {editorView === 'original'
                                ? hasOriginalGptHighlights
                                  ? 'Undetectable.AI overall human score for Source. Snippet highlights use GPTZero’s sentence map on the same text so you can edit risky parts; the headline % is from Undetectable.AI.'
                                  : 'Undetectable.AI overall human score for Source. Add GPTZERO_API_KEY or run a GPTZero-only check to get sentence highlights below.'
                                : hasGptSentenceHighlights
                                  ? 'Undetectable.AI overall human score for Corrections. Orange highlights use GPTZero’s sentence map for editing; the headline % is from Undetectable.AI.'
                                  : 'Undetectable.AI overall human score for Corrections. Add GPTZERO_API_KEY or run a GPTZero-only check to get sentence highlights below.'}
                            </>
                          ) : (
                            <>
                              {editorView === 'original'
                                ? 'GPTZero score for Source (first saved version). Risky sentences are highlighted in red below.'
                                : 'GPTZero score for Corrections (latest version). Highlights use orange below.'}
                            </>
                          )}
                        </p>
                      ) : sortedFull.length >= 2 ? (
                        <p className="mt-3 max-w-[28rem] text-[13px] leading-relaxed text-zinc-600 sm:text-sm">
                          This score applies to the Source draft below. Source and Corrections tabs unlock
                          after you run Humanize entire draft and a new version is saved—not after ordinary
                          edits alone.
                        </p>
                      ) : (
                        <p className="mt-3 max-w-[28rem] text-[13px] leading-relaxed text-zinc-600 sm:text-sm">
                          This score applies to the draft below. After an AI check, the toolbar shows Humanize
                          entire draft (one primary action at a time). After humanizing, Run AI check returns
                          for the new text; Source and Corrections tabs appear after the first full-draft
                          humanize.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-left">
                      {/* Same icon–label gap as “Back to AI chat” (`gap-2.5`) */}
                      <div className="flex w-full items-start gap-2.5">
                        <span
                          className="mt-0.5 inline-flex shrink-0 text-[#FF7A1A]"
                          aria-hidden
                        >
                          <Gauge
                            className="h-[1.125rem] w-[1.125rem] sm:h-5 sm:w-5"
                            strokeWidth={2}
                            aria-hidden
                          />
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col items-stretch text-left">
                          <h2
                            data-heading-mobile-align="start"
                            className="text-left text-[15px] font-semibold leading-snug tracking-tight text-zinc-950 sm:text-base"
                          >
                            Human Score appears after you run a check
                          </h2>
                          <p className="mt-2 max-w-[28rem] text-left text-[13px] leading-relaxed text-zinc-600 sm:text-sm">
                            Start with Run AI check. After a completed check, the toolbar switches to Humanize
                            entire draft. After humanizing, you will run an AI check again on the new text—then
                            the cycle repeats.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
                <section
                  className="flex min-h-0 min-w-0 flex-col justify-start border-t border-zinc-200/90 px-5 py-5 text-left sm:px-6 sm:py-6 md:border-t-0"
                  aria-label="Text editor"
                >
                  <div className="flex w-full items-start gap-2.5">
                    <span
                      className="mt-0.5 inline-flex shrink-0 text-[#FF7A1A]"
                      aria-hidden
                    >
                      <FileText
                        className="h-[1.125rem] w-[1.125rem] sm:h-5 sm:w-5"
                        strokeWidth={2}
                        aria-hidden
                      />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col items-stretch text-left">
                      <h2
                        data-heading-mobile-align="start"
                        className="text-left text-[15px] font-semibold leading-snug tracking-tight text-zinc-950 sm:text-base"
                      >
                        Text editor
                      </h2>
                      <p className="mt-2 max-w-[28rem] text-left text-[13px] leading-relaxed text-zinc-600 sm:text-sm">
                        {showVersionTabs
                          ? 'Source uses the same highlights and snippet editing as Corrections, without the Humanize button in the pop-up editor. Corrections is your latest version; Run AI check and Humanize entire draft alternate in the toolbar.'
                          : 'You start with a single draft. Source and Corrections tabs appear after Humanize entire draft saves a new version.'}
                      </p>
                      {showTextEditorSendForAiCheck ? (
                        <EssaySendForAiCheckButton
                          disabled={busy}
                          loading={mergeLoading}
                          manualCoveragePercent={manualGreenCoveragePercent}
                          onPickDetector={(d) => void sendFromTextEditorForAiCheck(d)}
                        />
                      ) : null}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          ) : null}
          <div className="px-6 pb-8 pt-6 sm:px-10 sm:pb-10 sm:pt-7">
            {showVersionTabs ? (
              <>
                <div
                  className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  role="tablist"
                  aria-label="Essay view mode"
                >
                  <div className="inline-flex w-full max-w-md rounded-xl border border-zinc-200/95 bg-zinc-50/95 p-1 shadow-inner sm:w-auto">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={editorView === 'original'}
                      onClick={() => setEditorView('original')}
                      className={cn(
                        'inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition sm:flex-none sm:px-4',
                        editorView === 'original'
                          ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/90'
                          : 'text-zinc-600 hover:bg-white/70 hover:text-zinc-900'
                      )}
                    >
                      <ScrollText className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                      Source
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={editorView === 'corrections'}
                      onClick={() => setEditorView('corrections')}
                      className={cn(
                        'inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition sm:flex-none sm:px-4',
                        editorView === 'corrections'
                          ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-orange-200/90'
                          : 'text-zinc-600 hover:bg-white/70 hover:text-zinc-900'
                      )}
                    >
                      <FilePenLine
                        className="h-4 w-4 shrink-0 text-[#FF7A1A] opacity-95"
                        aria-hidden
                      />
                      Corrections
                    </button>
                  </div>
                  <p className="text-[11px] leading-relaxed text-zinc-500 sm:max-w-sm sm:text-right sm:text-xs">
                    {editorView === 'original'
                      ? 'Edit below; Run AI check saves the Source and runs GPTZero. Highlights appear after a check.'
                      : 'Latest version after edits; re-run the AI check for updated orange highlights.'}
                  </p>
                </div>

                {editorView === 'original' ? (
                  originalEssayRow ? (
                    <div className={essayBodyClassName()}>
                      {sortedFull.length > 1 &&
                      originalEssayRow.id !== latest.id &&
                      originalEssayRow.content.trim() !== latest.content.trim() ? (
                        <div className="mb-4 rounded-xl border border-amber-200/90 bg-amber-50/90 px-3 py-2.5 text-[13px] leading-snug text-amber-950">
                          <strong className="font-semibold">Newer text exists.</strong> Full humanize and
                          later versions are under the{' '}
                          <span className="font-medium">Corrections</span> tab. Source shows the first saved
                          draft only — copy or run an AI check here for that draft, not for the latest
                          humanized text.
                        </div>
                      ) : null}
                      {sortedFull.length > 1 ? (
                        <p className="mb-4 text-xs font-medium text-zinc-500">
                          Version {originalEssayRow.version} · original draft
                        </p>
                      ) : (
                        <p className="mb-4 text-xs font-medium text-zinc-500">
                          Only saved version — same as Corrections.
                        </p>
                      )}
                      {hasOriginalGptHighlights && gptOriginal?.sentences ? (
                        <EssayContentHighlighted
                          essayContent={originalEssayRow.content}
                          sentenceScores={gptOriginal.sentences}
                          userEdits={sentenceUserEdits[originalEssayRow.id]}
                          humanizedIndices={humanizeSourceByRow[originalEssayRow.id]}
                          onSaveUserEdit={onSaveUserSentenceEdit}
                          sentenceEditInteractive={sentenceEditUiActive}
                          highlightPalette="red"
                          snippetHumanizeEnabled={false}
                          onManualSnippetTouchRecorded={() =>
                            setHasManualSnippetTouch(true)
                          }
                        />
                      ) : (
                        <div className="whitespace-pre-wrap text-black">
                          {originalEssayRow.content.trim() ? originalEssayRow.content : '—'}
                        </div>
                      )}
                      <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                        {
                          'Same as Corrections: click a highlight to edit a snippet. The pop-up has no Humanize button here—that action lives on Corrections. When you have pending snippet edits, use Merge & re-check at the bottom.'
                        }
                      </p>
                    </div>
                  ) : null
                ) : displayed.emptyHint && !displayed.content.trim() ? (
                  <p className="text-center text-zinc-500">{displayed.emptyHint}</p>
                ) : displayed.showHighlights && displayed.sentences ? (
                  <div className={essayBodyClassName()}>
                    <EssayContentHighlighted
                      essayContent={displayed.row.content}
                      sentenceScores={displayed.sentences}
                      userEdits={sentenceUserEdits[displayed.row.id]}
                      humanizedIndices={humanizeSourceByRow[displayed.row.id]}
                      onSaveUserEdit={onSaveUserSentenceEdit}
                      sentenceEditInteractive={sentenceEditUiActive}
                      humanizeSnippetPremiumLocked={!hasSubscription}
                      onHumanizeSnippetPremiumBlocked={() =>
                        setSubscriptionOfferOpen(true)
                      }
                      onManualSnippetTouchRecorded={() =>
                        setHasManualSnippetTouch(true)
                      }
                    />
                  </div>
                ) : (
                  <div className={essayBodyClassName()}>
                    <div className="whitespace-pre-wrap">{displayed.content}</div>
                  </div>
                )}
              </>
            ) : sortedFull.length >= 2 ? (
              <div className={essayBodyClassName()}>
                <p className="mb-4 text-xs font-medium leading-relaxed text-zinc-600">
                  Two versions exist, but Humanize entire draft has not run yet—tabs stay hidden. Below is
                  your first saved version (Source).
                </p>
                <div className="whitespace-pre-wrap text-black">
                  {originalEssayContent.trim() ? originalEssayContent : '—'}
                </div>
              </div>
            ) : displayed.emptyHint && !displayed.content.trim() ? (
              <p className="text-center text-zinc-500">{displayed.emptyHint}</p>
            ) : displayed.showHighlights && displayed.sentences ? (
              <div className={essayBodyClassName()}>
                <p className="mb-4 text-xs font-medium text-zinc-500">
                  Post-generation draft—edit and run AI checks here until a second version exists.
                </p>
                <EssayContentHighlighted
                  essayContent={displayed.row.content}
                  sentenceScores={displayed.sentences}
                  userEdits={sentenceUserEdits[displayed.row.id]}
                  humanizedIndices={humanizeSourceByRow[displayed.row.id]}
                  onSaveUserEdit={onSaveUserSentenceEdit}
                  sentenceEditInteractive={sentenceEditUiActive}
                  humanizeSnippetPremiumLocked={!hasSubscription}
                  onHumanizeSnippetPremiumBlocked={() =>
                    setSubscriptionOfferOpen(true)
                  }
                  onManualSnippetTouchRecorded={() =>
                    setHasManualSnippetTouch(true)
                  }
                />
              </div>
            ) : (
              <div className={essayBodyClassName()}>
                <p className="mb-4 text-xs font-medium text-zinc-500">
                  Essay draft—run an AI check to enable highlights and a Human Score.
                </p>
                <div className="whitespace-pre-wrap">{displayed.content}</div>
              </div>
            )}
          </div>
        </article>

        <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-black/[0.04]">
          <button
            type="button"
            onClick={() => setAccordionOpen((o) => !o)}
            className="relative flex w-full items-center justify-center px-4 py-4 pr-12 text-center text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50/80 sm:px-5 sm:pr-14"
            aria-expanded={accordionOpen}
          >
            <span>AI editor notes</span>
            <ChevronDown
              className={`pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500 transition-transform sm:right-5 ${
                accordionOpen ? 'rotate-180' : ''
              }`}
              aria-hidden
            />
          </button>
          {accordionOpen ? (
            <div className="border-t border-zinc-100 bg-zinc-50/80 px-4 py-4 text-sm leading-relaxed text-zinc-700 sm:px-5">
              {notes ? (
                <pre className="whitespace-pre-wrap font-sans">{notes}</pre>
              ) : (
                <p className="text-zinc-500">No notes.</p>
              )}
            </div>
          ) : null}
        </div>

        {showStickyMergeFooter ? (
          <div
            className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200/90 bg-white/95 px-4 py-3.5 shadow-[0_-12px_40px_-14px_rgba(15,23,42,0.14)] backdrop-blur-md supports-[backdrop-filter]:bg-white/88"
            role="region"
            aria-label="Merge text after edits"
          >
            <div className="mx-auto flex max-w-3xl justify-center sm:justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={() => void smartMerge()}
                className="inline-flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-full bg-[#FF7A1A] px-7 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:bg-[#E6670C] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB27D] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {mergeLoading ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                ) : null}
                Merge & re-check
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
