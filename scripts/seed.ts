// Loads the starter content from data/seed/*.json. Only fills tables that are still empty, so it is
// safe to run again after editors have started working: it never overwrites their content.
// The seed jobs are placeholders ("(contoh)"). Replace or close them before launch.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { count } from "drizzle-orm";
import { Pool } from "pg";
import { articles, jobs, news, pageCopy } from "../src/db/schema";

type SeedNews = { cat: string; date: string; tId: string; tEn: string; sId: string; sEn: string; status: string };
type SeedArticle = { src: string; url: string; date: string; title: string; sumId: string; sumEn: string; status: string };
type SeedJob = { tId: string; tEn: string; loc: string; typeId: string; typeEn: string; url: string; status: string; order: number };

function load<T>(file: string): T[] {
  const raw = JSON.parse(readFileSync(resolve("data/seed", file), "utf8")) as Record<string, T>;
  return Object.values(raw);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString: url, max: 1 });
  const db = drizzle(pool);

  try {
    const [n] = await db.select({ c: count() }).from(news);
    if (n.c === 0) {
      await db.insert(news).values(
        load<SeedNews>("news.json").map((r) => ({
          cat: r.cat,
          date: r.date,
          titleId: r.tId,
          titleEn: r.tEn,
          summaryId: r.sId,
          summaryEn: r.sEn,
          status: r.status,
        })),
      );
      console.log("news: seeded");
    } else console.log("news: already has rows, skipped");

    const [a] = await db.select({ c: count() }).from(articles);
    if (a.c === 0) {
      await db.insert(articles).values(
        load<SeedArticle>("articles.json").map((r) => ({
          source: r.src,
          url: r.url,
          date: r.date || null, // the ShalokalIndonesia article has no date yet
          title: r.title,
          summaryId: r.sumId,
          summaryEn: r.sumEn,
          status: r.status,
        })),
      );
      console.log("articles: seeded");
    } else console.log("articles: already has rows, skipped");

    const [j] = await db.select({ c: count() }).from(jobs);
    if (j.c === 0) {
      await db.insert(jobs).values(
        load<SeedJob>("jobs.json").map((r) => ({
          titleId: r.tId,
          titleEn: r.tEn,
          location: r.loc,
          typeId: r.typeId,
          typeEn: r.typeEn,
          url: r.url,
          sortOrder: r.order,
          status: r.status,
        })),
      );
      console.log("jobs: seeded (PLACEHOLDERS, replace before launch)");
    } else console.log("jobs: already has rows, skipped");

    // Empty copy means every text and photo slot uses the defaults in data/page-copy-defaults.json.
    await db
      .insert(pageCopy)
      .values([{ version: "draft" }, { version: "live" }])
      .onConflictDoNothing();
    console.log("page_copy: draft and live rows ensured");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
