import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// Every content row records who last changed it and when.
const audit = {
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
};

// Text fields are _id / _en pairs. Empty _en means "show the Indonesian text".

export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  originalName: text("original_name").notNull(),
  mime: text("mime").notNull(), // type of the stored file after processing (image/webp)
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  bytes: integer("bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
});

export const news = pgTable(
  "news",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cat: text("cat").notNull(), // com | env | safe | event
    date: date("date", { mode: "string" }).notNull(),
    titleId: text("title_id").notNull(),
    titleEn: text("title_en").notNull().default(""),
    summaryId: text("summary_id").notNull().default(""),
    summaryEn: text("summary_en").notNull().default(""),
    coverImageId: uuid("cover_image_id").references(() => media.id, { onDelete: "set null" }),
    status: text("status").notNull().default("draft"), // draft | pub
    ...audit,
  },
  (t) => [
    check("news_cat_chk", sql`${t.cat} in ('com','env','safe','event')`),
    check("news_status_chk", sql`${t.status} in ('draft','pub')`),
    index("news_status_date_idx").on(t.status, t.date),
  ],
);

// External press coverage: headline and our own summary only, never article text.
export const articles = pgTable(
  "articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: text("source").notNull(),
    url: text("url").notNull(),
    date: date("date", { mode: "string" }), // optional
    title: text("title").notNull(), // original headline, not translated
    summaryId: text("summary_id").notNull().default(""),
    summaryEn: text("summary_en").notNull().default(""),
    status: text("status").notNull().default("draft"), // draft | pub
    ...audit,
  },
  (t) => [
    check("articles_status_chk", sql`${t.status} in ('draft','pub')`),
    check("articles_url_chk", sql`${t.url} like 'https://%'`),
  ],
);

export const gallery = pgTable(
  "gallery",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    imageId: uuid("image_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    captionId: text("caption_id").notNull().default(""), // also used as alt text
    captionEn: text("caption_en").notNull().default(""),
    date: date("date", { mode: "string" }).notNull(),
    status: text("status").notNull().default("show"), // show | hidden
    ...audit,
  },
  (t) => [check("gallery_status_chk", sql`${t.status} in ('show','hidden')`)],
);

export const videos = pgTable(
  "videos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    url: text("url").notNull(), // YouTube only
    titleId: text("title_id").notNull(),
    titleEn: text("title_en").notNull().default(""),
    date: date("date", { mode: "string" }).notNull(),
    home: boolean("home").notNull().default(false), // featured on the home page
    status: text("status").notNull().default("show"), // show | hidden
    ...audit,
  },
  (t) => [
    check("videos_status_chk", sql`${t.status} in ('show','hidden')`),
    // At most one video can be featured on the home page.
    uniqueIndex("videos_one_home_idx").on(t.home).where(sql`${t.home}`),
  ],
);

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    titleId: text("title_id").notNull(),
    titleEn: text("title_en").notNull().default(""),
    location: text("location").notNull(),
    typeId: text("type_id").notNull(), // Penuh waktu | Kontrak | Magang
    typeEn: text("type_en").notNull(), // derived: Full-time | Contract | Internship
    url: text("url").notNull(), // JobStreet listing
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status").notNull().default("open"), // open | closed
    ...audit,
  },
  (t) => [
    check("jobs_status_chk", sql`${t.status} in ('open','closed')`),
    check("jobs_url_chk", sql`${t.url} like 'https://%'`),
  ],
);

export type PageCopyText = Record<string, { id: string; en: string }>;
export type PageCopyImg = Partial<Record<"hero" | "team" | "about", string>>;

// Static-page text and photo slots. Two rows: "draft" (autosaved by the editor) and "live"
// (what visitors see). Terbitkan copies draft to live. Missing keys fall back to the defaults
// in data/page-copy-defaults.json.
export const pageCopy = pgTable(
  "page_copy",
  {
    version: text("version").primaryKey(), // draft | live
    text: jsonb("text").$type<PageCopyText>().notNull().default({}),
    img: jsonb("img").$type<PageCopyImg>().notNull().default({}),
    publishedAt: timestamp("published_at", { withTimezone: true }), // live row only
    ...audit,
  },
  (t) => [check("page_copy_version_chk", sql`${t.version} in ('draft','live')`)],
);
