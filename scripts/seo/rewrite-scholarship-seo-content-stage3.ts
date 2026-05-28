import fs from "node:fs";
import path from "node:path";

type JsonRecord = Record<string, unknown>;

type TextChange = {
  file: string;
  path: string;
  before: string;
  after: string;
};

const DATA_DIR = path.join(process.cwd(), "data", "seo-scholarship-content");

const USER_TEXT_KEYS = [
  "seo_title",
  "seo_description",
  "h1",
  "intro",
  "supporting",
  "related_intro",
] as const;

const BAD_PHRASE_RE =
  /official source|official website|official site|official program page|official scholarship page|official provider page|official provider application path|official provider application paths|official page|official application|official requirement|official requirements|official listing|official listings|official link|official links|official detail|official details|\bofficial\b|source page|source pages|source named|provider or school page|sponsor site|provider website|provider site|open the provider-path context|open the provider application path to review|provider application paths are the place to review|provider application paths are the place to confirm|provider application path is the place to confirm|provider application paths are the place to understand|provider application paths to review|opening provider application paths|provider-path context for final confirmation|catalog for discovery|checking each provider application path|checking each provider|on the provider-path context|with the relevant provider|\bverify\b|verifying|verified|verification|double-check|check with|check (?:the )?official|not official|not affiliated|guarantee|not guarantee|no guarantee|does not guarantee|not responsible|information may change|may be outdated|starting point|starting point only|place to start|directory only|discovery only|not final authority|use at your own risk|independently verify|final decision|final rules|scholarship provider|provider is responsible|terms may change|deadlines may change|award amounts may change|details can change|requirement details can change|should always be structured|\bconfirm\b|confirming|confirmed|confirmation|official pages are the place|directory filter page|catalog[^.\n]{0,120}official sources/gi;

const TARGET_VALIDATION_RE =
  /verify every|double-check every|starting point only|treat[^.\n]*starting point|directory only|discovery only|not final authority|official source before you apply|not an official scholarship provider|official pages are the place|provider website controls|information may be outdated|use at your own risk|independently verify/gi;

const SAFETY_RE =
  /guarantee[^.\n]{0,80}scholarship|guaranteed scholarship|guarantee[^.\n]{0,80}acceptance|guaranteed acceptance|official provider|we award|we pay|100% accurate|100 percent accurate/gi;

const WORKSPACE_IDENTITY =
  "ScholarshipTop is a scholarship search and application workspace for international students. It organizes scholarship details, eligibility signals, deadlines, award information, provider application paths, shortlisting tools, and AI support so students can move faster toward application.";

const SEO_VIEW =
  "Use this ScholarshipTop view to compare organized opportunities by eligibility signals, award details, deadlines, effort level, and application path.";

const WORKFLOW =
  "Use ScholarshipTop to compare fit, save relevant opportunities, prepare materials, track deadlines, and continue toward the provider application path when you are ready to submit.";

const PROVIDER_BOUNDARY =
  "Final scholarship decisions are made by the relevant provider. ScholarshipTop helps you organize the research, compare opportunities, and prepare application materials with more context.";

const DEADLINE_AWARD =
  "ScholarshipTop highlights available deadline and award details in a structured format so you can prioritize opportunities and plan your next step.";

const PROVIDER_LINK =
  "When a provider application path is available, ScholarshipTop includes it so you can move from shortlist to submission more easily.";

function hasBadFraming(text: string): boolean {
  BAD_PHRASE_RE.lastIndex = 0;
  return BAD_PHRASE_RE.test(text);
}

function countMatches(text: string, re: RegExp): number {
  re.lastIndex = 0;
  return text.match(re)?.length ?? 0;
}

function normalizeSpacing(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+-\s+/g, " - ")
    .trim();
}

function cleanupWorkspaceCopy(text: string): string {
  return normalizeSpacing(text)
    .replace(/,\s*but Use ScholarshipTop\b/g, ". Use ScholarshipTop")
    .replace(/\bbut Use ScholarshipTop\b/g, "Use ScholarshipTop")
    .replace(
      /\breview dates early, review provider-path context in ScholarshipTop, and (?:review|verify) the latest details before you apply\b/gi,
      "review dates early, use provider-path context in ScholarshipTop, and plan your next step before you apply",
    )
    .replace(
      /\breview provider-path context in ScholarshipTop to review\b/gi,
      "use ScholarshipTop to organize",
    )
    .replace(
      /\beligibility signals for international students in the USA should always be structured on the provider application path\b/gi,
      "Use ScholarshipTop to compare eligibility signals for international students alongside provider-path context",
    );
}

