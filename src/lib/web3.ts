"use client";

/**
 * Minimal read-only web3 helpers — NO dependencies, NO private keys.
 *
 * Security: we only ever request a wallet's PUBLIC address and read its
 * balance. We never request, receive, or store a private key or seed phrase.
 * Balance is fetched via public JSON-RPC (or the injected provider), so it
 * works even for a manually-entered address with no wallet installed.
 */

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<any>;
      on?: (event: string, handler: (...args: any[]) => void) => void;
      removeListener?: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}

// Public Ethereum mainnet RPCs (CORS-enabled, no API key). Tried in order.
const RPC_URLS = [
  "https://ethereum-rpc.publicnode.com",
  "https://rpc.ankr.com/eth",
  "https://cloudflare-eth.com",
];

export function isEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

export function hasInjectedWallet(): boolean {
  return typeof window !== "undefined" && !!window.ethereum;
}

/** Prompt the browser wallet (MetaMask, etc.) and return the selected address. */
export async function connectInjectedWallet(): Promise<string> {
  if (!hasInjectedWallet()) {
    throw new Error("No browser wallet detected. Install MetaMask or paste an address manually.");
  }
  const accounts: string[] = await window.ethereum!.request({ method: "eth_requestAccounts" });
  if (!accounts || accounts.length === 0) {
    throw new Error("No account was authorized.");
  }
  return accounts[0];
}

async function rpcCall(method: string, params: unknown[]): Promise<string> {
  const payload = JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });
  for (const url of RPC_URLS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
      });
      const json = await res.json();
      if (json?.result) return json.result as string;
    } catch {
      /* try next endpoint */
    }
  }
  throw new Error("Could not reach an Ethereum RPC endpoint.");
}

/** Real on-chain ETH balance (mainnet) for an address, in ETH. */
export async function getEthBalance(address: string): Promise<number> {
  if (!isEvmAddress(address)) throw new Error("Invalid address");
  const hexWei = await rpcCall("eth_getBalance", [address, "latest"]);
  return weiHexToEth(hexWei);
}

/** Convert a hex wei string to a Number of ETH (6-decimal precision). */
export function weiHexToEth(hexWei: string): number {
  const wei = BigInt(hexWei);
  const microEth = wei / 1_000_000_000_000n; // 1e12 -> microETH, keeps precision
  return Number(microEth) / 1_000_000;
}
