import { z } from "zod";
import { TYPE_EN } from "@/lib/format";

// Field limits come from CLAUDE.md section 4 and the prototype's forms. The editor UI reuses them.
export const LIMITS = {
  newsTitle: 90,
  newsSummary: 220,
  articleSummary: 200,
  articleSource: 100,
  articleTitle: 300,
  caption: 120,
  videoTitle: 80,
  jobTitle: 70,
  jobLocation: 100,
  pageText: 2000,
} as const;

const str = (label: string, max: number) => z.string().trim().max(max, `${label} maksimal ${max} karakter.`);
const required = (label: string, max: number) => str(label, max).min(1, `${label} wajib diisi.`);
const optional = (label: string, max: number) => str(label, max).default("");

const isoDate = (label = "Tanggal") =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} tidak valid.`)
    .refine((s) => {
      const d = new Date(`${s}T00:00:00Z`);
      return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
    }, `${label} tidak valid.`);

// "" from an empty form field means "none".
const emptyToNull = (v: unknown) => (v === "" ? null : v);

const httpsUrl = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} wajib diisi.`)
    .regex(/^https:\/\/\S+\.\S+$/, "Tautan harus diawali https://");

export const isYouTubeUrl = (u: string) => {
  try {
    const h = new URL(u).hostname.toLowerCase();
    return h === "youtu.be" || h === "youtube.com" || h.endsWith(".youtube.com");
  } catch {
    return false;
  }
};

// Jobs link to JobStreet only, never LinkedIn or anything else (CLAUDE.md section 8). An exact domain
// allowlist: "jobstreet.evil.com" and "evil.com/jobstreet.com" must not pass.
const JOBSTREET_DOMAINS = ["jobstreet.com", "jobstreet.co.id"];
export const isJobStreetUrl = (u: string) => {
  try {
    const url = new URL(u);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && JOBSTREET_DOMAINS.some((d) => host === d || host.endsWith("." + d));
  } catch {
    return false;
  }
};

export const newsInput = z.strictObject({
  cat: z.enum(["com", "env", "safe", "event"], "Pilih kategori."),
  date: isoDate(),
  titleId: required("Judul (Indonesia)", LIMITS.newsTitle),
  titleEn: optional("Judul (English)", LIMITS.newsTitle),
  summaryId: optional("Ringkasan (Indonesia)", LIMITS.newsSummary),
  summaryEn: optional("Ringkasan (English)", LIMITS.newsSummary),
  coverImageId: z.preprocess(emptyToNull, z.uuid("Foto tidak valid.").nullable()).default(null),
  status: z.enum(["draft", "pub"], "Status tidak valid."),
});

export const articlesInput = z.strictObject({
  source: required("Nama media", LIMITS.articleSource),
  url: httpsUrl("Tautan artikel"),
  date: z.preprocess(emptyToNull, isoDate("Tanggal terbit").nullable()).default(null),
  title: required("Judul asli artikel", LIMITS.articleTitle),
  summaryId: optional("Ringkasan (Indonesia)", LIMITS.articleSummary),
  summaryEn: optional("Ringkasan (English)", LIMITS.articleSummary),
  status: z.enum(["draft", "pub"], "Status tidak valid."),
});

export const galleryInput = z.strictObject({
  imageId: z.uuid("Pilih foto terlebih dahulu."),
  captionId: optional("Keterangan (Indonesia)", LIMITS.caption),
  captionEn: optional("Keterangan (English)", LIMITS.caption),
  date: isoDate(),
  status: z.enum(["show", "hidden"], "Status tidak valid."),
});

export const videosInput = z.strictObject({
  url: httpsUrl("Tautan YouTube").refine(isYouTubeUrl, "Gunakan tautan YouTube."),
  titleId: required("Judul (Indonesia)", LIMITS.videoTitle),
  titleEn: optional("Judul (English)", LIMITS.videoTitle),
  date: isoDate(),
  home: z.boolean().default(false),
  status: z.enum(["show", "hidden"], "Status tidak valid."),
});

export const jobsInput = z.strictObject({
  titleId: required("Nama posisi (Indonesia)", LIMITS.jobTitle),
  titleEn: optional("Nama posisi (English)", LIMITS.jobTitle),
  location: required("Lokasi", LIMITS.jobLocation),
  typeId: z.enum(Object.keys(TYPE_EN) as [string, ...string[]], "Pilih jenis kerja."),
  url: httpsUrl("Tautan lowongan JobStreet").refine(isJobStreetUrl, "Tautan harus ke halaman JobStreet."),
  status: z.enum(["open", "closed"], "Status tidak valid."),
});

export const CONTENT_SCHEMAS = {
  news: newsInput,
  articles: articlesInput,
  gallery: galleryInput,
  videos: videosInput,
  jobs: jobsInput,
} as const;

// Maps zod issues to { fieldName: first message } for the inspector's inline errors.
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    out[key] ??= issue.message;
  }
  return out;
}