function replacementForBadSentence(sentence: string, fieldPath: string): string {
  const lower = sentence.toLowerCase();

  if (fieldPath.includes("how_to_use")) {
    if (/deadline|date|award|amount/.test(lower)) {
      return "Use structured deadline and award details to prioritize your next step";
    }
    if (/apply|application|submit|official|provider|sponsor/.test(lower)) {
      return "Use the provider application path when you are ready to submit";
    }
    if (/eligibility|requirement|rule|material/.test(lower)) {
      return "Review eligibility signals, required materials, and fit in your ScholarshipTop shortlist";
    }
    return "Use this ScholarshipTop view to compare organized opportunities";
  }

  if (/starting point|directory|catalog/.test(lower)) {
    return SEO_VIEW;
  }

  if (/guarantee|final decision|not responsible|not affiliated|not official/.test(lower)) {
    return PROVIDER_BOUNDARY;
  }

  if (/deadline|date|award|amount|term/.test(lower)) {
    return DEADLINE_AWARD;
  }

  if (/official|provider|sponsor|apply|application|submit|shortlist/.test(lower)) {
    return PROVIDER_LINK;
  }

  return WORKFLOW;
}

function replaceBadSentences(text: string, fieldPath: string): string {
  const parts = text.split(/(?<=[.!?])\s+/);
  const rewritten = parts.map((part) => {
    if (!hasBadFraming(part)) {
      return part;
    }

    return replacementForBadSentence(part, fieldPath);
  });

  return rewritten.join(" ");
}

