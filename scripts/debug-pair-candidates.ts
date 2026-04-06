/**
 * Full trace for specific SEO double canonical paths (tokens, dimensions, counts, overlap, score, promote gate).
 *
 *   npx tsx scripts/debug-pair-candidates.ts
 *   npx tsx scripts/debug-pair-candidates.ts path/to/scholarships.json
 */

import fs from 'fs';
import path from 'path';

import type { Scholarship } from '../app/scholarships/scholarshipsData';
import { buildDynamicSeoManifestEntry } from '../lib/scholarships/seoScholarshipDynamicEntry';
import {
  ALLOWLISTED_DOUBLE_OVERLAP_CAP,
  computeRouteScore,
  HIGH_PRIORITY_SEGMENTS,
  maxCuratedWeightForPath,
  minCountForPageType,
  minScoreForPageType,
  shouldPromoteAutoRoute
} from '../lib/scholarships/seoScholarshipCandidateScoring';
import {
  isAllowedSeoDouble,
  seoCombinationDimension
} from '../lib/scholarships/seoScholarshipCandidateDimensions';
import {
  PAIR_POOL_MIN_COUNT,
  PAIR_SEED_CURATED_SEGMENTS,
  buildSeoScholarshipAutoCandidates,
  defaultCandidateBuildOptions
} from '../lib/scholarships/seoScholarshipCandidateBuilder';
import { getScholarshipIdsMatchingManifestEntry } from '../lib/scholarships/seoScholarshipListing';
import { maxRelativeChildToParentSize } from '../lib/scholarships/seoScholarshipOverlap';
import {
  canonicalPathFromTokens,
  listPreferredSeoPathSegments,
  parsePathSegmentsToTokens
} from '../lib/scholarships/seoScholarshipRouteTokens';
import type { SeoRouteToken } from '../lib/scholarships/seoScholarshipRouteTokens';

const ROOT = path.join(__dirname, '..');

type SingleRow = {
  segment: string;
  canonicalPath: string;
  ids: Set<string>;
  count: number;
};

function buildSingleRow(list: Scholarship[], segment: string): SingleRow | null {
  const tokens = parsePathSegmentsToTokens([segment]);
  if (!tokens?.length) return null;
  const canonicalPath = canonicalPathFromTokens(tokens);
  const entry = buildDynamicSeoManifestEntry(tokens, canonicalPath);
  if (!entry) return null;
  const ids = getScholarshipIdsMatchingManifestEntry(list, entry);
  return { segment, canonicalPath, ids, count: ids.size };
}

function tokenSummary(t: SeoRouteToken): string {
  switch (t.kind) {
    case 'legacy_preset':
      return `legacy_preset:${t.slug}`;
    case 'eligibility':
      return `eligibility:${t.id}`;
    case 'education':
      return `education:${t.id}`;
    case 'easy_apply':
      return `easy_apply:${t.id}`;
    case 'gpa':
      return `gpa:${t.id}`;
    case 'location':
      return `location:${t.label}`;
    case 'deadline':
      return `deadline:${t.preset}`;
    case 'verified':
      return 'verified';
    case 'payout':
      return `payout:${t.id}`;
    default:
      return JSON.stringify(t);
  }
}

type DropReason =
  | 'invalid_tokens'
  | 'disallowed_pair'
  | 'no_filter_effect'
  | 'low_count'
  | 'high_overlap'
  | 'low_score'
  | 'other_ok_intrinsic'
  | 'not_in_promoted_builder_order';

