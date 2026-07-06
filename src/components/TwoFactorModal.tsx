"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/store/useStore";

export default function TwoFactorModal({ onClose }: { onClose: () => void }) {
  const { user, setUser } = useStore();
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [totp, setTotp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const enabled = user?.twoFactorEnabled;

  async function startSetup() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.setup2fa();
      setQr(res.qr);
      setSecret(res.secret);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const { user } = await api.enable2fa(totp.trim());
      setUser(user);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const { user } = await api.disable2fa(totp.trim());
      setUser(user);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4" onMouseDown={onClose}>
      <div className="w-full max-w-md panel p-6" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Two-Factor Authentication</h2>
          <button className="text-muted hover:text-gray-200" onClick={onClose}>✕</button>
        </div>

        {enabled ? (
          <>
            <p className="text-sm text-accent-up mb-4">✓ 2FA is currently enabled on your account.</p>
            <label className="text-xs text-muted">Enter a current code to disable</label>
            <input
              className="input mt-1 text-center tracking-widest"
              placeholder="000000"
              inputMode="numeric"
              maxLength={6}
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
            />
            {error && <p className="text-sm text-accent-down mt-2">{error}</p>}
            <button className="btn-ghost w-full mt-4" onClick={disable} disabled={busy}>
              Disable 2FA
            </button>
          </>
        ) : !qr ? (
          <>
            <p className="text-sm text-muted mb-4">
              Protect your account with a time-based one-time password (TOTP) from apps like Google
              Authenticator or Authy.
            </p>
            <button className="btn-primary w-full" onClick={startSetup} disabled={busy}>
              {busy ? "Preparing…" : "Begin setup"}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted mb-3">1. Scan this QR code with your authenticator app:</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="2FA QR code" className="mx-auto rounded bg-white p-2" width={180} height={180} />
            <p className="text-[11px] text-muted text-center mt-2 break-all">
              Manual key: <span className="font-mono">{secret}</span>
            </p>
            <p className="text-sm text-muted mt-4 mb-1">2. Enter the 6-digit code to confirm:</p>
            <input
              className="input text-center tracking-widest"
              placeholder="000000"
              inputMode="numeric"
              maxLength={6}
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
            />
            {error && <p className="text-sm text-accent-down mt-2">{error}</p>}
            <button className="btn-primary w-full mt-4" onClick={confirm} disabled={busy}>
              Enable 2FA
            </button>
          </>
        )}
      </div>
    </div>
  );
}