function applyPhraseLevelRewrites(text: string): string {
  return text
    .replace(
      /\bapply through (?:each )?(?:official )?(?:program pages|program page|scholarship pages|scholarship page|application pages|application page|listings|listing|links|link)\b/gi,
      "continue toward provider application paths when you are ready to submit",
    )
    .replace(
      /\bapply through structured listing details\b/gi,
      "continue toward provider application paths when you are ready to submit",
    )
    .replace(
      /\bthen apply after reviewing organized details and provider-path context\b/gi,
      "then prioritize next application steps with organized details and provider-path context",
    )
    .replace(
      /\bthen apply after reviewing details on each structured listing detail\b/gi,
      "then continue toward provider application paths with organized details",
    )
    .replace(/\bofficial program pages\b/gi, "provider application paths")
    .replace(/\bofficial program page\b/gi, "provider application path")
    .replace(/\bofficial scholarship pages\b/gi, "provider application paths")
    .replace(/\bofficial scholarship page\b/gi, "provider application path")
    .replace(/\bofficial USA program pages\b/gi, "provider application paths")
    .replace(/\bofficial USA program page\b/gi, "provider application path")
    .replace(/\bofficial provider application paths\b/gi, "provider application paths")
    .replace(/\bofficial provider application path\b/gi, "provider application path")
    .replace(/\bofficial provider pages\b/gi, "provider application paths")
    .replace(/\bofficial provider page\b/gi, "provider application path")
    .replace(/\bofficial application links\b/gi, "provider application paths")
    .replace(/\bofficial application link\b/gi, "provider application path")
    .replace(/\bofficial applications\b/gi, "provider application paths")
    .replace(/\bofficial application\b/gi, "provider application path")
    .replace(/\bofficial eligibility details\b/gi, "eligibility signals and provider-path context")
    .replace(/\bofficial eligibility detail\b/gi, "eligibility signal and provider-path context")
    .replace(/\bofficial eligibility rules\b/gi, "eligibility signals")
    .replace(/\bofficial eligibility rule\b/gi, "eligibility signal")
    .replace(/\bofficial eligibility language\b/gi, "eligibility signals")
    .replace(/\bofficial criteria\b/gi, "eligibility signals")
    .replace(/\bofficial rules\b/gi, "application rules")
    .replace(/\bofficial terms\b/gi, "provider-path context")
    .replace(/\bofficial process\b/gi, "application process")
    .replace(/\bofficial instructions\b/gi, "application instructions")
    .replace(/\bofficial-page instructions\b/gi, "provider-path instructions")
    .replace(/\bofficial scholarship sources\b/gi, "provider application paths")
    .replace(/\bofficial scholarship source\b/gi, "provider application path")
    .replace(/\bofficial scholarship websites\b/gi, "provider application paths")
    .replace(/\bofficial scholarship website\b/gi, "provider application path")
    .replace(/\bofficial sponsor pages\b/gi, "provider application paths")
    .replace(/\bofficial sponsor page\b/gi, "provider application path")
    .replace(/\bofficial sponsor defines\b/gi, "provider-path context shows")
    .replace(/\bofficial sponsor\b/gi, "relevant provider")
    .replace(/\bofficial scholarship descriptions\b/gi, "structured listing descriptions")
    .replace(/\bofficial scholarship description\b/gi, "structured listing description")
    .replace(/\bofficial descriptions\b/gi, "structured listing descriptions")
    .replace(/\bofficial description\b/gi, "structured listing description")
    .replace(/\bofficial requirements\b/gi, "application requirements")
    .replace(/\bofficial requirement\b/gi, "application requirement")
    .replace(/\bofficial details\b/gi, "structured details")
    .replace(/\bofficial detail\b/gi, "structured detail")
    .replace(/\bofficial listings\b/gi, "structured listing details")
    .replace(/\bofficial listing\b/gi, "structured listing detail")
    .replace(/\bofficial links\b/gi, "provider application paths")
    .replace(/\bofficial link\b/gi, "provider application path")
    .replace(/\bofficial sources\b/gi, "provider-path context")
    .replace(/\bofficial source\b/gi, "provider-path context")
    .replace(/\bsource pages\b/gi, "provider-path context")
    .replace(/\bsource page\b/gi, "provider-path context")
    .replace(/\bofficial websites\b/gi, "provider application paths")
    .replace(/\bofficial website\b/gi, "provider application path")
    .replace(/\bofficial sites\b/gi, "provider application paths")
    .replace(/\bofficial site\b/gi, "provider application path")
    .replace(/\bofficial pages\b/gi, "provider application paths")
    .replace(/\bofficial page\b/gi, "provider application path")
    .replace(/\bsponsor sites\b/gi, "provider application paths")
    .replace(/\bsponsor site\b/gi, "provider application path")
    .replace(/\bsponsor\b/gi, "provider")
    .replace(/\bprovider websites\b/gi, "provider application paths")
    .replace(/\bprovider website\b/gi, "provider application path")
    .replace(/\bprovider sites\b/gi, "provider application paths")
    .replace(/\bprovider site\b/gi, "provider application path")
    .replace(
      /\bfinal rules for international students in the USA can be compared with provider-path context in ScholarshipTop\b/gi,
      "eligibility signals for international students in the USA can be compared with provider-path context in ScholarshipTop",
    )
    .replace(/\bfinal rules\b/gi, "eligibility signals")
    .replace(
      /\brequirement details can change\b/gi,
      "ScholarshipTop organizes requirement details as part of application planning",
    )
    .replace(
      /\bdetails can change\b/gi,
      "ScholarshipTop organizes available details as part of application planning",
    )
    .replace(
      /\bcheck each scholarship's application requirements\b/gi,
      "compare each scholarship's application requirements in ScholarshipTop",
    )
    .replace(/\bconfirm fit\b/gi, "compare fit")
    .replace(/\bconfirming fit\b/gi, "comparing fit")
    .replace(/\bconfirm whether\b/gi, "understand whether")
    .replace(/\bconfirm who can apply\b/gi, "understand who can apply")
    .replace(/\bconfirm that international students are eligible\b/gi, "compare international-student eligibility signals")
    .replace(
      /\bconfirm what counts as need, who can apply, and what materials are required\b/gi,
      "understand need-based eligibility signals, audience fit, and required materials",
    )
    .replace(
      /\bprovider application paths are the place to confirm what is currently offered\b/gi,
      "ScholarshipTop organizes provider-path context so you can compare what is currently offered",
    )
    .replace(
      /\bprovider application paths are the place to understand need-based eligibility signals, audience fit, and required materials\b/gi,
      "ScholarshipTop organizes provider-path context so you can understand need-based eligibility signals, audience fit, and required materials",
    )
    .replace(
      /\bprovider application paths are the place to confirm the current terms\b/gi,
      "ScholarshipTop organizes provider-path context so you can plan around current terms",
    )
    .replace(
      /\bprovider application paths are the place to confirm\b/gi,
      "ScholarshipTop organizes provider-path context to compare",
    )
    .replace(
      /\bprovider application path is the place to confirm\b/gi,
      "ScholarshipTop organizes provider-path context to compare",
    )
    .replace(/\bsource named on that row\b/gi, "provider application path shown on that row")
    .replace(/\bprovider or school page\b/gi, "provider-path context in ScholarshipTop")
    .replace(
      /\brely on the catalog for discovery and the provider-path context for final confirmation\b/gi,
      "use ScholarshipTop to compare organized details and provider-path context for application planning",
    )
    .replace(/\bprovider-path context for final confirmation\b/gi, "provider-path context for application planning")
    .replace(/\bcatalog for discovery\b/gi, "ScholarshipTop workspace for comparison")
    .replace(/\bfinal confirmation\b/gi, "application planning")
    .replace(/\bconfirmed row by row\b/gi, "compared row by row in ScholarshipTop")
    .replace(/\bopening provider application paths to review current details\b/gi, "using provider-path context in ScholarshipTop to review current details")
    .replace(/\bopen provider application paths to review current details\b/gi, "use provider-path context in ScholarshipTop to review current details")
    .replace(/\bprovider application paths to review current details\b/gi, "provider-path context in ScholarshipTop for current details")
    .replace(/\bshould always be structured on the provider application path\b/gi, "can be planned with provider-path context in ScholarshipTop")
    .replace(/\bshould always be structured\b/gi, "can be planned")
    .replace(/\bconfirming\b/gi, "comparing")
    .replace(/\bconfirmed\b/gi, "compared")
    .replace(/\bconfirmation\b/gi, "application planning")
    .replace(/\bconfirm\b/gi, "compare")
    .replace(
      /\bapply after checking each provider application path\b/gi,
      "use the provider application path when you are ready to submit",
    )
    .replace(
      /\bafter checking each provider application path\b/gi,
      "with provider-path context in ScholarshipTop",
    )
    .replace(
      /\bchecking each provider application path\b/gi,
      "using provider-path context in ScholarshipTop",
    )
    .replace(/\bopen the provider-path context\b/gi, "review provider-path context in ScholarshipTop")
    .replace(
      /\bopen the provider application path to review current rules, materials, and whether the scholarship truly covers what you need\b/gi,
      "use ScholarshipTop to organize current rules, materials, coverage signals, and provider-path context",
    )
    .replace(
      /\bopen the provider application path to review current rules, materials, and submission details before you apply\b/gi,
      "use ScholarshipTop to organize current rules, materials, submission details, and provider-path context before you apply",
    )
    .replace(
      /\bprovider application paths are the place to review current details before you apply\b/gi,
      "ScholarshipTop organizes provider-path context so you can plan your next step before you apply",
    )
    .replace(
      /\breview what each scholarship actually includes on the provider-path context\b/gi,
      "review coverage signals and provider-path context in ScholarshipTop",
    )
    .replace(/\breview fit on the provider-path context\b/gi, "review fit and provider-path context in ScholarshipTop")
    .replace(
      /\breview details with the relevant provider\b/gi,
      "review details through the provider application path when you are ready to submit",
    )
    .replace(/\bverify every detail\b/gi, "review eligibility signals and provider-path context")
    .replace(/\bdouble-check every detail\b/gi, "review eligibility signals and provider-path context")
    .replace(/\balways verify\b/gi, "review")
    .replace(/\bindependently verify\b/gi, "review in your ScholarshipTop workspace")
    .replace(/\bafter verifying each listing\b/gi, "after reviewing organized details and provider-path context")
    .replace(/\bafter verifying eligibility and award terms\b/gi, "after reviewing eligibility signals and award details in ScholarshipTop")
    .replace(/\bwhile still verifying each row\b/gi, "while using ScholarshipTop to compare each row")
    .replace(/\bverifying each provider application path\b/gi, "reviewing provider-path context in ScholarshipTop")
    .replace(/\bverifying the latest terms on the provider application path\b/gi, "using structured provider-path context to plan your next step")
    .replace(/\bverification habits\b/gi, "application-readiness habits")
    .replace(/\bverification\b/gi, "application readiness")
    .replace(/\bverifying\b/gi, "reviewing")
    .replace(/\bverified\b/gi, "structured")
    .replace(
      /\bshould always be reviewed on the provider application path\b/gi,
      "can be compared with provider-path context in ScholarshipTop",
    )
    .replace(
      /\bThen review on the provider application path that\b/gi,
      "Then use provider-path context in ScholarshipTop to understand whether",
    )
    .replace(
      /\bThen verify on the provider application path that\b/gi,
      "Then use provider-path context in ScholarshipTop to understand whether",
    )
    .replace(
      /\bthen review on the provider application path that\b/gi,
      "then use provider-path context in ScholarshipTop to understand whether",
    )
    .replace(
      /\bthen verify on the provider application path that\b/gi,
      "then use provider-path context in ScholarshipTop to understand whether",
    )
    .replace(
      /\bthen apply fast after reviewing organized details and provider-path context\b/gi,
      "then prioritize urgent next steps with organized details and provider-path context",
    )
    .replace(
      /\beligibility signals for international students in the USA should always be structured on the provider application path\b/gi,
      "Use ScholarshipTop to compare eligibility signals for international students alongside provider-path context",
    )
    .replace(
      /\bAward amounts vary by listing and should be structured on each provider application path\b/gi,
      "ScholarshipTop structures award details by listing so you can prioritize urgent next steps",
    )
    .replace(
      /\breview dates early, review provider-path context in ScholarshipTop, and review the latest details before you apply\b/gi,
      "review dates early, use provider-path context in ScholarshipTop, and plan your next step before you apply",
    )
    .replace(
      /\bTreat this page as a catalog filter, not a guarantee that every row shares the same provider\b/gi,
      "Use this ScholarshipTop view as a focused comparison workspace",
    )
    .replace(
      /\bthat is only a guide and not a guarantee\b/gi,
      "ScholarshipTop keeps that signal as planning context",
    )
    .replace(/\brather than a guarantee\b/gi, "as part of your ScholarshipTop workspace")
    .replace(/\bnot a guarantee for every program\b/gi, "a planning signal for comparing programs")
    .replace(/\bnot a guarantee\b/gi, "a planning signal")
    .replace(/\bguarantee\b/gi, "planning signal")
    .replace(
      /\breview all (?:information|details) on the provider application paths?[^.]*\./gi,
      "use ScholarshipTop provider-path context to plan requirements, deadlines, and your next step.",
    )
    .replace(
      /\breview details on the provider application paths?[^.]*\./gi,
      "use ScholarshipTop provider-path context to plan requirements, deadlines, and your next step.",
    )
    .replace(
      /\breview details on provider application paths?[^.]*\./gi,
      "use ScholarshipTop provider-path context to plan requirements, deadlines, and your next step.",
    )
    .replace(
      /\bthen apply after reviewing organized details and provider-path context\b/gi,
      "then prioritize next application steps with organized details and provider-path context",
    )
    .replace(
      /\bthen apply after reviewing details on each structured listing detail\b/gi,
      "then continue toward provider application paths with organized details",
    )
    .replace(/\bverify\b/gi, "review")
    .replace(/\bcheck with\b/gi, "review with")
    .replace(/\bcheck the official\b/gi, "review the provider-path")
    .replace(/\bcheck official\b/gi, "review provider-path")
    .replace(/\bcheck the provider-path context\b/gi, "review provider-path context in ScholarshipTop")
    .replace(/\bcheck provider-path context\b/gi, "review provider-path context in ScholarshipTop")
    .replace(/\bcheck the provider application path\b/gi, "review the provider application path in ScholarshipTop")
    .replace(/\bcheck provider application path\b/gi, "review the provider application path in ScholarshipTop")
    .replace(/\bstarting point only\b/gi, "application workspace")
    .replace(/\btreat this as a starting point\b/gi, "use this as an organized ScholarshipTop workspace")
    .replace(/\bplace to start\b/gi, "organized place to plan")
    .replace(/\bstarting point\b/gi, "organized ScholarshipTop workspace")
    .replace(/\bUSA catalog\b/g, "USA workspace")
    .replace(/\bcatalog slice\b/gi, "ScholarshipTop workspace")
    .replace(/\bdirectory only\b/gi, "organized workspace")
    .replace(/\bdiscovery only\b/gi, "search and application planning workspace")
    .replace(/\bnot final authority\b/gi, "application-planning workspace")
    .replace(/\bnot official rules\b/gi, "structured eligibility signals")
    .replace(/\bnot an official scholarship provider\b/gi, "a scholarship search and application workspace")
    .replace(/\bscholarship provider\b/gi, "relevant provider")
    .replace(/\bprovider is responsible\b/gi, "the relevant provider makes final decisions")
    .replace(/\binformation may be outdated\b/gi, "ScholarshipTop highlights available details in a structured format")
    .replace(/\bterms may change\b/gi, "details can be planned from structured provider-path context")
    .replace(/\bdeadlines may change\b/gi, "deadline context is organized for planning")
    .replace(/\baward amounts may change\b/gi, "award details are organized for planning")
    .replace(/\buse at your own risk\b/gi, "use ScholarshipTop to compare and plan with more context");
}

