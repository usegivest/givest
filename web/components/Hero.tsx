"use client";

import PopupCard from "@/components/PopupCard";
import StockLogo from "@/components/StockLogo";
import { STOCKS } from "@/lib/config";

export default function Hero({ scrollProgress }: { scrollProgress: number }) {
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
        A stock, a dollar amount, a link. They claim it. You paid the fee.
      </p>

      <div className="mt-8 grid w-full max-w-xl grid-cols-2 gap-3 text-left">
        <a href="/send" className="rounded-[24px] bg-gray-900 px-5 py-5 text-white shadow-lg transition hover:bg-gray-800">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-white/50 uppercase">Send</p>
          <p className="mt-3 text-xl font-medium tracking-tight">Pick a stock.</p>
          <p className="mt-1 text-sm leading-snug text-white/70">$10, or any amount. You get a private link.</p>
        </a>
        <a href="/claim" className="rounded-[24px] border border-gray-200/80 bg-white/85 px-5 py-5 text-gray-900 shadow-sm backdrop-blur-sm transition hover:border-gray-300">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-gray-400 uppercase">Claim</p>
          <p className="mt-3 text-xl font-medium tracking-tight">Open the link.</p>
          <p className="mt-1 text-sm leading-snug text-gray-500">One tap. No fee. Phantom receives it.</p>
        </a>
      </div>

      <div className="mt-8 w-full max-w-xl">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-gray-400 uppercase">
          xStocks on Solana
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {STOCKS.map((stock) => (
            <a
              key={stock.symbol}
              href={`/send?s=${stock.symbol}`}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200/80 bg-white/85 py-1.5 pr-3.5 pl-1.5 text-sm font-medium text-gray-900 shadow-sm backdrop-blur-sm transition hover:border-gray-300"
            >
              <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-gray-50">
                <StockLogo symbol={stock.symbol} size={22} />
              </span>
              {stock.symbol}
            </a>
          ))}
        </div>
      </div>

      <p className="mt-4 max-w-sm text-sm text-gray-500">
        iPhone is not out yet.{" "}
        <a href="/android" className="font-medium text-gray-800 underline-offset-2 hover:underline">
          Android is live
        </a>
        {" · "}
        <a href="/updates" className="text-gray-400 underline-offset-2 hover:text-gray-600 hover:underline">
          updates
        </a>
      </p>

      <PopupCard />
    </section>
  );
}
