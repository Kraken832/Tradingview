import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest, toPublicUser, verifyTwoFactorToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.twoFactorSecret) {
    return NextResponse.json({ error: "Start setup first" }, { status: 400 });
  }

  let body: { totp?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const totp = (body.totp || "").trim();
  if (!verifyTwoFactorToken(totp, user.twoFactorSecret)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const updated = db.updateUser(user.id, { twoFactorEnabled: true });
  return NextResponse.json({ user: toPublicUser(updated!) });
}
