"use client";

import { useRef, type DragEvent } from "react";
import { CONFIG, CONTENT_LABEL, PAGE_LABEL, PAGE_OF, TYPES } from "./config";
import { ItemIcon, PATHS, Svg } from "./icons";
import type { Editor, Fly } from "./use-editor";
import { PAGES } from "@/lib/routes";
import { mediaUrl } from "@/lib/media";
import { byDateDesc } from "@/lib/format";
import type { ContentType } from "@/lib/permissions";

const RAIL: { fly: Exclude<Fly, null>; label: string; d: string; add?: boolean }[] = [
  { fly: "add", label: "Tambah", d: PATHS.add, add: true },
  { fly: "pages", label: "Halaman", d: PATHS.page },
  { fly: "content", label: "Konten", d: PATHS.content },
  { fly: "media", label: "Media", d: PATHS.media },
];

export function Rail({ e }: { e: Editor }) {
  return (
    <nav className="e-rail" aria-label="Alat editor">
      {RAIL.map((r) => (
        <button
          key={r.fly}
          className={r.add ? "add" : undefined}
          aria-expanded={e.fly === r.fly}
          title={r.add ? "Tambah" : undefined}
          onClick={() => {
            e.setFly(e.fly === r.fly ? null : r.fly);
            e.setFlyCol(null);
            e.setFlyQ("");
          }}
        >
          <Svg d={r.d} size={20} w={r.add ? 2.4 : 2} />
          {!r.add && r.label}
        </button>
      ))}
    </nav>
  );
}

export function Flyout({ e }: { e: Editor }) {
  const pickMany = useRef<HTMLInputElement>(null);
  if (!e.fly) return <div className="e-fly" hidden />;

  let title = "";
  let body: React.ReactNode = null;

  const newItem = (k: ContentType) => {
    if (!e.canSwitch()) return;
    if (k === "gallery") {
      e.setFly("media");
      pickMany.current?.click();
      return;
    }
    e.openItem(k, null);
  };
  const open = (k: ContentType, id: string) => {
    if (e.canSwitch()) e.openItem(k, id);
  };

  if (e.fly === "add") {
    title = "Tambah ke situs";
    body = (["news", "gallery", "jobs", "videos", "articles"] as ContentType[]).map((k) => (
      <button key={k} className="e-item" onClick={() => newItem(k)}>
        <ItemIcon kind={k} />
        <span className="tx">
          <b>{CONFIG[k].add}</b>
          <span>Tampil di halaman {PAGE_LABEL[PAGE_OF[k]]}</span>
        </span>
      </button>
    ));
  }

  if (e.fly === "pages") {
    title = "Halaman situs";
    body = PAGES.map((p) => (
      <button key={p.key} className="e-item" aria-current={p.key === e.page ? "page" : undefined} onClick={() => e.changePage(p.key)}>
        <ItemIcon kind="page" />
        <span className="tx">
          <b>{PAGE_LABEL[p.key]}</b>
          <span>{p.path}</span>
        </span>
      </button>
    ));
  }

  if (e.fly === "content") {
    if (!e.flyCol) {
      title = "Konten";
      body = TYPES.map((k) => {
        const list = e.items[k];
        const on = list.filter(CONFIG[k].live).length;
        return (
          <button key={k} className="e-item" onClick={() => e.setFlyCol(k)}>
            <ItemIcon kind={k} />
            <span className="tx">
              <b>{CONTENT_LABEL[k]}</b>
              <span>
                {on} tampil · {list.length - on} {CONFIG[k].liveLbl[1].toLowerCase()}
              </span>
            </span>
            <span aria-hidden="true">›</span>
          </button>
        );
      });
    } else {
      const k = e.flyCol;
      const t = CONFIG[k];
      title = CONTENT_LABEL[k];
      const q = e.flyQ.toLowerCase();
      const list = [...e.items[k]]
        .sort(k === "jobs" ? (a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0) : (a, b) => byDateDesc({ date: String(a.date ?? "") }, { date: String(b.date ?? "") }))
        .filter((x) => !q || t.search(x).toLowerCase().includes(q));
      body = (
        <>
          <button className="c-btn ghost sm" style={{ justifySelf: "start" }} onClick={() => e.setFlyCol(null)}>
            ← Semua konten
          </button>
          <label className="e-search">
            <input type="text" placeholder={`Cari ${t.one}…`} value={e.flyQ} aria-label="Cari" onChange={(ev) => e.setFlyQ(ev.target.value)} />
          </label>
          <button className="c-btn sm" onClick={() => newItem(k)}>
            + {t.add}
          </button>
          {list.length ? (
            list.map((x) => (
              <button key={String(x.id)} className="e-item" onClick={() => open(k, String(x.id))}>
                <ItemIcon kind={k} />
                <span className="tx">
                  <b>{t.title(x)}</b>
                  <span>{t.sub(x)}</span>
                </span>
                <span className={`pill ${t.live(x) ? "on" : "off"}`}>{t.live(x) ? t.liveLbl[0] : t.liveLbl[1]}</span>
              </button>
            ))
          ) : (
            <div className="e-hint">Belum ada {t.one}.</div>
          )}
        </>
      );
    }
  }

  if (e.fly === "media") {
    title = "Media";
    const photos = [...e.items.gallery].sort((a, b) => byDateDesc({ date: String(a.date ?? "") }, { date: String(b.date ?? "") }));
    const onDrop = (ev: DragEvent) => {
      ev.preventDefault();
      ev.currentTarget.classList.remove("over");
      e.uploadToGallery([...ev.dataTransfer.files]);
    };
    body = (
      <>
        <div
          className="c-drop"
          onDragEnter={(ev) => {
            ev.preventDefault();
            ev.currentTarget.classList.add("over");
          }}
          onDragOver={(ev) => {
            ev.preventDefault();
            ev.currentTarget.classList.add("over");
          }}
          onDragLeave={(ev) => ev.currentTarget.classList.remove("over")}
          onDrop={onDrop}
        >
          <b style={{ color: "var(--ink)" }}>Seret foto ke sini</b>
          <button className="c-btn sm" onClick={() => pickMany.current?.click()}>
            Pilih foto
          </button>
          <small>Foto masuk ke Galeri di halaman Media.</small>
        </div>
        <div className="e-sub">{photos.length} foto di galeri</div>
        {e.uploading > 0 && <div className="e-hint">Mengunggah {e.uploading} foto…</div>}
        <div className="c-grid">
          {photos.map((x) => (
            <button key={String(x.id)} className="c-tile" onClick={() => open("gallery", String(x.id))}>
              <div className="im">
                <img src={mediaUrl(String(x.imageId), 400)} alt="" loading="lazy" />
              </div>
              <div className="cap">{String(x.captionId || (x.status === "show" ? "Tanpa keterangan" : "Disembunyikan"))}</div>
            </button>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="e-fly" id="eFly">
      <header>
        <h2>{title}</h2>
        <button className="x" aria-label="Tutup" onClick={() => e.setFly(null)}>
          ×
        </button>
      </header>
      <div className="bd">{body}</div>
      <input
        ref={pickMany}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(ev) => {
          const files = [...(ev.target.files ?? [])];
          ev.target.value = "";
          e.uploadToGallery(files);
        }}
      />
    </div>
  );
}
