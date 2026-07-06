// Small display formatters shared across trading UI.

export function fmtMoney(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Signed money, e.g. +$12.34 / -$5.00 — for P&L. */
export function fmtPnl(n: number): string {
  return `${n >= 0 ? "+" : "-"}$${Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Compact price/quantity: more decimals for small values. */
export function fmtNum(n: number): string {
  const abs = Math.abs(n);
  const decimals = abs >= 1000 ? 2 : abs >= 1 ? 3 : 6;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: decimals });
}

export function fmtPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}
