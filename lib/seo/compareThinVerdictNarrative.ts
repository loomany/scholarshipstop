/** Word-count helpers and editorial “thin page” explanatory copy for compare detail routes. */

const THIN_COMPARE_WORD_THRESHOLD = 170;

function stripMarkup(html: string): string {
  return html.replace(/<[^>]+>/g, ' ');
}

function normalizeWordCount(chunk: string): number {
  return chunk
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * Counts words across HTML-ish body and optional plain excerpts (AI verdict,
 * essays, climate blurbs — not tab captions).
 */
export function countWordsInCompareSources(
  bodyHtml: string,
  ...plainParts: ReadonlyArray<string | null | undefined>
): number {
  const stripped = `${stripMarkup(bodyHtml)} ${plainParts.filter(Boolean).join(' ')}`;
  return normalizeWordCount(stripped);
}

/** When total editorial text is sparse, inject a substantive explainer (~200 words). */
export function isCompareArticleThin(totalWords: number): boolean {
  return totalWords < THIN_COMPARE_WORD_THRESHOLD;
}

function grantDescriptor(label: string, grantCount: number | null): string {
  return grantCount !== null && Number.isFinite(grantCount)
    ? `about ${Intl.NumberFormat('en-US').format(Math.round(grantCount))} scholarships indexed today for listings commonly associated with ${label}`
    : `directional coverage for listings tied to ${label}`;
}

/**
 * Two editorial paragraphs (~200–240 words combined). Visible only when the
 * matchup page lacks enough natural-language context.
 */
export function buildStateThinVerdictParagraphs(args: {
  year: number;
  stateAName: string;
  stateBName: string;
  grantCountA: number | null;
  grantCountB: number | null;
}): readonly [string, string] {
  const { year, stateAName, stateBName, grantCountA, grantCountB } = args;

  const p1 =
    `ScholarshipTop publishes this supplemental “Final verdict explanation” whenever the primary matchup body for ${year} skews thinner than editorial depth standards. ` +
    `The comparison table summarizes ${grantDescriptor(stateAName, grantCountA)} alongside ${grantDescriptor(stateBName, grantCountB)} using the same ingestion window, so deltas highlight catalog-wide signals rather than courthouse-grade guarantees. ` +
    `Residents, transfers, and commuter students weighing ${stateAName} campuses against ${stateBName} footprints should corroborate every figure with authoritative financial aid disclosures, state higher-ed portals, endowed scholarship riders, reciprocal tuition agreements, Honors supplements, or graduation timelines before staking savings plans.`;

  const p2 =
    `After reviewing the matchup metrics above, continue with Matches-style browsing, internationally inclusive corridors when visas matter, streamlined application corridors when time is scarce, followed by essay hubs and evergreen resource articles covering drafting workflows, budgeting, appeals, parental contribution conversations, and scholarship renewals tied to academic performance. ` +
    `ScholarshipTop provides these cues as scaffolding; students still validate final award letters directly with campuses and adjust strategy whenever policies evolve during ${year} and afterward.`;

  return [p1, p2] as const;
}

export function buildUniversityThinVerdictParagraphs(args: {
  year: number;
  instAName: string;
  instBName: string;
  grantCountA: number | null;
  grantCountB: number | null;
}): readonly [string, string] {
  const { year, instAName, instBName, grantCountA, grantCountB } = args;

  const p1 =
    `This “Final verdict explanation” frames ${year} readiness when applicants compare admits between ${instAName} and ${instBName} but matchup prose skews abbreviated. ` +
    `Catalog columns quantify ${grantDescriptor(instAName, grantCountA)} versus ${grantDescriptor(instBName, grantCountB)} with shared ingestion logic so merit-versus-need mixes, openness of deadlines surfaced in-catalog, indexed award placeholders, or coaching guardrails interpret consistently. ` +
    `Treat them as directional triage—they never substitute registrar-validated ledger lines documenting endowed riders, departmental supplements, tuition waivers, Honors stackability, or athletic aid interplay beyond Title IV packaged awards.`;

  const p2 =
    `Whenever narrative prose feels thin beside detailed tables, pair this matchup with Matches browsing, internationally inclusive corridors, streamlined application corridors, evergreen essay tooling, evergreen resource pillars, and citations listed below inside this page.` +
    ` Continue reconciling FAFSA outputs, institutional notifications, and enrollment contracts with campus counsel until net price matches commitments for ${year} and successive terms; ScholarshipTop catalogs and hubs illuminate workflows but never replace fiduciary advice tied to admitted-student paperwork.`;

  return [p1, p2] as const;
}
