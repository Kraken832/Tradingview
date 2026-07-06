import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest, toPublicUser, verifyTwoFactorToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { totp?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (user.twoFactorEnabled && user.twoFactorSecret) {
    if (!verifyTwoFactorToken((body.totp || "").trim(), user.twoFactorSecret)) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }
  }

  const updated = db.updateUser(user.id, { twoFactorEnabled: false, twoFactorSecret: undefined });
  return NextResponse.json({ user: toPublicUser(updated!) });
}
