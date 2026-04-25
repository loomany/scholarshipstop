export type ArticleType = "list" | "guide" | "strategy" | "comparison" | "niche" | "deep_dive";
export type IntroStyle = "problem" | "question" | "statistic" | "story" | "direct";
export type ImageStyle = "realistic" | "editorial";
export type SceneId = "people" | "documents" | "laptop_workspace" | "campus" | "letters" | "deadlines" | "finance";

export interface SceneDefinition {
  id: SceneId;
  promptTokens: string[];
  exclusions?: string[];
  compositionHints?: string[];
}

export interface SelectedScene {
  id: SceneId;
  prompt: string;
  exclusions: string[];
  compositionHints: string[];
}

export interface CompositionVariant {
  id: "close_up" | "medium_shot" | "wide_shot" | "top_down" | "over_shoulder" | "side_angle";
  angle: string;
  distance: string;
  perspective: string;
}

const ARTICLE_TYPES: ArticleType[] = ["list", "guide", "strategy", "comparison", "niche", "deep_dive"];
const INTRO_STYLES: IntroStyle[] = ["problem", "question", "statistic", "story", "direct"];
const IMAGE_STYLES: ImageStyle[] = ["realistic", "editorial"];
const SCENE_LIBRARY: SceneDefinition[] = [
  {
    id: "people",
    promptTokens: [
      "student reviewing scholarship options with advisor in campus office",
      "candidate discussing financial aid steps with counselor at admissions desk",
      "learner preparing application checklist at a library table"
    ],
    compositionHints: ["medium_shot", "over_shoulder"]
  },
  {
    id: "documents",
    promptTokens: [
      "scholarship application forms, transcripts, and notes neatly arranged on a desk",
      "close view of official scholarship paperwork with highlighted eligibility sections",
      "application documents and supporting records prepared for submission"
    ],
    exclusions: ["no people"],
    compositionHints: ["top_down", "close_up"]
  },
  {
    id: "laptop_workspace",
    promptTokens: [
      "laptop workspace open to scholarship search tools with notes and planner",
      "organized desk with laptop, budget sheet, and scholarship deadline reminders",
      "home study workspace focused on online financial aid application process"
    ],
    exclusions: ["no visible faces"],
    compositionHints: ["top_down", "side_angle"]
  },
  {
    id: "campus",
    promptTokens: [
      "university campus walkway and admissions building with informational signage",
      "quiet campus courtyard near financial aid office",
      "college administrative area prepared for scholarship season"
    ],
    exclusions: ["no central human subject"],
    compositionHints: ["wide_shot", "side_angle"]
  },
  {
    id: "letters",
    promptTokens: [
      "acceptance and rejection letters from scholarship committees on study desk",
      "official envelope and decision letter beside application notes",
      "scholarship decision paperwork with emphasized result section"
    ],
    exclusions: ["no people"],
    compositionHints: ["close_up", "top_down"]
  },
  {
    id: "deadlines",
    promptTokens: [
      "calendar marked with scholarship deadlines and reminders",
      "monthly planner with highlighted application cutoff dates",
      "deadline tracking board for scholarship submissions and follow-ups"
    ],
    exclusions: ["no people"],
    compositionHints: ["top_down", "close_up"]
  },
  {
    id: "finance",
    promptTokens: [
      "tuition statement, aid award summary, and calculator on desk",
      "financial planning layout with cost breakdown and grant estimates",
      "education funding worksheet with scholarship amount scenarios"
    ],
    exclusions: ["no people"],
    compositionHints: ["top_down", "medium_shot"]
  }
];

const COMPOSITION_LIBRARY: CompositionVariant[] = [
  { id: "close_up", angle: "close-up", distance: "tight framing", perspective: "detail-focused perspective" },
  { id: "medium_shot", angle: "medium shot", distance: "eye-level distance", perspective: "balanced perspective" },
  { id: "wide_shot", angle: "wide shot", distance: "environment-focused distance", perspective: "context-first perspective" },
  { id: "top_down", angle: "top-down angle", distance: "tabletop distance", perspective: "overhead perspective" },
  { id: "over_shoulder", angle: "over-the-shoulder angle", distance: "conversational distance", perspective: "observer perspective" },
  { id: "side_angle", angle: "side angle", distance: "mid-range distance", perspective: "lateral perspective" }
];

const SCENE_KEYWORDS: Array<{ scene: SceneId; patterns: RegExp[] }> = [
  { scene: "deadlines", patterns: [/\bdeadline\b/, /\bdue date\b/, /\bcalendar\b/, /\btimeline\b/, /\bapply by\b/] },
  { scene: "letters", patterns: [/\bacceptance\b/, /\brejection\b/, /\bdecision letter\b/, /\benvelope\b/, /\baward letter\b/] },
  { scene: "documents", patterns: [/\bdocument\b/, /\bpaperwork\b/, /\btranscript\b/, /\bessay\b/, /\bapplication form\b/] },
  { scene: "laptop_workspace", patterns: [/\blaptop\b/, /\bonline\b/, /\bportal\b/, /\bworkspace\b/, /\bsearch\b/] },
  { scene: "finance", patterns: [/\btuition\b/, /\bfinancial aid\b/, /\bgrant\b/, /\bcost\b/, /\bbudget\b/, /\bfunding\b/] },
  { scene: "campus", patterns: [/\bcampus\b/, /\buniversity\b/, /\bcollege\b/, /\badmissions\b/, /\bon campus\b/] },
  { scene: "people", patterns: [/\bstudent\b/, /\bscholar\b/, /\bapplicant\b/, /\bmentor\b/, /\bcounselor\b/] }
];

