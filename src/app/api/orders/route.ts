import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest, newId, toPublicUser } from "@/lib/auth";
import { getSymbol } from "@/lib/symbols";
import { getQuote } from "@/lib/market";
import { applyOrder, OrderError } from "@/lib/portfolio";
import type { OrderSide } from "@/types";

export const runtime = "nodejs";

/**
 * Place a paper-trading market order. Fills at the current live price returned
 * by the market-data layer (real Binance price for crypto, mock otherwise).
 *
 * Body: { symbol: string, side: "buy" | "sell", qty: number }
 */
export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { symbol?: string; side?: string; qty?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const symbol = (body.symbol || "").trim();
  const side = body.side as OrderSide;
  const qty = Number(body.qty);

  if (!getSymbol(symbol)) {
    return NextResponse.json({ error: "Unknown symbol" }, { status: 404 });
  }
  if (side !== "buy" && side !== "sell") {
    return NextResponse.json({ error: "side must be 'buy' or 'sell'" }, { status: 400 });
  }
  if (!Number.isFinite(qty) || qty <= 0) {
    return NextResponse.json({ error: "qty must be greater than zero" }, { status: 400 });
  }

  const quote = await getQuote(symbol);
  if (!quote || !(quote.price > 0)) {
    return NextResponse.json({ error: "No live price available" }, { status: 502 });
  }

  try {
    const { account, trade } = applyOrder(
      {
        cash: user.cash,
        realizedPnl: user.realizedPnl,
        positions: user.positions,
        trades: user.trades,
      },
      symbol,
      side,
      qty,
      quote.price,
      newId,
      Date.now()
    );

    const updated = db.updateUser(user.id, {
      cash: account.cash,
      realizedPnl: account.realizedPnl,
      positions: account.positions,
      trades: account.trades,
    });

    return NextResponse.json({ trade, user: toPublicUser(updated!) });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Order failed" }, { status: 500 });
  }
}
