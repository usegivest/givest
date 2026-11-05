"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { GIVEST_MINT } from "@/lib/config";

export default function TokenCa() {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(GIVEST_MINT);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      className="mt-6 inline-flex max-w-full items-center gap-2 rounded-full border border-gray-200/80 bg-white/70 px-4 py-2 font-mono text-[11px] text-gray-600 shadow-sm backdrop-blur-sm transition hover:border-gray-300 hover:text-gray-900 sm:text-xs"
      aria-label="Copy Givest token address"
    >
      <span className="font-sans font-semibold tracking-wide text-gray-400">CA</span>
      <span className="hidden truncate sm:inline">{GIVEST_MINT}</span>
      <span className="sm:hidden">
        {GIVEST_MINT.slice(0, 6)}…{GIVEST_MINT.slice(-4)}
      </span>
      {copied ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-green-600" />
      ) : (
        <Copy className="h-3.5 w-3.5 shrink-0 text-gray-400" />
      )}
    </button>
  );
}
