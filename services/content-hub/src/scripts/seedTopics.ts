import { supabase } from "../lib/supabase.js";

const topics = [
  "How to write a winning scholarship essay",
  "Best STEM scholarships for undergraduate students",
  "Scholarships for international students in the US",
  "Need-based vs merit-based scholarships",
  "Common scholarship application mistakes"
];

async function main() {
  const rows = topics.map((topic, index) => ({
    topic,
    priority: 100 + index,
    status: "queued"
  }));

  const { error } = await supabase.from("content_topics").insert(rows);

  if (error) throw error;
  console.log(`Seeded ${rows.length} topics`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
