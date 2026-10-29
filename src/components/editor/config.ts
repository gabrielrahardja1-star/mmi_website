// What the editor knows about each kind of content: labels, blank items, list display and the inspector
// form. Ported from the prototype's `T` object, with field names matching the API (titleId, not tId).
import { CATS, TYPE_EN } from "@/lib/format";
import type { ContentType } from "@/lib/permissions";
import { PAGES as SITE_PAGES, type PageKey } from "@/lib/routes";
import type { Role } from "@/lib/roles";

export type Item = Record<string, unknown> & { id?: string };

export type Field =
  | { two: Field[] }
  | { bi: [string, string]; label: string; req?: boolean; max?: number; area?: boolean; help?: string }
  | {
      k: string;
      label?: string;
      req?: boolean;
      img?: true;
      check?: string;
      sel?: [string, string][];
      date?: true;
      url?: true;
      ph?: string;
      help?: string;
    };

export type TypeConfig = {
  one: string; // "berita"
  add: string; // "Tulis berita"
  blank: (role: Role) => Item;
  title: (x: Item) => string;
  sub: (x: Item) => string;
  live: (x: Item) => boolean;
  liveLbl: [string, string];
  pub: boolean; // true: has its own Draft / Publish buttons. false: goes live when saved.
  search: (x: Item) => string;
  form: { sec: string; fields: Field[] }[];
};

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const s = (v: unknown) => String(v ?? "");
const catLabel = (c: unknown) => CATS[s(c) as keyof typeof CATS]?.[0] ?? "—";

export const CONTENT_LABEL: Record<ContentType, string> = {
  news: "Berita",
  articles: "Artikel media",
  gallery: "Foto galeri",
  videos: "Video",
  jobs: "Lowongan",
};
export const PAGE_OF: Record<ContentType, PageKey> = {
  news: "media",
  articles: "articles",
  gallery: "media",
  videos: "media",
  jobs: "careers",
};
export const PAGE_LABEL = Object.fromEntries(SITE_PAGES.map((p) => [p.key, p.label])) as Record<PageKey, string>;
export const TYPES: ContentType[] = ["news", "articles", "gallery", "videos", "jobs"];

export const CONFIG: Record<ContentType, TypeConfig> = {
  news: {
    one: "berita",
    add: "Tulis berita",
    blank: () => ({ cat: "com", date: today(), titleId: "", titleEn: "", summaryId: "", summaryEn: "", coverImageId: null, status: "draft" }),
    title: (x) => s(x.titleId) || "(Tanpa judul)",
    sub: (x) => `${catLabel(x.cat)} · ${s(x.date)}`,
    live: (x) => x.status === "pub",
    liveLbl: ["Terbit", "Draf"],
    pub: true,
    search: (x) => `${s(x.titleId)} ${s(x.titleEn)}`,
    form: [
      { sec: "Isi berita", fields: [{ bi: ["titleId", "titleEn"], label: "Judul", req: true, max: 90 }, { bi: ["summaryId", "summaryEn"], label: "Ringkasan", area: true, max: 220 }] },
      {
        sec: "Detail",
        fields: [{ two: [{ k: "cat", label: "Kategori", sel: Object.entries(CATS).map(([k, v]) => [k, v[0]] as [string, string]) }, { k: "date", label: "Tanggal", date: true, req: true }] }],
      },
      { sec: "Foto sampul", fields: [{ k: "coverImageId", img: true, help: "JPG, PNG atau WEBP. Rasio 3:2 tampil paling baik." }] },
    ],
  },
  articles: {
    one: "artikel",
    add: "Tambah artikel media",
    blank: () => ({ source: "", url: "", date: today(), title: "", summaryId: "", summaryEn: "", status: "draft" }),
    title: (x) => s(x.title) || "(Tanpa judul)",
    sub: (x) => s(x.source) || "—",
    live: (x) => x.status === "pub",
    liveLbl: ["Terbit", "Draf"],
    pub: true,
    search: (x) => `${s(x.title)} ${s(x.source)}`,
    form: [
      {
        sec: "Sumber",
        fields: [
          { k: "source", label: "Nama media", req: true, ph: "cth. Habar Kalimantan" },
          { k: "date", label: "Tanggal terbit", date: true },
          { k: "url", label: "Tautan artikel", url: true, req: true, ph: "https://" },
          { k: "title", label: "Judul asli artikel", req: true, help: "Salin persis seperti di situs media." },
        ],
      },
      { sec: "Ringkasan", fields: [{ bi: ["summaryId", "summaryEn"], label: "Ringkasan singkat", area: true, max: 200, help: "Tulis dengan kata-kata sendiri." }] },
    ],
  },
  gallery: {
    one: "foto",
    add: "Unggah foto",
    blank: (role) => ({ imageId: "", captionId: "", captionEn: "", date: today(), status: role === "contributor" ? "hidden" : "show" }),
    title: (x) => s(x.captionId) || "(Tanpa keterangan)",
    sub: (x) => s(x.date),
    live: (x) => x.status === "show",
    liveLbl: ["Tampil", "Disembunyikan"],
    pub: false,
    search: (x) => `${s(x.captionId)} ${s(x.captionEn)}`,
    form: [
      { sec: "Foto", fields: [{ k: "imageId", img: true, req: true }] },
      { sec: "Keterangan", fields: [{ bi: ["captionId", "captionEn"], label: "Keterangan foto", max: 120, help: "Juga dipakai untuk pembaca layar." }, { k: "date", label: "Tanggal", date: true }] },
    ],
  },
  videos: {
    one: "video",
    add: "Tambah video",
    blank: (role) => ({ url: "", titleId: "", titleEn: "", date: today(), home: false, status: role === "contributor" ? "hidden" : "show" }),
    title: (x) => s(x.titleId) || "(Tanpa judul)",
    sub: (x) => (x.home ? "Tampil di beranda" : "YouTube"),
    live: (x) => x.status === "show",
    liveLbl: ["Tampil", "Disembunyikan"],
    pub: false,
    search: (x) => `${s(x.titleId)} ${s(x.titleEn)}`,
    form: [
      {
        sec: "Video",
        fields: [
          { k: "url", label: "Tautan YouTube", url: true, req: true, ph: "https://www.youtube.com/watch?v=…" },
          { bi: ["titleId", "titleEn"], label: "Judul", req: true, max: 80 },
          { k: "date", label: "Tanggal", date: true },
          { k: "home", check: "Tampilkan di beranda", help: "Hanya satu video tampil di beranda. Hanya berlaku untuk video yang tampil." },
        ],
      },
    ],
  },
  jobs: {
    one: "lowongan",
    add: "Tambah lowongan",
    blank: (role) => ({ titleId: "", titleEn: "", location: "Sungai Pinang, Kalsel", typeId: "Penuh waktu", typeEn: "Full-time", url: "", status: role === "contributor" ? "closed" : "open" }),
    title: (x) => s(x.titleId) || "(Tanpa posisi)",
    sub: (x) => `${s(x.location) || "—"} · ${s(x.typeId)}`,
    live: (x) => x.status === "open",
    liveLbl: ["Dibuka", "Ditutup"],
    pub: false,
    search: (x) => `${s(x.titleId)} ${s(x.titleEn)} ${s(x.location)}`,
    form: [
      {
        sec: "Posisi",
        fields: [
          { bi: ["titleId", "titleEn"], label: "Nama posisi", req: true, max: 70 },
          { two: [{ k: "location", label: "Lokasi", req: true }, { k: "typeId", label: "Jenis kerja", sel: Object.keys(TYPE_EN).map((k) => [k, k] as [string, string]) }] },
        ],
      },
      { sec: "Lamaran", fields: [{ k: "url", label: "Tautan lowongan JobStreet", url: true, req: true, ph: "https://id.jobstreet.com/…" }] },
    ],
  },
};

