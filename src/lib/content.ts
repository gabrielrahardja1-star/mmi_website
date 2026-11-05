import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { gallery, jobs, news, pageCopy, videos } from "@/db/schema";
import type { Lang } from "@/lib/format";
import { makeCopy, type CopyDoc } from "@/lib/page-copy";
import type { SiteContent } from "@/lib/site-types";


// One published story from the id at the end of its address, or null.
export async function getPublicNews(idStart: string) {
  if (!/^[0-9a-f]{8}$/.test(idStart)) return null;
  const rows = await getDb()
    .select()
    .from(news)
    .where(and(eq(news.status, "pub"), sql`${news.id}::text like ${idStart + "%"}`))
    .limit(1);
  return rows[0] ?? null;
}

export const listPublicNews = () => getDb().select().from(news).where(eq(news.status, "pub")).orderBy(desc(news.date));

// What visitors see: only published / shown / open rows, and the live page copy.
export async function getPublicContent(lang: Lang): Promise<SiteContent> {
  const db = getDb();
  const [n, g, v, j, live] = await Promise.all([
    db.select().from(news).where(eq(news.status, "pub")).orderBy(desc(news.date)),
    db.select().from(gallery).where(eq(gallery.status, "show")).orderBy(desc(gallery.date)),
    db.select().from(videos).where(eq(videos.status, "show")).orderBy(desc(videos.date)),
    db.select().from(jobs).where(eq(jobs.status, "open")).orderBy(asc(jobs.sortOrder)),
    db.select().from(pageCopy).where(eq(pageCopy.version, "live")),
  ]);
  return { lang, news: n, gallery: g, videos: v, jobs: j, copy: makeCopy(live[0] as CopyDoc | undefined, lang) };
}
