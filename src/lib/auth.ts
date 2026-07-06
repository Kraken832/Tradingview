import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authenticator } from "otplib";
import type { NextRequest } from "next/server";
import type { JwtPayload, PublicUser, User } from "@/types";
import { db } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const APP_NAME = process.env.APP_NAME || "TradingPlatform";

// ---- passwords -------------------------------------------------------------

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ---- tokens ----------------------------------------------------------------

export function signToken(user: User): string {
  const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
  // `expiresIn` accepts a duration string ("7d") or seconds; cast keeps strict
  // @types/jsonwebtoken (which narrows to a template-literal type) happy.
  const options = { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions;
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/** Extracts the bearer token from an Authorization header. */
export function bearerFrom(req: NextRequest): string | null {
  const header = req.headers.get("authorization") || "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() === "bearer" && token) return token;
  return null;
}

/** Resolves the authenticated user for a request, or null. */
export function getUserFromRequest(req: NextRequest): User | null {
  const token = bearerFrom(req);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return db.findUserById(payload.sub) ?? null;
}

// ---- 2FA (TOTP) ------------------------------------------------------------

export function generateTwoFactorSecret(): string {
  return authenticator.generateSecret();
}

export function twoFactorKeyUri(email: string, secret: string): string {
  return authenticator.keyuri(email, APP_NAME, secret);
}

export function verifyTwoFactorToken(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token: token.replace(/\s/g, ""), secret });
  } catch {
    return false;
  }
}

// ---- misc ------------------------------------------------------------------

export function newId(): string {
  return crypto.randomUUID();
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    twoFactorEnabled: user.twoFactorEnabled,
    watchlist: user.watchlist,
    cash: user.cash,
    realizedPnl: user.realizedPnl,
    positions: user.positions,
    trades: user.trades,
    walletAddress: user.walletAddress,
    createdAt: user.createdAt,
  };
}
