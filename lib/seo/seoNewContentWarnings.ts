import fs from 'fs/promises';
import path from 'path';

const DEFAULT_RELATIVE = path.join('docs', 'seo-new-content-warnings.json');
const MAX_TAIL_ENTRIES = 200;

export type SeoNewContentWarningRun = {
  generatedAt: string;
  source: string;
  counts: { ok: number; warnings: number; below90: number };
  entries: Array<{
    url: string;
    type: string;
    score: number;
    issues: string[];
    warnings: string[];
  }>;
};

function resolveWarningsPath(): string {
  const fromEnv = process.env.SEO_NEW_CONTENT_WARNINGS_PATH?.trim();
  if (fromEnv) return path.isAbsolute(fromEnv) ? fromEnv : path.resolve(fromEnv);
  return path.resolve(process.cwd(), DEFAULT_RELATIVE);
}

/**
 * Append one audit run to docs/seo-new-content-warnings.json (array tail capped).
 * Never throws — failures go to stderr.
 */
export async function appendSeoNewContentWarningRun(run: SeoNewContentWarningRun): Promise<void> {
  const filePath = resolveWarningsPath();
  try {
    let existing: unknown[] = [];
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) existing = parsed;
      else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { runs?: unknown }).runs)) {
        existing = (parsed as { runs: unknown[] }).runs;
      }
    } catch {
      existing = [];
    }
    const next = [...existing, run].slice(-MAX_TAIL_ENTRIES);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${JSON.stringify(next, null, 2)}\n`, 'utf-8');
  } catch (e) {
    console.error(
      '[seo-new-content-warnings] append failed:',
      e instanceof Error ? e.message : String(e)
    );
  }
}

/** Default warn-only: unset or "1" => true; explicit "0" => false. */
export function isSeoQualityWarnOnlyDefault(): boolean {
  const v = process.env.SEO_QUALITY_WARN_ONLY?.trim();
  if (!v) return true;
  return v !== '0';
}
