"use client";

import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { authMessage } from "@/lib/auth-errors";

type Step = "password" | "code";

export function LoginForm() {
  const [step, setStep] = useState<Step>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [useBackup, setUseBackup] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const done = () => window.location.assign("/");

  async function submitPassword(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { data, error } = await authClient.signIn.email({ email, password });
    setBusy(false);
    if (error) return setError(authMessage(error));
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) return setStep("code");
    done();
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = useBackup
      ? await authClient.twoFactor.verifyBackupCode({ code: code.trim() })
      : await authClient.twoFactor.verifyTotp({ code: code.trim() });
    setBusy(false);
    if (error) return setError(authMessage(error));
    done();
  }

  if (step === "code") {
    return (
      <form onSubmit={submitCode}>
        <h1>Verifikasi dua langkah</h1>
        <p className="muted">
          {useBackup
            ? "Masukkan salah satu kode cadangan Anda."
            : "Masukkan kode 6 angka dari aplikasi autentikator Anda."}
        </p>
        {error && <div className="err" role="alert">{error}</div>}
        <div className="c-f">
          <label htmlFor="code">{useBackup ? "Kode cadangan" : "Kode"}</label>
          <input
            id="code"
            type="text"
            inputMode={useBackup ? "text" : "numeric"}
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
            required
          />
        </div>
        <div className="row">
          <button
            type="button"
            className="c-btn ghost sm"
            onClick={() => {
              setUseBackup(!useBackup);
              setCode("");
              setError("");
            }}
          >
            {useBackup ? "Pakai kode autentikator" : "Pakai kode cadangan"}
          </button>
          <span className="sp" />
          <button className="c-btn" disabled={busy}>
            {busy ? "Memeriksa…" : "Verifikasi"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submitPassword}>
      <h1>Masuk</h1>
      <p className="muted">Khusus untuk pengelola situs MMI.</p>
      {error && <div className="err" role="alert">{error}</div>}
      <div className="c-f">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
      </div>
      <div className="c-f">
        <label htmlFor="password">Kata sandi</label>
        <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <button className="c-btn" disabled={busy}>
        {busy ? "Memeriksa…" : "Masuk"}
      </button>
    </form>
  );
}
