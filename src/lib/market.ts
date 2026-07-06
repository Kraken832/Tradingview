import type { Candle, Interval, Quote } from "@/types";
import { getSymbol } from "@/lib/symbols";
import { fetchBinanceCandles, fetchBinanceQuote, isCryptoSymbol } from "@/lib/providers/binance";

/**
 * Market-data access layer.
 *
 * - Crypto symbols return REAL data from Binance's public API (no key).
 * - Everything else (stocks/forex/commodities/indices/futures — which need a
 *   paid provider) falls back to the deterministic mock generator below, as
 *   does any Binance request that fails, so the app always renders.
 *
 * The deterministic mock is a pure function of (symbol, interval, bar-time), so
 * repeated requests return identical history and overlapping windows line up.
 * To add real stock/forex data, plug a provider (Polygon, Finnhub, Alpaca) into
 * `getCandles`/`getQuote` the same way Binance is wired here.
 */

export const INTERVAL_SECONDS: Record<Interval, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
};

export function isInterval(v: string): v is Interval {
  return v in INTERVAL_SECONDS;
}

// 32-bit hash → float in [0, 1). Stable across runs and platforms.
function hash01(seed: number): number {
  let x = seed | 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = (x ^ (x >>> 16)) >>> 0;
  return x / 4294967296;
}

function strSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}

// Deterministic close price for a given bar index.
function closeAt(symbolId: string, basePrice: number, intervalSec: number, barIndex: number): number {
  const base = strSeed(symbolId + ":" + intervalSec);
  const slow = Math.sin(barIndex / 220 + (base % 100)) * 0.09;
  const mid = Math.sin(barIndex / 47 + (base % 233)) * 0.035;
  const fast = Math.sin(barIndex / 11 + (base % 71)) * 0.012;
  const noise = (hash01(base ^ (barIndex * 2654435761)) - 0.5) * 0.01;
  const factor = 1 + slow + mid + fast + noise;
  return round(basePrice * factor, basePrice);
}

function round(v: number, ref: number): number {
  // more decimals for low-priced instruments (forex, small crypto)
  const decimals = ref >= 1000 ? 2 : ref >= 1 ? 3 : 5;
  const p = Math.pow(10, decimals);
  return Math.round(v * p) / p;
}

function mockCandles(symbolId: string, interval: Interval, limit = 300): Candle[] {
  const sym = getSymbol(symbolId);
  if (!sym) return [];
  const intervalSec = INTERVAL_SECONDS[interval];
  const nowBar = Math.floor(Date.now() / 1000 / intervalSec);
  const count = Math.min(Math.max(limit, 1), 1000);
  const candles: Candle[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const barIndex = nowBar - i;
    const time = barIndex * intervalSec;
    const open = closeAt(symbolId, sym.basePrice, intervalSec, barIndex - 1);
    const close = closeAt(symbolId, sym.basePrice, intervalSec, barIndex);
    const spread = sym.basePrice * (0.002 + hash01(strSeed(symbolId) ^ barIndex) * 0.004);
    const high = round(Math.max(open, close) + spread * hash01(barIndex ^ 7), sym.basePrice);
    const low = round(Math.min(open, close) - spread * hash01(barIndex ^ 13), sym.basePrice);
    const volume = Math.round(
      (0.5 + hash01(barIndex ^ 101)) * sym.basePrice * 40 * (interval === "1d" ? 24 : 1)
    );
    candles.push({ time, open, high, low, close, volume });
  }
  return candles;
}

function mockQuote(symbolId: string): Quote | null {
  const sym = getSymbol(symbolId);
  if (!sym) return null;
  const candles = mockCandles(symbolId, "1m", 2);
  if (candles.length < 2) return null;
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const change = round(last.close - prev.close, sym.basePrice);
  const changePercent = Math.round((change / prev.close) * 10000) / 100;
  return { symbol: symbolId, price: last.close, change, changePercent, time: last.time };
}

// ---- public API: real data first, mock fallback -----------------------------

export async function getCandles(
  symbolId: string,
  interval: Interval,
  limit = 300
): Promise<Candle[]> {
  if (isCryptoSymbol(symbolId)) {
    const real = await fetchBinanceCandles(symbolId, interval, limit);
    if (real && real.length > 0) return real;
  }
  return mockCandles(symbolId, interval, limit);
}

export async function getQuote(symbolId: string): Promise<Quote | null> {
  if (isCryptoSymbol(symbolId)) {
    const real = await fetchBinanceQuote(symbolId);
    if (real) return real;
  }
  return mockQuote(symbolId);
}