function rewriteSeoDescription(text: string): string {
  let next = text;

  next = applyPhraseLevelRewrites(next);
  next = next.replace(
    /,\s*then apply through each official program page\.?/gi,
    ", then use provider application paths when you are ready to submit.",
  );
  next = next.replace(
    /\bcompare awards, deadlines, and requirements\b/gi,
    "compare organized eligibility signals, award details, deadlines, requirements, effort level, and application paths",
  );
  next = next.replace(
    /\bcheck official sources before applying\b/gi,
    "use ScholarshipTop to plan your next application step",
  );

  if (hasBadFraming(next)) {
    next = replaceBadSentences(next, "seo_description");
  }

  return normalizeSpacing(next);
}

function rewriteText(text: string, fieldPath: string): string {
  const cleaned = cleanupWorkspaceCopy(text);
  if (!hasBadFraming(cleaned)) {
    return cleaned;
  }

  let next =
    fieldPath === "seo_description"
      ? rewriteSeoDescription(cleaned)
      : fieldPath.includes("how_to_use")
        ? replaceBadSentences(cleaned, fieldPath)
      : applyPhraseLevelRewrites(cleaned);

  if (hasBadFraming(next)) {
    next = replaceBadSentences(next, fieldPath);
    next = applyPhraseLevelRewrites(next);
  }

  next = cleanupWorkspaceCopy(next);

  if (hasBadFraming(next)) {
    next = replacementForBadSentence(next, fieldPath);
  }

  return cleanupWorkspaceCopy(next);
}

