import "@fontsource-variable/archivo/wdth.css";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/outfit/latin-600.css";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/editor.css";
import "@/styles/cms-pages.css";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

// Root layout of the editor shell: login, account and the visual editor. Served only on the CMS host.
// The editor's canvas (the site inside an iframe) has its own root layout so site and editor CSS never mix.
export const metadata = { title: "MMI Editor", robots: { index: false, follow: false }, icons: { icon: "/static/logo-mark.png" } };

export default function CmsShellLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
