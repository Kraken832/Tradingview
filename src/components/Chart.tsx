"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
  type CandlestickData,
  type LineData,
  type HistogramData,
} from "lightweight-charts";
import type { Candle, Interval } from "@/types";
import { api } from "@/lib/api";
import { bollinger, ema, macd, rsi, sma, type LinePoint } from "@/lib/indicators";
import { BINANCE_WS_BASE, binanceTicker } from "@/lib/providers/binance";
import { useStore } from "@/store/useStore";

export interface IndicatorFlags {
  sma: boolean;
  ema: boolean;
  bollinger: boolean;
  volume: boolean;
  rsi: boolean;
  macd: boolean;
}

interface Props {
  symbol: string;
  interval: Interval;
  chartType: "candles" | "line";
  indicators: IndicatorFlags;
}

const UP = "#26a69a";
const DOWN = "#ef5350";

const baseLayout = {
  background: { type: ColorType.Solid, color: "#131722" },
  textColor: "#b2b5be",
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
};
const baseGrid = {
  vertLines: { color: "#1e222d" },
  horzLines: { color: "#1e222d" },
};

function toLine(points: LinePoint[]): LineData[] {
  return points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value }));
}

export default function Chart({ symbol, interval, chartType, indicators }: Props) {
  const mainRef = useRef<HTMLDivElement>(null);
  const rsiRef = useRef<HTMLDivElement>(null);
  const macdRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let tickTimer: ReturnType<typeof setInterval> | null = null;
    let ws: WebSocket | null = null;
    const charts: IChartApi[] = [];

    async function build() {
      if (!mainRef.current) return;

      let candles: Candle[] = [];
      try {
        const res = await api.candles(symbol, interval, 300);
        candles = res.candles;
      } catch {
        return;
      }
      if (disposed || !mainRef.current || candles.length === 0) return;

      // ---- main price chart ----
      const main = createChart(mainRef.current, {
        layout: baseLayout,
        grid: baseGrid,
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: { borderColor: "#2a2e39" },
        timeScale: { borderColor: "#2a2e39", timeVisible: true, secondsVisible: false },
        autoSize: true,
      });
      charts.push(main);

      let priceSeries: ISeriesApi<"Candlestick"> | ISeriesApi<"Line">;
      if (chartType === "candles") {
        const s = main.addCandlestickSeries({
          upColor: UP,
          downColor: DOWN,
          borderVisible: false,
          wickUpColor: UP,
          wickDownColor: DOWN,
        });
        s.setData(
          candles.map(
            (c): CandlestickData => ({
              time: c.time as UTCTimestamp,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
            })
          )
        );
        priceSeries = s;
      } else {
        const s = main.addLineSeries({ color: "#2962ff", lineWidth: 2 });
        s.setData(candles.map((c): LineData => ({ time: c.time as UTCTimestamp, value: c.close })));
        priceSeries = s;
      }

      // ---- volume ----
      let volumeSeries: ISeriesApi<"Histogram"> | null = null;
      if (indicators.volume) {
        volumeSeries = main.addHistogramSeries({
          priceFormat: { type: "volume" },
          priceScaleId: "vol",
        });
        main.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
        volumeSeries.setData(
          candles.map(
            (c): HistogramData => ({
              time: c.time as UTCTimestamp,
              value: c.volume,
              color: c.close >= c.open ? "rgba(38,166,154,0.5)" : "rgba(239,83,80,0.5)",
            })
          )
        );
      }

      // ---- overlays ----
      if (indicators.sma) {
        const s = main.addLineSeries({ color: "#ffb74d", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
        s.setData(toLine(sma(candles, 20)));
      }
      if (indicators.ema) {
        const s = main.addLineSeries({ color: "#42a5f5", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
        s.setData(toLine(ema(candles, 50)));
      }
      if (indicators.bollinger) {
        const bb = bollinger(candles, 20, 2);
        const style = { lineWidth: 1 as const, priceLineVisible: false, lastValueVisible: false, lineStyle: LineStyle.Dashed };
        main.addLineSeries({ color: "#9575cd", ...style }).setData(toLine(bb.upper));
        main.addLineSeries({ color: "#9575cd", lineWidth: 1, priceLineVisible: false, lastValueVisible: false }).setData(toLine(bb.middle));
        main.addLineSeries({ color: "#9575cd", ...style }).setData(toLine(bb.lower));
      }

      // ---- RSI subchart ----
      let rsiSeries: ISeriesApi<"Line"> | null = null;
      if (indicators.rsi && rsiRef.current) {
        const rc = createChart(rsiRef.current, {
          layout: baseLayout,
          grid: baseGrid,
          rightPriceScale: { borderColor: "#2a2e39" },
          timeScale: { borderColor: "#2a2e39", timeVisible: true, secondsVisible: false },
          autoSize: true,
        });
        charts.push(rc);
        rsiSeries = rc.addLineSeries({ color: "#e040fb", lineWidth: 1 });
        rsiSeries.setData(toLine(rsi(candles, 14)));
        // 70 / 30 guide lines
        rsiSeries.createPriceLine({ price: 70, color: "#ef5350", lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: true, title: "" });
        rsiSeries.createPriceLine({ price: 30, color: "#26a69a", lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: true, title: "" });
        syncTimeScale(main, rc);
      }

      // ---- MACD subchart ----
      let macdHist: ISeriesApi<"Histogram"> | null = null;
      let macdLine: ISeriesApi<"Line"> | null = null;
      let macdSignal: ISeriesApi<"Line"> | null = null;
      if (indicators.macd && macdRef.current) {
        const mc = createChart(macdRef.current, {
          layout: baseLayout,
          grid: baseGrid,
          rightPriceScale: { borderColor: "#2a2e39" },
          timeScale: { borderColor: "#2a2e39", timeVisible: true, secondsVisible: false },
          autoSize: true,
        });
        charts.push(mc);
        const m = macd(candles);
        macdHist = mc.addHistogramSeries({ priceLineVisible: false });
        macdHist.setData(
          m.histogram.map((p): HistogramData => ({
            time: p.time as UTCTimestamp,
            value: p.value,
            color: p.value >= 0 ? "rgba(38,166,154,0.6)" : "rgba(239,83,80,0.6)",
          }))
        );
        macdLine = mc.addLineSeries({ color: "#2962ff", lineWidth: 1, priceLineVisible: false });
        macdLine.setData(toLine(m.macd));
        macdSignal = mc.addLineSeries({ color: "#ff9800", lineWidth: 1, priceLineVisible: false });
        macdSignal.setData(toLine(m.signal));
        syncTimeScale(main, mc);
      }

      main.timeScale().fitContent();

      // ---- live updates ----
      const ticker = binanceTicker(symbol); // non-null only for crypto
      if (ticker) {
        // REAL live data: subscribe to Binance's kline WebSocket stream. Each
        // message updates the currently-forming bar (and opens a new one when
        // the interval rolls over).
        const stream = `${ticker.toLowerCase()}@kline_${interval}`;
        ws = new WebSocket(`${BINANCE_WS_BASE}/${stream}`);
        ws.onmessage = (ev) => {
          if (disposed) return;
          let k: any;
          try {
            k = JSON.parse(ev.data).k;
          } catch {
            return;
          }
          if (!k) return;
          const t = Math.floor(k.t / 1000) as UTCTimestamp;
          const o = Number(k.o);
          const c = Number(k.c);
          useStore.getState().setPrice(symbol, c); // feed live P&L
          if (chartType === "candles") {
            (priceSeries as ISeriesApi<"Candlestick">).update({
              time: t,
              open: o,
              high: Number(k.h),
              low: Number(k.l),
              close: c,
            });
          } else {
            (priceSeries as ISeriesApi<"Line">).update({ time: t, value: c });
          }
          if (volumeSeries) {
            volumeSeries.update({
              time: t,
              value: Number(k.v),
              color: c >= o ? "rgba(38,166,154,0.5)" : "rgba(239,83,80,0.5)",
            });
          }
        };
      } else {
        // Fallback for non-crypto (no key-free real feed): simulate ticks with a
        // small random walk on the most recent bar so the chart still feels live.
        let last = candles[candles.length - 1];
        tickTimer = setInterval(() => {
          if (disposed) return;
          const drift = last.close * (Math.random() - 0.5) * 0.0015;
          const close = +(last.close + drift).toFixed(last.close >= 1 ? 3 : 5);
          const high = Math.max(last.high, close);
          const low = Math.min(last.low, close);
          last = { ...last, close, high, low };
          const t = last.time as UTCTimestamp;
          useStore.getState().setPrice(symbol, close); // feed live P&L
          if (chartType === "candles") {
            (priceSeries as ISeriesApi<"Candlestick">).update({ time: t, open: last.open, high, low, close });
          } else {
            (priceSeries as ISeriesApi<"Line">).update({ time: t, value: close });
          }
        }, 1000);
      }
    }

    build();

    return () => {
      disposed = true;
      if (tickTimer) clearInterval(tickTimer);
      if (ws) {
        ws.onmessage = null;
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      }
      for (const c of charts) c.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, interval, chartType, JSON.stringify(indicators)]);

  return (
    <div className="flex flex-col h-full gap-1">
      <div ref={mainRef} className="flex-1 min-h-0" />
      {indicators.rsi && (
        <div className="relative h-28 shrink-0">
          <span className="absolute left-2 top-1 z-10 text-[11px] text-muted">RSI 14</span>
          <div ref={rsiRef} className="h-full" />
        </div>
      )}
      {indicators.macd && (
        <div className="relative h-28 shrink-0">
          <span className="absolute left-2 top-1 z-10 text-[11px] text-muted">MACD 12 26 9</span>
          <div ref={macdRef} className="h-full" />
        </div>
      )}
    </div>
  );
}

/** Keep a subchart's time scale in lock-step with the main chart. */
function syncTimeScale(main: IChartApi, sub: IChartApi) {
  let syncing = false;
  const mts = main.timeScale();
  const sts = sub.timeScale();
  mts.subscribeVisibleLogicalRangeChange((range) => {
    if (syncing || !range) return;
    syncing = true;
    sts.setVisibleLogicalRange(range);
    syncing = false;
  });
  sts.subscribeVisibleLogicalRangeChange((range) => {
    if (syncing || !range) return;
    syncing = true;
    mts.setVisibleLogicalRange(range);
    syncing = false;
  });
}
