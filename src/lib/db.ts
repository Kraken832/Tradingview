import fs from "fs";
import path from "path";
import { STARTING_CASH, type User } from "@/types";

/**
 * Minimal file-backed JSON store for the MVP.
 *
 * This is intentionally simple so the app runs with zero external services.
 * For production (Phase 1 hardening) swap this module for PostgreSQL (users,
 * watchlists) + Redis (sessions/cache) behind the same function signatures.
 */

interface Schema {
  users: User[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

function ensureFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const empty: Schema = { users: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(empty, null, 2), "utf8");
  }
}

// Backfill fields added after a user was first created, so older records
// (and any created before paper-trading existed) always have a valid account.
function withDefaults(user: User): User {
  return {
    ...user,
    watchlist: user.watchlist ?? [],
    cash: user.cash ?? STARTING_CASH,
    realizedPnl: user.realizedPnl ?? 0,
    positions: user.positions ?? [],
    trades: user.trades ?? [],
  };
}

function read(): Schema {
  ensureFile();
  try {
    const raw = fs.readFileSync(DB_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<Schema>;
    return { users: (parsed.users ?? []).map(withDefaults) };
  } catch {
    return { users: [] };
  }
}

function write(data: Schema): void {
  ensureFile();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
}

export const db = {
  findUserByEmail(email: string): User | undefined {
    const normalized = email.trim().toLowerCase();
    return read().users.find((u) => u.email === normalized);
  },

  findUserById(id: string): User | undefined {
    return read().users.find((u) => u.id === id);
  },

  createUser(user: User): User {
    const data = read();
    data.users.push(user);
    write(data);
    return user;
  },

  updateUser(id: string, patch: Partial<User>): User | undefined {
    const data = read();
    const idx = data.users.findIndex((u) => u.id === id);
    if (idx === -1) return undefined;
    data.users[idx] = { ...data.users[idx], ...patch, id };
    write(data);
    return data.users[idx];
  },
};