function rewriteStringField(
  file: string,
  record: JsonRecord,
  key: string,
  changes: TextChange[],
) {
  const before = record[key];
  if (typeof before !== "string") {
    return;
  }
  const after = rewriteText(before, key);
  if (after !== before) {
    record[key] = after;
    changes.push({ file, path: key, before, after });
  }
}

function rewriteStringArray(
  file: string,
  record: JsonRecord,
  key: string,
  changes: TextChange[],
) {
  const value = record[key];
  if (!Array.isArray(value)) {
    return;
  }

  value.forEach((item, index) => {
    if (typeof item !== "string") {
      return;
    }

    const fieldPath = `${key}[${index}]`;
    const after = rewriteText(item, fieldPath);
    if (after !== item) {
      value[index] = after;
      changes.push({ file, path: fieldPath, before: item, after });
    }
  });
}

function rewriteFaq(file: string, record: JsonRecord, changes: TextChange[]) {
  const value = record.faq;
  if (!Array.isArray(value)) {
    return;
  }

  value.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") {
      return;
    }

    const faq = entry as JsonRecord;
    for (const key of ["question", "answer"]) {
      const before = faq[key];
      if (typeof before !== "string") {
        continue;
      }

      const fieldPath = `faq[${index}].${key}`;
      const after = rewriteText(before, fieldPath);
      if (after !== before) {
        faq[key] = after;
        changes.push({ file, path: fieldPath, before, after });
      }
    }
  });
}

