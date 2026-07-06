// Shared domain types for the trading platform.

export type UserRole = "guest" | "user" | "premium" | "admin";

// A held (long-only) paper-trading position.
export interface Position {
  symbol: string; // symbol id
  qty: number; // units held (> 0)
  avgPrice: number; // volume-weighted average entry price
}

export type OrderSide = "buy" | "sell";

// A single executed paper trade (market order at the live price).
export interface Trade {
  id: string;
  symbol: string;
  side: OrderSide;
  qty: number;
  price: number; // execution price
  realizedPnl: number; // P&L realized by this trade (sells only; 0 for buys)
  time: number;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  // 2FA (TOTP)
  twoFactorEnabled: boolean;
  twoFactorSecret?: string; // base32; present once setup has begun
  watchlist: string[]; // symbol ids, e.g. "BINANCE:BTCUSDT"
  // paper-trading account
  cash: number; // available paper balance
  realizedPnl: number; // cumulative realized profit/loss
  positions: Position[];
  trades: Trade[]; // most-recent first, capped
  // connected wallet (public address only — never keys/seed phrases)
  walletAddress?: string;
  createdAt: number;
}

// Safe user shape sent to the client (never leak hashes/secrets).
export interface PublicUser {
  id: string;
  email: string;
  role: UserRole;
  twoFactorEnabled: boolean;
  watchlist: string[];
  cash: number;
  realizedPnl: number;
  positions: Position[];
  trades: Trade[];
  walletAddress?: string;
  createdAt: number;
}

// Starting paper balance for new accounts.
export const STARTING_CASH = 100_000;

export type AssetClass =
  | "crypto"
  | "stock"
  | "forex"
  | "commodity"
  | "index"
  | "future";

export interface Symbol {
  id: string; // "BINANCE:BTCUSDT"
  ticker: string; // "BTCUSDT"
  name: string; // "Bitcoin / TetherUS"
  exchange: string; // "BINANCE"
  assetClass: AssetClass;
  basePrice: number; // seed price for the mock feed
}

export type Interval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export interface Candle {
  time: number; // unix seconds (UTC)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Quote {
  symbol: string;
  price: number;
  change: number; // absolute vs previous close
  changePercent: number;
  time: number;
}

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
}
