import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, toPublicUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ user: toPublicUser(user) });
}
