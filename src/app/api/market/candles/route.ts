import { NextRequest, NextResponse } from "next/server";
import { getCandles, isInterval } from "@/lib/market";
import { getSymbol } from "@/lib/symbols";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol") || "";
  const interval = searchParams.get("interval") || "1h";
  const limit = Number(searchParams.get("limit") || "300");

  if (!getSymbol(symbol)) {
    return NextResponse.json({ error: "Unknown symbol" }, { status: 404 });
  }
  if (!isInterval(interval)) {
    return NextResponse.json({ error: "Invalid interval" }, { status: 400 });
  }

  const candles = await getCandles(symbol, interval, Number.isFinite(limit) ? limit : 300);
  return NextResponse.json({ symbol, interval, candles });
}
