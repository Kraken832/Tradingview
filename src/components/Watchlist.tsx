"use client";

import { useEffect, useRef, useState } from "react";
import type { Quote } from "@/types";
import { api } from "@/lib/api";
import { getSymbol } from "@/lib/symbols";
import { useStore } from "@/store/useStore";

export default function Watchlist() {
  const { watchlist, symbol, setSymbol, setWatchlist } = useStore();
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function load() {
      if (watchlist.length === 0) {
        setQuotes({});
        return;
      }
      try {
        const { quotes } = await api.quotes(watchlist);
        const map: Record<string, Quote> = {};
        for (const q of quotes) map[q.symbol] = q;
        setQuotes(map);
      } catch {
        /* ignore */
      }
    }
    load();
    timer.current = setInterval(load, 4000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [watchlist]);

  async function remove(sym: string) {
    try {
      const { watchlist } = await api.removeWatch(sym);
      setWatchlist(watchlist);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="panel flex flex-col h-full">
      <div className="px-3 py-2 border-b border-bg-border text-xs uppercase tracking-wide text-muted">
        Watchlist
      </div>
      <div className="flex-1 overflow-auto">
        {watchlist.length === 0 && (
          <p className="text-muted text-sm p-3">Search a symbol and add it to your watchlist.</p>
        )}
        {watchlist.map((sym) => {
          const meta = getSymbol(sym);
          const q = quotes[sym];
          const up = (q?.change ?? 0) >= 0;
          return (
            <div
              key={sym}
              className={`group flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-bg-panel ${
                sym === symbol ? "bg-bg-panel" : ""
              }`}
              onClick={() => setSymbol(sym)}
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-100 truncate">
                  {meta?.ticker ?? sym}
                </div>
                <div className="text-[11px] text-muted truncate">{meta?.name ?? ""}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-sm tabular-nums text-gray-100">
                    {q ? q.price : "—"}
                  </div>
                  <div className={`text-[11px] tabular-nums ${up ? "text-accent-up" : "text-accent-down"}`}>
                    {q ? `${up ? "+" : ""}${q.changePercent}%` : ""}
                  </div>
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 text-muted hover:text-accent-down px-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(sym);
                  }}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