// "live" status values per type, used to turn the Terbit / Tampil checkbox into a status.
export const LIVE_ON: Record<ContentType, string> = { news: "pub", articles: "pub", gallery: "show", videos: "show", jobs: "open" };
export const LIVE_OFF: Record<ContentType, string> = { news: "draft", articles: "draft", gallery: "hidden", videos: "hidden", jobs: "closed" };

// Labels that appear on the canvas when hovering editable page text and photos.
export const ED_LABEL = (key: string) =>
  (
    {
      h1: "Judul utama",
      h2: "Judul bagian",
      h3: "Subjudul",
      p: "Paragraf",
      li: "Poin daftar",
      blockquote: "Kutipan",
      figcaption: "Keterangan foto",
      a: "Tombol / tautan",
    } as Record<string, string>
  )[key.split("-")[1]] ?? "Teks";
export const IMG_LABEL: Record<string, string> = { hero: "Foto utama beranda", team: "Foto tim", about: "Foto halaman Tentang" };

export const ICON: Record<string, string> = {
  news: "M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M8 9h5M8 13h5",
  articles: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  gallery: "M3 4h18v16H3zM3 16l5-5 4 4 3-3 6 6",
  videos: "M3 5h18v14H3zM10 9l5 3-5 3z",
  jobs: "M3 7h18v13H3zM8 7V4h8v3M3 12h18",
  page: "M6 3h9l4 4v14H6zM14 3v5h5",
};

// The fields the API accepts for a type: every field in its form plus status. The rows loaded from the
// server also carry id, updatedAt and updatedBy, which must not be sent back.
export function editableKeys(type: ContentType): string[] {
  const keys = new Set<string>(["status"]);
  const walk = (f: Field) => {
    if ("two" in f) f.two.forEach(walk);
    else if ("bi" in f) f.bi.forEach((k) => keys.add(k));
    else keys.add(f.k);
  };
  CONFIG[type].form.forEach((sec) => sec.fields.forEach(walk));
  return [...keys];
}

export function pickEditable(type: ContentType, data: Item): Item {
  const out: Item = {};
  for (const k of editableKeys(type)) if (k in data) out[k] = data[k];
  return out;
}
