import "@fontsource-variable/archivo/wdth.css";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/outfit/latin-600.css";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/site.css";
import type { ReactNode } from "react";
import type { Lang } from "@/lib/format";

// The <html> shell of the public site, shared by the Indonesian and English root layouts.
// lang is fixed per URL, so crawlers and screen readers get the right language.
export function SiteRoot({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    <html lang={lang}>
      <body data-lang={lang}>{children}</body>
    </html>
  );
}