function intrinsicTrace(
  list: Scholarship[],
  userPath: string
): {
  tokens: SeoRouteToken[] | null;
  dimensions: string[];
  canonicalPath: string;
  isAllowedSeoDouble: boolean;
  count: number;
  overlap: number;
  overlapParentHint: string;
  score: number;
  shouldPromoteAutoRoute: boolean;
  dropReason: DropReason;
  detail: string;
} {
  const segments = userPath.split('/').filter(Boolean);
  const tokens = parsePathSegmentsToTokens(segments);
  if (!tokens || tokens.length !== 2) {
    return {
      tokens,
      dimensions: [],
      canonicalPath: userPath,
      isAllowedSeoDouble: false,
      count: 0,
      overlap: 0,
      overlapParentHint: '',
      score: 0,
      shouldPromoteAutoRoute: false,
      dropReason: 'invalid_tokens',
      detail: `parsePathSegmentsToTokens failed or len!==2`
    };
  }

  const canonicalPath = canonicalPathFromTokens(tokens);
  const dimensions = tokens.map((t) => seoCombinationDimension(t));
  const allowed = isAllowedSeoDouble(tokens);
  if (!allowed) {
    const d0 = dimensions[0]!;
    const d1 = dimensions[1]!;
    return {
      tokens,
      dimensions,
      canonicalPath,
      isAllowedSeoDouble: false,
      count: 0,
      overlap: 0,
      overlapParentHint: '',
      score: 0,
      shouldPromoteAutoRoute: false,
      dropReason: 'disallowed_pair',
      detail: `dim pair ${d0}+${d1} not in allowlist`
    };
  }

  const entry = buildDynamicSeoManifestEntry(tokens, canonicalPath);
  if (!entry) {
    return {
      tokens,
      dimensions,
      canonicalPath,
      isAllowedSeoDouble: true,
      count: 0,
      overlap: 0,
      overlapParentHint: '',
      score: 0,
      shouldPromoteAutoRoute: false,
      dropReason: 'no_filter_effect',
      detail: 'buildDynamicSeoManifestEntry returned null'
    };
  }

  const childIds = getScholarshipIdsMatchingManifestEntry(list, entry);
  const count = childIds.size;
  const minD = minCountForPageType('double');
  if (count < minD) {
    return {
      tokens,
      dimensions,
      canonicalPath,
      isAllowedSeoDouble: true,
      count,
      overlap: 0,
      overlapParentHint: '',
      score: 0,
      shouldPromoteAutoRoute: false,
      dropReason: 'low_count',
      detail: `need >=${minD}`
    };
  }

  const parts = canonicalPath.split('/').filter(Boolean);
  const row0 = buildSingleRow(list, parts[0]!);
  const row1 = buildSingleRow(list, parts[1]!);
  if (!row0 || !row1) {
    return {
      tokens,
      dimensions,
      canonicalPath,
      isAllowedSeoDouble: true,
      count,
      overlap: 0,
      overlapParentHint: '',
      score: 0,
      shouldPromoteAutoRoute: false,
      dropReason: 'other_ok_intrinsic',
      detail: 'missing single parent row (unexpected)'
    };
  }

  const { ratio, parentIndex } = maxRelativeChildToParentSize({
    child: childIds,
    parents: [row0.ids, row1.ids]
  });
  const parentPaths = [row0.canonicalPath, row1.canonicalPath];
  const overlapParentHint =
    parentIndex >= 0 ? parentPaths[parentIndex]! : '(none)';

  const score = computeRouteScore({
    pageType: 'double',
    count,
    canonicalPath,
    overlapRatio: ratio,
    allowlistedDouble: true
  });

  const ok = shouldPromoteAutoRoute({
    pageType: 'double',
    count,
    score,
    overlapRatio: ratio,
    allowlistedDouble: true
  });

  let dropReason: DropReason = 'other_ok_intrinsic';
  let detail = 'intrinsic checks passed';
  if (!ok) {
    if (ratio >= ALLOWLISTED_DOUBLE_OVERLAP_CAP) {
      dropReason = 'high_overlap';
      detail = `ratio ${ratio.toFixed(6)} >= cap ${ALLOWLISTED_DOUBLE_OVERLAP_CAP}`;
    } else if (score < minScoreForPageType('double')) {
      dropReason = 'low_score';
      detail = `score ${score} < min ${minScoreForPageType('double')}`;
    } else {
      dropReason = 'low_count';
      detail = 'shouldPromote false for other reason (unexpected)';
    }
  }

  return {
    tokens,
    dimensions,
    canonicalPath,
    isAllowedSeoDouble: true,
    count,
    overlap: ratio,
    overlapParentHint,
    score,
    shouldPromoteAutoRoute: ok,
    dropReason: ok ? 'other_ok_intrinsic' : dropReason,
    detail: ok ? 'all intrinsic gates pass' : detail
  };
}

function buildPairPool(list: Scholarship[], onlyPriority: 'all' | 'high') {
  let allSegments = listPreferredSeoPathSegments();
  if (onlyPriority === 'high') {
    allSegments = allSegments.filter((s) => HIGH_PRIORITY_SEGMENTS.has(s));
  }

  const rowBySegment = new Map<string, SingleRow>();
  for (const seg of allSegments) {
    const row = buildSingleRow(list, seg);
    if (row) rowBySegment.set(seg, row);
  }

  const pairCandidateRows: SingleRow[] = [];
  for (const seg of allSegments) {
    const row = rowBySegment.get(seg);
    if (!row || row.count < PAIR_POOL_MIN_COUNT) continue;
    const curatedSeed = PAIR_SEED_CURATED_SEGMENTS.has(seg);
    if (!curatedSeed && row.count < minCountForPageType('single')) continue;
    pairCandidateRows.push(row);
  }

  pairCandidateRows.sort((a, b) => {
    const wa = maxCuratedWeightForPath(a.canonicalPath);
    const wb = maxCuratedWeightForPath(b.canonicalPath);
    if (wb !== wa) return wb - wa;
    return b.count - a.count;
  });

  const opts = defaultCandidateBuildOptions;
  return pairCandidateRows.slice(0, opts.maxPairPool).map((r) => r.segment);
}

