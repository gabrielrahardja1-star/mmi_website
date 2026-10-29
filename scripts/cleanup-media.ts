// Removes photos nobody uses: uploaded but never attached to a news cover, a gallery entry or a page
// photo slot, and older than 24 hours (so an upload someone is in the middle of is never touched).
// Also removes leftover upload folders that have no database record.
//
//   npm run media:cleanup -- --dry-run      show what would be removed
//   npm run media:cleanup                   remove it
//   npm run media:cleanup -- --older-than-hours 72
import { readdir, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Pool } from "pg";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const root = resolve(process.env.UPLOAD_DIR ?? "./uploads");
  const dry = process.argv.includes("--dry-run");
  const hours = Number(arg("older-than-hours") ?? 24);
  if (!Number.isFinite(hours) || hours < 1) throw new Error("--older-than-hours must be a number of at least 1");

  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    const { rows } = await pool.query<{ id: string }>(
      `select m.id from media m
        where m.created_at < now() - make_interval(hours => $1)
          and not exists (select 1 from news n where n.cover_image_id = m.id)
          and not exists (select 1 from gallery g where g.image_id = m.id)
          and not exists (select 1 from page_copy p where p.img::text like '%' || m.id::text || '%')`,
      [hours],
    );
    for (const { id } of rows) {
      console.log(`${dry ? "would remove" : "removing"} unused photo ${id}`);
      if (!dry) {
        await pool.query("delete from media where id = $1", [id]);
        await rm(join(root, id), { recursive: true, force: true });
      }
    }

    // Folders on disk with no media row (for example from a save that failed half way).
    let strays = 0;
    const known = new Set((await pool.query<{ id: string }>("select id from media")).rows.map((r) => r.id));
    for (const name of await readdir(root).catch(() => [] as string[])) {
      if (!UUID_RE.test(name) || known.has(name)) continue;
      const age = Date.now() - (await stat(join(root, name))).mtimeMs;
      if (age < hours * 3600_000) continue;
      strays++;
      console.log(`${dry ? "would remove" : "removing"} leftover folder ${name}`);
      if (!dry) await rm(join(root, name), { recursive: true, force: true });
    }
    console.log(`${dry ? "Dry run: " : ""}${rows.length} unused photo(s), ${strays} leftover folder(s).`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
