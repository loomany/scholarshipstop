/**
 * Mirror of `lib/seo/seoTelegramNotify.ts` (content-hub is a separate package; keep in sync).
 */

function escapeTelegramHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export type SeoTelegramLevel = "ok" | "warning" | "critical";

export type SeoTelegramNotifyEntry = {
  url: string;
  type: string;
  score: number;
  issues: string[];
  warnings: string[];
};

export type SeoTelegramNotifyInput = {
  title: string;
  message?: string;
  level: SeoTelegramLevel;
  counts: { ok: number; warnings: number; below90: number };
  entries: SeoTelegramNotifyEntry[];
};

export function isSeoTelegramNotifyConfigured(): boolean {
  const token = process.env.SEO_TELEGRAM_BOT_TOKEN?.trim();
  const chat = process.env.SEO_TELEGRAM_ADMIN_CHAT_ID?.trim();
  return Boolean(token && chat);
}

export function isSeoTelegramNotifyEnabled(): boolean {
  return process.env.SEO_TELEGRAM_NOTIFY_ENABLED?.trim() === "1";
}

function tokenPrefixForLog(): string {
  const t = process.env.SEO_TELEGRAM_BOT_TOKEN?.trim();
  if (!t) return "(unset)";
  return `${t.slice(0, 6)}…`;
}

export function listSeoIssueCountsSorted(
  entries: SeoTelegramNotifyEntry[]
): { code: string; count: number }[] {
  const map = new Map<string, number>();
  for (const e of entries) {
    const codes = new Set(
      [...e.issues, ...e.warnings]
        .map((c) => c.trim())
        .filter(Boolean)
    );
    for (const k of codes) {
      map.set(k, (map.get(k) ?? 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}

export function buildSeoGuardTelegramHtml(input: SeoTelegramNotifyInput): string {
  const sortedIssues = listSeoIssueCountsSorted(input.entries);
  const topIssues = sortedIssues.slice(0, 5);

  const lines: string[] = [];
  lines.push(`<b>${escapeTelegramHtml(input.title)}</b>`);
  if (input.message?.trim()) {
    lines.push("");
    lines.push(escapeTelegramHtml(input.message.trim()));
  }
  lines.push("");
  lines.push("New content check finished.");
  lines.push("");
  lines.push(`<b>OK:</b> ${input.counts.ok}`);
  lines.push(`<b>Warnings:</b> ${input.counts.warnings}`);
  lines.push(`<b>Below 90:</b> ${input.counts.below90}`);

  lines.push("");
  lines.push("<b>Top issues:</b>");
  if (topIssues.length === 0) {
    lines.push("—");
  } else {
    for (const row of topIssues) {
      lines.push(`• <code>${escapeTelegramHtml(row.code)}</code>: ${row.count}`);
    }
    if (sortedIssues.length > 5) {
      lines.push(`…and <i>${sortedIssues.length - 5} more</i>`);
    }
  }

  const sorted = [...input.entries].sort((a, b) => a.score - b.score);
  const examples = sorted.slice(0, 5);
  lines.push("");
  lines.push("<b>Examples:</b>");
  examples.forEach((e, i) => {
    lines.push(
      `${i + 1}. <code>${escapeTelegramHtml(e.url)}</code> — score ${e.score}`
    );
  });
  if (sorted.length > 5) {
    lines.push(`…and <i>${sorted.length - 5} more</i>`);
  }

  lines.push("");
  lines.push("<b>Action:</b>");
  lines.push("Run targeted fix for new pages below 90.");

  return lines.join("\n");
}

export type SeoTelegramSendResult = {
  sent: boolean;
  reason?: string;
};

export async function sendSeoTelegramNotification(
  input: SeoTelegramNotifyInput
): Promise<SeoTelegramSendResult> {
  if (!isSeoTelegramNotifyEnabled()) {
    return { sent: false, reason: "notify_disabled" };
  }
  const token = process.env.SEO_TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.SEO_TELEGRAM_ADMIN_CHAT_ID?.trim();
  if (!token || !chatId) {
    return { sent: false, reason: "missing_token_or_chat_id" };
  }

  const text = buildSeoGuardTelegramHtml(input);
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 8_000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: ac.signal,
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true
      })
    });
    clearTimeout(timer);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        "[seo-telegram] sendMessage failed",
        res.status,
        "token=",
        tokenPrefixForLog(),
        body.slice(0, 200)
      );
      return { sent: false, reason: `http_${res.status}` };
    }
    return { sent: true };
  } catch (e) {
    console.error(
      "[seo-telegram] sendMessage error",
      e instanceof Error ? e.message : String(e),
      "token=",
      tokenPrefixForLog()
    );
    return { sent: false, reason: "fetch_error" };
  }
}
