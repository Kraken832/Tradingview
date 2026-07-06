import type { Candle } from "@/types";

/**
 * Technical-indicator math. Pure functions over candle arrays returning
 * { time, value } points aligned to candle time, ready for lightweight-charts
 * line series. Leading bars without enough data are omitted.
 */

export interface LinePoint {
  time: number;
  value: number;
}

export function sma(candles: Candle[], period: number): LinePoint[] {
  const out: LinePoint[] = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) sum -= candles[i - period].close;
    if (i >= period - 1) out.push({ time: candles[i].time, value: sum / period });
  }
  return out;
}

export function ema(candles: Candle[], period: number): LinePoint[] {
  const out: LinePoint[] = [];
  if (candles.length < period) return out;
  const k = 2 / (period + 1);
  // seed with SMA of first `period` closes
  let prev = 0;
  for (let i = 0; i < period; i++) prev += candles[i].close;
  prev /= period;
  out.push({ time: candles[period - 1].time, value: prev });
  for (let i = period; i < candles.length; i++) {
    prev = candles[i].close * k + prev * (1 - k);
    out.push({ time: candles[i].time, value: prev });
  }
  return out;
}

export function rsi(candles: Candle[], period = 14): LinePoint[] {
  const out: LinePoint[] = [];
  if (candles.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  const push = (i: number) => {
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const value = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
    out.push({ time: candles[i].time, value: Math.round(value * 100) / 100 });
  };
  push(period);
  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const g = diff >= 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    push(i);
  }
  return out;
}

export interface MacdResult {
  macd: LinePoint[];
  signal: LinePoint[];
  histogram: LinePoint[];
}

export function macd(candles: Candle[], fast = 12, slow = 26, signalPeriod = 9): MacdResult {
  const emaFast = ema(candles, fast);
  const emaSlow = ema(candles, slow);
  const slowMap = new Map(emaSlow.map((p) => [p.time, p.value]));
  const macdLine: LinePoint[] = [];
  for (const p of emaFast) {
    const s = slowMap.get(p.time);
    if (s !== undefined) macdLine.push({ time: p.time, value: p.value - s });
  }
  // signal = EMA of the MACD line
  const signal: LinePoint[] = [];
  if (macdLine.length >= signalPeriod) {
    const k = 2 / (signalPeriod + 1);
    let prev = 0;
    for (let i = 0; i < signalPeriod; i++) prev += macdLine[i].value;
    prev /= signalPeriod;
    signal.push({ time: macdLine[signalPeriod - 1].time, value: prev });
    for (let i = signalPeriod; i < macdLine.length; i++) {
      prev = macdLine[i].value * k + prev * (1 - k);
      signal.push({ time: macdLine[i].time, value: prev });
    }
  }
  const signalMap = new Map(signal.map((p) => [p.time, p.value]));
  const histogram: LinePoint[] = macdLine
    .filter((p) => signalMap.has(p.time))
    .map((p) => ({ time: p.time, value: p.value - (signalMap.get(p.time) as number) }));
  return { macd: macdLine, signal, histogram };
}

export interface BollingerResult {
  upper: LinePoint[];
  middle: LinePoint[];
  lower: LinePoint[];
}

export function bollinger(candles: Candle[], period = 20, mult = 2): BollingerResult {
  const upper: LinePoint[] = [];
  const middle: LinePoint[] = [];
  const lower: LinePoint[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += candles[j].close;
    const mean = sum / period;
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) variance += (candles[j].close - mean) ** 2;
    const sd = Math.sqrt(variance / period);
    const t = candles[i].time;
    middle.push({ time: t, value: mean });
    upper.push({ time: t, value: mean + mult * sd });
    lower.push({ time: t, value: mean - mult * sd });
  }
  return { upper, middle, lower };
}
