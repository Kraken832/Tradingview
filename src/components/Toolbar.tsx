"use client";

import type { Interval } from "@/types";
import type { IndicatorFlags } from "@/components/Chart";

const INTERVALS: Interval[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

const INDICATORS: { key: keyof IndicatorFlags; label: string }[] = [
  { key: "sma", label: "SMA 20" },
  { key: "ema", label: "EMA 50" },
  { key: "bollinger", label: "BB" },
  { key: "volume", label: "Vol" },
  { key: "rsi", label: "RSI" },
  { key: "macd", label: "MACD" },
];

interface Props {
  interval: Interval;
  onInterval: (i: Interval) => void;
  chartType: "candles" | "line";
  onChartType: (t: "candles" | "line") => void;
  indicators: IndicatorFlags;
  onToggleIndicator: (k: keyof IndicatorFlags) => void;
}

export default function Toolbar({
  interval,
  onInterval,
  chartType,
  onChartType,
  indicators,
  onToggleIndicator,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-3 py-2 border-b border-bg-border bg-bg-soft">
      <div className="flex items-center gap-1">
        {INTERVALS.map((i) => (
          <button
            key={i}
            onClick={() => onInterval(i)}
            className={`px-2 py-1 rounded text-xs font-medium ${
              interval === i ? "bg-accent text-white" : "text-muted hover:bg-bg-panel"
            }`}
          >
            {i}
          </button>
        ))}
      </div>

      <div className="h-5 w-px bg-bg-border" />

      <div className="flex items-center gap-1">
        {(["candles", "line"] as const).map((t) => (
          <button
            key={t}
            onClick={() => onChartType(t)}
            className={`px-2 py-1 rounded text-xs font-medium capitalize ${
              chartType === t ? "bg-bg-panel text-gray-100" : "text-muted hover:bg-bg-panel"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="h-5 w-px bg-bg-border" />

      <div className="flex items-center gap-1">
        {INDICATORS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onToggleIndicator(key)}
            className={`px-2 py-1 rounded text-xs font-medium ${
              indicators[key] ? "bg-accent/20 text-accent border border-accent/40" : "text-muted hover:bg-bg-panel border border-transparent"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
