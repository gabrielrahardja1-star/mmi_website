import type { Lang } from "@/lib/format";

export type PageKey = "home" | "about" | "media" | "careers";

export const PAGES: { key: PageKey; path: string; label: string }[] = [
  { key: "home", path: "/", label: "Beranda" },
  { key: "about", path: "/tentang", label: "Tentang Kami" },
  { key: "media", path: "/media", label: "Media" },
  { key: "careers", path: "/karir", label: "Karir" },
];

// Indonesian lives at the root, English under /en. "/" -> "/en", "/media" -> "/en/media".
export const localizePath = (path: string, lang: Lang | "both") =>
  lang === "en" ? (path === "/" ? "/en" : "/en" + path) : path;

export const pagePath = (key: PageKey, lang: Lang | "both" = "id") =>
  localizePath(PAGES.find((p) => p.key === key)!.path, lang);

// A story's address: its Indonesian title, then the start of its id. The id finds the story, so an edited
// title changes the address without breaking old links (they redirect).
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
export const newsSlug = (n: { id: string; titleId: string }) => [slugify(n.titleId), n.id.slice(0, 8)].filter(Boolean).join("-");
export const newsPath = (n: { id: string; titleId: string }, lang: Lang | "both" = "id") => localizePath(`/berita/${newsSlug(n)}`, lang);

// The same page in the other language, for the toggle: "/en/media" <-> "/media".
export const counterpartPath = (path: string, to: Lang) => {
  const base = path === "/en" ? "/" : path.startsWith("/en/") ? path.slice(3) : path;
  return localizePath(base, to);
};

// Set by the language toggle. A returning English reader is sent to /en by the proxy.
export const LANG_COOKIE = "mmi-lang";