/** Simulate builder double loop: when is target canonicalPath first hit, and outcome. */
function simulateDoubleLoop(
  list: Scholarship[],
  targetCanonical: string,
  onlyPriority: 'all' | 'high'
): {
  evalIndexFirstHit: number | null;
  outcomeAtHit: string;
  promotedBeforeHit: number;
} {
  const opts = defaultCandidateBuildOptions;
  let allSegments = listPreferredSeoPathSegments();
  if (onlyPriority === 'high') {
    allSegments = allSegments.filter((s) => HIGH_PRIORITY_SEGMENTS.has(s));
  }

  const rowBySegment = new Map<string, SingleRow>();
  for (const seg of allSegments) {
    const row = buildSingleRow(list, seg);
    if (row) rowBySegment.set(seg, row);
  }

  const pairCandidateRows: SingleRow[] = [];
  for (const seg of allSegments) {
    const row = rowBySegment.get(seg);
    if (!row || row.count < PAIR_POOL_MIN_COUNT) continue;
    const curatedSeed = PAIR_SEED_CURATED_SEGMENTS.has(seg);
    if (!curatedSeed && row.count < minCountForPageType('single')) continue;
    pairCandidateRows.push(row);
  }
  pairCandidateRows.sort((a, b) => {
    const wa = maxCuratedWeightForPath(a.canonicalPath);
    const wb = maxCuratedWeightForPath(b.canonicalPath);
    if (wb !== wa) return wb - wa;
    return b.count - a.count;
  });
  const pairPool = pairCandidateRows.slice(0, opts.maxPairPool);
  const pairPoolBySegment = new Map(pairPool.map((r) => [r.segment, r]));
  const pairPoolSegs = pairPool.map((r) => r.segment);

  const seenPaths = new Set<string>();
  let doublesOut = 0;
  let pairEvals = 0;
  let evalIndexFirstHit: number | null = null;
  let outcomeAtHit = '';
  let promotedBeforeHit = 0;

  outer: for (let i = 0; i < pairPoolSegs.length && doublesOut < opts.maxDoubles; i++) {
    for (
      let j = i + 1;
      j < pairPoolSegs.length && doublesOut < opts.maxDoubles;
      j++
    ) {
      if (pairEvals >= opts.maxPairEvaluations) break outer;
      pairEvals += 1;

      const segA = pairPoolSegs[i]!;
      const segB = pairPoolSegs[j]!;
      const tokens = parsePathSegmentsToTokens([segA, segB]);
      if (!tokens || tokens.length < 2) continue;
      if (!isAllowedSeoDouble(tokens)) continue;
      const canonicalPath = canonicalPathFromTokens(tokens);
      const isHit = canonicalPath === targetCanonical;

      if (isHit && evalIndexFirstHit === null) {
        evalIndexFirstHit = pairEvals;
        promotedBeforeHit = doublesOut;
      }

      if (seenPaths.has(canonicalPath)) {
        if (isHit && evalIndexFirstHit === pairEvals) {
          outcomeAtHit = 'skipped_seenPaths_duplicate';
        }
        continue;
      }

      const entry = buildDynamicSeoManifestEntry(tokens, canonicalPath);
      if (!entry) {
        if (isHit && evalIndexFirstHit === pairEvals) outcomeAtHit = 'no_filter_effect';
        continue;
      }

      const childIds = getScholarshipIdsMatchingManifestEntry(list, entry);
      const count = childIds.size;
      if (count < minCountForPageType('double')) {
        if (isHit && evalIndexFirstHit === pairEvals) {
          outcomeAtHit = `low_count got ${count}`;
        }
        continue;
      }

      const rowA = pairPoolBySegment.get(segA);
      const rowB = pairPoolBySegment.get(segB);
      if (!rowA || !rowB) continue;

      const { ratio } = maxRelativeChildToParentSize({
        child: childIds,
        parents: [rowA.ids, rowB.ids]
      });
      const score = computeRouteScore({
        pageType: 'double',
        count,
        canonicalPath,
        overlapRatio: ratio,
        allowlistedDouble: true
      });
      const ok = shouldPromoteAutoRoute({
        pageType: 'double',
        count,
        score,
        overlapRatio: ratio,
        allowlistedDouble: true
      });

      if (isHit && evalIndexFirstHit === pairEvals) {
        if (!ok) {
          outcomeAtHit =
            ratio >= ALLOWLISTED_DOUBLE_OVERLAP_CAP
              ? `high_overlap ratio=${ratio.toFixed(4)}`
              : `low_score score=${score}`;
        } else {
          outcomeAtHit = 'would_promote';
        }
      }

      if (!ok) continue;

      seenPaths.add(canonicalPath);
      doublesOut += 1;
    }
  }

  if (evalIndexFirstHit === null) {
    outcomeAtHit = 'pair_never_evaluated_in_loop';
  }

  return { evalIndexFirstHit, outcomeAtHit, promotedBeforeHit };
}

