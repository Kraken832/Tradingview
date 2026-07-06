import type { OrderSide, Position, Trade } from "@/types";

/**
 * Paper-trading portfolio math. Pure and side-effect free so it is easy to test
 * and reason about. Long-only for the MVP: you can buy to open/add, and sell up
 * to the quantity you hold (which realizes P&L). Short-selling and margin are
 * intentionally out of scope — the shapes leave room to add them later.
 */

export interface Account {
  cash: number;
  realizedPnl: number;
  positions: Position[];
  trades: Trade[];
}

export interface OrderResult {
  account: Account;
  trade: Trade;
}

const EPS = 1e-8;
const MAX_TRADES = 100;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export class OrderError extends Error {}

/**
 * Applies a market order at `price` and returns the new account + the trade.
 * Throws OrderError on invalid input or insufficient cash/position.
 */
export function applyOrder(
  account: Account,
  symbol: string,
  side: OrderSide,
  qty: number,
  price: number,
  newId: () => string,
  now: number
): OrderResult {
  if (!(qty > 0) || !Number.isFinite(qty)) {
    throw new OrderError("Quantity must be greater than zero");
  }
  if (!(price > 0) || !Number.isFinite(price)) {
    throw new OrderError("No live price available for this symbol");
  }

  const positions = account.positions.map((p) => ({ ...p }));
  const existing = positions.find((p) => p.symbol === symbol);
  let cash = account.cash;
  let realizedPnl = account.realizedPnl;
  let tradeRealized = 0;

  if (side === "buy") {
    const cost = qty * price;
    if (cost > cash + EPS) {
      throw new OrderError("Insufficient cash for this order");
    }
    cash = round2(cash - cost);
    if (existing) {
      const newQty = existing.qty + qty;
      existing.avgPrice = (existing.avgPrice * existing.qty + price * qty) / newQty;
      existing.qty = newQty;
    } else {
      positions.push({ symbol, qty, avgPrice: price });
    }
  } else {
    // sell
    if (!existing || existing.qty + EPS < qty) {
      throw new OrderError("Not enough position to sell");
    }
    tradeRealized = round2((price - existing.avgPrice) * qty);
    realizedPnl = round2(realizedPnl + tradeRealized);
    cash = round2(cash + qty * price);
    existing.qty -= qty;
    if (existing.qty <= EPS) {
      const idx = positions.findIndex((p) => p.symbol === symbol);
      positions.splice(idx, 1);
    }
  }

  const trade: Trade = {
    id: newId(),
    symbol,
    side,
    qty,
    price,
    realizedPnl: tradeRealized,
    time: now,
  };

  const trades = [trade, ...account.trades].slice(0, MAX_TRADES);
  return { account: { cash, realizedPnl, positions, trades }, trade };
}

// ---- read-side helpers (used by the client for live P&L) -------------------

export interface PositionValuation extends Position {
  price: number; // current/last price
  marketValue: number; // qty * price
  costBasis: number; // qty * avgPrice
  unrealizedPnl: number; // marketValue - costBasis
  unrealizedPct: number; // vs cost basis
}

export function valuePosition(pos: Position, price: number): PositionValuation {
  const marketValue = pos.qty * price;
  const costBasis = pos.qty * pos.avgPrice;
  const unrealizedPnl = marketValue - costBasis;
  const unrealizedPct = costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;
  return { ...pos, price, marketValue, costBasis, unrealizedPnl, unrealizedPct };
}

export interface AccountSummary {
  cash: number;
  positionsValue: number;
  equity: number; // cash + positionsValue
  unrealizedPnl: number;
  realizedPnl: number;
}

export function summarize(
  cash: number,
  realizedPnl: number,
  valuations: PositionValuation[]
): AccountSummary {
  const positionsValue = valuations.reduce((s, v) => s + v.marketValue, 0);
  const unrealizedPnl = valuations.reduce((s, v) => s + v.unrealizedPnl, 0);
  return {
    cash,
    positionsValue,
    equity: cash + positionsValue,
    unrealizedPnl,
    realizedPnl,
  };
}