function weightedPick<T extends string>(items: Array<{ value: T; weight: number }>): T {
  const total = items.reduce((acc, item) => acc + item.weight, 0);
  let random = Math.random() * total;
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

export function pickArticleType(topic: string): ArticleType {
  const normalized = topic.toLowerCase();

  if (/top\b|best\b|list\b/.test(normalized)) return "list";
  if (/how to\b|step by step\b|apply\b/.test(normalized)) return "guide";
  if (/tips?\b|mistakes?\b|strategy\b/.test(normalized)) return "strategy";
  if (/\bvs\b|versus\b|compare|comparison/.test(normalized)) return "comparison";
  if (/for women|for low income|for international|for first generation|for veterans/.test(normalized)) return "niche";
  if (/what is\b|how .* works|explained/.test(normalized)) return "deep_dive";

  return weightedPick<ArticleType>([
    { value: "guide", weight: 24 },
    { value: "strategy", weight: 20 },
    { value: "list", weight: 18 },
    { value: "deep_dive", weight: 14 },
    { value: "comparison", weight: 12 },
    { value: "niche", weight: 12 }
  ]);
}

export function pickIntroStyle(): IntroStyle {
  return INTRO_STYLES[Math.floor(Math.random() * INTRO_STYLES.length)];
}

export function shuffleSections(sections: string[]): string[] {
  const copy = [...sections];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

export function pickImageStyle(topic: string, articleType: ArticleType): ImageStyle {
  void topic;
  void articleType;
  return "realistic";
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function selectScene(params: {
  topic: string;
  articleType: ArticleType;
  imageBrief?: string;
  recentScenes?: SceneId[];
  avoidSceneIds?: SceneId[];
}): SelectedScene {
  const text = `${params.topic} ${params.imageBrief ?? ""}`.toLowerCase();
  void params.articleType;
  const avoid = new Set(params.avoidSceneIds ?? []);
  const recent = params.recentScenes ?? [];
  const streakScene = recent.length >= 3 && recent[recent.length - 1] === recent[recent.length - 2]
    ? recent[recent.length - 1]
    : null;

  const scored = SCENE_LIBRARY
    .map((scene) => {
      const keywordScore = SCENE_KEYWORDS
        .filter((entry) => entry.scene === scene.id)
        .flatMap((entry) => entry.patterns)
        .reduce((acc, pattern) => (pattern.test(text) ? acc + 1 : acc), 0);
      return { scene, keywordScore };
    })
    .sort((a, b) => b.keywordScore - a.keywordScore);

  let selected = scored.find((entry) => entry.keywordScore > 0 && !avoid.has(entry.scene.id))?.scene;

  if (!selected) {
    const candidates = SCENE_LIBRARY.filter((scene) => !avoid.has(scene.id));
    selected = pickRandom(candidates.length > 0 ? candidates : SCENE_LIBRARY);
  }

  if (streakScene && selected.id === streakScene) {
    const alternatives = SCENE_LIBRARY.filter((scene) => scene.id !== streakScene && !avoid.has(scene.id));
    if (alternatives.length > 0) {
      selected = pickRandom(alternatives);
    }
  }

  return {
    id: selected.id,
    prompt: pickRandom(selected.promptTokens),
    exclusions: selected.exclusions ?? [],
    compositionHints: selected.compositionHints ?? []
  };
}

export function pickCompositionVariant(scene: SelectedScene): CompositionVariant {
  const hinted = scene.compositionHints
    .map((hint) => COMPOSITION_LIBRARY.find((item) => item.id === hint))
    .filter((item): item is CompositionVariant => Boolean(item));
  const pool = hinted.length > 0 ? hinted : COMPOSITION_LIBRARY;
  return pickRandom(pool);
}

function tokenizePrompt(prompt: string): Set<string> {
  return new Set(
    prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 4)
  );
}

export function isImagePromptTooSimilar(nextPrompt: string, lastPrompts: string[]): boolean {
  const nextTokens = tokenizePrompt(nextPrompt);
  if (nextTokens.size === 0) return false;

  return lastPrompts.some((existingPrompt) => {
    const existingTokens = tokenizePrompt(existingPrompt);
    if (existingTokens.size === 0) return false;
    let overlap = 0;
    for (const token of nextTokens) {
      if (existingTokens.has(token)) overlap += 1;
    }
    const jaccard = overlap / (nextTokens.size + existingTokens.size - overlap);
    return jaccard >= 0.55;
  });
}

export function pickAlternativeImageStyle(current: ImageStyle): ImageStyle {
  const candidates = IMAGE_STYLES.filter((style) => style !== current);
  return candidates[Math.floor(Math.random() * candidates.length)];
}
