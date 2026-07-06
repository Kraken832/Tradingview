"use client";

import { useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { getSymbol } from "@/lib/symbols";
import { useStore } from "@/store/useStore";
import { summarize, valuePosition } from "@/lib/portfolio";
import { fmtMoney, fmtNum, fmtPct, fmtPnl } from "@/lib/format";
import { STARTING_CASH } from "@/types";

/** Positions table + account summary with real-time (live-price) P&L. */
export default function Positions() {
  const { user, prices, symbol, setSymbol, setPrices, setUser } = useStore();
  const positions = user?.positions ?? [];

  // Poll live prices for every held symbol so P&L stays current even for
  // positions that aren't the active chart symbol.
  useEffect(() => {
    if (positions.length === 0) return;
    const symbols = positions.map((p) => p.symbol);
    let active = true;
    async function load() {
      try {
        const { quotes } = await api.quotes(symbols);
        if (!active) return;
        const map: Record<string, number> = {};
        for (const q of quotes) map[q.symbol] = q.price;
        setPrices(map);
      } catch {
        /* ignore */
      }
    }
    load();
    const t = setInterval(load, 2500);
    return () => {
      active = false;
      clearInterval(t);
    };
    // re-run when the set of held symbols changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions.map((p) => p.symbol).join(","), setPrices]);

  const valuations = useMemo(
    () =>
      positions.map((p) => valuePosition(p, prices[p.symbol] ?? p.avgPrice)),
    [positions, prices]
  );

  const summary = useMemo(
    () => summarize(user?.cash ?? 0, user?.realizedPnl ?? 0, valuations),
    [user?.cash, user?.realizedPnl, valuations]
  );

  const totalPnl = summary.equity - STARTING_CASH; // realized + unrealized vs start

  async function closePosition(sym: string, qty: number) {
    try {
      const res = await api.order(sym, "sell", qty);
      setUser(res.user);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="panel flex flex-col h-full">
      {/* summary bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-3 py-2 border-b border-bg-border text-xs">
        <Metric label="Equity" value={fmtMoney(summary.equity)} />
        <Metric label="Cash" value={fmtMoney(summary.cash)} />
        <Metric label="Positions" value={fmtMoney(summary.positionsValue)} />
        <Metric
          label="Unrealized P&L"
          value={fmtPnl(summary.unrealizedPnl)}
          tone={summary.unrealizedPnl >= 0 ? "up" : "down"}
        />
        <Metric
          label="Realized P&L"
          value={fmtPnl(summary.realizedPnl)}
          tone={summary.realizedPnl >= 0 ? "up" : "down"}
        />
        <Metric
          label="Total P&L"
          value={`${fmtPnl(totalPnl)} (${fmtPct((totalPnl / STARTING_CASH) * 100)})`}
          tone={totalPnl >= 0 ? "up" : "down"}
        />
      </div>

      {/* positions table */}
      <div className="flex-1 overflow-auto">
        {valuations.length === 0 ? (
          <p className="text-muted text-sm p-3">
            No open positions. Use the Trade panel to buy a symbol.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted sticky top-0 bg-bg-soft">
              <tr>
                <th className="text-left font-normal px-3 py-1.5">Symbol</th>
                <th className="text-right font-normal px-3 py-1.5">Qty</th>
                <th className="text-right font-normal px-3 py-1.5">Avg</th>
                <th className="text-right font-normal px-3 py-1.5">Last</th>
                <th className="text-right font-normal px-3 py-1.5">Value</th>
                <th className="text-right font-normal px-3 py-1.5">Unrealized P&L</th>
                <th className="px-3 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {valuations.map((v) => {
                const meta = getSymbol(v.symbol);
                const up = v.unrealizedPnl >= 0;
                return (
                  <tr key={v.symbol} className="border-t border-bg-border hover:bg-bg-panel">
                    <td className="px-3 py-1.5">
                      <button
                        className="font-medium text-gray-100 hover:text-accent"
                        onClick={() => setSymbol(v.symbol)}
                      >
                        {meta?.ticker ?? v.symbol}
                      </button>
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmtNum(v.qty)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-muted">{fmtNum(v.avgPrice)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmtNum(v.price)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmtMoney(v.marketValue)}</td>
                    <td className={`px-3 py-1.5 text-right tabular-nums ${up ? "text-accent-up" : "text-accent-down"}`}>
                      {fmtPnl(v.unrealizedPnl)}{" "}
                      <span className="text-[11px]">({fmtPct(v.unrealizedPct)})</span>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <button
                        className="btn-ghost !px-2 !py-0.5 text-[11px]"
                        onClick={() => closePosition(v.symbol, v.qty)}
                      >
                        Close
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  const color = tone === "up" ? "text-accent-up" : tone === "down" ? "text-accent-down" : "text-gray-100";
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted">{label}</span>
      <span className={`tabular-nums font-medium ${color}`}>{value}</span>
    </div>
  );
}
