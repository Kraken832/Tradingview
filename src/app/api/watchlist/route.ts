import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { getSymbol } from "@/lib/symbols";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ watchlist: user.watchlist });
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { symbol?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const symbol = (body.symbol || "").trim();
  if (!getSymbol(symbol)) {
    return NextResponse.json({ error: "Unknown symbol" }, { status: 404 });
  }
  const watchlist = user.watchlist.includes(symbol)
    ? user.watchlist
    : [...user.watchlist, symbol];
  db.updateUser(user.id, { watchlist });
  return NextResponse.json({ watchlist });
}

export async function DELETE(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") || "").trim();
  const watchlist = user.watchlist.filter((s) => s !== symbol);
  db.updateUser(user.id, { watchlist });
  return NextResponse.json({ watchlist });
}