function rewriteRecord(file: string, record: JsonRecord): TextChange[] {
  const changes: TextChange[] = [];

  for (const key of USER_TEXT_KEYS) {
    rewriteStringField(file, record, key, changes);
  }

  rewriteStringArray(file, record, "how_to_use", changes);
  rewriteStringArray(file, record, "who_for", changes);
  rewriteFaq(file, record, changes);

  return changes;
}

function readJson(file: string): JsonRecord {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8")) as JsonRecord;
}

function writeJson(file: string, data: JsonRecord) {
  fs.writeFileSync(path.join(DATA_DIR, file), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function listJsonFiles(): string[] {
  return fs
    .readdirSync(DATA_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort();
}

function selectSampleFiles(files: string[]): string[] {
  const requested = [
    "full-ride.json",
    "engineering.json",
    "african-american.json",
    "african-american__alaska.json",
    "african-american__california.json",
    "african-american__california__closing-soon.json",
    "computer-science__texas.json",
    "engineering__colorado.json",
    "financial-need__undergraduate__south-carolina.json",
    "closing-soon.json",
    "under-10000__florida.json",
    "ai-scholarship-matching-for-international-students.json",
    "can-international-students-apply-for-scholarships-usa.json",
    "engineering-scholarships-for-international-students-usa.json",
    "financial-need__engineering__michigan.json",
    "hispanic__illinois.json",
  ];
  const set = new Set(requested.filter((file) => files.includes(file)));

  for (const index of [42, 213, 587]) {
    if (files[index]) {
      set.add(files[index]);
    }
  }

  return [...set].sort();
}

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  const onlyArg = process.argv.find((arg) => arg.startsWith("--only="));

  return {
    write: args.has("--write"),
    sample: args.has("--sample"),
    only: onlyArg
      ? onlyArg
          .slice("--only=".length)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : null,
  };
}

function main() {
  const { write, sample, only } = parseArgs();
  const allFiles = listJsonFiles();
  const files = only
    ? only.filter((file) => allFiles.includes(file))
    : sample
      ? selectSampleFiles(allFiles)
      : allFiles;

  const beforeRaw = files
    .map((file) => fs.readFileSync(path.join(DATA_DIR, file), "utf8"))
    .join("\n");
  const beforeBadHits = countMatches(beforeRaw, BAD_PHRASE_RE);
  const beforeTargetHits = countMatches(beforeRaw, TARGET_VALIDATION_RE);
  const beforeSafetyHits = countMatches(beforeRaw, SAFETY_RE);

  const allChanges: TextChange[] = [];
  let filesChanged = 0;
  const simulatedAfterPayloads: string[] = [];

  for (const file of files) {
    const data = readJson(file);
    const changes = rewriteRecord(file, data);
    if (changes.length > 0) {
      filesChanged += 1;
      allChanges.push(...changes);
      if (write) {
        writeJson(file, data);
      }
    }
    simulatedAfterPayloads.push(JSON.stringify(data, null, 2));
  }

  const afterRaw = simulatedAfterPayloads.join("\n");
  const afterBadHits = countMatches(afterRaw, BAD_PHRASE_RE);
  const afterTargetHits = countMatches(afterRaw, TARGET_VALIDATION_RE);
  const afterSafetyHits = countMatches(afterRaw, SAFETY_RE);

  console.log("Stage 3 SEO scholarship content rewrite");
  console.log(`Mode: ${sample ? "sample" : "full"} ${write ? "write" : "dry-run"}`);
  console.log(`Files scanned: ${files.length}`);
  console.log(`Files changed: ${filesChanged}`);
  console.log(`Text fields changed: ${allChanges.length}`);
  console.log(`Broad bad phrase hits before: ${beforeBadHits}`);
  console.log(`Broad bad phrase hits after: ${afterBadHits}`);
  console.log(`Target validation hits before: ${beforeTargetHits}`);
  console.log(`Target validation hits after: ${afterTargetHits}`);
  console.log(`Safety hits before: ${beforeSafetyHits}`);
  console.log(`Safety hits after: ${afterSafetyHits}`);

  if (sample) {
    console.log("Sample files:");
    for (const file of files) {
      console.log(`- ${file}`);
    }
  }

  if (allChanges.length > 0) {
    console.log("First changes:");
    for (const change of allChanges.slice(0, 8)) {
      console.log(`- ${change.file} :: ${change.path}`);
      console.log(`  before: ${change.before.slice(0, 180).replace(/\s+/g, " ")}`);
      console.log(`  after:  ${change.after.slice(0, 180).replace(/\s+/g, " ")}`);
    }
  }
}

main();
