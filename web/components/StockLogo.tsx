"use client";

import { useState } from "react";
import Image from "next/image";

export default function StockLogo({
  symbol,
  size = 24,
  className = "",
  src,
}: {
  symbol: string;
  size?: number;
  className?: string;
  /** Optional remote logo URL (custom tokens). Defaults to the bundled /logos file. */
  src?: string | null;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-md bg-gray-100 font-bold text-gray-600 ${className}`}
        style={{ width: size, height: size, fontSize: Math.max(8, size * 0.38) }}
        aria-hidden
      >
        {symbol.slice(0, 2)}
      </span>
    );
  }

  return (
    <Image
      src={src || `/logos/${symbol}.png`}
      alt={`${symbol} logo`}
      width={size}
      height={size}
      unoptimized={Boolean(src)}
      className={`object-contain ${symbol === "SPCX" ? "invert" : ""} ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
