// Attaches the photos in data/covers to their news items: n01-cover.jpg goes on item n01 in
// data/seed/news.json, matched by its Indonesian title. Photos go through the same processing as an
// editor upload. An item that already has a cover is never changed, so it is safe to run again.
//
//   npm run covers:import              show what would happen, change nothing
//   npm run covers:import -- --apply   do it
import { randomUUID } from "node:crypto";
import { chown, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Pool } from "pg";
import { processImage } from "../src/lib/image-process";

const COVERS = resolve("data/covers");
const APP_UID = 1000; // the app container's user. The tools container runs as root.

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const root = resolve(process.env.UPLOAD_DIR ?? "./uploads");
  const apply = process.argv.includes("--apply");
  const seed = JSON.parse(await readFile(resolve("data/seed/news.json"), "utf8")) as Record<string, { tId: string }>;

  const pool = new Pool({ connectionString: url, max: 1 });
  let done = 0;
  try {
    for (const file of (await readdir(COVERS)).filter((f) => f.endsWith("-cover.jpg")).sort()) {
      const key = file.replace("-cover.jpg", "");
      const title = seed[key]?.tId;
      const { rows } = await pool.query<{ id: string; cover_image_id: string | null }>(
        "select id, cover_image_id from news where title_id = $1",
        [title ?? ""],
      );
      if (rows.length !== 1) {
        console.log(`${key}: SKIPPED, ${rows.length} news items have the title "${title}"`);
        continue;
      }
      if (rows[0].cover_image_id) {
        console.log(`${key}: skipped, already has a cover`);
        continue;
      }
      if (!apply) {
        console.log(`${key}: would attach ${file} to "${title}"`);
        continue;
      }

      const variants = await processImage(await readFile(join(COVERS, file)));
      const id = randomUUID();
      const dir = join(root, id);
      await mkdir(dir, { recursive: true });
      try {
        for (const v of variants) await writeFile(join(dir, `${v.size}.webp`), v.data);
        if (process.getuid?.() === 0) {
          await chown(dir, APP_UID, APP_UID);
          for (const v of variants) await chown(join(dir, `${v.size}.webp`), APP_UID, APP_UID);
        }
        const largest = variants[variants.length - 1];
        await pool.query("insert into media (id, original_name, mime, width, height, bytes) values ($1, $2, 'image/webp', $3, $4, $5)", [
          id,
          file,
          largest.width,
          largest.height,
          largest.data.length,
        ]);
        await pool.query("update news set cover_image_id = $1, updated_at = now() where id = $2 and cover_image_id is null", [id, rows[0].id]);
      } catch (err) {
        await rm(dir, { recursive: true, force: true });
        throw err;
      }
      done++;
      console.log(`${key}: attached ${file}`);
    }
    console.log(apply ? `Done. ${done} cover(s) attached.` : "Nothing changed. Add --apply to do it.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
