"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { Quote } from "@/types";
import { api } from "@/lib/api";
import { getSymbol } from "@/lib/symbols";
import { useStore } from "@/store/useStore";
import type { IndicatorFlags } from "@/components/Chart";
import Toolbar from "@/components/Toolbar";
import SymbolSearch from "@/components/SymbolSearch";
import Watchlist from "@/components/Watchlist";
import TradePanel from "@/components/TradePanel";
import Positions from "@/components/Positions";
import TwoFactorModal from "@/components/TwoFactorModal";
import WalletModal from "@/components/WalletModal";
import { shortAddress } from "@/lib/web3";

// Charts touch the DOM/canvas — load client-side only.
const Chart = dynamic(() => import("@/components/Chart"), { ssr: false });

export default function DashboardPage() {
  const router = useRouter();
  const { user, authReady, bootstrap, logout, symbol, setSymbol, interval, setInterval: setIv, setWatchlist, setPrice } =
    useStore();

  const [chartType, setChartType] = useState<"candles" | "line">("candles");
  const [indicators, setIndicators] = useState<IndicatorFlags>({
    sma: true,
    ema: false,
    bollinger: false,
    volume: true,
    rsi: true,
    macd: false,
  });
  const [quote, setQuote] = useState<Quote | null>(null);
  const [show2fa, setShow2fa] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // auth gate
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (authReady && !user) router.replace("/login");
  }, [authReady, user, router]);

  // header quote for the active symbol
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { quotes } = await api.quotes([symbol]);
        if (active && quotes[0]) {
          setQuote(quotes[0]);
          setPrice(symbol, quotes[0].price); // seed live price for trade/P&L
        }
      } catch {
        /* ignore */
      }
    }
    load();
    const t = window.setInterval(load, 4000);
    return () => {
      active = false;
      window.clearInterval(t);
    };
  }, [symbol, setPrice]);

  if (!authReady || !user) {
    return <div className="min-h-screen grid place-items-center text-muted">Loading…</div>;
  }

  const meta = getSymbol(symbol);
  const inWatch = user.watchlist.includes(symbol);
  const up = (quote?.change ?? 0) >= 0;

  async function toggleWatch() {
    try {
      const res = inWatch ? await api.removeWatch(symbol) : await api.addWatch(symbol);
      setWatchlist(res.watchlist);
    } catch {
      /* ignore */
    }
  }

  function toggleIndicator(k: keyof IndicatorFlags) {
    setIndicators((prev) => ({ ...prev, [k]: !prev[k] }));
  }

  return (
    <div className="h-screen flex flex-col">
      {/* top bar */}
      <header className="flex items-center gap-4 px-4 h-14 border-b border-bg-border bg-bg-soft shrink-0">
        <div className="text-accent font-bold tracking-tight whitespace-nowrap">◆ TradePlatform</div>
        <SymbolSearch onSelect={(s) => setSymbol(s.id)} />

        <div className="flex items-center gap-3 min-w-0">
          <div className="text-gray-100 font-semibold truncate">{meta?.ticker}</div>
          {quote && (
            <>
              <div className="tabular-nums text-gray-100">{quote.price}</div>
              <div className={`tabular-nums text-sm ${up ? "text-accent-up" : "text-accent-down"}`}>
                {up ? "+" : ""}
                {quote.change} ({up ? "+" : ""}
                {quote.changePercent}%)
              </div>
            </>
          )}
          <button className="btn-ghost !px-2 !py-1 text-xs" onClick={toggleWatch}>
            {inWatch ? "★ Watching" : "☆ Watch"}
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            className="btn-ghost !px-3 !py-1.5 text-sm font-mono"
            onClick={() => setShowWallet(true)}
            title={user.walletAddress ? "Wallet settings" : "Connect a wallet"}
          >
            {user.walletAddress ? `🔗 ${shortAddress(user.walletAddress)}` : "🔗 Connect Wallet"}
          </button>

        <div className="relative">
          <button className="btn-ghost !px-3 !py-1.5 text-sm" onClick={() => setMenuOpen((v) => !v)}>
            {user.email} ▾
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-48 panel py-1 z-40" onMouseLeave={() => setMenuOpen(false)}>
              <div className="px-3 py-2 text-xs text-muted border-b border-bg-border">
                Plan: <span className="capitalize text-gray-200">{user.role}</span>
              </div>
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-bg-panel"
                onClick={() => {
                  setShowWallet(true);
                  setMenuOpen(false);
                }}
              >
                Wallet {user.walletAddress ? "✓" : ""}
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-bg-panel"
                onClick={() => {
                  setShow2fa(true);
                  setMenuOpen(false);
                }}
              >
                Security & 2FA {user.twoFactorEnabled ? "✓" : ""}
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-bg-panel text-accent-down"
                onClick={() => {
                  logout();
                  router.replace("/login");
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
        </div>
      </header>

      {/* body */}
      <div className="flex-1 flex min-h-0">
        <main className="flex-1 flex flex-col min-w-0">
          <Toolbar
            interval={interval}
            onInterval={setIv}
            chartType={chartType}
            onChartType={setChartType}
            indicators={indicators}
            onToggleIndicator={toggleIndicator}
          />
          <div className="flex-1 min-h-0 p-2">
            <Chart symbol={symbol} interval={interval} chartType={chartType} indicators={indicators} />
          </div>
          <div className="h-56 shrink-0 border-t border-bg-border p-2">
            <Positions />
          </div>
        </main>

        <aside className="w-80 shrink-0 border-l border-bg-border p-2 flex flex-col gap-2 min-h-0">
          <TradePanel />
          <div className="flex-1 min-h-0">
            <Watchlist />
          </div>
        </aside>
      </div>

      {show2fa && <TwoFactorModal onClose={() => setShow2fa(false)} />}
      {showWallet && <WalletModal onClose={() => setShowWallet(false)} />}
    </div>
  );
}
