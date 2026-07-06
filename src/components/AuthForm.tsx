"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, setStoredToken } from "@/lib/api";
import { useStore } from "@/store/useStore";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const setUser = useStore((s) => s.setUser);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [needTotp, setNeedTotp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isLogin = mode === "login";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = isLogin
        ? await api.login(email, password, needTotp ? totp : undefined)
        : await api.register(email, password);
      setStoredToken(res.token);
      setUser(res.user);
      router.push("/dashboard");
    } catch (err: any) {
      if (err?.data?.twoFactorRequired) {
        setNeedTotp(true);
        setError(needTotp ? "Invalid 2FA code" : "Enter your 6-digit authenticator code");
      } else {
        setError(err.message || "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm panel p-8">
        <div className="mb-6 text-center">
          <div className="text-accent text-2xl font-bold tracking-tight">◆ TradePlatform</div>
          <p className="text-muted text-sm mt-1">
            {isLogin ? "Sign in to your account" : "Create your account"}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted">Email</label>
            <input
              className="input mt-1"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs text-muted">Password</label>
            <input
              className="input mt-1"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            {!isLogin && (
              <p className="text-[11px] text-muted mt-1">Minimum 8 characters.</p>
            )}
          </div>

          {needTotp && (
            <div>
              <label className="text-xs text-muted">Authenticator code</label>
              <input
                className="input mt-1 tracking-widest text-center"
                inputMode="numeric"
                placeholder="000000"
                value={totp}
                onChange={(e) => setTotp(e.target.value)}
                maxLength={6}
              />
            </div>
          )}

          {error && <p className="text-sm text-accent-down">{error}</p>}

          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="text-sm text-muted text-center mt-6">
          {isLogin ? (
            <>
              No account?{" "}
              <Link href="/register" className="text-accent hover:underline">
                Register
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="text-accent hover:underline">
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
