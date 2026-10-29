import { asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { articles, gallery, jobs, news, pageCopy, videos } from "@/db/schema";
import type { Lang, ViewLang } from "@/lib/format";
import { makeCopy, type Copy, type CopyDoc } from "@/lib/page-copy";

export type NewsRow = typeof news.$inferSelect;
export type ArticleRow = typeof articles.$inferSelect;
export type GalleryRow = typeof gallery.$inferSelect;
export type VideoRow = typeof videos.$inferSelect;
export type JobRow = typeof jobs.$inferSelect;

export type SiteContent = {
  lang: ViewLang;
  news: NewsRow[];
  articles: ArticleRow[];
  gallery: GalleryRow[];
  videos: VideoRow[];
  jobs: JobRow[];
  copy: Copy;
};

// What visitors see: only published / shown / open rows, and the live page copy.
export async function getPublicContent(lang: Lang): Promise<SiteContent> {
  const db = getDb();
  const [n, a, g, v, j, live] = await Promise.all([
    db.select().from(news).where(eq(news.status, "pub")).orderBy(desc(news.date)),
    // Undated articles sort last (Postgres puts NULLs first on DESC).
    db.select().from(articles).where(eq(articles.status, "pub")).orderBy(sql`${articles.date} desc nulls last`),
    db.select().from(gallery).where(eq(gallery.status, "show")).orderBy(desc(gallery.date)),
    db.select().from(videos).where(eq(videos.status, "show")).orderBy(desc(videos.date)),
    db.select().from(jobs).where(eq(jobs.status, "open")).orderBy(asc(jobs.sortOrder)),
    db.select().from(pageCopy).where(eq(pageCopy.version, "live")),
  ]);
  return { lang, news: n, articles: a, gallery: g, videos: v, jobs: j, copy: makeCopy(live[0] as CopyDoc | undefined, lang) };
}
