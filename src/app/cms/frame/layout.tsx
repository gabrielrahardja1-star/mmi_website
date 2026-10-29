import "@fontsource-variable/archivo/wdth.css";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/outfit/latin-600.css";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/site.css";
import "@/styles/frame.css";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";
export const metadata = { title: "MMI Editor (kanvas)", robots: { index: false, follow: false }, icons: { icon: "/static/logo-mark.png" } };

// Root layout of the editor canvas. It is a separate document from the editor shell, so the site's CSS
// (headings, header, footer) never leaks into the editor's own chrome, and the phone preview gets real
// media queries at 390px.
export default function FrameLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body data-lang="id">{children}</body>
    </html>
  );
}
