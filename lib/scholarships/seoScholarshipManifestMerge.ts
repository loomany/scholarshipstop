import type {
  SeoScholarshipRouteManifestEntry,
  SeoScholarshipRoutesManifest
} from '@/lib/scholarships/seoScholarshipManifest';

function isManualEntry(e: SeoScholarshipRouteManifestEntry): boolean {
  return e.source !== 'auto';
}

function shouldKeepManualEntry(e: SeoScholarshipRouteManifestEntry): boolean {
  if (!isManualEntry(e)) return true;
  if (e.qualityBucket === 'EMPTY') return false;
  return true;
}

export type MergeManifestOptions = {
  nowIso: string;
  pruneStaleAuto: boolean;
};

/**
 * Merge auto-generated routes with existing manifest rows.
 * - Manual: preserve copy, filters, and legacy merge shape; refresh counts from `refreshedByPath`.
 * - Auto: replace with the latest generated row for that path.
 */
export function mergeSeoManifestRoutes(args: {
  existing: SeoScholarshipRouteManifestEntry[];
  generatedAuto: Map<string, SeoScholarshipRouteManifestEntry>;
  refreshedByPath: Map<string, SeoScholarshipRouteManifestEntry>;
  opts: MergeManifestOptions;
}): SeoScholarshipRouteManifestEntry[] {
  const { existing, generatedAuto, refreshedByPath, opts } = args;
  const byPath = new Map<string, SeoScholarshipRouteManifestEntry>();

  for (const row of existing) {
    if (!shouldKeepManualEntry(row)) continue;
    byPath.set(row.canonicalPath, row);
  }

  const generatedPaths = new Set(generatedAuto.keys());

  for (const [path, gen] of generatedAuto) {
    const prev = byPath.get(path);
    if (!prev) {
      byPath.set(path, {
        ...gen,
        lastEvaluatedAt: opts.nowIso
      });
      continue;
    }
    if (isManualEntry(prev)) {
      const fresh = refreshedByPath.get(path);
      if (fresh) {
        byPath.set(path, {
          ...prev,
          minCountSnapshot: fresh.minCountSnapshot,
          scholarshipsCount: fresh.scholarshipsCount,
          score: fresh.score,
          overlapMeta: fresh.overlapMeta,
          lastEvaluatedAt: opts.nowIso
        });
      } else {
        byPath.set(path, {
          ...prev,
          lastEvaluatedAt: opts.nowIso
        });
      }
      continue;
    }
    byPath.set(path, {
      ...gen,
      lastEvaluatedAt: opts.nowIso
    });
  }

  for (const row of existing) {
    if (!isManualEntry(row)) continue;
    if (!shouldKeepManualEntry(row)) continue;
    if (generatedAuto.has(row.canonicalPath)) continue;
    const fresh = refreshedByPath.get(row.canonicalPath);
    if (!fresh) continue;
    byPath.set(row.canonicalPath, {
      ...row,
      minCountSnapshot: fresh.minCountSnapshot,
      scholarshipsCount: fresh.scholarshipsCount,
      score: fresh.score,
      overlapMeta: fresh.overlapMeta,
      lastEvaluatedAt: opts.nowIso
    });
  }

  if (opts.pruneStaleAuto) {
    for (const [path, row] of Array.from(byPath.entries())) {
      if (row.source === 'auto' && !generatedPaths.has(path)) {
        byPath.delete(path);
      }
    }
  }

  return Array.from(byPath.values()).sort((a, b) => {
    const sa = a.score ?? a.priority ?? 0;
    const sb = b.score ?? b.priority ?? 0;
    if (sb !== sa) return sb - sa;
    const ca = a.scholarshipsCount ?? a.minCountSnapshot ?? 0;
    const cb = b.scholarshipsCount ?? b.minCountSnapshot ?? 0;
    if (cb !== ca) return cb - ca;
    return a.canonicalPath.localeCompare(b.canonicalPath);
  });
}

export function bumpManifestMeta(
  manifest: SeoScholarshipRoutesManifest,
  nowIso: string,
  promptVersion?: string
): void {
  manifest.generatedAt = nowIso;
  if (promptVersion != null) manifest.promptVersion = promptVersion;
}
