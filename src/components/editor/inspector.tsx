"use client";

import { useRef } from "react";
import { CONFIG, CONTENT_LABEL, ED_LABEL, IMG_LABEL, PAGE_LABEL, type Field, type Item } from "./config";
import type { Editor, ItemEdit } from "./use-editor";
import { LIMITS } from "@/lib/content-schemas";
import { mediaUrl } from "@/lib/media";
import { DEFAULT_TEXT } from "@/lib/page-copy";
import { ROLE_LABEL } from "@/lib/roles";

// The right-hand panel. What it shows depends on what is selected on the canvas.
export function Inspector({ e }: { e: Editor }) {
  if (e.mode === "preview") {
    return (
      <aside className="e-insp" aria-label="Panel edit">
        <header>
          <span className="k">Pratinjau</span>
          <h2>Mode pratinjau</h2>
        </header>
        <div className="e-hint">
          Situs tampil seperti yang dilihat pengunjung. Klik menu untuk berpindah halaman. Tekan <b>Kembali mengedit</b> untuk lanjut mengubah.
        </div>
      </aside>
    );
  }
  if (e.ed) return <ItemInspector e={e} ed={e.ed} />;
  if (e.sel?.kind === "text") return <TextInspector e={e} k={e.sel.key} />;
  if (e.sel?.kind === "img") return <ImageInspector e={e} slot={e.sel.key} />;

  return (
    <aside className="e-insp idle" aria-label="Panel edit">
      <header>
        <span className="k">{PAGE_LABEL[e.page]}</span>
        <h2>Klik apa saja di halaman untuk mengedit</h2>
      </header>
      <div className="e-hint">
        <ol>
          <li>
            <b>Teks:</b> klik lalu ketik langsung. Ganti bahasa di atas untuk mengedit versi EN.
          </li>
          <li>
            <b>Foto:</b> klik untuk mengganti.
          </li>
          <li>
            <b>Berita, lowongan, video:</b> klik kartunya untuk mengubah isi.
          </li>
          <li>
            Tekan <b>Terbitkan</b> untuk menayangkan perubahan teks dan foto halaman.
          </li>
        </ol>
      </div>
      <div className="e-legend">
        <span>
          <i />
          Bisa diedit
        </span>
        <span>
          <i className="solid" />
          Sedang dipilih
        </span>
      </div>
    </aside>
  );
}

// ---------- page text ----------

function TextInspector({ e, k }: { e: Editor; k: string }) {
  const value = e.draft.text[k] ?? DEFAULT_TEXT[k];
  const changed = JSON.stringify(value) !== JSON.stringify(DEFAULT_TEXT[k]);
  const oneLine = (s: string) => s.replace(/\s*\n\s*/g, " ");
  return (
    <aside className="e-insp" aria-label="Panel edit">
      <header>
        <span className="k">Teks halaman</span>
        <h2>{ED_LABEL(k)}</h2>
      </header>
      <div className="bd">
        <div className="c-sec">
          <div className="c-bi">
            <div className="c-f">
              <label htmlFor="tk-id">
                <span className="tag">ID</span>Bahasa Indonesia
              </label>
              <textarea id="tk-id" value={value.id} maxLength={LIMITS.pageText} onChange={(ev) => e.setText(k, "id", oneLine(ev.target.value))} />
            </div>
            <div className="c-f">
              <label htmlFor="tk-en">
                <span className="tag">EN</span>English
              </label>
              <textarea id="tk-en" value={value.en} maxLength={LIMITS.pageText} onChange={(ev) => e.setText(k, "en", oneLine(ev.target.value))} />
            </div>
            <small style={{ color: "var(--ink-2)" }}>Perubahan tersimpan otomatis sebagai draf. Pengunjung melihatnya setelah Anda menekan Terbitkan.</small>
          </div>
        </div>
      </div>
      <div className="ft">
        <span className="sp" />
        {changed && (
          <button className="c-btn ghost sm" onClick={() => e.resetText(k)}>
            Kembalikan teks awal
          </button>
        )}
        <button className="c-btn sm" onClick={() => e.select(null)}>
          Selesai
        </button>
      </div>
    </aside>
  );
}

// ---------- page photos ----------

