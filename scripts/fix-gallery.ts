// One-off gallery tidy-up (November 2026): fills empty captions, swaps the date-stamped fire extinguisher
// photo for a clean crop, and hides the low-quality planting photo, adding a replacement so the
// 7-photo grid has no gap. Rows are found by their photo's id. Captions that are already filled in are
// left alone, so it is safe to run again.
//
//   npm run gallery:fix              show what would happen, change nothing
//   npm run gallery:fix -- --apply   do it
import { randomUUID } from "node:crypto";
import { chown, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Pool } from "pg";
import { processImage } from "../src/lib/image-process";

const APP_UID = 1000; // the app container's user. The tools container runs as root.
const FIRE = "151f0887";
const PLANTING = "e55ee27e";
const REPLACEMENT = "gallery-air-quality.jpg";
const CAPTIONS: Record<string, [string, string]> = {
  "60598590": ["Upacara bendera HUT ke-81 Kemerdekaan RI di lokasi tambang.", "Flag ceremony for Indonesia's 81st Independence Day at the mine site."],
  [FIRE]: ["Praktik penggunaan alat pemadam api ringan saat pelatihan keselamatan.", "Hands-on fire extinguisher practice during safety training."],
  "12935738": ["Dukungan logistik untuk tim siaga karhutla di Kalimantan Selatan.", "Logistics support for the forest and land fire response team in South Kalimantan."],
  df135504: ["Foto bersama peserta Program Pemberdayaan Masyarakat MMI.", "Group photo with participants in MMI's community empowerment program."],
  fc56b64a: ["Pengambilan sampel air untuk pemantauan lingkungan rutin.", "Collecting a water sample for routine environmental monitoring."],
  "48fef592": ["Para siswa berfoto bersama dalam program rehabilitasi madrasah.", "Students together during the madrasah renovation program."],
};

type Row = { id: string; image_id: string; caption_id: string; caption_en: string; date: string; status: string };

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const root = resolve(process.env.UPLOAD_DIR ?? "./uploads");
  const apply = process.argv.includes("--apply");
  const pool = new Pool({ connectionString: url, max: 1 });

  // Same processing as an editor upload. Returns the new photo's id.
  async function savePhoto(path: string, name: string): Promise<string> {
    const variants = await processImage(await readFile(path));
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
        name,
        largest.width,
        largest.height,
        largest.data.length,
      ]);
      return id;
    } catch (err) {
      await rm(dir, { recursive: true, force: true });
      throw err;
    }
  }

  const find = async (prefix: string) =>
    (await pool.query<Row>("select id, image_id, caption_id, caption_en, date::text as date, status from gallery where image_id::text like $1", [prefix + "%"])).rows;

  try {
    const { rows: shown } = await pool.query("select id from gallery where status = 'show'");
    console.log(`${shown.length} photos are visible now.`);

    for (const [prefix, [id, en]] of Object.entries(CAPTIONS)) {
      const rows = await find(prefix);
      if (rows.length !== 1) {
        console.log(`${prefix}: not found, skipped`);
        continue;
      }
      if (rows[0].caption_id || rows[0].caption_en) {
        console.log(`${prefix}: already has a caption, skipped: "${rows[0].caption_id || rows[0].caption_en}"`);
        continue;
      }
      console.log(`${prefix}: ${apply ? "captioned" : "would caption"}: "${id}"`);
      if (apply) await pool.query("update gallery set caption_id = $1, caption_en = $2, updated_at = now() where id = $3", [id, en, rows[0].id]);
    }

    const [fire] = await find(FIRE);
    if (fire) {
      console.log(`${FIRE}: ${apply ? "swapped" : "would swap"} the stamped photo for the clean crop`);
      if (apply) {
        const image = await savePhoto(resolve("data/covers/n06-cover.jpg"), "gallery-fire-extinguisher.jpg");
        await pool.query("update gallery set image_id = $1, updated_at = now() where id = $2", [image, fire.id]);
      }
    } else console.log(`${FIRE}: already swapped or not found, skipped`);

    const [planting] = await find(PLANTING);
    if (planting?.status === "show") {
      console.log(`${PLANTING}: ${apply ? "hidden" : "would hide"}, and ${apply ? "added" : "would add"} the air quality photo`);
      if (apply) {
        const image = await savePhoto(resolve("data/gallery/air-quality.jpg"), REPLACEMENT);
        await pool.query("insert into gallery (image_id, caption_id, caption_en, date, status) values ($1, $2, $3, $4, 'show')", [
          image,
          "Pemantauan kualitas udara sebagai bagian dari pengujian lingkungan rutin.",
          "Air quality monitoring as part of routine environmental testing.",
          planting.date,
        ]);
        await pool.query("update gallery set status = 'hidden', updated_at = now() where id = $1", [planting.id]);
      }
    } else console.log(`${PLANTING}: already hidden or not found, skipped`);

    console.log(apply ? "Done." : "Nothing changed. Add --apply to do it.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
