import { NextRequest, NextResponse } from "next/server";
import { searchSymbols } from "@/lib/symbols";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const results = searchSymbols(q, 20);
  return NextResponse.json({ results });
}
