"use client";

import { useState } from "react";
import { PAGE_LABEL } from "./config";
import { PATHS, Svg } from "./icons";
import type { Editor } from "./use-editor";
import { authClient } from "@/lib/auth-client";
import { PAGES, type PageKey } from "@/lib/routes";

export function TopBar({ e }: { e: Editor }) {
  const [leaving, setLeaving] = useState(false);
  const saving = e.saveState === "saving" || e.publishing;

  // Log out, but never lose work: unsaved item changes trigger the usual warning, and a page-text
  // autosave still in flight is allowed to finish first.
  const logout = async () => {
    if (!e.canSwitch()) return;
    if (saving) {
      e.showToast("Tunggu sebentar, perubahan masih disimpan.", true);
      return;
    }
    setLeaving(true);
    await authClient.signOut();
    window.location.assign("/login");
  };
  const statusClass = saving ? " saving" : e.unpublished ? " unpub" : "";
  const statusText = saving
    ? "Menyimpan…"
    : e.saveState === "error"
      ? "Gagal menyimpan"
      : e.unpublished
        ? "Ada perubahan belum terbit"
        : "Situs sudah terbaru";

  return (
    <div className="e-top">
      <div className="e-brand">
        <img src="/static/logo-mark.png" alt="" />
        <b>MMI Editor</b>
      </div>
      <label className="e-page">
        <span>Halaman</span>
        <select value={e.page} aria-label="Halaman" onChange={(ev) => e.changePage(ev.target.value as PageKey)}>
          {PAGES.map((p) => (
            <option key={p.key} value={p.key}>
              {PAGE_LABEL[p.key]}
            </option>
          ))}
        </select>
      </label>
      <div className="e-seg" role="group" aria-label="Bahasa">
        <button aria-pressed={e.lang === "id"} onClick={() => e.setLang("id")}>
          ID
        </button>
        <button aria-pressed={e.lang === "en"} onClick={() => e.setLang("en")}>
          EN
        </button>
      </div>
      <div className="e-seg e-viewsw" role="group" aria-label="Tampilan">
        <button aria-pressed={!e.mobile} title="Desktop" onClick={() => e.setMobile(false)}>
          <Svg d={PATHS.desktop} size={16} />
        </button>
        <button aria-pressed={e.mobile} title="Ponsel" onClick={() => e.setMobile(true)}>
          <Svg d={PATHS.phone} size={16} />
        </button>
      </div>
      <span className="e-sp" />
      <span className={`e-status${statusClass}`} role="status">
        <i className="dot" />
        <span>{statusText}</span>
      </span>
      <button className="c-btn ghost" aria-pressed={e.mode === "preview"} onClick={() => e.setMode(e.mode === "edit" ? "preview" : "edit")}>
        <Svg d={PATHS.eye} size={16} />
        <span className="e-prevlbl">{e.mode === "preview" ? "Kembali mengedit" : "Pratinjau"}</span>
      </button>
      <a className="c-btn ghost" href={e.publicOrigin} target="_blank" rel="noopener" title="Buka situs">
        <Svg d={PATHS.exit} size={16} />
      </a>
      <a className="c-btn ghost" href="/akun" title={`Akun: ${e.user.name}`}>
        <Svg d={PATHS.user} size={16} />
      </a>
      <button className="c-btn ghost" onClick={logout} disabled={leaving} title="Keluar dari editor">
        <Svg d={PATHS.logout} size={16} />
        <span className="e-prevlbl">Keluar</span>
      </button>
      <button
        className="c-btn"
        disabled={!e.mayPublish || !e.unpublished || saving}
        title={e.mayPublish ? undefined : "Hanya Editor dan Admin yang bisa menerbitkan."}
        onClick={e.publish}
      >
        Terbitkan
      </button>
    </div>
  );
}
