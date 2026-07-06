"use client";

import { create } from "zustand";
import type { Interval, PublicUser } from "@/types";
import { api, setStoredToken } from "@/lib/api";

interface AppState {
  user: PublicUser | null;
  authReady: boolean;

  symbol: string;
  interval: Interval;
  watchlist: string[];
  prices: Record<string, number>; // latest live price per symbol id

  setUser: (u: PublicUser | null) => void;
  setSymbol: (s: string) => void;
  setInterval: (i: Interval) => void;
  setWatchlist: (w: string[]) => void;
  setPrice: (symbol: string, price: number) => void;
  setPrices: (prices: Record<string, number>) => void;

  bootstrap: () => Promise<void>;
  logout: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  authReady: false,

  symbol: "BINANCE:BTCUSDT",
  interval: "1h",
  watchlist: [],
  prices: {},

  setUser: (user) => set({ user, watchlist: user?.watchlist ?? [] }),
  setSymbol: (symbol) => set({ symbol }),
  setInterval: (interval) => set({ interval }),
  setWatchlist: (watchlist) => set({ watchlist }),
  setPrice: (symbol, price) =>
    set((s) => ({ prices: { ...s.prices, [symbol]: price } })),
  setPrices: (prices) => set((s) => ({ prices: { ...s.prices, ...prices } })),

  bootstrap: async () => {
    try {
      const { user } = await api.me();
      set({ user, watchlist: user.watchlist, authReady: true });
    } catch {
      set({ user: null, authReady: true });
    }
  },

  logout: () => {
    setStoredToken(null);
    set({ user: null, watchlist: [] });
  },
}));
