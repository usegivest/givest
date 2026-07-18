"use client";

import { useMemo, useState } from "react";
import StockLogo from "@/components/StockLogo";
import { STOCKS } from "@/lib/config";

const EXPLORER = "https://robinhoodchain.blockscout.com";

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function DocsStockGrid() {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(18);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return STOCKS;
    return STOCKS.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q),
    );
  }, [query]);

  const visible = filtered.slice(0, query.trim() ? Math.max(limit, 24) : limit);

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setLimit(18);
        }}
        placeholder={`Search ${STOCKS.length} stocks`}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400 focus:bg-white"
      />
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {visible.map((s) => (
          <a
            key={s.symbol}
            href={`${EXPLORER}/address/${s.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 transition hover:border-gray-400"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-50">
              <StockLogo symbol={s.symbol} size={16} />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-gray-900">
                {s.symbol}
              </span>
              <span className="block truncate font-mono text-[10px] text-gray-400">
                {short(s.address)}
              </span>
            </span>
          </a>
        ))}
      </div>
      {visible.length < filtered.length && (
        <button
          type="button"
          onClick={() => setLimit((n) => n + 18)}
          className="w-full rounded-full border border-gray-200 bg-white py-2 text-xs font-semibold text-gray-600 transition hover:border-gray-400 hover:text-gray-900"
        >
          More ({filtered.length - visible.length} left)
        </button>
      )}
    </div>
  );
}
