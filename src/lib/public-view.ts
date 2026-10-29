import { byDateDesc, type ViewLang } from "@/lib/format";
import type { Copy } from "@/lib/page-copy";
import type { RawContent, SiteContent } from "@/lib/site-types";

// What a visitor would see from a set of rows: only published / shown / open items, in the site's order.
// The editor canvas uses this on its in-memory rows, so it matches the public pages (which filter in SQL).
export function toPublicContent(raw: RawContent, copy: Copy, lang: ViewLang): SiteContent {
  return {
    lang,
    copy,
    news: raw.news.filter((n) => n.status === "pub").sort(byDateDesc),
    articles: raw.articles.filter((a) => a.status === "pub").sort(byDateDesc),
    gallery: raw.gallery.filter((g) => g.status === "show").sort(byDateDesc),
    videos: raw.videos.filter((v) => v.status === "show").sort(byDateDesc),
    jobs: raw.jobs.filter((j) => j.status === "open").sort((a, b) => a.sortOrder - b.sortOrder),
  };
}
