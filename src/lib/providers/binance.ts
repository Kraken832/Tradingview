import type { Candle, Interval, Quote } from "@/types";
import { getSymbol } from "@/lib/symbols";

/**
 * Real market data from Binance's public endpoints — no API key required.
 *
 * We use the `binance.vision` public data proxy, which serves the same market
 * data as the main API but is auth-free and less geo-restricted. Only crypto
 * symbols (assetClass === "crypto") are supported here; other asset classes
 * need a paid provider and fall back to the mock feed in `market.ts`.
 *
 * Docs: https://developers.binance.com/docs/binance-spot-api-docs/rest-api
 */

const REST_BASE = "https://data-api.binance.vision";

/** WebSocket base for browser live streams (used client-side in the chart). */
export const BINANCE_WS_BASE = "wss://data-stream.binance.vision/ws";

/** Our Interval strings already match Binance's interval codes 1:1. */
export function isCryptoSymbol(symbolId: string): boolean {
  return getSymbol(symbolId)?.assetClass === "crypto";
}

/** "BINANCE:BTCUSDT" -> "BTCUSDT" (the Binance ticker). */
export function binanceTicker(symbolId: string): string | null {
  const sym = getSymbol(symbolId);
  if (!sym || sym.assetClass !== "crypto") return null;
  return sym.ticker;
}

interface RawKline extends Array<number | string> {}

export async function fetchBinanceCandles(
  symbolId: string,
  interval: Interval,
  limit: number
): Promise<Candle[] | null> {
  const ticker = binanceTicker(symbolId);
  if (!ticker) return null;

  const url = `${REST_BASE}/api/v3/klines?symbol=${ticker}&interval=${interval}&limit=${Math.min(
    Math.max(limit, 1),
    1000
  )}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const rows = (await res.json()) as RawKline[];
    return rows.map((r): Candle => ({
      time: Math.floor(Number(r[0]) / 1000), // openTime ms -> unix seconds
      open: Number(r[1]),
      high: Number(r[2]),
      low: Number(r[3]),
      close: Number(r[4]),
      volume: Number(r[5]),
    }));
  } catch {
    return null;
  }
}

export async function fetchBinanceQuote(symbolId: string): Promise<Quote | null> {
  const ticker = binanceTicker(symbolId);
  if (!ticker) return null;

  const url = `${REST_BASE}/api/v3/ticker/24hr?symbol=${ticker}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const d = (await res.json()) as {
      lastPrice: string;
      priceChange: string;
      priceChangePercent: string;
      closeTime: number;
    };
    return {
      symbol: symbolId,
      price: Number(d.lastPrice),
      change: Number(d.priceChange),
      changePercent: Number(Number(d.priceChangePercent).toFixed(2)),
      time: Math.floor(Number(d.closeTime) / 1000),
    };
  } catch {
    return null;
  }
}
