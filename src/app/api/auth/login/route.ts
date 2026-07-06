import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signToken, toPublicUser, verifyPassword, verifyTwoFactorToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string; totp?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  const user = db.findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  if (user.twoFactorEnabled && user.twoFactorSecret) {
    const totp = (body.totp || "").trim();
    if (!totp) {
      return NextResponse.json({ error: "2FA code required", twoFactorRequired: true }, { status: 401 });
    }
    if (!verifyTwoFactorToken(totp, user.twoFactorSecret)) {
      return NextResponse.json({ error: "Invalid 2FA code", twoFactorRequired: true }, { status: 401 });
    }
  }

  const token = signToken(user);
  return NextResponse.json({ token, user: toPublicUser(user) });
}