function segmentInPairPool(seg: string, pool: string[]): boolean {
  return pool.includes(seg);
}

async function main() {
  const jsonPath =
    process.argv[2] || path.join(ROOT, 'data', 'scholarships.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('Missing:', jsonPath);
    process.exit(1);
  }
  const list = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as Scholarship[];

  const targets = [
    'for-women/no-essay',
    'international-students/california',
    'undergraduate/california',
    'high-school/no-essay',
    'engineering/texas',
    'computer-science/no-essay'
  ];

  const report = buildSeoScholarshipAutoCandidates(list, { onlyPriority: 'all' });
  const promotedSet = new Set(report.promoted.map((r) => r.canonicalPath));
  const pool = buildPairPool(list, 'all');

  console.log(`Scholarships: ${list.length}`);
  console.log(`Data file: ${jsonPath}`);
  console.log(
    `Builder: doubles=${report.promotedByType.double}, pairPoolSize=${report.pairPoolSize}, maxPairEvaluations=${defaultCandidateBuildOptions.maxPairEvaluations}\n`
  );

  for (const userPath of targets) {
    const tr = intrinsicTrace(list, userPath);
    const parts = tr.canonicalPath.split('/').filter(Boolean);
    const inPoolA = parts[0] ? segmentInPairPool(parts[0], pool) : false;
    const inPoolB = parts[1] ? segmentInPairPool(parts[1], pool) : false;
    const sim = simulateDoubleLoop(list, tr.canonicalPath, 'all');

    let finalReason = tr.dropReason;
    if (tr.shouldPromoteAutoRoute && !promotedSet.has(tr.canonicalPath)) {
      finalReason = 'not_in_promoted_builder_order';
    }
    if (!tr.shouldPromoteAutoRoute && tr.dropReason === 'other_ok_intrinsic') {
      finalReason = tr.dropReason;
    }

    console.log('---');
    console.log(`requested path: ${userPath}`);
    console.log(`1. tokens: ${tr.tokens?.map(tokenSummary).join(' | ') ?? 'null'}`);
    console.log(`2. dimensions: ${tr.dimensions.join(' + ')}`);
    console.log(`3. canonicalPath: ${tr.canonicalPath}`);
    console.log(`4. isAllowedSeoDouble: ${tr.isAllowedSeoDouble}`);
    console.log(`5. count (double listing): ${tr.count}`);
    console.log(
      `6. overlap (max vs single parents): ${tr.overlap.toFixed(6)} (parent: ${tr.overlapParentHint})`
    );
    console.log(`7. score: ${tr.score}`);
    console.log(`8. shouldPromoteAutoRoute (intrinsic): ${tr.shouldPromoteAutoRoute}`);
    console.log(`9. in promoted manifest (this run): ${promotedSet.has(tr.canonicalPath)}`);
    console.log(
      `   segments in pair pool: [${parts[0]}]=${inPoolA}, [${parts[1]}]=${inPoolB}`
    );
    console.log(
      `   simulate loop: firstEvalIndex=${sim.evalIndexFirstHit}, atHit=${sim.outcomeAtHit}, doublesAlreadyPromotedBeforeHit=${sim.promotedBeforeHit}`
    );
    console.log(`   exact drop reason: ${finalReason}`);
    console.log(`   detail: ${tr.detail}`);
  }

  console.log('\n---\nOverlap for doubles uses max(|child|/|parent|) over the two single parents (narrowing / duplicate-likeness).\n' +
    'Exact counts/scores require your catalog JSON (run: node node_modules/tsx/dist/cli.mjs scripts/debug-pair-candidates.ts [path]).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
