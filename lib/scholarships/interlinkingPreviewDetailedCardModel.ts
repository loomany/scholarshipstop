import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import {
  formatScholarshipAwardDisplay,
  getScholarshipDeadlineDisplayParts,
  scholarshipPublicPath
} from '@/app/scholarships/scholarshipsData';
import type { GrantNotifyChannelId } from '@/lib/notifications/grantNotificationPrefs';
import { GRANT_NOTIFY_CHANNELS } from '@/lib/notifications/grantNotificationPrefs';

export type InterlinkingPreviewDetailedCardModel = {
  providerName: string;
  scholarshipTitle: string;
  deadlineLabel: string;
  awardLabel: string;
  requirementsCountLabel: string;
  tags: string[];
  summarySnippet: string;
  scholarshipId: string;
  detailHref: string;
  notificationChannel: GrantNotifyChannelId | null;
  notificationLabel: string | null;
};

const NOTIFY_PARAM_ALIASES: Record<string, GrantNotifyChannelId> = {
  best: 'best',
  best_matches: 'best',
  saved_filters: 'saved_filters',
  saved: 'saved_filters',
  filters: 'saved_filters',
  easy_apply: 'easy_apply',
  easy: 'easy_apply',
  hot_deadlines: 'hot_deadlines',
  hot: 'hot_deadlines',
  deadlines: 'hot_deadlines'
};

export function parseGrantNotifyChannelParam(
  raw: string | string[] | null | undefined
): GrantNotifyChannelId | null {
  const v =
    typeof raw === 'string'
      ? raw.trim().toLowerCase()
      : Array.isArray(raw) && typeof raw[0] === 'string'
        ? raw[0].trim().toLowerCase()
        : '';
  if (!v) return null;
  return NOTIFY_PARAM_ALIASES[v] ?? null;
}

export function grantNotifyChannelLabel(id: GrantNotifyChannelId): string {
  return (
    GRANT_NOTIFY_CHANNELS.find((c) => c.id === id)?.shortLabel ?? id
  );
}

function firstSentence(text: string, maxLen = 360): string {
  const t = text.trim();
  if (!t) return '';
  const cut = t.split(/(?<=[.!?])\s+/)[0]?.trim() ?? t;
  if (cut.length <= maxLen) return cut;
  return `${cut.slice(0, maxLen).trim()}…`;
}

function titleCaseWords(s: string): string {
  return s
    .split(/[\s/_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function collectTags(s: Scholarship): string[] {
  const out: string[] = [];
  const push = (x: string) => {
    const v = x.trim();
    if (v && !out.includes(v)) out.push(v);
  };
  for (const t of s.seoTags ?? []) push(t);
  for (const c of s.categories ?? []) push(titleCaseWords(String(c)));
  for (const f of s.fieldOfStudy ?? []) push(titleCaseWords(String(f)));
  return out.slice(0, 8);
}

function deadlineMetricLine(s: Scholarship): string {
  const parts = getScholarshipDeadlineDisplayParts(s);
  let line = parts.primary;
  if (line.includes(' • ')) {
    line = line.split(' • ')[0] ?? line;
  }
  return line.trim() || '—';
}

function awardLine(s: Scholarship): string {
  const raw = s.amount?.trim() || s.awardAmount?.trim() || '';
  const formatted = formatScholarshipAwardDisplay(raw || null);
  return formatted && formatted !== '—' ? formatted : '—';
}

function requirementsLine(s: Scholarship): string {
  const n = s.requirementsCount;
  if (typeof n === 'number' && Number.isFinite(n) && n >= 0) {
    return String(n);
  }
  return '—';
}

/**
 * Builds props for the premium interlinking preview card (Telegram / web parity).
 */
export function buildInterlinkingPreviewDetailedCardModel(
  scholarship: Scholarship,
  overviewPlain: string,
  notificationChannel: GrantNotifyChannelId | null
): InterlinkingPreviewDetailedCardModel {
  const providerName = scholarship.provider?.trim() || 'Provider';
  const scholarshipTitle = scholarship.title?.trim() || 'Scholarship';
  const summarySource =
    overviewPlain.trim() ||
    scholarship.aiStudentSummary?.trim() ||
    scholarship.summaryShort?.trim() ||
    scholarship.description?.trim() ||
    '';

  return {
    providerName,
    scholarshipTitle,
    deadlineLabel: deadlineMetricLine(scholarship),
    awardLabel: awardLine(scholarship),
    requirementsCountLabel: requirementsLine(scholarship),
    tags: collectTags(scholarship),
    summarySnippet: firstSentence(summarySource),
    scholarshipId: scholarship.id,
    detailHref: scholarshipPublicPath(scholarship),
    notificationChannel,
    notificationLabel: notificationChannel
      ? grantNotifyChannelLabel(notificationChannel)
      : null
  };
}
