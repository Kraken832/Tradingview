import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { generateTwoFactorSecret, getUserFromRequest, twoFactorKeyUri } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Begins 2FA enrolment: generates a TOTP secret, stores it (not yet enabled),
 * and returns an otpauth URI + QR data-URL to display. The user confirms with
 * POST /api/auth/2fa/enable before it takes effect.
 */
export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const secret = generateTwoFactorSecret();
  db.updateUser(user.id, { twoFactorSecret: secret, twoFactorEnabled: false });

  const uri = twoFactorKeyUri(user.email, secret);
  const qr = await QRCode.toDataURL(uri);
  return NextResponse.json({ secret, otpauthUri: uri, qr });
}
