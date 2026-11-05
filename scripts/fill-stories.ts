// Fills in the full story text from data/news-bodies.json: the key n01 is item n01 in
// data/seed/news.json, matched by its Indonesian title. A story that already has text is never changed,
// so it is safe to run again and it won't undo anything written in the editor.
//
//   npm run stories:fill              show what would happen, change nothing
//   npm run stories:fill -- --apply   do it
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const apply = process.argv.includes("--apply");
  const seed = JSON.parse(await readFile(resolve("data/seed/news.json"), "utf8")) as Record<string, { tId: string }>;
  const bodies = JSON.parse(await readFile(resolve("data/news-bodies.json"), "utf8")) as Record<string, { id: string; en: string }>;

  const pool = new Pool({ connectionString: url, max: 1 });
  let done = 0;
  try {
    for (const [key, body] of Object.entries(bodies)) {
      const title = seed[key]?.tId;
      const { rows } = await pool.query<{ id: string; body_id: string; body_en: string }>("select id, body_id, body_en from news where title_id = $1", [
        title ?? "",
      ]);
      if (rows.length !== 1) {
        console.log(`${key}: SKIPPED, ${rows.length} news items have the title "${title}"`);
      } else if (rows[0].body_id || rows[0].body_en) {
        console.log(`${key}: skipped, already has text`);
      } else if (apply) {
        await pool.query("update news set body_id = $1, body_en = $2, updated_at = now() where id = $3", [body.id, body.en, rows[0].id]);
        done++;
        console.log(`${key}: filled in`);
      } else console.log(`${key}: would fill in "${title}"`);
    }
    console.log(apply ? `Done. ${done} stories filled in.` : "Nothing changed. Add --apply to do it.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
