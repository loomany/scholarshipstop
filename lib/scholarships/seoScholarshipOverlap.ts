/**
 * Pragmatic overlap between filtered result sets (child vs parent SEO page).
 */

/** |child ∩ parent| / |child| — useful when child is not necessarily ⊆ parent. */
export function childSubsetOverlapRatio(
  child: Set<string>,
  parent: Set<string>
): number {
  if (child.size === 0) return 0;
  let inter = 0;
  for (const id of Array.from(child)) {
    if (parent.has(id)) inter += 1;
  }
  return inter / child.size;
}

export function maxParentOverlap(args: {
  child: Set<string>;
  parents: Set<string>[];
}): { ratio: number; parentIndex: number } {
  let best = 0;
  let idx = -1;
  for (let i = 0; i < args.parents.length; i++) {
    const r = childSubsetOverlapRatio(args.child, args.parents[i]!);
    if (r > best) {
      best = r;
      idx = i;
    }
  }
  return { ratio: best, parentIndex: idx };
}

/**
 * AND listing pages (double/triple): child = ⋂ filters is always ⊆ each single (or pair) parent.
 * |child∩parent|/|child| is therefore always 1 — not a duplicate signal.
 *
 * Instead use **relative size** max_i |child|/|parent_i|: high when the child captures almost
 * all of one parent's results (weak extra filter → duplicate-like); low when it narrows strongly.
 */
export function maxRelativeChildToParentSize(args: {
  child: Set<string>;
  parents: Set<string>[];
}): { ratio: number; parentIndex: number } {
  let best = 0;
  let idx = -1;
  for (let i = 0; i < args.parents.length; i++) {
    const p = args.parents[i]!;
    if (p.size === 0) continue;
    const r = args.child.size / p.size;
    if (r > best) {
      best = r;
      idx = i;
    }
  }
  return { ratio: best, parentIndex: idx };
}
