"use client";

import { useEffect, useRef, useState } from "react";
import type { Symbol } from "@/types";
import { api } from "@/lib/api";

interface Props {
  onSelect: (symbol: Symbol) => void;
}

export default function SymbolSearch({ onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Symbol[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const t = setTimeout(async () => {
      try {
        const { results } = await api.search(q);
        if (active) setResults(results);
      } catch {
        /* ignore */
      }
    }, 150);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={boxRef}>
      <input
        className="input w-64"
        placeholder="Search symbol (BTC, AAPL, EURUSD…)"
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
      />
      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1 w-80 max-h-80 overflow-auto panel shadow-xl">
          {results.map((s) => (
            <button
              key={s.id}
              className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-bg-panel"
              onClick={() => {
                onSelect(s);
                setOpen(false);
                setQ("");
              }}
            >
              <span>
                <span className="font-medium text-gray-100">{s.ticker}</span>
                <span className="text-muted text-xs ml-2">{s.name}</span>
              </span>
              <span className="text-[10px] uppercase tracking-wide text-muted border border-bg-border rounded px-1.5 py-0.5">
                {s.assetClass}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
