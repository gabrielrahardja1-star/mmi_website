import type { Lang } from "@/lib/format";

export type PageKey = "home" | "about" | "media" | "articles" | "careers";

export const PAGES: { key: PageKey; path: string; label: string }[] = [
  { key: "home", path: "/", label: "Beranda" },
  { key: "about", path: "/tentang", label: "Tentang Kami" },
  { key: "media", path: "/media", label: "Media" },
  { key: "articles", path: "/artikel", label: "Artikel" },
  { key: "careers", path: "/karir", label: "Karir" },
];

// Indonesian lives at the root, English under /en. "/" -> "/en", "/media" -> "/en/media".
export const localizePath = (path: string, lang: Lang | "both") =>
  lang === "en" ? (path === "/" ? "/en" : "/en" + path) : path;

export const pagePath = (key: PageKey, lang: Lang | "both" = "id") =>
  localizePath(PAGES.find((p) => p.key === key)!.path, lang);

// The same page in the other language, for the toggle: "/en/media" <-> "/media".
export const counterpartPath = (path: string, to: Lang) => {
  const base = path === "/en" ? "/" : path.startsWith("/en/") ? path.slice(3) : path;
  return localizePath(base, to);
};

// Set by the language toggle. A returning English reader is sent to /en by the proxy.
export const LANG_COOKIE = "mmi-lang";
