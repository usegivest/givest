"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import PopupCard from "@/components/PopupCard";

const TOKEN_CA = "0x0188da44dcc9b6c9d0d80de904c633c5ff227777";

function TokenCa() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(TOKEN_CA);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      className="mt-6 inline-flex items-center gap-2 rounded-full border border-gray-200/80 bg-white/70 px-4 py-2 font-mono text-[11px] text-gray-600 shadow-sm backdrop-blur-sm transition hover:border-gray-300 hover:text-gray-900 sm:text-xs"
      aria-label="Copy token contract address"
    >
      <span className="font-sans font-semibold tracking-wide text-gray-400">CA</span>
      <span className="hidden sm:inline">{TOKEN_CA}</span>
      <span className="sm:hidden">
        {TOKEN_CA.slice(0, 8)}…{TOKEN_CA.slice(-6)}
      </span>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-600" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-gray-400" />
      )}
    </button>
  );
}

function ProtocolVolume({
  volumeLabel,
  dropCount,
}: {
  volumeLabel: string;
  dropCount: number;
}) {
  return (
    <p className="mt-5 text-sm text-gray-500">
      <a href="/volume" className="font-medium text-gray-800 underline-offset-2 hover:underline">
        {volumeLabel}
      </a>
      {" "}
      sent onchain
      {dropCount > 0 && (
        <span className="text-gray-400"> · {dropCount} drops</span>
      )}
      <span className="text-gray-400"> · </span>
      <a href="/volume" className="text-gray-400 underline-offset-2 hover:text-gray-600 hover:underline">
        verify
      </a>
    </p>
  );
}

export default function Hero({
  scrollProgress,
  volumeLabel,
  dropCount,
}: {
  scrollProgress: number;
  volumeLabel: string;
  dropCount: number;
}) {
  const opacity = Math.max(1 - scrollProgress * 2.5, 0);
  const translateY = scrollProgress * -60;

  return (
    <section
      className="relative flex min-h-screen flex-col items-center justify-start px-4 pt-32 text-center will-change-transform sm:px-6 sm:pt-36 md:pt-40"
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        zIndex: 10,
        pointerEvents: opacity < 0.1 ? "none" : "auto",
      }}
    >
      <h1 className="max-w-2xl text-[2.25rem] leading-none font-medium tracking-tighter text-gray-900 sm:text-[3rem] md:text-[3.75rem]">
        <span className="text-zinc-400">A New Way</span>
        <br />
        to Send Your
        <br />
        Stock Tokens
      </h1>

      <p className="mt-8 max-w-sm text-base leading-relaxed text-gray-500">
        Send real stock tokens as a link on Robinhood Chain.
        <br />
        Claimed in one click, no wallet, no gas.
      </p>

      <ProtocolVolume volumeLabel={volumeLabel} dropCount={dropCount} />

      <TokenCa />

      <PopupCard />
    </section>
  );
}
