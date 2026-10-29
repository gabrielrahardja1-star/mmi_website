"use client";

import { useState } from "react";
import { Bi, Empty } from "./primitives";
import { StoryCard } from "./items";
import type { NewsItem } from "@/lib/site-types";
import type { ViewLang } from "@/lib/format";

const TABS: { f: string; id: string; en: string }[] = [
  { f: "all", id: "Semua", en: "All" },
  { f: "com", id: "Masyarakat", en: "Community" },
  { f: "env", id: "Lingkungan", en: "Environment" },
  { f: "safe", id: "Keselamatan", en: "Safety" },
  { f: "event", id: "Kegiatan", en: "Company" },
];

// Category filter on the Media page. `items` arrives already sorted newest first.
export function NewsBrowser({ items, edit, lang }: { items: NewsItem[]; edit: boolean; lang: ViewLang }) {
  const [filter, setFilter] = useState("all");
  const list = items.filter((n) => filter === "all" || n.cat === filter);
  return (
    <>
      <div className="tabs" id="newsTabs">
        {TABS.map((t) => (
          <button key={t.f} aria-pressed={filter === t.f} onClick={() => setFilter(t.f)}>
            <Bi lang={lang} id={t.id} en={t.en} />
          </button>
        ))}
      </div>
      <div className="news-grid" id="allNews">
        {list.length ? (
          list.map((n) => <StoryCard key={n.id} n={n} edit={edit} lang={lang} />)
        ) : (
          <Empty id="Belum ada berita di kategori ini" en="No news in this category yet" lang={lang} />
        )}
      </div>
    </>
  );
}
