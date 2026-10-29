import type { MetadataRoute } from "next";
import { getEnv, isIndexable } from "@/lib/env";
import { PAGES, pagePath } from "@/lib/routes";

export const dynamic = "force-dynamic";

// Every page in both languages, each pointing at its translation (hreflang).
export default function sitemap(): MetadataRoute.Sitemap {
  if (!isIndexable()) return []; // listing noindex pages would send mixed signals
  const origin = getEnv().PUBLIC_ORIGIN.replace(/\/$/, "");
  const abs = (path: string) => origin + (path === "/" ? "" : path);
  return PAGES.flatMap((p) =>
    (["id", "en"] as const).map((lang) => ({
      url: abs(pagePath(p.key, lang)),
      changeFrequency: "weekly" as const,
      alternates: { languages: { id: abs(pagePath(p.key, "id")), en: abs(pagePath(p.key, "en")) } },
    })),
  );
}
