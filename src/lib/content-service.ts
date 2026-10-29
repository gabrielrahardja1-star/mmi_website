import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { articles, gallery, jobs, media, news, pageCopy, videos } from "@/db/schema";
import { CONTENT_SCHEMAS, fieldErrors } from "@/lib/content-schemas";
import { TYPE_EN } from "@/lib/format";
import { removeMediaFiles } from "@/lib/media-store";
import { copyDiffers, pageCopyInput } from "@/lib/page-copy-schema";
import { checkWrite, type ContentType } from "@/lib/permissions";
import type { CopyDoc } from "@/lib/page-copy";
import type { CurrentUser } from "@/lib/session";

const TABLES = { news, articles, gallery, videos, jobs } as const;
// Every content table has id, status, updated_at and updated_by, so one typed handle serves them all.
const tableOf = (type: ContentType) => TABLES[type] as typeof news;

export type Fail = { ok: false; status: number; error: string; fields?: Record<string, string> };
export type Result<T> = { ok: true; value: T } | Fail;
const fail = (status: number, error: string, fields?: Record<string, string>): Fail => ({ ok: false, status, error, fields });

// ---------- photos ----------

// Deletes a photo (database row and files) once nothing uses it any more: no news cover, no gallery
// entry, and neither the draft nor the live page copy.
async function releaseMedia(id: string | null | undefined): Promise<void> {
  if (!id) return;
  const db = getDb();
  const [a, b, c] = await Promise.all([
    db.select({ id: news.id }).from(news).where(eq(news.coverImageId, id)).limit(1),
    db.select({ id: gallery.id }).from(gallery).where(eq(gallery.imageId, id)).limit(1),
    db.select({ v: pageCopy.version }).from(pageCopy).where(sql`${pageCopy.img}::text like ${"%" + id + "%"}`).limit(1),
  ]);
  if (a.length || b.length || c.length) return;
  await db.delete(media).where(eq(media.id, id));
  await removeMediaFiles(id);
}

async function mediaExists(id: string): Promise<boolean> {
  const rows = await getDb().select({ id: media.id }).from(media).where(eq(media.id, id)).limit(1);
  return rows.length > 0;
}

// ---------- content items ----------

const listNews = () => getDb().select().from(news).orderBy(desc(news.date), desc(news.updatedAt));
const listArticles = () =>
  getDb().select().from(articles).orderBy(sql`${articles.date} desc nulls last`, desc(articles.updatedAt));
const listGallery = () => getDb().select().from(gallery).orderBy(desc(gallery.date), desc(gallery.updatedAt));
const listVideos = () => getDb().select().from(videos).orderBy(desc(videos.date), desc(videos.updatedAt));
const listJobs = () => getDb().select().from(jobs).orderBy(asc(jobs.sortOrder));

export function listContent(type: ContentType) {
  switch (type) {
    case "news":
      return listNews();
    case "articles":
      return listArticles();
    case "gallery":
      return listGallery();
    case "videos":
      return listVideos();
    case "jobs":
      return listJobs();
  }
}

type Row = { id: string; status: string; coverImageId?: string | null; imageId?: string };

async function findRow(type: ContentType, id: string): Promise<Row | undefined> {
  const t = tableOf(type);
  const [row] = await getDb().select().from(t).where(eq(t.id, id)).limit(1);
  return row as Row | undefined;
}

// Validates the input for this type and shapes it into column values. Anything the server decides
// (derived English job type, the home-video rule) is applied here, not trusted from the client.
async function prepare(type: ContentType, input: unknown): Promise<Result<Record<string, unknown>>> {
  const parsed = CONTENT_SCHEMAS[type].safeParse(input);
  if (!parsed.success) return fail(400, "Periksa kolom yang ditandai.", fieldErrors(parsed.error));
  const values: Record<string, unknown> = { ...parsed.data };

  if (type === "jobs") values.typeEn = TYPE_EN[values.typeId as string];
  // Only a visible video can be the featured one. This also means contributors (who can't make
  // anything visible) can never take the home slot away from the live video.
  if (type === "videos") values.home = Boolean(values.home) && values.status === "show";

  const photoField = type === "news" ? "coverImageId" : type === "gallery" ? "imageId" : null;
  const photo = photoField ? (values[photoField] as string | null) : null;
  if (photoField && photo && !(await mediaExists(photo))) {
    return fail(400, "Periksa kolom yang ditandai.", { [photoField]: "Foto tidak ditemukan. Unggah ulang." });
  }
  return { ok: true, value: values };
}

