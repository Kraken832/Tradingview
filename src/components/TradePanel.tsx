"use client";

import { useMemo, useState } from "react";
import type { OrderSide } from "@/types";
import { api } from "@/lib/api";
import { getSymbol } from "@/lib/symbols";
import { useStore } from "@/store/useStore";
import { fmtMoney, fmtNum } from "@/lib/format";

export default function TradePanel() {
  const { user, symbol, prices, setUser } = useStore();
  const [qty, setQty] = useState("1");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const meta = getSymbol(symbol);
  const price = prices[symbol] ?? 0;
  const quantity = Number(qty);
  const validQty = Number.isFinite(quantity) && quantity > 0;
  const notional = validQty && price > 0 ? quantity * price : 0;

  const holding = useMemo(
    () => user?.positions.find((p) => p.symbol === symbol),
    [user?.positions, symbol]
  );

  async function submit(side: OrderSide) {
    if (!validQty) {
      setMsg({ kind: "err", text: "Enter a quantity greater than zero" });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await api.order(symbol, side, quantity);
      setUser(res.user);
      const t = res.trade;
      setMsg({
        kind: "ok",
        text: `${side === "buy" ? "Bought" : "Sold"} ${fmtNum(t.qty)} ${meta?.ticker} @ ${fmtNum(
          t.price
        )}${side === "sell" ? `  (P&L ${fmtMoney(t.realizedPnl)})` : ""}`,
      });
    } catch (e: any) {
      setMsg({ kind: "err", text: e.message || "Order failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-muted">Trade</span>
        <span className="text-xs text-muted">
          Cash <span className="text-gray-100 tabular-nums">{fmtMoney(user?.cash ?? 0)}</span>
        </span>
      </div>

      <div className="flex items-baseline justify-between mb-2">
        <div className="text-sm font-semibold text-gray-100">{meta?.ticker ?? symbol}</div>
        <div className="tabular-nums text-sm text-gray-100">{price > 0 ? fmtNum(price) : "—"}</div>
      </div>

      <label className="text-[11px] text-muted">Quantity</label>
      <div className="flex gap-2 mt-1">
        <input
          className="input flex-1"
          type="number"
          min="0"
          step="any"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
        <div className="flex gap-1">
          {["0.5", "1", "5"].map((q) => (
            <button key={q} className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setQty(q)}>
              {q}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between text-[11px] text-muted mt-2">
        <span>Order value</span>
        <span className="tabular-nums text-gray-200">{fmtMoney(notional)}</span>
      </div>
      {holding && (
        <div className="flex justify-between text-[11px] text-muted">
          <span>Holding</span>
          <span className="tabular-nums text-gray-200">
            {fmtNum(holding.qty)} @ {fmtNum(holding.avgPrice)}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          className="btn !bg-accent-up text-white hover:opacity-90"
          disabled={busy || price <= 0}
          onClick={() => submit("buy")}
        >
          Buy
        </button>
        <button
          className="btn !bg-accent-down text-white hover:opacity-90"
          disabled={busy || price <= 0 || !holding}
          onClick={() => submit("sell")}
        >
          Sell
        </button>
      </div>

      {msg && (
        <p className={`text-[11px] mt-2 ${msg.kind === "ok" ? "text-accent-up" : "text-accent-down"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
