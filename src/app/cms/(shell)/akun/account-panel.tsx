"use client";

import QRCode from "qrcode";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { authMessage } from "@/lib/auth-errors";
import { ROLE_LABEL } from "@/lib/roles";
import type { CurrentUser } from "@/lib/session";

type Setup = { qr: string; uri: string; backupCodes: string[] };

export function AccountPanel({ user }: { user: CurrentUser }) {
  return (
    <>
      <div>
        <h1>{user.name}</h1>
        <p className="meta">
          {user.email} · {ROLE_LABEL[user.role]}
        </p>
      </div>
      <TwoFactor enabled={user.twoFactorEnabled} />
      <ChangePassword />
      <div className="sec">
        <div className="row">
          <a className="c-btn ghost sm" href="/">
            Kembali
          </a>
          <span className="sp" />
          <button
            className="c-btn danger sm"
            onClick={async () => {
              await authClient.signOut();
              window.location.assign("/login");
            }}
          >
            Keluar
          </button>
        </div>
      </div>
    </>
  );
}

function TwoFactor({ enabled }: { enabled: boolean }) {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState<Setup | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function start(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { data, error } = await authClient.twoFactor.enable({ password });
    setBusy(false);
    if (error || !data || !("totpURI" in data)) return setError(authMessage(error));
    setPassword("");
    setSetup({ qr: await QRCode.toDataURL(data.totpURI, { margin: 1, width: 200 }), uri: data.totpURI, backupCodes: data.backupCodes });
  }

  async function confirm(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await authClient.twoFactor.verifyTotp({ code: code.trim() });
    setBusy(false);
    if (error) return setError(authMessage(error));
    window.location.reload();
  }

  async function disable(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await authClient.twoFactor.disable({ password });
    setBusy(false);
    if (error) return setError(authMessage(error));
    window.location.reload();
  }

  if (setup) {
    return (
      <div className="sec">
        <h2>Aktifkan verifikasi dua langkah</h2>
        <p className="muted">
          1. Pindai kode QR dengan aplikasi autentikator (Google Authenticator, Microsoft Authenticator, dan sejenisnya).
        </p>
        <img className="qr" src={setup.qr} alt="Kode QR untuk aplikasi autentikator" />
        <p className="meta">
          Atau masukkan manual: <code>{setup.uri}</code>
        </p>
        <p className="muted">2. Simpan kode cadangan ini di tempat aman. Tiap kode hanya berlaku sekali.</p>
        <div className="codes">
          {setup.backupCodes.map((c) => (
            <code key={c}>{c}</code>
          ))}
        </div>
        <form onSubmit={confirm}>
          <p className="muted">3. Masukkan kode 6 angka dari aplikasi untuk menyelesaikan.</p>
          {error && <div className="err" role="alert">{error}</div>}
          <div className="c-f">
            <label htmlFor="tf-code">Kode</label>
            <input id="tf-code" type="text" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required />
          </div>
          <button className="c-btn" disabled={busy}>
            {busy ? "Memeriksa…" : "Selesai"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <form className="sec" onSubmit={enabled ? disable : start}>
      <h2>Verifikasi dua langkah</h2>
      <p className="muted">
        {enabled
          ? "Aktif. Setiap masuk meminta kode dari aplikasi autentikator."
          : "Belum aktif. Sangat disarankan, terutama untuk Admin dan Editor."}
      </p>
      {error && <div className="err" role="alert">{error}</div>}
      <div className="c-f">
        <label htmlFor="tf-pass">Kata sandi Anda</label>
        <input id="tf-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <button className={enabled ? "c-btn danger" : "c-btn"} disabled={busy}>
        {enabled ? "Nonaktifkan" : "Aktifkan"}
      </button>
    </form>
  );
}

function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    if (next !== again) return setError("Kata sandi baru dan konfirmasinya tidak sama.");
    setBusy(true);
    const { error } = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: true,
    });
    setBusy(false);
    if (error) return setError(authMessage(error));
    setCurrent("");
    setNext("");
    setAgain("");
    setSaved(true);
  }

  return (
    <form className="sec" onSubmit={submit}>
      <h2>Ganti kata sandi</h2>
      {error && <div className="err" role="alert">{error}</div>}
      {saved && <div className="ok" role="status">Kata sandi diganti. Perangkat lain keluar otomatis.</div>}
      <div className="c-f">
        <label htmlFor="pw-current">Kata sandi saat ini</label>
        <input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
      </div>
      <div className="c-f">
        <label htmlFor="pw-next">Kata sandi baru</label>
        <input id="pw-next" type="password" autoComplete="new-password" minLength={12} value={next} onChange={(e) => setNext(e.target.value)} required />
        <small>Minimal 12 karakter.</small>
      </div>
      <div className="c-f">
        <label htmlFor="pw-again">Ulangi kata sandi baru</label>
        <input id="pw-again" type="password" autoComplete="new-password" minLength={12} value={again} onChange={(e) => setAgain(e.target.value)} required />
      </div>
      <button className="c-btn" disabled={busy}>
        {busy ? "Menyimpan…" : "Simpan"}
      </button>
    </form>
  );
}
