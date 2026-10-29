"use client";

import Link from "next/link";
import { useState } from "react";
import { Bi } from "./primitives";
import { LANG_COOKIE, PAGES, pagePath, type PageKey } from "@/lib/routes";
import type { Lang, ViewLang } from "@/lib/format";

const NAV_LABEL: Record<PageKey, [string, string]> = {
  home: ["Beranda", "Home"],
  about: ["Tentang Kami", "About Us"],
  media: ["Media", "Media"],
  articles: ["Artikel", "Articles"],
  careers: ["Karir", "Careers"],
};

// Remembers the visitor's choice. The proxy sends returning English readers to /en.
function rememberLang(l: Lang) {
  document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
}

export function SiteHeader({ current, lang, activeLang }: { current: PageKey; lang: ViewLang; activeLang?: Lang }) {
  const [open, setOpen] = useState(false);
  // In the editor canvas (lang="both") the editor shell owns the language; clicks on the toggle are
  // caught by the canvas and forwarded to it, so the buttons here only display the state.
  const active: Lang = lang === "both" ? (activeLang ?? "id") : lang;

  const langButton = (l: Lang, label: string) =>
    lang === "both" ? (
      <button aria-pressed={active === l} data-lang-choice={l}>
        {label}
      </button>
    ) : (
      <a
        href={pagePath(current, l)}
        aria-current={active === l ? "true" : undefined}
        hrefLang={l}
        onClick={() => rememberLang(l)}
      >
        {label}
      </a>
    );

  return (
    <header className="site">
      <div className="wrap">
        <Link className="brand" href={pagePath("home", lang)} aria-label="Merge Mining Industri">
          <img src="/static/logo-mark.png" alt="" />
          <span>Merge Mining Industri</span>
        </Link>
        <button
          className="menu-btn"
          aria-expanded={open}
          aria-controls="mainNav"
          onClick={() => setOpen((o) => !o)}
        >
          Menu
        </button>
        <nav className="main" id="mainNav" data-open={open}>
          {PAGES.map((p) => (
            <Link
              key={p.key}
              href={pagePath(p.key, lang)}
              aria-current={p.key === current ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              <Bi id={NAV_LABEL[p.key][0]} en={NAV_LABEL[p.key][1]} lang={lang} />
            </Link>
          ))}
        </nav>
        <div className="lang" role="group" aria-label="Bahasa / Language">
          {langButton("id", "ID")}/{langButton("en", "EN")}
        </div>
      </div>
    </header>
  );
}