export async function createContent(type: ContentType, input: unknown, user: CurrentUser): Promise<Result<unknown>> {
  const prepared = await prepare(type, input);
  if (!prepared.ok) return prepared;
  const values = prepared.value;

  const verdict = checkWrite(user.role, type, null, values.status as string);
  if (!verdict.ok) return fail(403, verdict.message);

  const db = getDb();
  const id = randomUUID();
  const audit = { updatedAt: new Date(), updatedBy: user.id };
  if (type === "jobs") {
    const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${jobs.sortOrder}), 0)` }).from(jobs);
    values.sortOrder = Number(max) + 1;
  }
  const t = tableOf(type);
  const row = await db.transaction(async (tx) => {
    if (type === "videos" && values.home) {
      await tx.update(videos).set({ home: false, ...audit }).where(eq(videos.home, true));
    }
    const [created] = await tx.insert(t).values({ id, ...values, ...audit } as typeof news.$inferInsert).returning();
    return created;
  });
  return { ok: true, value: row };
}

export async function updateContent(type: ContentType, id: string, input: unknown, user: CurrentUser): Promise<Result<unknown>> {
  const existing = await findRow(type, id);
  if (!existing) return fail(404, "Data tidak ditemukan.");

  const prepared = await prepare(type, input);
  if (!prepared.ok) return prepared;
  const values = prepared.value;

  const verdict = checkWrite(user.role, type, existing.status, values.status as string);
  if (!verdict.ok) return fail(403, verdict.message);

  const db = getDb();
  const audit = { updatedAt: new Date(), updatedBy: user.id };
  const t = tableOf(type);
  const row = await db.transaction(async (tx) => {
    if (type === "videos" && values.home) {
      await tx.update(videos).set({ home: false, ...audit }).where(and(eq(videos.home, true), ne(videos.id, id)));
    }
    const [updated] = await tx.update(t).set({ ...values, ...audit } as Partial<typeof news.$inferInsert>).where(eq(t.id, id)).returning();
    return updated;
  });

  // A replaced photo may now be unused.
  const oldPhoto = type === "news" ? existing.coverImageId : type === "gallery" ? existing.imageId : null;
  const newPhoto = type === "news" ? values.coverImageId : type === "gallery" ? values.imageId : null;
  if (oldPhoto && oldPhoto !== newPhoto) await releaseMedia(oldPhoto);
  return { ok: true, value: row };
}

export async function deleteContent(type: ContentType, id: string, user: CurrentUser): Promise<Result<null>> {
  const existing = await findRow(type, id);
  if (!existing) return fail(404, "Data tidak ditemukan.");
  const verdict = checkWrite(user.role, type, existing.status, null);
  if (!verdict.ok) return fail(403, verdict.message);

  const t = tableOf(type);
  await getDb().delete(t).where(eq(t.id, id));
  await releaseMedia(type === "news" ? existing.coverImageId : type === "gallery" ? existing.imageId : null);
  return { ok: true, value: null };
}

// ---------- page copy (static-page text and photos) ----------

type CopyRow = typeof pageCopy.$inferSelect;

async function copyRows(): Promise<{ draft: CopyRow; live: CopyRow }> {
  const db = getDb();
  await db.insert(pageCopy).values([{ version: "draft" }, { version: "live" }]).onConflictDoNothing();
  const rows = await db.select().from(pageCopy);
  return { draft: rows.find((r) => r.version === "draft")!, live: rows.find((r) => r.version === "live")! };
}

export async function getPageCopy() {
  const { draft, live } = await copyRows();
  return { draft, live, unpublished: copyDiffers(draft as CopyDoc, live as CopyDoc) };
}

// Replaces the draft with the editor's current document (autosave). Visitors are unaffected until Terbitkan.
export async function saveDraft(input: unknown, user: CurrentUser): Promise<Result<unknown>> {
  const parsed = pageCopyInput.safeParse(input);
  if (!parsed.success) return fail(400, "Teks atau foto tidak valid.", fieldErrors(parsed.error));
  const { draft } = await copyRows();

  const img = Object.fromEntries(Object.entries(parsed.data.img).filter(([, v]) => v)) as CopyDoc["img"];
  for (const id of Object.values(img)) {
    if (!(await mediaExists(id))) return fail(400, "Foto tidak ditemukan. Unggah ulang.");
  }
  const [row] = await getDb()
    .update(pageCopy)
    .set({ text: parsed.data.text, img, updatedAt: new Date(), updatedBy: user.id })
    .where(eq(pageCopy.version, "draft"))
    .returning();

  for (const old of Object.values(draft.img)) if (old && !Object.values(img).includes(old)) await releaseMedia(old);
  return { ok: true, value: { draft: row } };
}

// Terbitkan: copies the draft to live. This is the only way page text and photos reach visitors.
export async function publishDraft(user: CurrentUser): Promise<Result<unknown>> {
  const { draft, live } = await copyRows();
  const now = new Date();
  const [row] = await getDb()
    .update(pageCopy)
    .set({ text: draft.text, img: draft.img, publishedAt: now, updatedAt: now, updatedBy: user.id })
    .where(eq(pageCopy.version, "live"))
    .returning();
  for (const old of Object.values(live.img)) if (old && !Object.values(draft.img).includes(old)) await releaseMedia(old);
  return { ok: true, value: { live: row, unpublished: false } };
}

// Everything the editor needs on first load: every row (drafts included) and both copy documents.
export async function getEditorSnapshot() {
  const [n, a, g, v, j, copy] = await Promise.all([
    listNews(),
    listArticles(),
    listGallery(),
    listVideos(),
    listJobs(),
    getPageCopy(),
  ]);
  return {
    content: { news: n, articles: a, gallery: g, videos: v, jobs: j },
    draft: { text: copy.draft.text, img: copy.draft.img } as CopyDoc,
    live: { text: copy.live.text, img: copy.live.img } as CopyDoc,
  };
}
