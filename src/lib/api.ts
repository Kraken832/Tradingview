import type { Candle, Interval, OrderSide, PublicUser, Quote, Symbol, Trade } from "@/types";

/** Thin client-side fetch wrapper that attaches the bearer token. */

const TOKEN_KEY = "tp_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(path, { ...init, headers });
  const data = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    const err: any = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data as T;
}

export const api = {
  register: (email: string, password: string) =>
    request<{ token: string; user: PublicUser }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string, totp?: string) =>
    request<{ token: string; user: PublicUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, totp }),
    }),

  me: () => request<{ user: PublicUser }>("/api/auth/me"),

  setup2fa: () =>
    request<{ secret: string; otpauthUri: string; qr: string }>("/api/auth/2fa/setup", {
      method: "POST",
    }),

  enable2fa: (totp: string) =>
    request<{ user: PublicUser }>("/api/auth/2fa/enable", {
      method: "POST",
      body: JSON.stringify({ totp }),
    }),

  disable2fa: (totp: string) =>
    request<{ user: PublicUser }>("/api/auth/2fa/disable", {
      method: "POST",
      body: JSON.stringify({ totp }),
    }),

  candles: (symbol: string, interval: Interval, limit = 300) =>
    request<{ symbol: string; interval: Interval; candles: Candle[] }>(
      `/api/market/candles?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=${limit}`
    ),

  quotes: (symbols: string[]) =>
    request<{ quotes: Quote[] }>(
      `/api/market/quote?symbols=${encodeURIComponent(symbols.join(","))}`
    ),

  search: (q: string) =>
    request<{ results: Symbol[] }>(`/api/market/search?q=${encodeURIComponent(q)}`),

  getWatchlist: () => request<{ watchlist: string[] }>("/api/watchlist"),

  addWatch: (symbol: string) =>
    request<{ watchlist: string[] }>("/api/watchlist", {
      method: "POST",
      body: JSON.stringify({ symbol }),
    }),

  removeWatch: (symbol: string) =>
    request<{ watchlist: string[] }>(`/api/watchlist?symbol=${encodeURIComponent(symbol)}`, {
      method: "DELETE",
    }),

  order: (symbol: string, side: OrderSide, qty: number) =>
    request<{ trade: Trade; user: PublicUser }>("/api/orders", {
      method: "POST",
      body: JSON.stringify({ symbol, side, qty }),
    }),

  saveWallet: (address: string) =>
    request<{ user: PublicUser }>("/api/profile/wallet", {
      method: "POST",
      body: JSON.stringify({ address }),
    }),

  removeWallet: () =>
    request<{ user: PublicUser }>("/api/profile/wallet", { method: "DELETE" }),
};
