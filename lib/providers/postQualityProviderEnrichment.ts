/**
 * Heuristic post-check for enriched provider descriptions.
 * Intended to reject generic placeholders so downstream can skip storage enrich.
 */

/** Common English filler / function words (length ≥7) — not used as a “concrete” long token. */
const LONG_STOPWORDS = new Set(
  (
    `according additionally advantage although altogether alternative anything anywhere apparently ` +
    `approximately appropriate associated available basically because becoming before behind believe ` +
    `benefit besides between beyond building business carefully certain certainly chance changes ` +
    `clearly committee companies completely concerning conditions connection considered continue ` +
    `continued corporate customer decision definitely described description development difference ` +
    `different difficult direction directly discover document domestic dynamic economic education ` +
    `effectively either employees enough especially established eventually everyone everything ` +
    `everywhere exactly example exchange executive exercise existing expensive experience extremely ` +
    `facility federal financial following former forward function further general generally ` +
    `government ground growth however immediately important including increase individual ` +
    `information instead institutions interest international involved issues knowledge language ` +
    `learning legal levels likely limited located looking management marketing material members ` +
    `military million minutes moment money months morning national natural nearly necessary ` +
    `network nothing number obvious operation opportunities opportunity organization organizations ` +
    `otherwise outside particular patients period personal physical political population position ` +
    `possible potential practice previous previously primary probably problem problems process ` +
    `production products project projects property provide provided provides public purpose quality ` +
    `question questions quickly rather really reason receive received recent recently regarding ` +
    `related release remember report require required research resource resources response result ` +
    `results return rights running sales season second section security service services several ` +
    `should similar simply since single situation small social society something sometimes ` +
    `somewhere special specific staff standard started states still story strategy street ` +
    `strong subject success such suggest summer support supporting supports system systems ` +
    `technical technology themselves therefore thinking though thought through throughout together ` +
    `training treatment under understand understanding united until usually values various ` +
    `version video violence visit voice waiting weather welcome whether within without workers ` +
    `working would writing written yourself themselves everything somewhere community communities`
  )
    .split(/\s+/)
    .filter((w) => w.length >= 7)
);

function hasLongNonStopWord(text: string): boolean {
  const re = /\b[a-z]{7,}\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const w = m[0].toLowerCase();
    if (!LONG_STOPWORDS.has(w)) return true;
  }
  return false;
}

export function hasConcreteSignal(text: string): boolean {
  if (!text?.trim()) return false;

  return (
    /\d/.test(text) ||
    /\b(university|colleges?|foundation|programs?|scholarships?)\b/i.test(text) ||
    /\b[A-Z][a-z]{3,}\b/.test(text) ||
    /\b[A-Z]{4,}\b/.test(text) ||
    hasLongNonStopWord(text)
  );
}
