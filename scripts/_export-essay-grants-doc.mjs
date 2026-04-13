import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const cats = [
  "education",
  "miscellaneous",
  "arts",
  "stem",
  "community",
  "law",
  "humanities",
  "medical",
  "disability",
  "safety"
];

const sel =
  "title,category_slug,description,summary_short,requirements_text_clean,requirements_text,selection_criteria_text";

let from = 0;
const size = 500;
const all = [];

while (true) {
  const u = new URL(url + "/rest/v1/scholarships");
  u.searchParams.set("select", sel);
  u.searchParams.set("essay_required", "eq.true");
  u.searchParams.set("category_slug", `in.(${cats.map((c) => `"${c}"`).join(",")})`);
  u.searchParams.set("order", "category_slug.asc,title.asc");
  const res = await fetch(u, {
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      Accept: "application/json",
      Range: `${from}-${from + size - 1}`
    }
  });
  if (!res.ok) {
    console.error(res.status, await res.text());
    process.exit(1);
  }
  const chunk = await res.json();
  all.push(...chunk);
  if (chunk.length < size) break;
  from += size;
}

function clean(t) {
  if (t == null) return "";
  return String(t).replace(/\r/g, "").trim();
}

const out = path.join(__dirname, "..", "essay-grants-full-list.md");
let md = "# Grants with essay requirement (all listed categories)\n\n";
md += `Total: **${all.length}**. Source: Supabase, \`essay_required=true\`, categories: ${cats.join(", ")}.\n\n`;
md +=
  "Description uses `description`, or if empty `summary_short`. Essay prompt/topic uses `requirements_text_clean`, then `requirements_text`, then `selection_criteria_text`. If empty, verify on the official program page.\n\n";
md += "---\n\n";

for (const r of all) {
  const desc = clean(r.description) || clean(r.summary_short) || "(no description in data)";
  let topic =
    clean(r.requirements_text_clean) ||
    clean(r.requirements_text) ||
    clean(r.selection_criteria_text) ||
    "(no explicit essay topic in catalog — check official rules)";
  if (topic.length > 12000) topic = topic.slice(0, 12000) + "\n\n… [truncated]";
  md += `## ${clean(r.title) || "Untitled"}\n\n`;
  md += `**Category:** \`${clean(r.category_slug)}\`\n\n`;
  md += `### Description\n\n${desc}\n\n`;
  md += `### Essay topic / prompt (from catalog)\n\n${topic}\n\n`;
  md += "---\n\n";
}

fs.writeFileSync(out, md, "utf8");
console.log("Wrote", out, "size", fs.statSync(out).size);