function PhotoPicker({
  id,
  busy,
  onPick,
  onClear,
  disabled,
}: {
  id: string | null | undefined;
  busy: boolean;
  onPick: (f: File) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="c-img">
      <div className="im">{id ? <img src={mediaUrl(id, 800)} alt="" /> : busy ? "Mengunggah…" : "Belum ada foto"}</div>
      <div className="acts">
        <button className="c-btn ghost sm" disabled={busy || disabled} onClick={() => input.current?.click()}>
          {id ? "Ganti foto" : "Pilih foto"}
        </button>
        {id && !disabled && (
          <button className="c-btn ghost sm" onClick={onClear}>
            Hapus foto
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(ev) => {
          const f = ev.target.files?.[0];
          ev.target.value = "";
          if (f) onPick(f);
        }}
      />
    </div>
  );
}

function ImageInspector({ e, slot }: { e: Editor; slot: string }) {
  const id = (e.draft.img as Record<string, string | undefined>)[slot];
  return (
    <aside className="e-insp" aria-label="Panel edit">
      <header>
        <span className="k">Foto halaman</span>
        <h2>{IMG_LABEL[slot] ?? "Foto"}</h2>
      </header>
      <div className="bd">
        <div className="c-sec">
          <PhotoPicker id={id} busy={e.uploading > 0} onPick={(f) => e.uploadSlot(slot, f)} onClear={() => e.setSlotImage(slot, null)} />
          <small style={{ color: "var(--ink-2)" }}>JPG, PNG atau WEBP, maks. 20 MB. Foto dipotong otomatis agar pas dengan bingkai.</small>
        </div>
      </div>
      <div className="ft">
        <span className="sp" />
        <button className="c-btn ghost sm" onClick={() => e.select(null)}>
          Selesai
        </button>
      </div>
    </aside>
  );
}

// ---------- content items ----------

function ItemInspector({ e, ed }: { e: Editor; ed: ItemEdit }) {
  const t = CONFIG[ed.type];
  const live = t.live(ed.data);
  const lock = ed.readOnly || ed.saving;

  const footer = ed.confirmDel ? (
    <>
      <span className="confirm">Hapus {t.one} ini dari situs? Tidak bisa dibatalkan.</span>
      <span className="sp" />
      <button className="c-btn ghost sm" onClick={() => e.patchEd({ confirmDel: false })}>
        Batal
      </button>
      <button className="c-btn danger-solid sm" disabled={ed.saving} onClick={e.deleteItem}>
        Ya, hapus
      </button>
    </>
  ) : ed.readOnly ? (
    <>
      <span className="sp" />
      <button className="c-btn ghost sm" onClick={() => e.select(null)}>
        Tutup
      </button>
    </>
  ) : (
    <>
      {ed.id && (
        <button className="c-btn danger sm" onClick={() => e.patchEd({ confirmDel: true })}>
          Hapus
        </button>
      )}
      <span className="sp" />
      {t.pub ? (
        live ? (
          <>
            {e.mayPublish && (
              <button className="c-btn ghost sm" disabled={ed.saving} onClick={() => e.saveItem("draft")}>
                Jadikan draf
              </button>
            )}
            <button className="c-btn sm" disabled={ed.saving} onClick={() => e.saveItem()}>
              Simpan
            </button>
          </>
        ) : (
          <>
            <button className="c-btn ghost sm" disabled={ed.saving} onClick={() => e.saveItem("draft")}>
              Simpan draf
            </button>
            {e.mayPublish && (
              <button className="c-btn sm" disabled={ed.saving} onClick={() => e.saveItem("live")}>
                Terbitkan
              </button>
            )}
          </>
        )
      ) : (
        <>
          <label className="c-check" style={{ alignItems: "center" }}>
            <input type="checkbox" checked={live} disabled={!e.mayPublish} onChange={(ev) => e.setLiveFlag(ev.target.checked)} />
            {t.liveLbl[0]}
          </label>
          <button className="c-btn sm" disabled={ed.saving} onClick={() => e.saveItem()}>
            Simpan
          </button>
        </>
      )}
    </>
  );

  return (
    <aside className="e-insp" aria-label="Panel edit">
      <header>
        <span className="k">
          {CONTENT_LABEL[ed.type]} · {ed.id ? "Edit" : "Baru"}
        </span>
        <h2>{ed.id ? t.title(ed.data) : t.add}</h2>
        <span className={`pill ${live ? "on" : "off"}`}>{live ? t.liveLbl[0] : t.liveLbl[1]}</span>
      </header>
      {ed.pending && (
        <div className="c-warn" role="alert">
          <b>Ada perubahan yang belum disimpan.</b>
          <div>
            <button className="c-btn ghost sm" onClick={() => e.patchEd({ pending: false })}>
              Tetap di sini
            </button>
            <button className="c-btn danger sm" onClick={e.discard}>
              Buang perubahan
            </button>
          </div>
        </div>
      )}
      {ed.readOnly && (
        <div className="c-warn" role="note">
          <b>Sudah tampil di situs.</b> Sebagai {ROLE_LABEL[e.role]}, Anda hanya bisa mengubah draf. Minta Editor untuk mengubah item ini.
        </div>
      )}
      <div className="bd">
        {t.form.map((sc) => (
          <div className="c-sec" key={sc.sec}>
            <h3>{sc.sec}</h3>
            {sc.fields.map((f, i) => (
              <FieldView key={i} f={f} e={e} ed={ed} lock={lock} />
            ))}
          </div>
        ))}
        <div className="c-sec">
          <small style={{ color: "var(--ink-2)" }}>
            {t.pub
              ? "Konten ini tampil di situs begitu diterbitkan, tanpa perlu menekan Terbitkan di atas."
              : "Konten ini tampil di situs begitu disimpan."}
          </small>
        </div>
      </div>
      <div className="ft">{footer}</div>
    </aside>
  );
}

const str = (v: unknown) => String(v ?? "");

function FieldView({ f, e, ed, lock }: { f: Field; e: Editor; ed: ItemEdit; lock: boolean }) {
  const d: Item = ed.data;
  const er = ed.errors;

  if ("two" in f) {
    return (
      <div className="c-two">
        {f.two.map((g, i) => (
          <FieldView key={i} f={g} e={e} ed={ed} lock={lock} />
        ))}
      </div>
    );
  }

  if ("bi" in f) {
    const box = (k: string, tag: "ID" | "EN") => {
      const common = { id: `f-${k}`, value: str(d[k]), maxLength: f.max, disabled: lock, onChange: (ev: { target: { value: string } }) => e.editField(k, ev.target.value) };
      return (
        <div className={`c-f${er[k] ? " err" : ""}`}>
          <label htmlFor={`f-${k}`}>
            <span className="tag">{tag}</span>
            {f.label}
            {tag === "ID" && f.req ? " *" : ""}
          </label>
          {f.area ? <textarea {...common} /> : <input type="text" {...common} />}
          {er[k] && <span className="msg">{er[k]}</span>}
        </div>
      );
    };
    return (
      <div className="c-bi">
        {box(f.bi[0], "ID")}
        {box(f.bi[1], "EN")}
        {f.help && (
          <small className="c-f" style={{ color: "var(--ink-2)" }}>
            {f.help}
          </small>
        )}
      </div>
    );
  }

  const k = f.k;
  const v = d[k];
  const err = er[k];

  if (f.img) {
    return (
      <div className={`c-f${err ? " err" : ""}`}>
        <PhotoPicker
          id={v ? str(v) : null}
          busy={e.uploading > 0}
          disabled={lock}
          onPick={(file) => e.uploadField(k, file)}
          onClear={() => e.editField(k, null)}
        />
        {err && <span className="msg">{err}</span>}
        {f.help && <small>{f.help}</small>}
      </div>
    );
  }

  if (f.check) {
    return (
      <label className="c-check">
        <input type="checkbox" checked={Boolean(v)} disabled={lock || !e.mayPublish} onChange={(ev) => e.editField(k, ev.target.checked)} />
        <span>
          <b>{f.check}</b>
          {f.help && (
            <>
              <br />
              <small style={{ color: "var(--ink-2)" }}>{f.help}</small>
            </>
          )}
        </span>
      </label>
    );
  }

  return (
    <div className={`c-f${err ? " err" : ""}`}>
      <label htmlFor={`f-${k}`}>
        {f.label}
        {f.req ? " *" : ""}
      </label>
      {f.sel ? (
        <select id={`f-${k}`} value={str(v)} disabled={lock} onChange={(ev) => e.editField(k, ev.target.value)}>
          {f.sel.map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={`f-${k}`}
          type={f.date ? "date" : f.url ? "url" : "text"}
          value={str(v)}
          placeholder={f.ph}
          disabled={lock}
          onChange={(ev) => e.editField(k, ev.target.value)}
        />
      )}
      {err && <span className="msg">{err}</span>}
      {f.help && <small>{f.help}</small>}
    </div>
  );
}
