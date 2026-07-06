"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/store/useStore";
import {
  connectInjectedWallet,
  getEthBalance,
  hasInjectedWallet,
  isEvmAddress,
  shortAddress,
} from "@/lib/web3";

export default function WalletModal({ onClose }: { onClose: () => void }) {
  const { user, setUser } = useStore();
  const connected = user?.walletAddress;

  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceErr, setBalanceErr] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadBalance = useCallback(async (addr: string) => {
    setBalance(null);
    setBalanceErr(false);
    try {
      setBalance(await getEthBalance(addr));
    } catch {
      setBalanceErr(true);
    }
  }, []);

  useEffect(() => {
    if (connected) loadBalance(connected);
  }, [connected, loadBalance]);

  async function connectWallet() {
    setBusy(true);
    setError(null);
    try {
      const addr = await connectInjectedWallet();
      const { user } = await api.saveWallet(addr);
      setUser(user);
    } catch (e: any) {
      setError(e.message || "Could not connect wallet");
    } finally {
      setBusy(false);
    }
  }

  async function saveManual() {
    const addr = address.trim();
    if (!isEvmAddress(addr)) {
      setError("Enter a valid address: 0x followed by 40 hex characters");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { user } = await api.saveWallet(addr);
      setUser(user);
      setAddress("");
    } catch (e: any) {
      setError(e.message || "Could not save address");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      const { user } = await api.removeWallet();
      setUser(user);
      setBalance(null);
    } catch (e: any) {
      setError(e.message || "Could not disconnect");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4" onMouseDown={onClose}>
      <div className="w-full max-w-md panel p-6" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Wallet</h2>
          <button className="text-muted hover:text-gray-200" onClick={onClose}>✕</button>
        </div>

        {connected ? (
          <>
            <div className="panel bg-bg-panel p-4 mb-4">
              <div className="text-xs text-muted">Connected address</div>
              <div className="font-mono text-sm text-gray-100 break-all mt-1">{connected}</div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-xs text-muted">Ethereum balance</span>
                <span className="tabular-nums text-gray-100">
                  {balance !== null ? `${balance} ETH` : balanceErr ? "unavailable" : "loading…"}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => loadBalance(connected)} disabled={busy}>
                Refresh balance
              </button>
              <button className="btn !bg-accent-down text-white flex-1" onClick={disconnect} disabled={busy}>
                Disconnect
              </button>
            </div>
          </>
        ) : (
          <>
            <button className="btn-primary w-full" onClick={connectWallet} disabled={busy}>
              {hasInjectedWallet() ? "Connect browser wallet (MetaMask)" : "Connect wallet"}
            </button>
            {!hasInjectedWallet() && (
              <p className="text-[11px] text-muted mt-1">
                No browser wallet detected — paste your public address below instead.
              </p>
            )}

            <div className="flex items-center gap-3 my-4 text-xs text-muted">
              <div className="h-px flex-1 bg-bg-border" /> or <div className="h-px flex-1 bg-bg-border" />
            </div>

            <label className="text-xs text-muted">Wallet address</label>
            <input
              className="input mt-1 font-mono"
              placeholder="0x…"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <button className="btn-ghost w-full mt-3" onClick={saveManual} disabled={busy}>
              Save address
            </button>
          </>
        )}

        {error && <p className="text-sm text-accent-down mt-3">{error}</p>}

        <p className="text-[11px] text-muted mt-4 leading-relaxed">
          🔒 We only use your <strong>public address</strong> (read-only). We never ask for and will
          never store your private key or seed phrase. No app or person should ever ask you for those.
        </p>
      </div>
    </div>
  );
}
