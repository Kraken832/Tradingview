import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, newId, signToken, toPublicUser } from "@/lib/auth";
import { STARTING_CASH, type User } from "@/types";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }
  if (db.findUserByEmail(email)) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const user: User = {
    id: newId(),
    email,
    passwordHash: await hashPassword(password),
    role: "user",
    twoFactorEnabled: false,
    watchlist: ["BINANCE:BTCUSDT", "NASDAQ:AAPL"],
    cash: STARTING_CASH,
    realizedPnl: 0,
    positions: [],
    trades: [],
    createdAt: Date.now(),
  };
  db.createUser(user);

  const token = signToken(user);
  return NextResponse.json({ token, user: toPublicUser(user) }, { status: 201 });
}
