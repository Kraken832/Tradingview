import { NextRequest, NextResponse } from "next/server";
import { getQuote } from "@/lib/market";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbols = (searchParams.get("symbols") || searchParams.get("symbol") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (symbols.length === 0) {
    return NextResponse.json({ error: "symbol(s) required" }, { status: 400 });
  }

  const quotes = (await Promise.all(symbols.map((s) => getQuote(s)))).filter(Boolean);
  return NextResponse.json({ quotes });
}
