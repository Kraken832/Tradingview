import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest, toPublicUser } from "@/lib/auth";

export const runtime = "nodejs";

// EVM (Ethereum-style) address: 0x + 40 hex chars.
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/**
 * Save the user's public wallet address. We store the address ONLY — never a
 * private key or seed phrase (the client never sends those, and must never ask
 * for them). This is read-only identity/display data.
 */
export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { address?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const address = (body.address || "").trim();
  if (!ADDRESS_RE.test(address)) {
    return NextResponse.json({ error: "Invalid wallet address (expected 0x…40 hex chars)" }, { status: 400 });
  }

  const updated = db.updateUser(user.id, { walletAddress: address });
  return NextResponse.json({ user: toPublicUser(updated!) });
}

/** Disconnect / remove the saved wallet address. */
export async function DELETE(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const updated = db.updateUser(user.id, { walletAddress: undefined });
  return NextResponse.json({ user: toPublicUser(updated!) });
}
